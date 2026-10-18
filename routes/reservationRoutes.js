const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, reservationController.reserveBook);
router.get('/mine', authenticate, reservationController.getMyReservations);
router.get('/:bookId', authenticate, reservationController.getQueueForBook);
router.get('/:bookId/all', authenticate, authorize('librarian', 'admin'), reservationController.getAllReservationsForBook);

module.exports = router;