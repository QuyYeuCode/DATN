const TokenPrice = require("../models/tokenPrice");
const Token = require("../models/token");
const ethers = require("ethers");
const axios = require("axios");

// Lấy giá token từ API bên ngoài (ví dụ: CoinGecko)
async function fetchTokenPriceFromAPI(tokenAddress) {
  try {
    // Trong thực tế, bạn sẽ gọi API như CoinGecko hoặc CoinMarketCap
    // Đây chỉ là ví dụ
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddress}&vs_currencies=usd&include_24hr_change=true`
    );

    if (response.data && response.data[tokenAddress.toLowerCase()]) {
      const data = response.data[tokenAddress.toLowerCase()];
      return {
        price: data.usd,
        priceChange24h: data.usd_24h_change || 0,
      };
    }

    throw new Error("Không thể lấy giá token");
  } catch (error) {
    console.error("Error fetching token price from API:", error);
    // Trả về giá mặc định nếu không thể lấy từ API
    return {
      price: 1.0, // Giá mặc định
      priceChange24h: 0,
    };
  }
}

// Cập nhật giá token
exports.updateTokenPrice = async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const { price, priceChange24h } = req.body;

    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        message: "Thiếu địa chỉ token",
      });
    }

    // Kiểm tra token có tồn tại không
    const token = await Token.findOne({ address: tokenAddress });
    if (!token) {
      return res.status(404).json({
        success: false,
        message: "Token không tồn tại",
      });
    }

    // Cập nhật hoặc tạo mới giá token
    const tokenPrice = await TokenPrice.findOneAndUpdate(
      { tokenAddress },
      {
        price,
        priceChange24h,
        lastUpdated: Date.now(),
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: tokenPrice,
    });
  } catch (error) {
    console.error("Error updating token price:", error);
    res.status(500).json({
      success: false,
      message: "Không thể cập nhật giá token",
      error: error.message,
    });
  }
};

// Lấy giá của một token
exports.getTokenPrice = async (req, res) => {
  try {
    const { tokenAddress } = req.params;

    if (!tokenAddress) {
      return res.status(400).json({
        success: false,
        message: "Thiếu địa chỉ token",
      });
    }

    const tokenPrice = await TokenPrice.findOne({ tokenAddress });

    if (!tokenPrice) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin giá token",
      });
    }

    res.status(200).json({
      success: true,
      data: tokenPrice,
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

// Lấy giá của tất cả các token
exports.getAllTokenPrices = async (req, res) => {
  try {
    const tokenPrices = await TokenPrice.find();

    res.status(200).json({
      success: true,
      data: tokenPrices,
    });
  } catch (error) {
    console.error("Error fetching all token prices:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lấy giá của tất cả token",
      error: error.message,
    });
  }
};

// Hàm cập nhật giá token tự động
exports.updateAllTokenPrices = async () => {
  try {
    // Lấy danh sách tất cả token
    const tokens = await Token.find();

    for (const token of tokens) {
      try {
        // Lấy giá từ API bên ngoài
        const { price, priceChange24h } = await fetchTokenPriceFromAPI(
          token.address
        );

        // Cập nhật giá trong database
        await TokenPrice.findOneAndUpdate(
          { tokenAddress: token.address },
          {
            price,
            priceChange24h,
            lastUpdated: Date.now(),
          },
          { new: true, upsert: true }
        );

        console.log(`Đã cập nhật giá cho token ${token.symbol}: $${price}`);
      } catch (error) {
        console.error(`Lỗi khi cập nhật giá cho token ${token.symbol}:`, error);
      }
    }

    console.log("Đã cập nhật giá cho tất cả token");
  } catch (error) {
    console.error("Error updating all token prices:", error);
  }
};
