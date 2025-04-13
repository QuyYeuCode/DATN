const express = require('express');
const router = express.Router();
const swapController = require('../controllers/swap.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Get quote for token swap
router.get('/quote', swapController.getQuote);

// Execute a token swap
router.post('/execute', authMiddleware.verifyToken, swapController.executeSwap);

// Get swap history for user
router.get('/history', authMiddleware.verifyToken, swapController.getSwapHistory);

module.exports = router;