const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');

exports.recordPayment = async (req, res) => {
  const { studentId, amount, method } = req.body;
  const paid = Number(amount);
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (!Number.isFinite(paid) || paid <= 0) {
      throw new Error('Enter an amount greater than zero');
    }

    const student = await User.findOneAndUpdate(
      { _id: studentId, outstandingFine: { $gte: paid } },
      { $inc: { outstandingFine: -paid } },
      { new: true, session }
    );

    if (!student) {
      const existing = await User.findById(studentId).session(session);
      if (!existing) {
        throw new Error('Student not found');
      }
      throw new Error(
        `Payment exceeds outstanding fine. Fine owed: Rs.${existing.outstandingFine}`
      );
    }

    const payment = await Payment.create(
      [{ student: studentId, amount: paid, method: method || 'cash' }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: payment[0],
      remainingFine: student.outstandingFine
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;

    const isStaff = ['librarian', 'admin'].includes(req.user.role);
    if (!isStaff && req.user.id !== studentId) {
      return res.status(403).json({ error: 'You can only view your own payments' });
    }

    const payments = await Payment.find({ student: studentId }).sort({ paidAt: -1 });

    res.status(200).json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

