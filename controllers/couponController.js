const Cart = require("../models/cartModel");
const Coupon = require("../models/couponModel");

// ✅ Create Coupon (Admin only)
const createCoupon = async (req, res) => {
  try {
    const { code, discount, description, expiresAt, usageLimit, minPurchaseAmount } = req.body;

    if (!code || !discount) {
      return res.status(400).json({ success: false, message: "Code and discount are required" });
    }

    // Check if coupon already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ success: false, message: "Coupon code already exists" });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discount,
      description,
      expiresAt,
      usageLimit,
      minPurchaseAmount,
      createdBy: req.user?._id,
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon,
    });
  } catch (error) {
    console.error("❌ Error creating coupon:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 📋 Get All Coupons (Admin only)
const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: coupons.length,
      coupons,
    });
  } catch (error) {
    console.error("❌ Error fetching coupons:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 🔍 Get Single Coupon
const getCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    return res.status(200).json({
      success: true,
      coupon,
    });
  } catch (error) {
    console.error("❌ Error fetching coupon:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ✏️ Update Coupon (Admin only)
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If code is being updated, check for duplicates
    if (updates.code) {
      const existing = await Coupon.findOne({ 
        code: updates.code.toUpperCase(),
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: "Coupon code already exists" });
      }
      updates.code = updates.code.toUpperCase();
    }

    const coupon = await Coupon.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      coupon,
    });
  } catch (error) {
    console.error("❌ Error updating coupon:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 🗑️ Delete Coupon (Admin only)
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting coupon:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Apply Coupon
const applyCoupon = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { couponCode } = req.body;

    if (!couponCode || couponCode.trim() === "") {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    // ✅ Find coupon from database
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon) {
      return res.status(400).json({ success: false, message: "Invalid coupon code" });
    }

    // ✅ Check if coupon is valid
    const validation = coupon.isValid();
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    // ✅ If user is not logged in, just return coupon validation (for frontend use)
    if (!userId) {
      return res.status(200).json({
        success: true,
        message: `Coupon ${coupon.code} is valid!`,
        discount: coupon.discount,
        coupon: {
          code: coupon.code,
          discountPercent: coupon.discount,
          minPurchaseAmount: coupon.minPurchaseAmount,
        },
      });
    }

    // ✅ Find cart and check minimum purchase amount (for logged-in users)
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    if (cart.totalAmount < coupon.minPurchaseAmount) {
      return res.status(400).json({ 
        success: false, 
        message: `Minimum purchase amount of ${coupon.minPurchaseAmount} required` 
      });
    }

    // ✅ Apply coupon to cart
    cart.coupon = {
      code: coupon.code,
      discountPercent: coupon.discount,
      appliedAt: new Date(),
    };

    await cart.save();

    // ✅ Increment usage count
    coupon.usageCount += 1;
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: `Coupon ${coupon.code} applied successfully!`,
      discount: coupon.discount,
      coupon: cart.coupon,
    });
  } catch (error) {
    console.error("❌ Error applying coupon:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ❌ Remove Coupon
const removeCoupon = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ Find cart and remove coupon
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    cart.coupon = {
      code: null,
      discountPercent: 0,
      appliedAt: null,
    };

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Coupon removed successfully",
    });
  } catch (error) {
    console.error("❌ Error removing coupon:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 📋 Get Valid Coupons (for UI display - public active coupons)
const getValidCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ 
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    }).select('code discount description minPurchaseAmount expiresAt');

    return res.status(200).json({
      success: true,
      coupons,
    });
  } catch (error) {
    console.error("❌ Error fetching coupons:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { 
  createCoupon,
  getAllCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon, 
  removeCoupon, 
  getValidCoupons 
};
