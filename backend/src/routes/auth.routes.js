const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Register a new user
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
  ],
  authController.register
);

// Login with email/password
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').exists().withMessage('Password is required')
  ],
  authController.login
);

// Connect a wallet address to user account
router.post(
  '/connect-wallet',
  authMiddleware.verifyToken,
  [
    body('address').isEthereumAddress().withMessage('Please enter a valid Ethereum address'),
    body('chain_id').isNumeric().withMessage('Chain ID must be a number')
  ],
  authController.connectWallet
);

// Get current user information
router.get('/user', authMiddleware.verifyToken, authController.getUser);

// Update user information
router.put('/user', authMiddleware.verifyToken, authController.updateUser);

module.exports = router;