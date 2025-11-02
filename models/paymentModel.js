const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  totalAmount: Number,
  adminShare: Number,
  ownerShare: Number,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ownerMerchantId: String,
  orderId: String,
  customer: Object,
  currency: String,
  status: { type: String, default: "pending" },
});

module.exports = mongoose.model("Payment", paymentSchema);
