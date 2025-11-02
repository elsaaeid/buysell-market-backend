const express = require("express");
const router = express.Router();

const { protect } = require("./authMiddleware");
const {
  addToCart,
  removeFromCart,
  getCartItems,
  clearCart,
  increaseQuantity,
  decreaseQuantity,
  updateCartItemVariant,
} = require("../controllers/cartController");

// Route to add an item to the cart
router.post("/", protect, addToCart);

// Route to get all cart items
router.get("/cartItems/:userId", protect, getCartItems);

// Route to increase an item quantity of the cart
router.patch("/increase/:itemId", protect, increaseQuantity);

// Route to decrease an item quantity of the cart
router.patch("/decrease/:itemId", protect, decreaseQuantity);

// Route to remove an item from the cart
router.delete("/removeFromCart/:itemId", protect, removeFromCart); // Added a slash before :itemId

// Route to clear the cart
router.delete("/clearCart", protect, clearCart);

// 🛒 PATCH: Update color, size, or image of a specific cart item
router.patch("/updateVariant/:itemId", protect, updateCartItemVariant);


module.exports = router;