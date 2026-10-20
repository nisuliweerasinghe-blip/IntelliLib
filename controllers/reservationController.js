const Book = require('../models/Book');
const BorrowRecord = require('../models/BorrowRecord');
const Reservation = require('../models/Reservation');

exports.reserveBook = async (req, res) => {
    try {
        const { bookId } = req.body;
        const studentId = req.user.id;

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        if(book.availableQty > 0) {
            return res.status(400).json({ error: 'Copies are available - no need to reserve' });
        }

        const alreadyReserved = await Reservation.findOne({ 
            book: bookId, 
            student: studentId,
            status: 'waiting'
        });

        if (alreadyReserved) {
            return res.status(400).json({ error: 'You already have an active reservation for this book' });
        }

        const queueCount = await Reservation.countDocuments({ 
            book: bookId, 
            status: 'waiting' 
        });

        const reservation = await Reservation.create({
            book: bookId,
            student: studentId,
            queuePosition: queueCount + 1,
        });

        res.status(201).json(reservation);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getQueueForBook = async (req, res) => {
    try {
        const { bookId } = req.params;

        const queue = await Reservation.find({
            book: bookId,
            status: 'waiting'
        })
        .sort({ requestedAt: 1 })
        .populate('student', 'name email');

        res.status(200).json(queue);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllReservationsForBook = async (req, res) => {
    try {
        const { bookId } = req.params;
        const reservations = await Reservation.find({ book: bookId })
            .sort({ requestedAt: 1 })
            .populate('student', 'name email');

        res.status(200).json(reservations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({
      student: req.user.id,
      status: { $in: ['waiting', 'fulfilled'] }
    })
      .populate('book', 'title author')
      .sort({ requestedAt: -1 });

    const results = [];

    for (const r of reservations) {
      if (!r.book) continue;

      if (r.status === 'waiting') {
        const ahead = await Reservation.countDocuments({
          book: r.book._id,
          status: 'waiting',
          requestedAt: { $lt: r.requestedAt }
        });
        results.push({ _id: r._id, book: r.book, status: 'waiting', position: ahead + 1 });
      } else {
        const collected = await BorrowRecord.exists({
          student: req.user.id,
          book: r.book._id,
          issuedAt: { $gt: r.requestedAt }
        });
        if (!collected) {
          results.push({ _id: r._id, book: r.book, status: 'ready' });
        }
      }
    }

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};