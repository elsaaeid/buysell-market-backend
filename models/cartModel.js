const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Products",
    },
    name: { type: String },
    name_ar: { type: String, trim: true },
    selectedImage: { type: String, trim: true },
    selectedColor: { type: String, trim: true },
    selectedSize: { type: String, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    price: { type: Number, min: 0 },
    discount: { type: Number, min: 0 },
    category: { type: String, trim: true },
    category_ar: { type: String, trim: true },
    productType: { type: String, trim: true },
    totalPrice: { type: Number, default: 0 },
    currency: { type: String, default: "USD", trim: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    productOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    photo: {
      type: String,
      default: "https://i.ibb.co/4pDNDk1/avatar.png",
    },
    items: [cartItemSchema],
    totalAmount: { type: Number, default: 0 },
    coupon: {
      code: { type: String, trim: true },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      appliedAt: { type: Date },
    },
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
