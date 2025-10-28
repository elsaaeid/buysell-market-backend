// controllers/paymentController.js
const axios = require("axios");

const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID;
const PAYMOB_API_URL = process.env.PAYMOB_API_URL;

// 🔹 Step 1: Get Auth Token
async function getAuthToken() {
  const { data } = await axios.post(`${PAYMOB_API_URL}/auth/tokens`, {
    api_key: PAYMOB_API_KEY,
  });
  return data.token;
}

// 🔹 Step 2: Create Order
async function createOrder(authToken, amountCents, currency) {
  const { data } = await axios.post(`${PAYMOB_API_URL}/ecommerce/orders`, {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: amountCents,
    currency: currency || "EGP", // ✅ dynamic currency
    items: [],
  });
  return data.id;
}

// 🔹 Step 3: Create Payment Key
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
    currency: currency, // ✅ dynamic
    integration_id: PAYMOB_INTEGRATION_ID,
  });

  return data.token;
}

// 🔹 Step 4: Full Flow Controller
async function createPayment(req, res) {
  try {
    const { amount, customer, currency } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: "Amount is required" });
    }

    const amountCents = Math.round(amount * 100);
    const usedCurrency = currency || "EGP"; // ✅ default fallback

    const authToken = await getAuthToken();
    const orderId = await createOrder(authToken, amountCents, usedCurrency);
    const paymentKey = await createPaymentKey(authToken, orderId, amountCents, customer, usedCurrency);

    const iframeUrl = `https://accept.paymobsolutions.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;

    res.status(200).json({ success: true, iframeUrl });
  } catch (error) {
    console.error("❌ Error creating payment:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { createPayment };
