// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/ILendingManager.sol";
import "./interfaces/IUniswapV3SwapCallback.sol";
import "./interfaces/IUniswapV3Pool.sol";
import "./libraries/TickMath.sol";
import "./libraries/SqrtPriceMath.sol";
import "./libraries/Path.sol";

contract LimitOrderManager is Ownable, ReentrancyGuard, IUniswapV3SwapCallback {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;
    using Path for bytes;

    // Order ID counter
    Counters.Counter private _orderId;

    // Lending Manager contract
    ILendingManager public lendingManager;

    // Fee for limit orders (in basis points, e.g., 10 = 0.1%)
    uint16 public orderFee = 10;

    // Minimum order threshold in USD value (e.g., 10 USD)
    uint256 public minOrderValue = 10 * 1e18;

    // Address to collect fees
    address public feeCollector;

    // Oracle for price feeds (simplified)
    address public priceOracle;

    // Enum for order status
    enum OrderStatus {
        Active,
        Executed,
        Canceled
    }

    // Enum for order type
    enum OrderType {
        Buy, // tokenIn -> tokenOut (e.g., USDC -> ETH)
        Sell // tokenOut -> tokenIn (e.g., ETH -> USDC)
    }

    // Struct to represent a limit order
    struct LimitOrder {
        address maker;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        uint256 targetPrice; // Price in tokenOut per tokenIn scaled by 1e18
        uint256 deadline;
        OrderStatus status;
        OrderType orderType;
        uint256 createdAt;
        uint256 executedAt;
        uint256 lendingPositionId; // ID of the position in lending protocol
    }

    // Mapping from order ID to limit order
    mapping(uint256 => LimitOrder) public orders;

    // Mapping from user address to their order IDs
    mapping(address => uint256[]) public userOrders;

    // Events
    event OrderCreated(
        uint256 indexed orderId,
        address indexed maker,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 targetPrice,
        uint256 deadline,
        OrderType orderType
    );

    event OrderExecuted(
        uint256 indexed orderId,
        address indexed maker,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 executionPrice
    );

    event OrderCanceled(
        uint256 indexed orderId,
        address indexed maker,
        uint256 refundAmount
    );

    event FeesCollected(
        uint256 indexed orderId,
        address token,
        uint256 feeAmount
    );

    event LendingManagerUpdated(address oldManager, address newManager);
    event OrderFeeUpdated(uint16 oldFee, uint16 newFee);
    event MinOrderValueUpdated(uint256 oldValue, uint256 newValue);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event PriceOracleUpdated(address oldOracle, address newOracle);

    constructor(
        address _lendingManager,
        address _feeCollector,
        address _priceOracle
    ) {
        require(_lendingManager != address(0), "Invalid lending manager");
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_priceOracle != address(0), "Invalid price oracle");

        lendingManager = ILendingManager(_lendingManager);
        feeCollector = _feeCollector;
        priceOracle = _priceOracle;
    }

    /**
     * @notice Creates a limit order to swap tokens when price reaches target
     * @param tokenIn Address of the token to sell
     * @param tokenOut Address of the token to buy
     * @param amountIn Amount of tokenIn to sell
     * @param amountOutMin Minimum amount of tokenOut to receive
     * @param targetPrice Price at which to execute the order (tokenOut per tokenIn * 1e18)
     * @param deadline Timestamp after which the order expires
     * @param orderType Type of order (Buy or Sell)
     * @return orderId The ID of the created order
     */
    function createLimitOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 targetPrice,
        uint256 deadline,
        OrderType orderType
    ) external nonReentrant returns (uint256) {
        require(tokenIn != tokenOut, "Same tokens");
        require(amountIn > 0, "Zero amount");
        require(amountOutMin > 0, "Zero min amount");
        require(deadline > block.timestamp, "Expired deadline");
        require(targetPrice > 0, "Invalid price");

        // Check if order meets minimum value requirements
        require(checkOrderValue(tokenIn, amountIn), "Order too small");

        // Transfer tokens from user to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Calculate fee
        uint256 feeAmount = (amountIn * orderFee) / 10000;
        uint256 amountAfterFee = amountIn - feeAmount;

        // Transfer fee to fee collector
        if (feeAmount > 0) {
            IERC20(tokenIn).safeTransfer(feeCollector, feeAmount);
            emit FeesCollected(_orderId.current() + 1, tokenIn, feeAmount);
        }

        // Deposit to lending protocol
        uint256 lendingPositionId = lendingManager.depositToHighestYieldPool(
            tokenIn,
            amountAfterFee
        );

        // Create order
        _orderId.increment();
        uint256 newOrderId = _orderId.current();

        orders[newOrderId] = LimitOrder({
            maker: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountAfterFee,
            amountOutMin: amountOutMin,
            targetPrice: targetPrice,
            deadline: deadline,
            status: OrderStatus.Active,
            orderType: orderType,
            createdAt: block.timestamp,
            executedAt: 0,
            lendingPositionId: lendingPositionId
        });

        // Add to user's orders
        userOrders[msg.sender].push(newOrderId);

        emit OrderCreated(
            newOrderId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountAfterFee,
            amountOutMin,
            targetPrice,
            deadline,
            orderType
        );

        return newOrderId;
    }

    /**
     * @notice Cancels an active limit order
     * @param orderId ID of the order to cancel
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        LimitOrder storage order = orders[orderId];

        require(order.maker == msg.sender, "Not order maker");
        require(order.status == OrderStatus.Active, "Not active");

        // Withdraw from lending protocol
        uint256 withdrawnAmount = lendingManager.withdrawFromPool(
            order.lendingPositionId,
            order.tokenIn
        );

        // Update order status
        order.status = OrderStatus.Canceled;

        // Transfer funds back to user
        IERC20(order.tokenIn).safeTransfer(msg.sender, withdrawnAmount);

        emit OrderCanceled(orderId, msg.sender, withdrawnAmount);
    }

    /**
     * @notice Executes a limit order if conditions are met
     * @param orderId ID of the order to execute
     * @param pool Uniswap V3 pool address to use for the swap
     * @param sqrtPriceLimitX96 Price limit for the swap
     */
    function executeOrder(
        uint256 orderId,
        address pool,
        uint160 sqrtPriceLimitX96
    ) external nonReentrant {
        LimitOrder storage order = orders[orderId];

        require(order.status == OrderStatus.Active, "Not active");
        require(block.timestamp <= order.deadline, "Order expired");

        // Check if the current price meets the target price
        require(checkPriceCondition(order, pool), "Price condition not met");

        // Withdraw from lending protocol
        uint256 withdrawnAmount = lendingManager.withdrawFromPool(
            order.lendingPositionId,
            order.tokenIn
        );

        // Approve token for swap
        IERC20(order.tokenIn).approve(address(pool), withdrawnAmount);

        // Execute swap via Uniswap V3
        (uint256 amountIn, uint256 amountOut) = swap(
            pool,
            order.orderType == OrderType.Buy,
            withdrawnAmount,
            sqrtPriceLimitX96,
            abi.encode(
                SwapCallbackData({
                    tokenIn: order.tokenIn,
                    tokenOut: order.tokenOut,
                    payer: address(this)
                })
            )
        );

        // Verify minimum amount out
        require(amountOut >= order.amountOutMin, "Insufficient output");

        // Update order status
        order.status = OrderStatus.Executed;
        order.executedAt = block.timestamp;

        // Transfer tokens to user
        IERC20(order.tokenOut).safeTransfer(order.maker, amountOut);

        // Calculate execution price
        uint256 executionPrice = (amountOut * 1e18) / amountIn;

        emit OrderExecuted(
            orderId,
            order.maker,
            order.tokenIn,
            order.tokenOut,
            amountIn,
            amountOut,
            executionPrice
        );
    }

    /**
     * @notice Checks if an order meets the minimum value requirement
     * @param token Token address
     * @param amount Token amount
     * @return Whether the order meets the minimum value
     */
    function checkOrderValue(
        address token,
        uint256 amount
    ) internal view returns (bool) {
        // This is a simplified implementation
        // In production, you would use a price oracle to get the USD value
        return true; // Implement token pricing logic
    }

    /**
     * @notice Checks if the current market price meets order's target price
     * @param order The limit order to check
     * @param pool Uniswap V3 pool to use for price check
     * @return Whether the price condition is met
     */
    function checkPriceCondition(
        LimitOrder storage order,
        address pool
    ) internal view returns (bool) {
        (uint160 sqrtPriceX96, , , , , , ) = IUniswapV3Pool(pool).slot0();
        uint256 currentPrice = getPriceFromSqrtPrice(
            sqrtPriceX96,
            order.tokenIn,
            order.tokenOut
        );

        if (order.orderType == OrderType.Buy) {
            // For buy orders, execute when price <= target price
            return currentPrice <= order.targetPrice;
        } else {
            // For sell orders, execute when price >= target price
            return currentPrice >= order.targetPrice;
        }
    }

    /**
     * @notice Converts sqrtPriceX96 to a regular price
     * @param sqrtPriceX96 The sqrt price from Uniswap
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @return The price of tokenOut in terms of tokenIn
     */
    function getPriceFromSqrtPrice(
        uint160 sqrtPriceX96,
        address tokenIn,
        address tokenOut
    ) internal pure returns (uint256) {
        // If token0 < token1 (by address), then we need to invert the price
        bool isToken0 = tokenIn < tokenOut;

        uint256 priceX96Squared = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        uint256 price = (priceX96Squared * 1e18) >> 192; // Divide by 2^192 to get the actual price

        if (isToken0) {
            return price;
        } else {
            return (1e36 / price);
        }
    }

    /**
     * @notice Executes a swap on Uniswap V3
     * @param pool Uniswap V3 pool to use for swap
     * @param zeroForOne Direction of the swap (true for token0 to token1)
     * @param amountSpecified Amount of input token
     * @param sqrtPriceLimitX96 Price limit for the swap
     * @param data Callback data
     * @return amount0 Amount of token0 swapped
     * @return amount1 Amount of token1 swapped
     */
    function swap(
        address pool,
        bool zeroForOne,
        uint256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes memory data
    ) internal returns (uint256 amount0, uint256 amount1) {
        return
            IUniswapV3Pool(pool).swap(
                address(this),
                zeroForOne,
                int256(amountSpecified),
                sqrtPriceLimitX96 == 0
                    ? (
                        zeroForOne
                            ? TickMath.MIN_SQRT_RATIO + 1
                            : TickMath.MAX_SQRT_RATIO - 1
                    )
                    : sqrtPriceLimitX96,
                data
            );
    }

    // Struct for Uniswap V3 swap callback data
    struct SwapCallbackData {
        address tokenIn;
        address tokenOut;
        address payer;
    }

    /**
     * @notice Callback for Uniswap V3 swap
     * @param amount0Delta Change in token0 balance
     * @param amount1Delta Change in token1 balance
     * @param data Callback data
     */
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        require(amount0Delta > 0 || amount1Delta > 0, "Invalid swap");

        SwapCallbackData memory decoded = abi.decode(data, (SwapCallbackData));

        // Verify callback is from a valid pool
        // In production, you would check that msg.sender is a valid Uniswap V3 pool

        if (amount0Delta > 0) {
            IERC20(decoded.tokenIn).safeTransfer(
                msg.sender,
                uint256(amount0Delta)
            );
        } else {
            IERC20(decoded.tokenIn).safeTransfer(
                msg.sender,
                uint256(amount1Delta)
            );
        }
    }

    /**
     * @notice Gets all orders of a user
     * @param user User address
     * @return Array of order IDs
     */
    function getUserOrders(
        address user
    ) external view returns (uint256[] memory) {
        return userOrders[user];
    }

    /**
     * @notice Gets order details
     * @param orderId Order ID
     * @return Order details
     */
    function getOrder(
        uint256 orderId
    ) external view returns (LimitOrder memory) {
        return orders[orderId];
    }

    /**
     * @notice Gets all active orders
     * @return Arrays of order IDs
     */
    function getActiveOrders() external view returns (uint256[] memory) {
        uint256 count = 0;

        // Count active orders
        for (uint256 i = 1; i <= _orderId.current(); i++) {
            if (orders[i].status == OrderStatus.Active) {
                count++;
            }
        }

        uint256[] memory activeOrders = new uint256[](count);
        uint256 index = 0;

        // Fill active orders
        for (uint256 i = 1; i <= _orderId.current(); i++) {
            if (orders[i].status == OrderStatus.Active) {
                activeOrders[index] = i;
                index++;
            }
        }

        return activeOrders;
    }

    // Admin functions

    /**
     * @notice Updates the lending manager contract
     * @param _lendingManager New lending manager address
     */
    function updateLendingManager(address _lendingManager) external onlyOwner {
        require(_lendingManager != address(0), "Invalid lending manager");
        address oldManager = address(lendingManager);
        lendingManager = ILendingManager(_lendingManager);
        emit LendingManagerUpdated(oldManager, _lendingManager);
    }

    /**
     * @notice Updates the order fee
     * @param _orderFee New order fee in basis points
     */
    function updateOrderFee(uint16 _orderFee) external onlyOwner {
        require(_orderFee <= 1000, "Fee too high"); // Max 10%
        uint16 oldFee = orderFee;
        orderFee = _orderFee;
        emit OrderFeeUpdated(oldFee, _orderFee);
    }

    /**
     * @notice Updates the minimum order value
     * @param _minOrderValue New minimum order value in USD
     */
    function updateMinOrderValue(uint256 _minOrderValue) external onlyOwner {
        uint256 oldValue = minOrderValue;
        minOrderValue = _minOrderValue;
        emit MinOrderValueUpdated(oldValue, _minOrderValue);
    }

    /**
     * @notice Updates the fee collector address
     * @param _feeCollector New fee collector address
     */
    function updateFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid fee collector");
        address oldCollector = feeCollector;
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(oldCollector, _feeCollector);
    }

    /**
     * @notice Updates the price oracle address
     * @param _priceOracle New price oracle address
     */
    function updatePriceOracle(address _priceOracle) external onlyOwner {
        require(_priceOracle != address(0), "Invalid price oracle");
        address oldOracle = priceOracle;
        priceOracle = _priceOracle;
        emit PriceOracleUpdated(oldOracle, _priceOracle);
    }

    /**
     * @notice Allows the owner to rescue stuck tokens
     * @param token Token to rescue
     * @param to Address to send tokens to
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
