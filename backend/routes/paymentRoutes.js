const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/',authenticate, authorize('librarian', 'admin'), paymentController.recordPayment);
router.get('/:studentId', authenticate, paymentController.getPaymentHistory);

module.exports = router;