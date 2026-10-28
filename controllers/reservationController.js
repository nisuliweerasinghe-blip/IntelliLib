const mongoose = require('mongoose');
const Book = require('../models/Book');
const BorrowRecord = require('../models/BorrowRecord');
const Reservation = require('../models/Reservation');
const { HOLD_DAYS, passCopyOn, notifyReady } = require('../utils/reservations');

const DAY = 24 * 60 * 60 * 1000;

exports.reserveBook = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can reserve books' });
    }

    const { bookId } = req.body;
    const studentId = req.user.id;

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.availableQty > 0) {
      return res.status(400).json({ error: 'Copies are on the shelf, so there is no need to reserve' });
    }

    const hasLoan = await BorrowRecord.exists({
      book: bookId,
      student: studentId,
      status: 'issued'
    });
    if (hasLoan) {
      return res.status(400).json({ error: 'You already have this book checked out' });
    }

    const existing = await Reservation.findOne({
      book: bookId,
      student: studentId,
      status: { $in: ['waiting', 'ready'] }
    });
    if (existing) {
      return res.status(400).json({
        error:
          existing.status === 'ready'
            ? 'A copy is already set aside for you. Collect it at the library desk.'
            : 'You already have an active reservation for this book'
      });
    }

    const reservation = await Reservation.create({ book: bookId, student: studentId });

    const queuePosition = await Reservation.countDocuments({
      book: bookId,
      status: 'waiting',
      requestedAt: { $lte: reservation.requestedAt }
    });

    res.status(201).json({ ...reservation.toObject(), queuePosition });
  } catch (err) {
    res.status(400).json({
      error: err.name === 'CastError' ? 'Invalid book ID format' : err.message
    });
  }
};

exports.getMyReservations = async (req, res) => {
  try {
    const mine = await Reservation.find({
      student: req.user.id,
      status: { $in: ['waiting', 'ready'] }
    })
      .populate('book', 'title author')
      .sort({ requestedAt: -1 });

    const results = [];

    for (const r of mine) {
      if (!r.book) continue;

      if (r.status === 'ready') {
        results.push({
          _id: r._id,
          book: r.book,
          status: 'ready',
          holdUntil: new Date(r.readyAt.getTime() + HOLD_DAYS * DAY)
        });
      } else {
        const ahead = await Reservation.countDocuments({
          book: r.book._id,
          status: 'waiting',
          requestedAt: { $lt: r.requestedAt }
        });
        results.push({ _id: r._id, book: r.book, status: 'waiting', position: ahead + 1 });
      }
    }

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cancelReservation = async (req, res) => {
  const session = await mongoose.startSession();
  let next = null;

  try {
    session.startTransaction();

    const reservation = await Reservation.findOneAndUpdate(
      { _id: req.params.id, student: req.user.id, status: { $in: ['waiting', 'ready'] } },
      { $set: { status: 'cancelled' } },
      { session }
    );

    if (!reservation) {
      throw new Error('Reservation not found, or it can no longer be cancelled');
    }

    if (reservation.status === 'ready') {
      next = await passCopyOn(reservation.book, session);
    }

    await session.commitTransaction();

    if (next) notifyReady(next);

    res.status(200).json({ message: 'Reservation cancelled' });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    res.status(400).json({
      error: err.name === 'CastError' ? 'Invalid reservation ID format' : err.message
    });
  } finally {
    session.endSession();
  }
};

exports.getReadyForBook = async (req, res) => {
  try {
    const list = await Reservation.find({ book: req.params.bookId, status: 'ready' })
      .populate('student', 'name email')
      .sort({ readyAt: 1 });

    res.status(200).json(
      list.map((r) => ({
        _id: r._id,
        student: r.student,
        readyAt: r.readyAt,
        holdUntil: new Date(r.readyAt.getTime() + HOLD_DAYS * DAY)
      }))
    );
  } catch (err) {
    res.status(400).json({ error: 'Invalid book ID format' });
  }
};

exports.getQueueForBook = async (req, res) => {
  try {
    const queue = await Reservation.find({ book: req.params.bookId, status: 'waiting' })
      .sort({ requestedAt: 1 })
      .populate('student', 'name email');

    res.status(200).json(queue);
  } catch (err) {
    res.status(400).json({ error: 'Invalid book ID format' });
  }
};

exports.getAllReservationsForBook = async (req, res) => {
  try {
    const reservations = await Reservation.find({ book: req.params.bookId })
      .sort({ requestedAt: 1 })
      .populate('student', 'name email');

    res.status(200).json(reservations);
  } catch (err) {
    res.status(400).json({ error: 'Invalid book ID format' });
  }
};