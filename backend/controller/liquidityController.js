const LiquidityPosition = require("../models/position");
const Pool = require("../models/pool");
const TokenPrice = require("../models/tokenPrice");
const ethers = require("ethers");
const DexABI = require("../abis/Dex.json");
require("dotenv").config();
// Cấu hình kết nối blockchain
const provider = new ethers.JsonRpcProvider(process.env.INFURA_KEY);
const dexContract = new ethers.Contract(
  process.env.DEX_ADDRESS,
  DexABI,
  provider
);

// Lấy thông tin pool
exports.getPoolInfo = async (req, res) => {
  try {
    const { token0, token1, fee } = req.query;

    if (!token0 || !token1 || !fee) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin token hoặc fee",
      });
    }

    // Lấy thông tin pool từ database
    const pool = await Pool.findOne({
      token0: token0.toLowerCase(),
      token1: token1.toLowerCase(),
      fee: parseInt(fee),
    });

    if (!pool) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin pool",
      });
    }

    // Lấy giá token
    const token0Price = await TokenPrice.findOne({ tokenAddress: token0 });
    const token1Price = await TokenPrice.findOne({ tokenAddress: token1 });

    res.status(200).json({
      success: true,
      data: {
        ...pool.toObject(),
        token0Price: token0Price ? token0Price.price : 0,
        token1Price: token1Price ? token1Price.price : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching pool info:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin pool",
      error: error.message,
    });
  }
};

// Tính toán giá trị thanh khoản
exports.calculateLiquidity = async (req, res) => {
  try {
    const {
      token0,
      token1,
      fee,
      amount0Desired,
      amount1Desired,
      tickLower,
      tickUpper,
    } = req.body;

    if (
      !token0 ||
      !token1 ||
      !fee ||
      !amount0Desired ||
      !amount1Desired ||
      !tickLower ||
      !tickUpper
    ) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin cần thiết",
      });
    }

    // Trong thực tế, bạn sẽ gọi đến contract để tính toán giá trị thanh khoản
    // Ở đây chúng ta sẽ giả lập kết quả
    const liquidity = ethers.parseUnits("1000", 18).toString(); // Giả lập giá trị thanh khoản
    const amount0 = amount0Desired;
    const amount1 = amount1Desired;

    res.status(200).json({
      success: true,
      data: {
        liquidity,
        amount0,
        amount1,
      },
    });
  } catch (error) {
    console.error("Error calculating liquidity:", error);
    res.status(500).json({
      success: false,
      message: "Không thể tính toán giá trị thanh khoản",
      error: error.message,
    });
  }
};

// Lưu thông tin giao dịch thêm thanh khoản
exports.saveAddLiquidityTransaction = async (req, res) => {
  try {
    const {
      userAddress,
      tokenId,
      token0,
      token1,
      fee,
      tickLower,
      tickUpper,
      liquidity,
      amount0,
      amount1,
      txHash,
      status,
    } = req.body;

    // Validate dữ liệu đầu vào
    if (
      !userAddress ||
      !tokenId ||
      !token0 ||
      !token1 ||
      !fee ||
      !tickLower ||
      !tickUpper ||
      !liquidity ||
      !amount0 ||
      !amount1
    ) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin giao dịch",
      });
    }

    // Tạo bản ghi mới
    const liquidityPosition = new LiquidityPosition({
      userAddress,
      tokenId,
      token0,
      token1,
      fee,
      tickLower,
      tickUpper,
      liquidity,
      amount0,
      amount1,
      txHash,
      status: status || "PENDING",
    });

    await liquidityPosition.save();

    // Cập nhật thông tin pool nếu cần
    await updatePoolInfo(token0, token1, fee);

    res.status(201).json({
      success: true,
      data: liquidityPosition,
    });
  } catch (error) {
    console.error("Error saving add liquidity transaction:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lưu thông tin giao dịch",
      error: error.message,
    });
  }
};

