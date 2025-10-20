const mongoose = require("mongoose");

// Pending product Schema
const pendingProductSchema = new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "User",
    },
    photo: {
      type: String,
      required: [false, "Please add a photo"],
      default: "https://i.ibb.co/4pDNDk1/avatar.png",
    },
    productType: {
        type: String,
        required: [false, "Please add a product type"],
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
      required: [false, "Please add a name"],
      trim: true,
    },
    name_ar: { // Arabic name
      type: String,
      required: false,
      trim: true,
  },
  currency: {
    type: String,
    required: false,
    trim: true,
    default: "USD",
  },
    sku: {
        type: [String],
        required: false,
        default: "SKU",
        trim: true,
    },
    category: {
      type: String,
      required: false,
      trim: true,
    },
    category_ar: { // Arabic category
      type: String,
      required: false,
      trim: true,
  },
    price: {
      type: Number,
      required: false,
      trim: true,
  },
  discount: {
    type: Number,
    required: false,
    trim: true,
},
  quantity: { type: Number, default: 1 },
  totalPrice: { type: Number, default: 0 },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    description_ar: { // Arabic description
      type: String,
      required: false,
      trim: true,
    },
    image: {
      type: Object,
      default: {},
      required: false,
    },
    productSlideImages: {
      type: [Object], // Changed to an array of objects
      default: [],
      required: false,
    },
    itemColors: {
      type: [String],
    },
    model: {
      type: String,
      required: false,
      trim: true,
    },
    model_ar: {
      type: String,
      required: false,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    verificationToken: String,
    expiresAt: Date,
  });

  module.exports = mongoose.model("PendingProduct", pendingProductSchema);