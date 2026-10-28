const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['waiting', 'ready', 'collected', 'expired', 'cancelled'],
    default: 'waiting'
  },
  readyAt: { type: Date }
});

module.exports = mongoose.model('Reservation', reservationSchema);