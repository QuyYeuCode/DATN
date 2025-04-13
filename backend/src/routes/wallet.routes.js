const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Get token balances for connected wallet
router.get('/balance', authMiddleware.verifyToken, walletController.getBalance);

// Get list of tokens with prices
router.get('/tokens', walletController.getTokens);

// Get token allowances for UniYield contracts
router.get('/allowances', authMiddleware.verifyToken, walletController.getAllowances);

module.exports = router;