const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  totalAmount: Number,
  originalAmount: { type: Number, default: null },
  couponDiscount: { type: Number, default: 0 },
  adminShare: Number,
  ownerShare: Number,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ownerMerchantId: String,
  orderId: String,
  customer: Object,
  currency: String,
  status: { type: String, default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
