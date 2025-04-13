const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Get portfolio value and performance
router.get('/portfolio', authMiddleware.verifyToken, analyticsController.getPortfolio);

// Get platform trading volume
router.get('/volume', analyticsController.getVolume);

// Get total value locked in platform
router.get('/tvl', analyticsController.getTvl);

// Get fee earnings for user (if providing liquidity)
router.get('/fees', authMiddleware.verifyToken, analyticsController.getFees);

module.exports = router;