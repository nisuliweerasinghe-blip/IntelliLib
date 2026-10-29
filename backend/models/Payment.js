const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['cash', 'card', 'payhere'], default: 'cash' },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    paidAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Payment', paymentSchema);