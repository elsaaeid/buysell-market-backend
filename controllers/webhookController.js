// controllers/webhookController.js
const axios = require("axios");
const Payment = require("../models/paymentModel");

const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const PAYMOB_PAYOUT_URL = process.env.PAYMOB_PAYOUT_URL; // e.g. https://payout.paymob.com/api/v1/disbursements

const handlePaymobWebhook = async (req, res) => {
  try {
    const data = req.body.obj;

    if (data.success) {
      const orderId = data.order.id;

      // Find our local record
      const payment = await Payment.findOne({ orderId });
      if (!payment) return res.sendStatus(404);

      // Mark payment completed
      payment.status = "paid";
      await payment.save();

      // 🧾 Send 80% to product owner (disbursement)
      await axios.post(
        `${PAYMOB_PAYOUT_URL}`,
        {
          merchant_id: payment.ownerMerchantId,
          amount_cents: Math.round(payment.ownerShare * 100),
          currency: payment.currency,
          description: `Payout for order ${payment._id}`,
        },
        {
          headers: {
            Authorization: `Token ${PAYMOB_API_KEY}`,
          },
        }
      );

      // Admin keeps 20% in main account (no payout needed)
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Webhook handling error:", error.message);
    res.sendStatus(500);
  }
};

module.exports = { handlePaymobWebhook };