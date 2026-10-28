const QRCode = require('qrcode');
const Book = require('../models/Book');
const BorrowRecord = require('../models/BorrowRecord');
const Reservation = require('../models/Reservation');

exports.createBook = async (req, res) => {
  try {
    const title = String(req.body.title ?? '').trim();
    const author = String(req.body.author ?? '').trim();
    const isbn = String(req.body.isbn ?? '').trim();
    const totalQty = Number(req.body.totalQty ?? 1);

    if (!title || !author || !isbn) {
      return res.status(400).json({ error: 'Title, author, and ISBN are all required' });
    }
    if (!Number.isInteger(totalQty) || totalQty < 1) {
      return res.status(400).json({ error: 'Number of copies must be a whole number, 1 or more' });
    }

    const book = await Book.create({
      title,
      author,
      isbn,
      totalQty,
      availableQty: totalQty
    });

    book.qrCode = await QRCode.toDataURL(book._id.toString());
    await book.save();

    res.status(201).json(book);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Another book already uses this ISBN.' });
    }
    res.status(400).json({ error: err.message });
  }
};

exports.getBookById = async (req, res) => {
    try {
        const { id } = req.params;

        const book = await Book.findById(id);

        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.status(200).json(book);
    }   catch (err) {
        res.status(400).json({ error: 'Invalid book ID format' });
    }
};

exports.getAllBooks = async (req, res) => {
    try {
        const books = await Book.find();
        res.status(200).json(books);
    }   catch (err) {
        res.status(500).json({ error: err.message });
    }   
};

exports.updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const title = String(req.body.title ?? '').trim();
    const author = String(req.body.author ?? '').trim();
    const isbn = String(req.body.isbn ?? '').trim();
    const totalQty = Number(req.body.totalQty);

    if (!title || !author || !isbn) {
      return res.status(400).json({ error: 'Title, author, and ISBN are all required' });
    }
    if (!Number.isInteger(totalQty) || totalQty < 1) {
      return res.status(400).json({ error: 'Number of copies must be a whole number, 1 or more' });
    }

    const existing = await Book.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const change = totalQty - existing.totalQty;

    const updated = await Book.findOneAndUpdate(
      {
        _id: id,
        totalQty: existing.totalQty,
        availableQty: { $gte: Math.max(0, -change) }
      },
      {
        $set: { title, author, isbn },
        $inc: { totalQty: change, availableQty: change }
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      const fresh = await Book.findById(id);
      if (!fresh) {
        return res.status(404).json({ error: 'Book not found' });
      }

      const copiesOut = fresh.totalQty - fresh.availableQty;
      if (totalQty < copiesOut) {
        return res.status(400).json({
          error: `${copiesOut} ${copiesOut === 1 ? 'copy is' : 'copies are'} checked out or set aside for a reservation, so the total cannot go below ${copiesOut}.`
        });
      }

      return res.status(409).json({
        error: 'Someone changed this book at the same moment. Reload the catalog and try again.'
      });
    }

    res.status(200).json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Another book already uses this ISBN.' });
    }
    res.status(400).json({
      error: err.name === 'CastError' ? 'Invalid book ID format' : err.message
    });
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    const activeLoans = await BorrowRecord.countDocuments({ book: id, status: 'issued' });
    if (activeLoans > 0) {
      return res.status(400).json({
        error: `${activeLoans} ${activeLoans === 1 ? 'copy is' : 'copies are'} still checked out. Return ${activeLoans === 1 ? 'it' : 'them'} before deleting this book.`
      });
    }

    const activeReservations = await Reservation.countDocuments({
      book: id,
      status: { $in: ['waiting', 'ready'] }
    });
    if (activeReservations > 0) {
      return res.status(400).json({
        error: `${activeReservations} ${activeReservations === 1 ? 'reservation is' : 'reservations are'} still active for this book. Wait until ${activeReservations === 1 ? 'it is' : 'they are'} collected, cancelled, or expired before deleting it.`
      });
    }

    const book = await Book.findByIdAndDelete(id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (err) {
    res.status(400).json({
      error: err.name === 'CastError' ? 'Invalid book ID format' : err.message
    });
  }
};