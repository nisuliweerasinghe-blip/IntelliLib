const BorrowRecord = require('../models/BorrowRecord');

exports.getRecommendations = async (req, res) => {
  try {
    const { bookId } = req.params;

    const borrowers = await BorrowRecord.find({ book: bookId }).distinct('student');

    if (borrowers.length === 0) {
      return res.status(200).json([]);
    }

    const others = await BorrowRecord.find({
      student: { $in: borrowers },
      book: { $ne: bookId }
    }).populate('book', 'title author availableQty');

    const tally = {};

    others.forEach((record) => {
      if (!record.book) return;

      const id = record.book._id.toString();

      if (!tally[id]) {
        tally[id] = { book: record.book, readers: new Set() };
      }
      tally[id].readers.add(record.student.toString());
    });

    const recommendations = Object.values(tally)
      .map(({ book, readers }) => ({ book, count: readers.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.status(200).json(recommendations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
