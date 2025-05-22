// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

/**
 * @title UniswapDEX
 * @dev Sàn DEX tích hợp với Uniswap V3, hỗ trợ swap token, add/remove liquidity và claim phí giao dịch
 */
contract UniswapDEX is Ownable, ReentrancyGuard, IERC721Receiver {
    // Uniswap V3 contracts
    ISwapRouter public immutable swapRouter;
    INonfungiblePositionManager public immutable nonfungiblePositionManager;
    IUniswapV3Factory public immutable uniswapFactory;

    // Phí của sàn (0.1%)
    uint24 public constant DEX_FEE = 100; // 0.1% = 0.001 = 100 / 100000
    uint24 public constant FEE_DENOMINATOR = 100000;

    // Mapping để lưu trữ thông tin về các vị trí thanh khoản
    struct LiquidityPosition {
        address owner;
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        uint256 tokensOwed0;
        uint256 tokensOwed1;
    }

    // Mapping từ tokenId đến thông tin vị trí
    mapping(uint256 => LiquidityPosition) public positions;

    // Mapping từ địa chỉ người dùng đến danh sách tokenId của họ
    mapping(address => uint256[]) public userPositions;

    // Phí tích lũy của sàn
    mapping(address => uint256) public dexFees;

    // Events
    event Swapped(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 dexFee
    );

    event LiquidityAdded(
        address indexed user,
        uint256 indexed tokenId,
        address token0,
        address token1,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    event LiquidityRemoved(
        address indexed user,
        uint256 indexed tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    event FeesCollected(
        address indexed user,
        uint256 indexed tokenId,
        uint256 amount0,
        uint256 amount1
    );

    event DexFeesWithdrawn(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    /**
     * @dev Khởi tạo contract với các địa chỉ của Uniswap V3
     * @param _swapRouter Địa chỉ của Uniswap V3 SwapRouter
     * @param _nonfungiblePositionManager Địa chỉ của Uniswap V3 NonfungiblePositionManager
     * @param _factory Địa chỉ của Uniswap V3 Factory
     */
    constructor(
        address _swapRouter,
        address _nonfungiblePositionManager,
        address _factory
    ) Ownable(msg.sender) {
        swapRouter = ISwapRouter(_swapRouter);
        nonfungiblePositionManager = INonfungiblePositionManager(
            _nonfungiblePositionManager
        );
        uniswapFactory = IUniswapV3Factory(_factory);
    }

    /**
     * @dev Thực hiện swap token
     * @param tokenIn Địa chỉ token đầu vào
     * @param tokenOut Địa chỉ token đầu ra
     * @param amountIn Số lượng token đầu vào
     * @param amountOutMinimum Số lượng token đầu ra tối thiểu (slippage protection)
     * @param poolFee Phí của pool (3000 = 0.3%, 500 = 0.05%, 10000 = 1%)
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 poolFee,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be greater than 0");

        // Tính phí của sàn (0.1%)
        uint256 dexFeeAmount = (amountIn * DEX_FEE) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - dexFeeAmount;

        // Chuyển token từ người dùng vào contract
        TransferHelper.safeTransferFrom(
            tokenIn,
            msg.sender,
            address(this),
            amountIn
        );

        // Approve cho SwapRouter
        TransferHelper.safeApprove(
            tokenIn,
            address(swapRouter),
            amountInAfterFee
        );

        // Thực hiện swap
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp + 15 minutes,
                amountIn: amountInAfterFee,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });

        amountOut = swapRouter.exactInputSingle(params);

        // Cập nhật phí của sàn
        dexFees[tokenIn] = dexFees[tokenIn] + (dexFeeAmount);

        emit Swapped(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            dexFeeAmount
        );

        return amountOut;
    }

    /**
     * @dev Thêm thanh khoản vào pool
     * @param token0 Địa chỉ token thứ nhất
     * @param token1 Địa chỉ token thứ hai
     * @param amount0Desired Số lượng token0 mong muốn
     * @param amount1Desired Số lượng token1 mong muốn
     * @param amount0Min Số lượng token0 tối thiểu (slippage protection)
     * @param amount1Min Số lượng token1 tối thiểu (slippage protection)
     * @param fee Phí của pool
     * @param tickLower Tick dưới của khoảng giá
     * @param tickUpper Tick trên của khoảng giá
     */
    function addLiquidity(
        address token0,
        address token1,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper
    )
        external
        nonReentrant
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        // Chuyển token từ người dùng vào contract
        TransferHelper.safeTransferFrom(
            token0,
            msg.sender,
            address(this),
            amount0Desired
        );
        TransferHelper.safeTransferFrom(
            token1,
            msg.sender,
            address(this),
            amount1Desired
        );

        // Approve cho PositionManager
        TransferHelper.safeApprove(
            token0,
            address(nonfungiblePositionManager),
            amount0Desired
        );
        TransferHelper.safeApprove(
            token1,
            address(nonfungiblePositionManager),
            amount1Desired
        );

        // Tạo vị trí thanh khoản mới
        INonfungiblePositionManager.MintParams
            memory params = INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: fee,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: amount0Min,
                amount1Min: amount1Min,
                recipient: address(this),
                deadline: block.timestamp + 15 minutes
            });

        (tokenId, liquidity, amount0, amount1) = nonfungiblePositionManager
            .mint(params);

        // Hoàn trả token thừa cho người dùng
        if (amount0 < amount0Desired) {
            TransferHelper.safeTransfer(
                token0,
                msg.sender,
                amount0Desired - amount0
            );
        }
        if (amount1 < amount1Desired) {
            TransferHelper.safeTransfer(
                token1,
                msg.sender,
                amount1Desired - amount1
            );
        }

        // Lưu thông tin vị trí
        positions[tokenId] = LiquidityPosition({
            owner: msg.sender,
            token0: token0,
            token1: token1,
            fee: fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidity: liquidity,
            tokensOwed0: 0,
            tokensOwed1: 0
        });

        // Thêm tokenId vào danh sách của người dùng
        userPositions[msg.sender].push(tokenId);

        emit LiquidityAdded(
            msg.sender,
            tokenId,
            token0,
            token1,
            liquidity,
            amount0,
            amount1
        );

        return (tokenId, liquidity, amount0, amount1);
    }

    /**
     * @dev Rút thanh khoản từ pool
     * @param tokenId ID của vị trí thanh khoản
     * @param liquidity Số lượng thanh khoản cần rút
     */
    function removeLiquidity(
        uint256 tokenId,
        uint128 liquidity
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        // Kiểm tra quyền sở hữu
        require(positions[tokenId].owner == msg.sender, "Not position owner");

        // Thu phí trước khi rút thanh khoản
        (uint256 fee0, uint256 fee1) = collectFees(tokenId);

        // Tạo tham số để rút thanh khoản
        INonfungiblePositionManager.DecreaseLiquidityParams
            memory params = INonfungiblePositionManager
                .DecreaseLiquidityParams({
                    tokenId: tokenId,
                    liquidity: liquidity,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: block.timestamp + 15 minutes
                });

        // Rút thanh khoản
        (amount0, amount1) = nonfungiblePositionManager.decreaseLiquidity(
            params
        );

        // Cập nhật thông tin vị trí
        positions[tokenId].liquidity -= liquidity;
        positions[tokenId].tokensOwed0 += amount0;
        positions[tokenId].tokensOwed1 += amount1;

        // Thu token đã rút
        INonfungiblePositionManager.CollectParams
            memory collectParams = INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        nonfungiblePositionManager.collect(collectParams);

        // Reset tokensOwed sau khi đã thu
        positions[tokenId].tokensOwed0 = 0;
        positions[tokenId].tokensOwed1 = 0;

        emit LiquidityRemoved(msg.sender, tokenId, liquidity, amount0, amount1);

        return (amount0, amount1);
    }

    /**
     * @dev Thu phí từ vị trí thanh khoản
     * @param tokenId ID của vị trí thanh khoản
     */
    function collectFees(
        uint256 tokenId
    ) public nonReentrant returns (uint256 amount0, uint256 amount1) {
        // Kiểm tra quyền sở hữu
        require(positions[tokenId].owner == msg.sender, "Not position owner");

        // Thu phí
        INonfungiblePositionManager.CollectParams
            memory params = INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        (amount0, amount1) = nonfungiblePositionManager.collect(params);

        emit FeesCollected(msg.sender, tokenId, amount0, amount1);

        return (amount0, amount1);
    }

    /**
     * @dev Lấy danh sách vị trí thanh khoản của người dùng
     * @param user Địa chỉ người dùng
     */
    function getUserPositions(
        address user
    ) external view returns (uint256[] memory) {
        return userPositions[user];
    }

    /**
     * @dev Lấy thông tin chi tiết về vị trí thanh khoản
     * @param tokenId ID của vị trí thanh khoản
     */
    function getPositionDetails(
        uint256 tokenId
    )
        external
        view
        returns (
            address owner,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity
        )
    {
        LiquidityPosition memory position = positions[tokenId];
        return (
            position.owner,
            position.token0,
            position.token1,
            position.fee,
            position.tickLower,
            position.tickUpper,
            position.liquidity
        );
    }

    /**
     * @dev Rút phí của sàn (chỉ owner)
     * @param token Địa chỉ token cần rút
     * @param amount Số lượng cần rút
     */
    function withdrawDexFees(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= dexFees[token], "Insufficient fee balance");

        dexFees[token] = dexFees[token] - (amount);
        TransferHelper.safeTransfer(token, msg.sender, amount);

        emit DexFeesWithdrawn(token, msg.sender, amount);
    }

    /**
     * @dev Hàm callback khi nhận NFT (cần thiết để nhận NFT từ NonfungiblePositionManager)
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        // Chỉ chấp nhận NFT từ NonfungiblePositionManager
        require(
            msg.sender == address(nonfungiblePositionManager),
            "Not from position manager"
        );

        return this.onERC721Received.selector;
    }
}
