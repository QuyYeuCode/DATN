const express = require("express");
const router = express.Router();
const protocolController = require("../controllers/protocolController");

// Lấy thông tin lãi suất các protocol
router.get("/rates", async (req, res) => {
  try {
    const rates = await protocolController.getLendingRates();

    res.json({
      success: true,
      data: rates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Lấy thông tin protocol tốt nhất cho token
router.get("/best/:tokenAddress", async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    const bestProtocol = await protocolController.getBestProtocol(tokenAddress);

    res.json({
      success: true,
      data: bestProtocol,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
