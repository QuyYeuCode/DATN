const express = require("express");
const orderRoutes = require("./orders");
const priceRoutes = require("./prices");
const protocolRoutes = require("./protocols");
const router = express.Router();

// Import controllers
const swapController = require("../controller/swapController");
const tokenPriceController = require("../controller/tokenPriceController");
const liquidityController = require("../controller/liquidityController");

// Swap routes
router.get("/tokens", swapController.getTokens);
router.get("/price", swapController.getTokenPrice);
router.get("/calculate-amount-out", swapController.calculateAmountOut);
router.get("/swap-quote", swapController.getSwapQuote);
router.post("/swap", swapController.saveSwapTransaction);
router.get("/swap-history/:userAddress", swapController.getUserSwapHistory);
router.put("/swap/:txHash", swapController.updateSwapStatus);

// Token price routes
router.get("/token-price/:tokenAddress", tokenPriceController.getTokenPrice);
router.get("/token-prices", tokenPriceController.getAllTokenPrices);
router.put("/token-price/:tokenAddress", tokenPriceController.updateTokenPrice);

// Liquidity routes
router.get("/pool-info", liquidityController.getPoolInfo);
router.post("/calculate-liquidity", liquidityController.calculateLiquidity);
router.post("/add-liquidity", liquidityController.saveAddLiquidityTransaction);
router.post(
  "/remove-liquidity",
  liquidityController.saveRemoveLiquidityTransaction
);
router.get(
  "/liquidity-positions/:userAddress",
  liquidityController.getUserLiquidityPositions
);
router.put("/liquidity/:txHash", liquidityController.updateTransactionStatus);

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "DEX API is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use("/orders", orderRoutes);
router.use("/prices", priceRoutes);
router.use("/protocols", protocolRoutes);

module.exports = router;