// Lưu thông tin giao dịch rút thanh khoản
exports.saveRemoveLiquidityTransaction = async (req, res) => {
  try {
    const { tokenId, liquidity, amount0, amount1, txHash, status } = req.body;

    if (!tokenId || !liquidity) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin giao dịch",
      });
    }

    // Tìm vị trí thanh khoản
    const liquidityPosition = await LiquidityPosition.findOne({ tokenId });

    if (!liquidityPosition) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vị trí thanh khoản",
      });
    }

    // Cập nhật thông tin
    liquidityPosition.liquidity = (
      BigInt(liquidityPosition.liquidity) - BigInt(liquidity)
    ).toString();

    if (amount0) {
      liquidityPosition.amount0 = (
        BigInt(liquidityPosition.amount0) - BigInt(amount0)
      ).toString();
    }

    if (amount1) {
      liquidityPosition.amount1 = (
        BigInt(liquidityPosition.amount1) - BigInt(amount1)
      ).toString();
    }

    if (txHash) {
      liquidityPosition.txHash = txHash;
    }

    if (status) {
      liquidityPosition.status = status;
    }

    await liquidityPosition.save();

    // Cập nhật thông tin pool nếu cần
    await updatePoolInfo(
      liquidityPosition.token0,
      liquidityPosition.token1,
      liquidityPosition.fee
    );

    res.status(200).json({
      success: true,
      data: liquidityPosition,
    });
  } catch (error) {
    console.error("Error saving remove liquidity transaction:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lưu thông tin giao dịch",
      error: error.message,
    });
  }
};

// Lấy danh sách vị trí thanh khoản của người dùng
exports.getUserLiquidityPositions = async (req, res) => {
  try {
    const { userAddress } = req.params;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        message: "Thiếu địa chỉ người dùng",
      });
    }

    const positions = await LiquidityPosition.find({
      userAddress: userAddress.toLowerCase(),
      liquidity: { $gt: "0" }, // Chỉ lấy các vị trí còn thanh khoản
    }).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      data: positions,
    });
  } catch (error) {
    console.error("Error fetching user liquidity positions:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách vị trí thanh khoản",
      error: error.message,
    });
  }
};

// Cập nhật trạng thái giao dịch
exports.updateTransactionStatus = async (req, res) => {
  try {
    const { txHash } = req.params;
    const { status } = req.body;

    if (!txHash || !status) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin cần thiết",
      });
    }

    const liquidityPosition = await LiquidityPosition.findOneAndUpdate(
      { txHash },
      { status },
      { new: true }
    );

    if (!liquidityPosition) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giao dịch",
      });
    }

    res.status(200).json({
      success: true,
      data: liquidityPosition,
    });
  } catch (error) {
    console.error("Error updating transaction status:", error);
    res.status(500).json({
      success: false,
      message: "Không thể cập nhật trạng thái giao dịch",
      error: error.message,
    });
  }
};

// Hàm cập nhật thông tin pool
async function updatePoolInfo(token0, token1, fee) {
  try {
    // Trong thực tế, bạn sẽ lấy thông tin từ blockchain
    // Ở đây chúng ta sẽ giả lập việc cập nhật
    let pool = await Pool.findOne({
      token0: token0.toLowerCase(),
      token1: token1.toLowerCase(),
      fee: parseInt(fee),
    });

    if (!pool) {
      // Tạo pool mới nếu chưa tồn tại
      pool = new Pool({
        token0: token0.toLowerCase(),
        token1: token1.toLowerCase(),
        fee: parseInt(fee),
        tick: 0,
        sqrtPriceX96: "0",
        liquidity: "0",
      });
    }

    // Cập nhật thông tin pool từ blockchain
    // Trong thực tế, bạn sẽ gọi đến contract để lấy thông tin
    // Ở đây chúng ta sẽ giả lập
    pool.liquidity = (BigInt(pool.liquidity) + BigInt(1000)).toString();
    pool.tick = 0;
    pool.sqrtPriceX96 = "0";

    await pool.save();
  } catch (error) {
    console.error("Error updating pool info:", error);
  }
}
