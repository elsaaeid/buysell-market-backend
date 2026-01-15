// controllers/cartController.js
const mongoose = require("mongoose");
const Cart = require("../models/cartModel");
const { Products } = require("../models/productsModel");

// ---------------------------------------------------------------------
// ADD TO CART
// ---------------------------------------------------------------------
const addToCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      id, // product _id
      quantity = 1,
      productType,
      name,
      name_ar,
      price,
      discount,
      selectedImage,
      selectedColor,
      selectedSize,
      category,
      category_ar,
      currency,
    } = req.body;

    if (!id || quantity == null) {
      return res
        .status(400)
        .json({ message: "Missing required fields: id or quantity" });
    }

    // ✅ Ensure the product exists
    const product = await Products.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ✅ Find or create the user's cart
    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId, items: [], totalAmount: 0 });

    const productObjectId = new mongoose.Types.ObjectId(id);

    // ✅ Check if same product with same variant exists
    const existingItem = cart.items.find(
      (i) =>
        String(i._id) === String(productObjectId) &&
        i.selectedColor === (selectedColor || "") &&
        i.selectedImage === (selectedImage || "") &&
        i.selectedSize === (selectedSize || "")
    );

    if (existingItem) {
      // 🧩 Update quantity & totalPrice
      existingItem.quantity += Number(quantity);
      existingItem.totalPrice = Number(existingItem.price) * existingItem.quantity;
      // 🧩 Ensure owner fields are set (for items added before this fix)
      if (!existingItem.ownerId && !existingItem.productOwnerId) {
        existingItem.ownerId = product.user || product.userId || null;
        existingItem.productOwnerId = product.user || product.userId || null;
      }
    } else {
      // 🧩 Add new item with variant support
      cart.items.push({
        _id: product._id,
        name: product.name || name,
        name_ar: product.name_ar || name_ar,
        category: product.category || category,
        category_ar: product.category_ar || category_ar,
        productType: product.productType || productType,
        price: Number(product.price ?? price ?? 0),
        discount: Number(product.discount ?? discount ?? 0),
        quantity: Number(quantity || 1),
        selectedImage: selectedImage || product.selectedImage || "",
        selectedColor: selectedColor || product.selectedColor || "",
        selectedSize: selectedSize || product.selectedSize || "",
        totalPrice:
          Number(product.price ?? price ?? 0) * Number(quantity || 1),
        currency: product.currency || currency || "USD",
        ownerId: product.user || product.userId || null,
        productOwnerId: product.user || product.userId || null,
      });
    }

    // ✅ Recalculate total cart amount
    cart.totalAmount = cart.items.reduce(
      (sum, it) => sum + Number(it.totalPrice || 0),
      0
    );

    await cart.save();

    return res.status(200).json({
      message: "Product added to cart",
      items: cart.items,
      cart,
    });
  } catch (error) {
    console.error("❌ Error adding to cart:", error);
    return res
      .status(500)
      .json({ message: "Error adding to cart", error: error.message });
  }
};

// ---------------------------------------------------------------------
// GET CART ITEMS
// ---------------------------------------------------------------------
const getCartItems = async (req, res) => {
  try {
    const userId = req.user?._id || req.params.userId;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const cart = await Cart.findOne({ userId }).populate("items._id").lean();
    if (!cart) return res.status(200).json({ items: [] });

    // console.log("🛒 Cart items raw:", cart.items.map(i => ({
    //   productId: i._id?._id,
    //   ownerId: i.ownerId,
    //   productOwnerId: i.productOwnerId,
    //   productUser: i._id?.user
    // })));

    const items = (cart.items || []).map((item) => {
      const product = item._id || {};
      return {
        _id: product._id || item._id,
        name: item.name || product.name || "",
        name_ar: item.name_ar || product.name_ar || "",
        selectedImage: item.selectedImage || product.selectedImage || "",
        selectedColor: item.selectedColor || product.selectedColor || "",
        selectedSize: item.selectedSize || product.selectedSize || "",
        category: item.category || product.category || "",
        category_ar: item.category_ar || product.category_ar || "",
        productType: item.productType || product.productType || "",
        price: Number(item.price ?? product.price ?? 0),
        discount: Number(item.discount ?? product.discount ?? 0),
        quantity: Number(item.quantity ?? 1),
        currency: item.currency || product.currency || "USD",
        ownerId: item.ownerId || product.user || product.userId || null,
        productOwnerId: item.productOwnerId || product.user || product.userId || null,
        totalPrice:
          Number(item.totalPrice) ||
          Number(item.price ?? product.price ?? 0) *
            Number(item.quantity ?? 1),
      };
    });

    return res.status(200).json({ items, cart });
  } catch (error) {
    console.error("❌ Error fetching cart items:", error);
    return res
      .status(500)
      .json({ message: "Error fetching cart items", error: error.message });
  }
};
// ---------------------------------------------------------------------
// REMOVE ITEM
// ---------------------------------------------------------------------
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter((i) => String(i._id) !== String(itemId));
    cart.totalAmount = cart.items.reduce(
      (sum, it) => sum + (Number(it.price) * Number(it.quantity)),
      0
    );

    await cart.save();
    return res.status(200).json({ message: "Item removed", items: cart.items, cart });
  } catch (error) {
    console.error("Error removing item:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------------------------------------------------------------
// CLEAR CART
// ---------------------------------------------------------------------
const clearCart = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    return res.status(200).json({ message: "Cart cleared", items: [], cart });
  } catch (error) {
    console.error("Error clearing cart:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------------------------------------------------------------
// INCREASE QUANTITY
// ---------------------------------------------------------------------
const increaseQuantity = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((i) => String(i._id) === String(itemId));
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.quantity += 1;
    item.totalPrice = item.price * item.quantity;
    cart.totalAmount = cart.items.reduce(
      (sum, it) => sum + (it.price * it.quantity),
      0
    );

    await cart.save();
    return res.status(200).json({ message: "Quantity increased", items: cart.items, cart });
  } catch (error) {
    console.error("Increase quantity error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------------------------------------------------------------
// UPDATE CART ITEM VARIANT (COLOR, SIZE, IMAGE)
const updateCartItemVariant = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { selectedColor, selectedSize, selectedImage } = req.body;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    const item = cart.items.find((i) => String(i._id) === String(itemId));
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.selectedColor = selectedColor;
    item.selectedSize = selectedSize;
    item.selectedImage = selectedImage;

    await cart.save();
    return res.status(200).json({ message: "Item variant updated", items: cart.items, cart });
  } catch (error) {
    console.error("Error updating cart item variant:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------------------------------------------------------------
// DECREASE QUANTITY
// ---------------------------------------------------------------------
const decreaseQuantity = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find((i) => String(i._id) === String(itemId));
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.quantity > 1) {
      item.quantity -= 1;
      item.totalPrice = item.price * item.quantity;
    } else {
      cart.items = cart.items.filter((i) => String(i._id) !== String(itemId));
    }

    cart.totalAmount = cart.items.reduce(
      (sum, it) => sum + (it.price * it.quantity),
      0
    );

    await cart.save();
    return res.status(200).json({ message: "Quantity decreased", items: cart.items, cart });
  } catch (error) {
    console.error("Decrease quantity error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ---------------------------------------------------------------------
module.exports = {
  addToCart,
  getCartItems,
  removeFromCart,
  clearCart,
  increaseQuantity,
  decreaseQuantity,
  updateCartItemVariant,
};