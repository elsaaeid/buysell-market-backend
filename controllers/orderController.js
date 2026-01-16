// controllers/orderController.js
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");

// =====================================================================
// CREATE COD ORDER
// =====================================================================
const createCODOrder = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      items,
      subtotal,
      couponCode,
      couponDiscount,
      discountAmount,
      totalAmount,
      shippingAddress,
      notes,
    } = req.body;

    // ✅ Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in order" });
    }

    if (totalAmount === undefined || totalAmount === null) {
      return res.status(400).json({ message: "Total amount is required" });
    }

    // ✅ Create the order
    const order = new Order({
      userId,
      items,
      subtotal: subtotal || 0,
      couponCode: couponCode || null,
      couponDiscount: couponDiscount || 0,
      discountAmount: discountAmount || 0,
      totalAmount,
      paymentMethod: "COD",
      status: "pending",
      shippingAddress: shippingAddress || "",
      notes: notes || "",
    });

    await order.save();

    // ✅ Clear user's cart after successful order
    await Cart.findOneAndUpdate(
      { userId },
      { items: [], totalAmount: 0, coupon: null },
      { new: true }
    );

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("Error creating COD order:", error);
    return res.status(500).json({
      message: "Error creating order",
      error: error.message,
    });
  }
};

// =====================================================================
// GET USER ORDERS
// =====================================================================
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user?._id;
    
    // ✅ If user is not logged in, return empty array
    if (!userId) {
      return res.status(200).json({
        success: true,
        orders: [],
        message: "No orders (user not logged in)",
      });
    }

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return res.status(500).json({
      message: "Error fetching orders",
      error: error.message,
    });
  }
};

// =====================================================================
// GET ORDER BY ID
// =====================================================================
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).json({
      message: "Error fetching order",
      error: error.message,
    });
  }
};

// =====================================================================
// GET ALL ORDERS (ADMIN ONLY)
// =====================================================================
const getAllOrders = async (req, res) => {
  try {
    // Assuming there's admin middleware that checks req.user.role
    const orders = await Order.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return res.status(500).json({
      message: "Error fetching orders",
      error: error.message,
    });
  }
};

// =====================================================================
// UPDATE ORDER STATUS (ADMIN ONLY)
// =====================================================================
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated",
      order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({
      message: "Error updating order",
      error: error.message,
    });
  }
};

// =====================================================================
// CANCEL ORDER (USER CAN ONLY CANCEL PENDING ORDERS)
// =====================================================================
const cancelOrder = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { orderId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ✅ Find the order and verify it belongs to the user
    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // ✅ Only allow cancellation of pending orders
    if (order.status !== "pending") {
      return res.status(400).json({
        message: `Cannot cancel order with status "${order.status}". Only pending orders can be cancelled.`,
      });
    }

    // ✅ Update order status to cancelled
    order.status = "cancelled";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return res.status(500).json({
      message: "Error cancelling order",
      error: error.message,
    });
  }
};

module.exports = {
  createCODOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
};
