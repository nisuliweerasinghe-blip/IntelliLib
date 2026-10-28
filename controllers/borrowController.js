const mongoose = require('mongoose');
const Book = require('../models/Book');
const BorrowRecord = require('../models/BorrowRecord');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { passCopyOn, notifyReady } = require('../utils/reservations');

const LOAN_DAYS = 14;
const FINE_PER_DAY = 10;
const FINE_LIMIT = 500;
const DAY = 24 * 60 * 60 * 1000;

exports.issueBook = async (req, res) => {
  const { bookId, studentId } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const book = await Book.findById(bookId).session(session);
    if (!book) {
      throw new Error('Book not found');
    }

    const student = await User.findById(studentId).session(session);
    if (!student) {
      throw new Error('Student not found');
    }
    if (student.role !== 'student') {
      throw new Error('Only student accounts can borrow books');
    }
    if (student.outstandingFine > FINE_LIMIT) {
      throw new Error(
        `${student.name} owes Rs.${student.outstandingFine} in fines. Fines above Rs.${FINE_LIMIT} must be paid before borrowing.`
      );
    }

    const alreadyHas = await BorrowRecord.exists({
      book: bookId,
      student: studentId,
      status: 'issued'
    }).session(session);
    if (alreadyHas) {
      throw new Error(`${student.name} already has a copy of this book checked out`);
    }

    // If a copy is set aside for this student, hand that one over.
    const hold = await Reservation.findOneAndUpdate(
      { book: bookId, student: studentId, status: 'ready' },
      { $set: { status: 'collected' } },
      { session }
    );

    if (!hold) {
      const taken = await Book.findOneAndUpdate(
        { _id: bookId, availableQty: { $gte: 1 } },
        { $inc: { availableQty: -1 } },
        { session }
      );
      if (!taken) {
        throw new Error('No copies are on the shelf right now. Reserve the book instead.');
      }
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

    const [record] = await BorrowRecord.create(
      [{ book: bookId, student: studentId, dueDate }],
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      message: 'Book issued successfully',
      record,
      collectedReservation: Boolean(hold)
    });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    res.status(400).json({
      error: err.name === 'CastError' ? 'Invalid ID format' : err.message
    });
  } finally {
    session.endSession();
  }
};

exports.returnBook = async (req, res) => {
  const { recordId } = req.body;
  const session = await mongoose.startSession();
  let next = null;

  try {
    session.startTransaction();

    const returnedAt = new Date();

    const record = await BorrowRecord.findOneAndUpdate(
      { _id: recordId, status: 'issued' },
      { $set: { status: 'returned', returnedAt } },
      { new: true, session }
    );

    if (!record) {
      throw new Error('This loan was not found, or the book has already been returned');
    }

    const daysLate = Math.floor((returnedAt - record.dueDate) / DAY);
    const fine = daysLate > 0 ? daysLate * FINE_PER_DAY : 0;

    if (fine > 0) {
      record.fineAmount = fine;
      await record.save({ session });
      await User.updateOne(
        { _id: record.student },
        { $inc: { outstandingFine: fine } },
        { session }
      );
    }

    next = await passCopyOn(record.book, session);

    await session.commitTransaction();

    if (next) notifyReady(next);

    res.status(200).json({
      message: 'Book returned successfully',
      fine,
      handedToReservation: Boolean(next)
    });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    res.status(400).json({
      error: err.name === 'CastError' ? 'Invalid ID format' : err.message
    });
  } finally {
    session.endSession();
  }
};

exports.getMyBorrows = async (req, res) => {
  try {
    const records = await BorrowRecord.find({ student: req.user.id })
      .populate('book', 'title author')
      .sort({ issuedAt: -1 });

    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getActiveBorrowsForBook = async (req, res) => {
  try {
    const { bookId } = req.params;

    const records = await BorrowRecord.find({ book: bookId, status: 'issued' })
      .populate('student', 'name email')
      .sort({ dueDate: 1 });

    res.status(200).json(records);
  } catch (err) {
    res.status(400).json({ error: 'Invalid book ID format' });
  }
};