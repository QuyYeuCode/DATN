const express = require('express');
const router = express.Router();
const liquidityController = require('../controllers/liquidity.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Add liquidity to a pool
router.post('/add', authMiddleware.verifyToken, liquidityController.addLiquidity);

// Remove liquidity from a pool
router.post('/remove', authMiddleware.verifyToken, liquidityController.removeLiquidity);

// Get user's liquidity positions
router.get('/positions', authMiddleware.verifyToken, liquidityController.getLiquidityPositions);

// Get available liquidity pools
router.get('/pools', liquidityController.getLiquidityPools);

module.exports = router;