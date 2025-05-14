// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

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
            uint256 liquidityIndex,
            uint256 currentLiquidityRate,
            uint256 variableBorrowIndex,
            uint256 currentVariableBorrowRate,
            uint256 currentStableBorrowRate,
            uint40 lastUpdateTimestamp,
            address aTokenAddress,
            address stableDebtTokenAddress,
            address variableDebtTokenAddress,
            uint8 interestRateStrategyAddress,
            uint8 id
        );
}

// Interface cho Compound lending pool
interface ICompoundCToken {
    function mint(uint mintAmount) external returns (uint);

    function redeem(uint redeemTokens) external returns (uint);

    function redeemUnderlying(uint redeemAmount) external returns (uint);

    function exchangeRateStored() external view returns (uint);

    function supplyRatePerBlock() external view returns (uint);

    function balanceOf(address owner) external view returns (uint);

    function underlying() external view returns (address);
}

// Interface cho chainlink oracle
interface IAggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

// Smart contract chính cho Limit Order kèm Yield
contract LimitOrderWithYield {
    enum LendingProtocol {
        NONE,
        AAVE,
        COMPOUND
    }
    enum OrderStatus {
        PENDING,
        EXECUTED,
        CANCELLED
    }

    struct LimitOrder {
        uint256 id;
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 targetPrice; // Giá mong muốn (tokenOut/tokenIn) * 10^18
        uint256 createdAt;
        OrderStatus status;
        uint256 depositedAmount; // Số tiền gốc đã gửi
        uint256 accruedInterest; // Lãi suất tích lũy
        LendingProtocol currentProtocol; // Protocol đang sử dụng
        address protocolTokenAddress; // Địa chỉ của aToken hoặc cToken
    }

    struct ProtocolInfo {
        address lendingPool;
        bool isActive;
    }

    // Mapping cho các lending protocol được hỗ trợ
    mapping(LendingProtocol => ProtocolInfo) public supportedProtocols;

    // Mapping cho các token oracle
    mapping(address => address) public priceOracles;

    // Danh sách các limit order
    LimitOrder[] public limitOrders;

    // Mapping order của mỗi user
    mapping(address => uint256[]) public userOrders;

    // Uniswap V3 Router
    ISwapRouter public uniswapRouter;

    // USDC token address
    address public usdcAddress;

    // Events
    event OrderCreated(
        uint256 indexed orderId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 targetPrice
    );
    event OrderExecuted(
        uint256 indexed orderId,
        address indexed user,
        address tokenOut,
        uint256 amountOut,
        uint256 interest
    );
    event OrderCancelled(
        uint256 indexed orderId,
        address indexed user,
        uint256 returnedAmount,
        uint256 interest
    );
    event ProtocolChanged(
        uint256 indexed orderId,
        LendingProtocol oldProtocol,
        LendingProtocol newProtocol,
        uint256 interestEarned
    );
    event InterestAccrued(
        uint256 indexed orderId,
        uint256 additionalInterest,
        uint256 totalInterest
    );

    constructor(address _uniswapRouter, address _usdcAddress) {
        uniswapRouter = ISwapRouter(_uniswapRouter);
        usdcAddress = _usdcAddress;
    }

    // Thêm một lending protocol mới
    function addLendingProtocol(
        LendingProtocol protocol,
        address poolAddress
    ) external {
        supportedProtocols[protocol] = ProtocolInfo({
            lendingPool: poolAddress,
            isActive: true
        });
    }

    // Cập nhật oracle cho token
    function setTokenOracle(address token, address oracle) external {
        priceOracles[token] = oracle;
    }

    // Lấy giá hiện tại từ oracle
    function getCurrentPrice(
        address tokenIn,
        address tokenOut
    ) public view returns (uint256) {
        address oracle = priceOracles[tokenOut];
        require(oracle != address(0), "Oracle not set for token");

        (, int256 price, , , ) = IAggregatorV3Interface(oracle)
            .latestRoundData();
        require(price > 0, "Invalid price from oracle");

        return uint256(price);
    }

    // Tính toán lãi suất hiện tại
    function calculateCurrentInterest(
        LimitOrder memory order
    ) internal view returns (uint256) {
        if (order.currentProtocol == LendingProtocol.NONE) {
            return 0;
        }

        uint256 interest = 0;

        if (order.currentProtocol == LendingProtocol.AAVE) {
            // Tính lãi suất Aave
            address aToken = order.protocolTokenAddress;
            uint256 aTokenBalance = IERC20(aToken).balanceOf(address(this));
            interest = aTokenBalance - order.depositedAmount;
        } else if (order.currentProtocol == LendingProtocol.COMPOUND) {
            // Tính lãi suất Compound
            ICompoundCToken cToken = ICompoundCToken(
                order.protocolTokenAddress
            );
            uint256 exchangeRate = cToken.exchangeRateStored();
            uint256 cTokenBalance = cToken.balanceOf(address(this));
            uint256 underlyingBalance = (cTokenBalance * exchangeRate) / 1e18;
            interest = underlyingBalance - order.depositedAmount;
        }

        return interest;
    }

    // Tìm protocol có lãi suất cao nhất
    function findBestLendingProtocol(
        address asset
    ) internal view returns (LendingProtocol, uint256, address) {
        LendingProtocol bestProtocol = LendingProtocol.NONE;
        uint256 highestRate = 0;
        address protocolToken;

        // Kiểm tra Aave
        if (supportedProtocols[LendingProtocol.AAVE].isActive) {
            IAaveLendingPool aavePool = IAaveLendingPool(
                supportedProtocols[LendingProtocol.AAVE].lendingPool
            );
            (
                ,
                uint256 currentLiquidityRate,
                ,
                ,
                ,
                ,
                address aTokenAddress,
                ,
                ,
                ,

            ) = aavePool.getReserveData(asset);

            if (currentLiquidityRate > highestRate) {
                highestRate = currentLiquidityRate;
                bestProtocol = LendingProtocol.AAVE;
                protocolToken = aTokenAddress;
            }
        }

        // Kiểm tra Compound
        if (supportedProtocols[LendingProtocol.COMPOUND].isActive) {
            ICompoundCToken cToken = ICompoundCToken(
                supportedProtocols[LendingProtocol.COMPOUND].lendingPool
            );
            uint256 compoundRate = cToken.supplyRatePerBlock() *
                4 *
                60 *
                24 *
                365; // Annualized rate

            if (compoundRate > highestRate) {
                highestRate = compoundRate;
                bestProtocol = LendingProtocol.COMPOUND;
                protocolToken = address(cToken);
            }
        }

        return (bestProtocol, highestRate, protocolToken);
    }

    // Gửi tiền vào lending protocol
    function depositToLendingProtocol(LimitOrder storage order) internal {
        (
            LendingProtocol bestProtocol,
            ,
            address protocolToken
        ) = findBestLendingProtocol(order.tokenIn);

        require(
            bestProtocol != LendingProtocol.NONE,
            "No active lending protocol"
        );

        // Chuyển tiền từ contract vào lending pool
        IERC20 tokenIn = IERC20(order.tokenIn);

        if (bestProtocol == LendingProtocol.AAVE) {
            IAaveLendingPool aavePool = IAaveLendingPool(
                supportedProtocols[LendingProtocol.AAVE].lendingPool
            );

            // Approve trước khi gửi
            tokenIn.approve(address(aavePool), order.amountIn);

            // Gửi tiền vào Aave
            aavePool.deposit(order.tokenIn, order.amountIn, address(this), 0);

            order.currentProtocol = LendingProtocol.AAVE;
            order.protocolTokenAddress = protocolToken;
        } else if (bestProtocol == LendingProtocol.COMPOUND) {
            ICompoundCToken cToken = ICompoundCToken(protocolToken);

            // Approve trước khi gửi
            tokenIn.approve(address(cToken), order.amountIn);

            // Gửi tiền vào Compound
            cToken.mint(order.amountIn);

            order.currentProtocol = LendingProtocol.COMPOUND;
            order.protocolTokenAddress = protocolToken;
        }
    }

    // Rút tiền từ lending protocol
    function withdrawFromLendingProtocol(
        LimitOrder storage order
    ) internal returns (uint256 totalAmount) {
        uint256 interest = calculateCurrentInterest(order);
        totalAmount = order.depositedAmount + interest;

        if (order.currentProtocol == LendingProtocol.AAVE) {
            IAaveLendingPool aavePool = IAaveLendingPool(
                supportedProtocols[LendingProtocol.AAVE].lendingPool
            );
            aavePool.withdraw(order.tokenIn, totalAmount, address(this));
        } else if (order.currentProtocol == LendingProtocol.COMPOUND) {
            ICompoundCToken cToken = ICompoundCToken(
                order.protocolTokenAddress
            );
            cToken.redeemUnderlying(totalAmount);
        }

        order.accruedInterest += interest;
        order.currentProtocol = LendingProtocol.NONE;
        return totalAmount;
    }

    // Tạo limit order mới
    function createLimitOrder(
        address tokenOut,
        uint256 amountIn,
        uint256 targetPrice
    ) external returns (uint256) {
        require(amountIn > 0, "Amount must be greater than 0");
        require(targetPrice > 0, "Target price must be greater than 0");
        require(tokenOut != address(0), "Invalid token out address");

        // Chuyển USDC từ user vào contract
        IERC20 usdc = IERC20(usdcAddress);
        require(
            usdc.transferFrom(msg.sender, address(this), amountIn),
            "Transfer failed"
        );

        // Tạo order mới
        uint256 orderId = limitOrders.length;

        LimitOrder memory newOrder = LimitOrder({
            id: orderId,
            user: msg.sender,
            tokenIn: usdcAddress,
            tokenOut: tokenOut,
            amountIn: amountIn,
            targetPrice: targetPrice,
            createdAt: block.timestamp,
            status: OrderStatus.PENDING,
            depositedAmount: amountIn,
            accruedInterest: 0,
            currentProtocol: LendingProtocol.NONE,
            protocolTokenAddress: address(0)
        });

        limitOrders.push(newOrder);
        userOrders[msg.sender].push(orderId);

        // Gửi tiền vào lending protocol có lãi suất cao nhất
        depositToLendingProtocol(limitOrders[orderId]);

        emit OrderCreated(
            orderId,
            msg.sender,
            usdcAddress,
            tokenOut,
            amountIn,
            targetPrice
        );

        return orderId;
    }

    // Hủy limit order
    function cancelOrder(uint256 orderId) external {
        require(orderId < limitOrders.length, "Order does not exist");
        LimitOrder storage order = limitOrders[orderId];

        require(order.user == msg.sender, "Not order owner");
        require(order.status == OrderStatus.PENDING, "Order is not pending");

        // Rút tiền từ lending protocol
        uint256 totalAmount = withdrawFromLendingProtocol(order);

        // Chuyển tiền về cho user
        IERC20(order.tokenIn).transfer(msg.sender, totalAmount);

        // Cập nhật trạng thái order
        order.status = OrderStatus.CANCELLED;

        emit OrderCancelled(
            orderId,
            msg.sender,
            order.depositedAmount,
            order.accruedInterest
        );
    }

    // Kiểm tra và cập nhật lending protocol nếu có lãi suất tốt hơn
    function checkAndUpdateLendingProtocol(uint256 orderId) public {
        require(orderId < limitOrders.length, "Order does not exist");
        LimitOrder storage order = limitOrders[orderId];

        require(order.status == OrderStatus.PENDING, "Order is not pending");

        (
            LendingProtocol bestProtocol,
            ,
            address protocolToken
        ) = findBestLendingProtocol(order.tokenIn);

        if (
            bestProtocol != order.currentProtocol &&
            bestProtocol != LendingProtocol.NONE
        ) {
            // Rút tiền từ protocol hiện tại
            uint256 totalAmount = withdrawFromLendingProtocol(order);
            LendingProtocol oldProtocol = order.currentProtocol;

            // Cập nhật số tiền gốc (bao gồm cả lãi)
            order.depositedAmount = totalAmount;

            // Gửi vào protocol mới
            order.currentProtocol = bestProtocol;
            order.protocolTokenAddress = protocolToken;

            if (bestProtocol == LendingProtocol.AAVE) {
                IAaveLendingPool aavePool = IAaveLendingPool(
                    supportedProtocols[LendingProtocol.AAVE].lendingPool
                );
                IERC20(order.tokenIn).approve(address(aavePool), totalAmount);
                aavePool.deposit(order.tokenIn, totalAmount, address(this), 0);
            } else if (bestProtocol == LendingProtocol.COMPOUND) {
                ICompoundCToken cToken = ICompoundCToken(protocolToken);
                IERC20(order.tokenIn).approve(address(cToken), totalAmount);
                cToken.mint(totalAmount);
            }

            emit ProtocolChanged(
                orderId,
                oldProtocol,
                bestProtocol,
                order.accruedInterest
            );
        }
    }

    // Thực hiện swap khi đạt giá mong muốn
    function executeOrder(uint256 orderId) external {
        require(orderId < limitOrders.length, "Order does not exist");
        LimitOrder storage order = limitOrders[orderId];

        require(order.status == OrderStatus.PENDING, "Order is not pending");

        // Kiểm tra giá hiện tại
        uint256 currentPrice = getCurrentPrice(order.tokenIn, order.tokenOut);
        require(currentPrice >= order.targetPrice, "Target price not reached");

        // Rút tiền từ lending protocol
        uint256 totalAmount = withdrawFromLendingProtocol(order);

        // Swap trên Uniswap V3
        IERC20(order.tokenIn).approve(address(uniswapRouter), totalAmount);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: order.tokenIn,
                tokenOut: order.tokenOut,
                fee: 3000, // 0.3%
                recipient: address(this),
                deadline: block.timestamp + 15 minutes,
                amountIn: totalAmount,
                amountOutMinimum: 0, // Có thể thêm slippage protection
                sqrtPriceLimitX96: 0
            });

        uint256 amountOut = uniswapRouter.exactInputSingle(params);

        // Chuyển token mua được cho user
        IERC20(order.tokenOut).transfer(order.user, amountOut);

        // Cập nhật trạng thái order
        order.status = OrderStatus.EXECUTED;

        emit OrderExecuted(
            orderId,
            order.user,
            order.tokenOut,
            amountOut,
            order.accruedInterest
        );
    }

    // Kiểm tra nhiều order đồng thời với oracle
    function checkAndExecuteOrders() external {
        for (uint256 i = 0; i < limitOrders.length; i++) {
            LimitOrder storage order = limitOrders[i];

            if (order.status != OrderStatus.PENDING) continue;

            // Kiểm tra và cập nhật lending protocol nếu cần
            checkAndUpdateLendingProtocol(i);

            // Kiểm tra giá
            uint256 currentPrice = getCurrentPrice(
                order.tokenIn,
                order.tokenOut
            );

            if (currentPrice >= order.targetPrice) {
                // Thực hiện order nếu đạt điều kiện giá
                this.executeOrder(i);
            }
        }
    }

    // Lấy danh sách order của user
    function getUserOrders(
        address user
    ) external view returns (uint256[] memory) {
        return userOrders[user];
    }

    // Lấy thông tin chi tiết về order
    function getOrderDetails(
        uint256 orderId
    )
        external
        view
        returns (
            address user,
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 targetPrice,
            uint256 createdAt,
            OrderStatus status,
            uint256 depositedAmount,
            uint256 currentInterest,
            LendingProtocol protocol
        )
    {
        require(orderId < limitOrders.length, "Order does not exist");
        LimitOrder storage order = limitOrders[orderId];

        uint256 interest = order.accruedInterest;
        if (order.status == OrderStatus.PENDING) {
            interest += calculateCurrentInterest(order);
        }

        return (
            order.user,
            order.tokenIn,
            order.tokenOut,
            order.amountIn,
            order.targetPrice,
            order.createdAt,
            order.status,
            order.depositedAmount,
            interest,
            order.currentProtocol
        );
    }

    // Rút toàn bộ phí (nếu có) - chỉ owner mới thực hiện được
    // function withdrawFees(address token, uint256 amount) external {
    //     IERC20(token).transfer(owner(), amount);
    // }
}
