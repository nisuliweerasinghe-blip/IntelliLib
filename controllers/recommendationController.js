const BorrowRecord = require('../models/BorrowRecord');

exports.getRecommendations = async (req, res) => {
    try {
        const { bookId } = req.params;

        const borrowersOfThisBook = await BorrowRecord.find({ book: bookId }).distinct('student');

        if (borrowersOfThisBook.length === 0) {
            return res.status(200).json([]);
        }

        const otherBorrowRecords = await BorrowRecord.find({ 
            student: { $in: borrowersOfThisBook }, 
            book: { $ne: bookId } 
        }).populate('book', 'title author qrCode');

        const countMap = {};

        otherBorrowRecords.forEach((record) => {
            const bookIdStr = record.book._id.toString();

            if (countMap[bookIdStr]) {
                countMap[bookIdStr].count += 1;
            } else {
                countMap[bookIdStr] = {
                    book: record.book,
                    count: 1
                };
            }   
        });

        const recommendations = Object.values(countMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

            res.status(200).json(recommendations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


   