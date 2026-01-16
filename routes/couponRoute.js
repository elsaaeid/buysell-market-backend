const express = require("express");
const router = express.Router();

const { 
  createCoupon,
  getAllCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon, 
  removeCoupon, 
  getValidCoupons 
} = require("../controllers/couponController");
const { protect, authorAdmin } = require("./authMiddleware");

// 🛡️ Optional protection middleware - continues even if not authenticated
const optionalProtect = (req, res, next) => {
  protect(req, res, (err) => {
    if (err) {
      // If protect fails, continue anyway (user not logged in)
      req.user = null;
      next();
    } else {
      next();
    }
  });
};

// Public routes
router.get("/valid", getValidCoupons); // Get active coupons

// Protected user routes (optional auth for non-logged-in users)
router.post("/apply", optionalProtect, applyCoupon); // Apply coupon to cart
router.post("/remove", protect, removeCoupon); // Remove coupon from cart

// Admin and Author routes
router.post("/", protect, authorAdmin, createCoupon); // Create new coupon
router.get("/", protect, authorAdmin, getAllCoupons); // Get all coupons
router.get("/:id", protect, authorAdmin, getCoupon); // Get single coupon
router.patch("/:id", protect, authorAdmin, updateCoupon); // Update coupon
router.delete("/:id", protect, authorAdmin, deleteCoupon); // Delete coupon

module.exports = router;
