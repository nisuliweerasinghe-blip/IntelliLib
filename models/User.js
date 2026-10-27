const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'librarian', 'admin'],
        default: 'student'
    },
    outstandingFine: {
        type: Number,
        default: 0
    },
    passwordChangedAt: { 
        type: Date 
    }
});

module.exports = mongoose.model('User', userSchema);