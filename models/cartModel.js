// models/cartModel.js
const mongoose = require("mongoose");

// ✅ Define cart item schema
const cartItemSchema = new mongoose.Schema(
  {
    _id: { // same as product _id
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Products",
    },
    name: { type: String },
    name_ar: { type: String, trim: true },
    image: {
      fileName: String,
      filePath: String,
      fileType: String,
      fileSize: String,
    },
    quantity: { type: Number, default: 1, min: 1 },
    price: { type: Number, min: 0 },
    discount: { type: Number, min: 0 },
    category: { type: String, trim: true },
    category_ar: { type: String, trim: true },
    productType: { type: String, trim: true },
    totalPrice: { type: Number, default: 0 },
    currency: {
    type: String,
    required: false,
    trim: true,
    default: "USD",
  },
  },
  { _id: false } // ✅ prevent new ObjectIds for subdocs
);

// ✅ Cart schema
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
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
