const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    isbn: {
        type: String,
        required: true,
        unique: true
    },
    totalQty: {
        type: Number,
        required: true,
        default: 1
    },
    availableQty: {
        type: Number,
        required: true,
        default: 1
    },
    qrCode: {
        type: String,
    },
    category: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category', 
        default: null 
    }
});

module.exports = mongoose.model('Book', bookSchema);