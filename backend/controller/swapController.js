const Swap = require("../models/swap");
const TokenPrice = require("../models/tokenPrice");
const Token = require("../models/token");
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

// Lấy danh sách token
exports.getTokens = async (req, res) => {
  try {
    const tokens = await Token.find().select(
      "address symbol name decimals logoURI chainId"
    );
    res.status(200).json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error("Error fetching tokens:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách token",
      error: error.message,
    });
  }
};

// Lấy giá token
exports.getTokenPrice = async (req, res) => {
  try {
    const { tokenIn, tokenOut } = req.query;

    if (!tokenIn || !tokenOut) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin tokenIn hoặc tokenOut",
      });
    }

    // Lấy giá từ database
    const tokenInPrice = await TokenPrice.findOne({ tokenAddress: tokenIn });
    const tokenOutPrice = await TokenPrice.findOne({ tokenAddress: tokenOut });

    if (!tokenInPrice || !tokenOutPrice) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin giá token",
      });
    }

    // Tính tỷ giá giữa hai token
    const exchangeRate = tokenOutPrice.price / tokenInPrice.price;

    res.status(200).json({
      success: true,
      data: {
        price: exchangeRate,
        tokenInPrice: tokenInPrice.price,
        tokenOutPrice: tokenOutPrice.price,
        priceChange24h: tokenOutPrice.priceChange24h,
        lastUpdated: tokenOutPrice.lastUpdated,
      },
    });
  } catch (error) {
    console.error("Error fetching token price:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lấy giá token",
      error: error.message,
    });
  }
};

// Tính toán số lượng token đầu ra
exports.calculateAmountOut = async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn } = req.query;

    if (!tokenIn || !tokenOut || !amountIn) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin cần thiết",
      });
    }

    // Lấy giá từ database
    const tokenInPrice = await TokenPrice.findOne({ tokenAddress: tokenIn });
    const tokenOutPrice = await TokenPrice.findOne({ tokenAddress: tokenOut });

    if (!tokenInPrice || !tokenOutPrice) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin giá token",
      });
    }

    // Tính toán số lượng token đầu ra
    const exchangeRate = tokenOutPrice.price / tokenInPrice.price;
    const amountOut = parseFloat(amountIn) * exchangeRate;

    res.status(200).json({
      success: true,
      data: {
        amountOut: amountOut.toString(),
        exchangeRate,
      },
    });
  } catch (error) {
    console.error("Error calculating amount out:", error);
    res.status(500).json({
      success: false,
      message: "Không thể tính toán số lượng token đầu ra",
      error: error.message,
    });
  }
};

// Lấy báo giá swap
exports.getSwapQuote = async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, amountOut } = req.query;

    if (!tokenIn || !tokenOut || (!amountIn && !amountOut)) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin cần thiết",
      });
    }

    // Lấy giá từ database
    const tokenInPrice = await TokenPrice.findOne({ tokenAddress: tokenIn });
    const tokenOutPrice = await TokenPrice.findOne({ tokenAddress: tokenOut });

    if (!tokenInPrice || !tokenOutPrice) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin giá token",
      });
    }

    const exchangeRate = tokenOutPrice.price / tokenInPrice.price;
    let calculatedAmountIn = amountIn || "0";
    let calculatedAmountOut = amountOut || "0";

    // Tính toán giá trị còn thiếu
    if (amountIn && parseFloat(amountIn) > 0) {
      calculatedAmountOut = (parseFloat(amountIn) * exchangeRate).toString();
    } else if (amountOut && parseFloat(amountOut) > 0) {
      calculatedAmountIn = (parseFloat(amountOut) / exchangeRate).toString();
    }

    // Tính toán price impact (giả định)
    const priceImpact = parseFloat(calculatedAmountIn) > 1000 ? 0.5 : 0.1;

    res.status(200).json({
      success: true,
      data: {
        amountIn: calculatedAmountIn,
        amountOut: calculatedAmountOut,
        price: exchangeRate,
        priceImpact,
        route: [tokenIn, tokenOut], // Đơn giản hóa, trong thực tế có thể có nhiều token trung gian
      },
    });
  } catch (error) {
    console.error("Error getting swap quote:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lấy báo giá swap",
      error: error.message,
    });
  }
};

// Lưu thông tin giao dịch swap
exports.saveSwapTransaction = async (req, res) => {
  try {
    const {
      userAddress,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      amountOutMinimum,
      poolFee,
      txHash,
      status,
    } = req.body;

    // Validate dữ liệu đầu vào
    if (
      !userAddress ||
      !tokenIn ||
      !tokenOut ||
      !amountIn ||
      !amountOut ||
      !amountOutMinimum ||
      !poolFee
    ) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin giao dịch",
      });
    }

    // Tạo bản ghi mới
    const swap = new Swap({
      userAddress,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      amountOutMinimum,
      poolFee,
      txHash,
      status: status || "PENDING",
    });

    await swap.save();

    res.status(201).json({
      success: true,
      data: swap,
    });
  } catch (error) {
    console.error("Error saving swap transaction:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lưu thông tin giao dịch",
      error: error.message,
    });
  }
};

// Lấy lịch sử giao dịch swap của người dùng
exports.getUserSwapHistory = async (req, res) => {
  try {
    const { userAddress } = req.params;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        message: "Thiếu địa chỉ người dùng",
      });
    }

    const swaps = await Swap.find({ userAddress })
      .sort({ timestamp: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: swaps,
    });
  } catch (error) {
    console.error("Error fetching user swap history:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lấy lịch sử giao dịch",
      error: error.message,
    });
  }
};

// Cập nhật trạng thái giao dịch swap
exports.updateSwapStatus = async (req, res) => {
  try {
    const { txHash } = req.params;
    const { status } = req.body;

    if (!txHash || !status) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin cần thiết",
      });
    }

    const swap = await Swap.findOneAndUpdate(
      { txHash },
      { status },
      { new: true }
    );

    if (!swap) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giao dịch",
      });
    }

    res.status(200).json({
      success: true,
      data: swap,
    });
  } catch (error) {
    console.error("Error updating swap status:", error);
    res.status(500).json({
      success: false,
      message: "Không thể cập nhật trạng thái giao dịch",
      error: error.message,
    });
  }
};
