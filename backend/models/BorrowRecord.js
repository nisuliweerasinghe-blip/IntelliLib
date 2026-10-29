const mongoose = require('mongoose');

const borrowRecordSchema = new mongoose.Schema({
    book: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Book', 
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    issuedAt: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    returnedAt: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['issued', 'returned'],
        default: 'issued'
    },
    fineAmount: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('BorrowRecord', borrowRecordSchema);