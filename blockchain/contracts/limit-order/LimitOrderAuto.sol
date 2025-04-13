// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Interface cho Aave lending pool
interface IAaveLendingPool {
    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    function getReserveData(
        address asset
    )
        external
        view
        returns (
            uint256 liquidityRate,
            uint256 stableBorrowRate,
            uint256 variableBorrowRate,
            uint256 liquidityIndex,
            uint256 variableBorrowIndex,
            uint40 lastUpdateTimestamp
        );
}

// Interface cho aToken của Aave
interface IAToken is IERC20 {
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
}

// Interface cho Compound cToken
interface ICToken {
    function mint(uint256 mintAmount) external returns (uint256);

    function redeem(uint256 redeemTokens) external returns (uint256);

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function exchangeRateStored() external view returns (uint256);

    function supplyRatePerBlock() external view returns (uint256);

    function underlying() external view returns (address);
}

// Interface cho DEX swap
interface IDexRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts);
}

contract LimitOrderYieldOptimizer is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct LimitOrder {
        address user;
        address sellToken;
        address buyToken;
        uint256 sellAmount;
        uint256 buyAmount;
        uint256 depositTimestamp;
        bool isActive;
        uint8 lendingProtocol; // 1 = Aave, 2 = Compound
        uint256 depositedAmount;
    }

    // Protocol constants
    uint8 constant AAVE = 1;
    uint8 constant COMPOUND = 2;

    // Mapping to store all limit orders
    mapping(uint256 => LimitOrder) public limitOrders;
    uint256 public nextOrderId;

    // Protocol addresses
    address public aaveLendingPoolAddress;
    mapping(address => address) public aTokens; // token => aToken
    mapping(address => address) public cTokens; // token => cToken
    address public dexRouterAddress;

    // Protocol activation
    bool public aaveEnabled = true;
    bool public compoundEnabled = true;

    // Fee settings
    uint256 public feePercentage = 10; // 0.1% (in basis points, 10000 = 100%)
    address public feeCollector;

    // Events
    event LimitOrderCreated(
        uint256 indexed orderId,
        address indexed user,
        address sellToken,
        address buyToken,
        uint256 sellAmount,
        uint256 buyAmount
    );
    event LimitOrderCancelled(uint256 indexed orderId);
    event LimitOrderExecuted(
        uint256 indexed orderId,
        uint256 soldAmount,
        uint256 boughtAmount,
        uint256 yieldEarned
    );
    event YieldRebalanced(
        uint256 indexed orderId,
        uint8 fromProtocol,
        uint8 toProtocol,
        uint256 amount
    );
    event FeeCollected(uint256 indexed orderId, address token, uint256 amount);

    constructor(
        address _aaveLendingPoolAddress,
        address _dexRouterAddress,
        address _feeCollector
    ) Ownable(msg.sender) {
        aaveLendingPoolAddress = _aaveLendingPoolAddress;
        dexRouterAddress = _dexRouterAddress;
        feeCollector = _feeCollector;
    }

    // Register aTokens for Aave
    function registerAToken(address token, address aToken) external onlyOwner {
        aTokens[token] = aToken;
    }

    // Register cTokens for Compound
    function registerCToken(address token, address cToken) external onlyOwner {
        cTokens[token] = cToken;
    }

    // Create a new limit order
    function createLimitOrder(
        address sellToken,
        address buyToken,
        uint256 sellAmount,
        uint256 buyAmount
    ) external nonReentrant returns (uint256) {
        require(
            sellToken != address(0) && buyToken != address(0),
            "Invalid tokens"
        );
        require(sellAmount > 0, "Sell amount must be > 0");
        require(buyAmount > 0, "Buy amount must be > 0");

        // Transfer tokens from user to this contract
        IERC20(sellToken).safeTransferFrom(
            msg.sender,
            address(this),
            sellAmount
        );

        // Calculate fee
        uint256 fee = (sellAmount * feePercentage) / 10000;
        uint256 amountAfterFee = sellAmount - fee;

        // Collect fee
        if (fee > 0) {
            IERC20(sellToken).safeTransfer(feeCollector, fee);
            emit FeeCollected(nextOrderId, sellToken, fee);
        }

        // Create order
        uint256 orderId = nextOrderId++;
        limitOrders[orderId] = LimitOrder({
            user: msg.sender,
            sellToken: sellToken,
            buyToken: buyToken,
            sellAmount: amountAfterFee, // Store amount after fee
            buyAmount: buyAmount,
            depositTimestamp: block.timestamp,
            isActive: true,
            lendingProtocol: 0, // Will be set when deposited
            depositedAmount: 0 // Will be set when deposited
        });

        emit LimitOrderCreated(
            orderId,
            msg.sender,
            sellToken,
            buyToken,
            amountAfterFee,
            buyAmount
        );

        // Find best yield and deposit
        _depositToHighestYield(orderId);

        return orderId;
    }

    // Cancel a limit order
    function cancelLimitOrder(uint256 orderId) external nonReentrant {
        LimitOrder storage order = limitOrders[orderId];
        require(order.user == msg.sender, "Not your order");
        require(order.isActive, "Order not active");

        order.isActive = false;

        // Withdraw from lending protocol with yield
        _withdrawFromLending(orderId);

        // Calculate total amount with yield
        uint256 totalAmountWithYield = IERC20(order.sellToken).balanceOf(
            address(this)
        );

        // Transfer tokens back to user
        IERC20(order.sellToken).safeTransfer(order.user, totalAmountWithYield);

        emit LimitOrderCancelled(orderId);
    }

    // Execute a limit order if price is favorable
    function executeOrder(uint256 orderId) external nonReentrant {
        LimitOrder storage order = limitOrders[orderId];
        require(order.isActive, "Order not active");

        // Withdraw from lending protocol with yield
        _withdrawFromLending(orderId);

        // Get current price from DEX
        address[] memory path = new address[](2);
        path[0] = order.sellToken;
        path[1] = order.buyToken;

        uint256 currentSellAmount = IERC20(order.sellToken).balanceOf(
            address(this)
        );
        uint[] memory amountsOut = IDexRouter(dexRouterAddress).getAmountsOut(
            currentSellAmount,
            path
        );
        uint256 expectedBuyAmount = amountsOut[1];

        // Check if price is favorable
        require(expectedBuyAmount >= order.buyAmount, "Price not favorable");

        // Execute the swap
        IERC20(order.sellToken).approve(dexRouterAddress, currentSellAmount);
        uint[] memory amounts = IDexRouter(dexRouterAddress)
            .swapExactTokensForTokens(
                currentSellAmount,
                order.buyAmount,
                path,
                address(this),
                block.timestamp + 300
            );

        // Mark order as fulfilled
        order.isActive = false;

        // Calculate yield earned
        uint256 yieldEarned = currentSellAmount > order.sellAmount
            ? currentSellAmount - order.sellAmount
            : 0;

        // Transfer bought tokens to user
        IERC20(order.buyToken).safeTransfer(order.user, amounts[1]);

        emit LimitOrderExecuted(
            orderId,
            currentSellAmount,
            amounts[1],
            yieldEarned
        );
    }

    // Admin function to check and rebalance yield if needed
    function checkAndRebalanceYield(uint256 orderId) external {
        LimitOrder storage order = limitOrders[orderId];
        require(order.isActive, "Order not active");

        // Check if there's a better yield available
        uint8 bestProtocol = _getBestLendingProtocol(order.sellToken);

        if (bestProtocol != order.lendingProtocol && bestProtocol != 0) {
            _rebalanceToHighestYield(orderId, bestProtocol);
        }
    }

    // Internal function to deposit to highest yield protocol
    function _depositToHighestYield(uint256 orderId) internal {
        LimitOrder storage order = limitOrders[orderId];
        uint8 bestProtocol = _getBestLendingProtocol(order.sellToken);

        if (bestProtocol == AAVE) {
            _depositToAave(orderId);
        } else if (bestProtocol == COMPOUND) {
            _depositToCompound(orderId);
        }
    }

    // Internal function to determine best lending protocol
    function _getBestLendingProtocol(
        address token
    ) internal view returns (uint8) {
        uint256 aaveRate = _getAaveRate(token);
        uint256 compoundRate = _getCompoundRate(token);

        if (!aaveEnabled && !compoundEnabled) {
            return 0; // No protocols enabled
        } else if (!aaveEnabled) {
            return COMPOUND;
        } else if (!compoundEnabled) {
            return AAVE;
        } else {
            return aaveRate > compoundRate ? AAVE : COMPOUND;
        }
    }

    // Get Aave lending rate (APY in ray, 1e27)
    function _getAaveRate(address token) internal view returns (uint256) {
        if (!aaveEnabled || aTokens[token] == address(0)) {
            return 0;
        }

        (uint256 liquidityRate, , , , , ) = IAaveLendingPool(
            aaveLendingPoolAddress
        ).getReserveData(token);
        return liquidityRate;
    }

    // Get Compound lending rate (APY)
    function _getCompoundRate(address token) internal view returns (uint256) {
        if (!compoundEnabled || cTokens[token] == address(0)) {
            return 0;
        }

        // Compound returns rate per block, need to convert to comparable format
        ICToken cToken = ICToken(cTokens[token]);
        uint256 ratePerBlock = cToken.supplyRatePerBlock();

        // Convert to annual rate (assuming ~2.1M blocks per year)
        return ratePerBlock * 2102400;
    }

    // Deposit to Aave
    function _depositToAave(uint256 orderId) internal {
        LimitOrder storage order = limitOrders[orderId];
        address token = order.sellToken;

        // Ensure aToken is registered
        require(aTokens[token] != address(0), "aToken not registered");

        uint256 amount = IERC20(token).balanceOf(address(this));

        // Approve and deposit
        IERC20(token).approve(aaveLendingPoolAddress, amount);
        IAaveLendingPool(aaveLendingPoolAddress).deposit(
            token,
            amount,
            address(this),
            0 // referral code
        );

        // Update order info
        order.lendingProtocol = AAVE;
        order.depositedAmount = amount;
    }

    // Deposit to Compound
    function _depositToCompound(uint256 orderId) internal {
        LimitOrder storage order = limitOrders[orderId];
        address token = order.sellToken;

        // Ensure cToken is registered
        require(cTokens[token] != address(0), "cToken not registered");

        uint256 amount = IERC20(token).balanceOf(address(this));

        // Approve and deposit
        IERC20(token).approve(cTokens[token], amount);
        require(
            ICToken(cTokens[token]).mint(amount) == 0,
            "Compound deposit failed"
        );

        // Update order info
        order.lendingProtocol = COMPOUND;
        order.depositedAmount = amount;
    }

    // Withdraw from lending protocol
    function _withdrawFromLending(uint256 orderId) internal {
        LimitOrder storage order = limitOrders[orderId];

        if (order.lendingProtocol == AAVE) {
            _withdrawFromAave(orderId);
        } else if (order.lendingProtocol == COMPOUND) {
            _withdrawFromCompound(orderId);
        }
    }

    // Withdraw from Aave
    function _withdrawFromAave(uint256 orderId) internal {
        LimitOrder storage order = limitOrders[orderId];
        address token = order.sellToken;
        address aToken = aTokens[token];

        // Withdraw full balance
        uint256 aTokenBalance = IERC20(aToken).balanceOf(address(this));
        if (aTokenBalance > 0) {
            IAaveLendingPool(aaveLendingPoolAddress).withdraw(
                token,
                type(uint256).max, // withdraw all
                address(this)
            );
        }
    }

    // Withdraw from Compound
    function _withdrawFromCompound(uint256 orderId) internal {
        LimitOrder storage order = limitOrders[orderId];
        address cToken = cTokens[order.sellToken];

        // Withdraw full balance
        uint256 cTokenBalance = IERC20(cToken).balanceOf(address(this));
        if (cTokenBalance > 0) {
            require(
                ICToken(cToken).redeem(cTokenBalance) == 0,
                "Compound withdrawal failed"
            );
        }
    }

    // Rebalance to highest yield protocol
    function _rebalanceToHighestYield(
        uint256 orderId,
        uint8 newProtocol
    ) internal {
        LimitOrder storage order = limitOrders[orderId];
        uint8 currentProtocol = order.lendingProtocol;

        // Withdraw from current protocol
        _withdrawFromLending(orderId);

        // Deposit to new protocol
        if (newProtocol == AAVE) {
            _depositToAave(orderId);
        } else if (newProtocol == COMPOUND) {
            _depositToCompound(orderId);
        }

        emit YieldRebalanced(
            orderId,
            currentProtocol,
            newProtocol,
            IERC20(order.sellToken).balanceOf(address(this))
        );
    }

    // Admin functions
    function setAaveEnabled(bool enabled) external onlyOwner {
        aaveEnabled = enabled;
    }

    function setCompoundEnabled(bool enabled) external onlyOwner {
        compoundEnabled = enabled;
    }

    function setAaveLendingPoolAddress(
        address _aaveLendingPoolAddress
    ) external onlyOwner {
        aaveLendingPoolAddress = _aaveLendingPoolAddress;
    }

    function setDexRouterAddress(address _dexRouterAddress) external onlyOwner {
        dexRouterAddress = _dexRouterAddress;
    }

    function setFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 1000, "Fee too high"); // Max 10%
        feePercentage = _feePercentage;
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid address");
        feeCollector = _feeCollector;
    }

    // Emergency withdraw all tokens from lending protocols
    function emergencyWithdraw(uint256 orderId) external onlyOwner {
        LimitOrder storage order = limitOrders[orderId];
        require(order.isActive, "Order not active");

        _withdrawFromLending(orderId);
    }
}
