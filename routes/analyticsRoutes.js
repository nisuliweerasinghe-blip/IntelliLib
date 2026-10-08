const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/most-borrowed', analyticsController.getMostBorrowedBooks);
router.get('/overdue', authenticate, authorize('admin', 'librarian'), analyticsController.getOverdueStats);
router.get('/summary', authenticate, authorize('admin', 'librarian'), analyticsController.getDashboardSummary);

module.exports = router;