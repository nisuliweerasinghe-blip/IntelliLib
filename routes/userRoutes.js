const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/staff', authenticate, authorize('admin'), userController.createStaffAccount);
router.get('/', authenticate, authorize('librarian', 'admin'), userController.getAllUsers);
router.get('/me', authenticate, userController.getMe);

module.exports = router;