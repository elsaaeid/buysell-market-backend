// 🧩 models/pendingProductModel.js
const mongoose = require("mongoose");

const pendingProductSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  photo: {
    type: String,
    default: "https://i.ibb.co/4pDNDk1/avatar.png",
  },
  productType: {
    type: String,
    trim: true,
  },
  hasShow: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    trim: true,
  },
  name_ar: {
    type: String,
    trim: true,
  },
  currency: {
    type: String,
    trim: true,
    default: "USD",
  },
  sku: {
    type: [String],
    default: ["SKU"],
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  category_ar: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    trim: true,
  },
  discount: {
    type: Number,
    trim: true,
  },
  quantity: { type: Number, default: 1 },
  totalPrice: { type: Number, default: 0 },
  description: {
    type: String,
    trim: true,
  },
  description_ar: {
    type: String,
    trim: true,
  },
  images: {
    type: [Object], // Changed to an array of objects
    default: [],
    required: false,
  },
  itemColors: {
    type: [String],
    default: [],
  },
  model: {
    type: String,
    trim: true,
  },
  model_ar: {
    type: String,
    trim: true,
  },
  sizes: {
    type: [String],
    default: [],
  },
  verificationToken: String,
  expiresAt: Date,
}, { timestamps: true });

module.exports = mongoose.model("PendingProduct", pendingProductSchema);
