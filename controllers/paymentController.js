const Payment = require('../models/Payment');
const User = require('../models/User');

exports.recordPayment = async (req, res) => {
    try {
        const { studentId, amount, method } = req.body;

        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if(amount > student.outstandingFine) {
            return res.status(400).json({ 
                error: `Payment exceeds outstanding fine. Fine owed: Rs.${student.outstandingFine}` });
        }

        const payment = await Payment.create({
            student: studentId,
            amount,
            method: method || 'cash'
        });

        student.outstandingFine -= amount;
        await student.save();

        res.status(201).json({ 
            message: 'Payment recorded successfully', 
            payment,
            remainingFine: student.outstandingFine
        });
    } catch (err) {
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

