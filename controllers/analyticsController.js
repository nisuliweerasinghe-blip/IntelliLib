const BorrowRecord = require('../models/BorrowRecord');
const Book = require('../models/Book');

exports.getMostBorrowedBooks = async (req, res) => {
    try {
        const results = await BorrowRecord.aggregate([
            {
                $group: {
                    _id: '$book',
                    borrowCount: { $sum: 1 }
                }
            },
            {
                $sort: { borrowCount: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'books',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'bookDetails'
                }
            },
            {
                $unwind: '$bookDetails'
            },
            {
                $project: {
                    _id: 0,
                    bookId: '$bookDetails._id',
                    title: '$bookDetails.title',
                    author: '$bookDetails.author',
                    borrowCount: 1
                }
            }
        ]);

        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getOverdueStats = async (req, res) => {
    try {
        const now = new Date();

        const overdueRecords = await BorrowRecord.find({
            status: 'issued',
            dueDate: { $lt: now }
        }).populate('book', 'title').populate('student', 'name email');

        const overdueByDay = {};

        overdueRecords.forEach((record) => {
            const dateKey = record.dueDate.toISOString().split('T')[0];
            overdueByDay[dateKey] = (overdueByDay[dateKey] || 0) + 1;    
        });

        res.status(200).json({
            totalOverdue: overdueRecords.length,
            overdueByDay,
            records: overdueRecords
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getDashboardSummary = async (req, res) => {
    try {
        const totalBooks = await Book.countDocuments();   
        const totalIssued = await BorrowRecord.countDocuments({ status: 'issued' });  
        const totalOverdue = await BorrowRecord.countDocuments({ 
            status: 'issued', 
            dueDate: { $lt: new Date() } 
        });

        const availableCopiesResult = await Book.aggregate([
            {
                $group: {
                    _id: null,
                    totalAvailable: { $sum: '$availableQty' }}}
        ]);
        const totalAvailableCopies = availableCopiesResult[0]?.totalAvailable || 0;

        res.status(200).json({
            totalBooks,
            totalIssued,
            totalOverdue,
            totalAvailableCopies
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const TIMEZONE = 'Asia/Colombo';

exports.getActivity = async (req, res) => {
  try {
    const days = 14;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await BorrowRecord.aggregate([
      { $match: { issuedAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$issuedAt', timezone: TIMEZONE }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const counts = {};
    rows.forEach((row) => {
      counts[row._id] = row.count;
    });

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const date = day.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
      result.push({ date, count: counts[date] || 0 });
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




