const express = require("express");
const router = express.Router();
const priceController = require("../controller/tokenPriceController.js");

// Lấy giá hiện tại của token
router.get("/:tokenAddress", async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const price = await priceController.getCurrentPrice(tokenAddress);

    res.json({
      success: true,
      data: {
        tokenAddress,
        price,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Lấy lịch sử giá
router.get("/:tokenAddress/history", async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const { period = "24h" } = req.query;

    const history = await priceController.getPriceHistory(tokenAddress, period);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Lấy danh sách token được hỗ trợ
router.get("/tokens/supported", async (req, res) => {
  try {
    const tokens = await priceController.getSupportedTokens();

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
