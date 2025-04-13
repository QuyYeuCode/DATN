const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Get user notifications
router.get('/', authMiddleware.verifyToken, notificationController.getNotifications);

// Mark notification as read
router.put('/:id', authMiddleware.verifyToken, notificationController.markAsRead);

// Update notification settings
router.put('/settings', authMiddleware.verifyToken, notificationController.updateSettings);

module.exports = router;