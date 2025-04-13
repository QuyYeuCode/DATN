const express = require('express');
const router = express.Router();
const limitOrderController = require('../controllers/limitOrder.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Create a new limit order
router.post('/create', authMiddleware.verifyToken, limitOrderController.createLimitOrder);

// Get active limit orders for user
router.get('/active', authMiddleware.verifyToken, limitOrderController.getActiveLimitOrders);

// Get details of a specific limit order
router.get('/:id', authMiddleware.verifyToken, limitOrderController.getLimitOrderDetails);

// Cancel a limit order
router.delete('/:id', authMiddleware.verifyToken, limitOrderController.cancelLimitOrder);

// Get limit order history
router.get('/history', authMiddleware.verifyToken, limitOrderController.getLimitOrderHistory);

module.exports = router;