const express = require("express");
const router = express.Router();

const { createPayment } = require("../controllers/paymentController");
const { handlePaymobWebhook } = require("../controllers/webhookController");

// Create Payment
router.post("/create", createPayment);

// Paymob webhook (called by Paymob server)
router.post("/webhook", handlePaymobWebhook);

module.exports = router;
