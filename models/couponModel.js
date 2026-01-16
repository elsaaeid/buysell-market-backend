const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discount: {
      type: Number,
      required: [true, "Discount percentage is required"],
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100%"],
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    usageLimit: {
      type: Number,
      default: null, // null means unlimited
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    minPurchaseAmount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Index for faster queries
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1 });

// Method to check if coupon is valid
couponSchema.methods.isValid = function () {
  if (!this.isActive) return { valid: false, message: "Coupon is not active" };
  
  if (this.expiresAt && new Date() > this.expiresAt) {
    return { valid: false, message: "Coupon has expired" };
  }
  
  if (this.usageLimit && this.usageCount >= this.usageLimit) {
    return { valid: false, message: "Coupon usage limit reached" };
  }
  
  return { valid: true };
};

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
