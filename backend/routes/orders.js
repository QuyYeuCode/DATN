// routes/orders.js
const express = require("express");
const router = express.Router();
const orderController = require("../controller/orderController.js");
const { validateOrder, validateAddress } = require("../middleware/auth.js");
const { rateLimiter } = require("../middleware/rateLimit.js");

// Middleware cho rate limiting
router.use(rateLimiter);

// Routes cho Order management

// Tạo order mới
router.post("/create", async (req, res) => {
  await orderController.createOrder(req, res);
});

// Hủy order
router.post("/cancel", async (req, res) => {
  await orderController.cancelOrder(req, res);
});

// Lấy danh sách order của user
router.get("/user/:userAddress", async (req, res) => {
  await orderController.getUserOrders(req, res);
});

// Lấy chi tiết order
router.get("/:orderId", async (req, res) => {
  await orderController.getOrderDetails(req, res);
});

// Lấy tất cả pending orders (cho monitoring)
router.get("/admin/pending", async (req, res) => {
  await orderController.getPendingOrders(req, res);
});

// Thống kê
router.get("/stats/overview", async (req, res) => {
  await orderController.getOrderStats(req, res);
});

module.exports = router;
