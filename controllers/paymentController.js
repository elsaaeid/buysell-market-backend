const axios = require("axios");
const Payment = require("../models/paymentModel");
const User = require("../models/userModel"); // assuming each seller has a paymobMerchantId field

const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID;
const PAYMOB_API_URL = process.env.PAYMOB_API_URL;

// 1️⃣ Get Auth Token
async function getAuthToken() {
  const { data } = await axios.post(`${PAYMOB_API_URL}/auth/tokens`, {
    api_key: PAYMOB_API_KEY,
  });
  return data.token;
}

// 2️⃣ Create Order
async function createOrder(authToken, amountCents, currency) {
  const { data } = await axios.post(`${PAYMOB_API_URL}/ecommerce/orders`, {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: amountCents,
    currency: currency || "EGP",
    items: [],
  });
  return data.id;
}

// 3️⃣ Create Payment Key
async function createPaymentKey(authToken, orderId, amountCents, customer = {}, currency = "EGP") {
  const billingData = {
    first_name: customer.first_name || "Customer",
    last_name: customer.last_name || "User",
    phone_number: customer.phone_number || "01000000000",
    email: customer.email || "customer@example.com",
    apartment: "NA",
    floor: "NA",
    street: "NA",
    building: "NA",
    city: "NA",
    country: "EG",
  };

  const { data } = await axios.post(`${PAYMOB_API_URL}/acceptance/payment_keys`, {
    auth_token: authToken,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: orderId,
    billing_data: billingData,
    currency,
    integration_id: PAYMOB_INTEGRATION_ID,
  });

  return data.token;
}

// 4️⃣ Create Payment Controller
async function createPayment(req, res) {
  try {
    const { amount, customer, currency, productOwnerId } = req.body;

    if (!amount || !productOwnerId) {
      return res.status(400).json({ success: false, message: "Amount and productOwnerId are required" });
    }

    // Find the seller
    const seller = await User.findById(productOwnerId);
    if (!seller || !seller.paymobMerchantId) {
      return res.status(400).json({ success: false, message: "Product owner does not have a Paymob merchant account" });
    }

    const usedCurrency = currency || "EGP";

    // 💰 Calculate shares
    const adminShare = Number((amount * 0.2).toFixed(2));
    const ownerShare = Number((amount * 0.8).toFixed(2));

    const authToken = await getAuthToken();
    const orderId = await createOrder(authToken, Math.round(amount * 100), usedCurrency);
    const paymentKey = await createPaymentKey(authToken, orderId, Math.round(amount * 100), customer, usedCurrency);

    const iframeUrl = `https://accept.paymobsolutions.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;

    // Save in DB
    const paymentDoc = await Payment.create({
      totalAmount: amount,
      adminShare,
      ownerShare,
      customer,
      orderId,
      ownerId: productOwnerId,
      ownerMerchantId: seller.paymobMerchantId,
      currency: usedCurrency,
      status: "pending",
    });

    res.status(200).json({
      success: true,
      iframeUrl,
      adminShare,
      ownerShare,
      total: amount,
      currency: usedCurrency,
      paymentId: paymentDoc._id,
    });
  } catch (error) {
    console.error("❌ Error creating payment:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { createPayment };
