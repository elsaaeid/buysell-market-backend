const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema({
    amount: Number,
    paymentMethod: String,
    paymentResponse: Object,
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;