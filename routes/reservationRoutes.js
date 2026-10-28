const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const { authenticate, authorize } = require('../middleware/auth');

const staff = authorize('librarian', 'admin');

router.post('/', authenticate, reservationController.reserveBook);
router.get('/mine', authenticate, reservationController.getMyReservations);
router.get('/ready/:bookId', authenticate, staff, reservationController.getReadyForBook);
router.get('/:bookId', authenticate, staff, reservationController.getQueueForBook);
router.get('/:bookId/all', authenticate, staff, reservationController.getAllReservationsForBook);
router.delete('/:id', authenticate, reservationController.cancelReservation);

module.exports = router;