const mongoose = require("mongoose");

const orderSchema = mongoose.Schema({
    items: Array,
    totalAmount: Number,
    paymentMethod: String,
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;