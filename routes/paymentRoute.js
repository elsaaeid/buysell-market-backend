const express = require("express");
const router = express.Router();

const { createPayment } = require("../controllers/paymentController");
const { handlePaymobWebhook } = require("../controllers/webhookController");
const { protect } = require("./authMiddleware");

// Create Payment (requires authentication)
router.post("/create", protect, createPayment);

// Paymob webhook (called by Paymob server)
router.post("/webhook", handlePaymobWebhook);

module.exports = router;
