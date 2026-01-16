// routes/orderRoute.js
const express = require("express");
const { protect } = require("./authMiddleware");
const {
  createCODOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} = require("../controllers/orderController");

const router = express.Router();

// 🛡️ Admin-only routes (must come before dynamic routes)
router.get("/all", protect, getAllOrders);
router.patch("/:orderId/status", protect, updateOrderStatus);

// 🛡️ Protected user routes
router.post("/create-cod", protect, createCODOrder);
router.get("/my-orders", protect, getUserOrders);
router.get("/:orderId", protect, getOrderById);
router.patch("/:orderId/cancel", protect, cancelOrder);

module.exports = router;
