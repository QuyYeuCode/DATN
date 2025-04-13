const express = require('express');
const router = express.Router();
const yieldController = require('../controllers/yield.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Get available yield strategies
router.get('/strategies', yieldController.getStrategies);

// Deposit tokens into yield optimizer
router.post('/deposit', authMiddleware.verifyToken, yieldController.deposit);

// Withdraw tokens from yield optimizer
router.post('/withdraw', authMiddleware.verifyToken, yieldController.withdraw);

// Get user's yield positions
router.get('/positions', authMiddleware.verifyToken, yieldController.getPositions);

// Get current APY for different protocols
router.get('/apy', yieldController.getApy);

module.exports = router;