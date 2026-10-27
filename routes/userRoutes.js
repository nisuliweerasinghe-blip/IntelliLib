const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { loginLimiter, registerLimiter, passwordLimiter } = require('../middleware/rateLimit');

router.post('/register', registerLimiter, userController.registerUser);
router.post('/login', loginLimiter, userController.loginUser);
router.get('/me', authenticate, userController.getMe);
router.put('/me/password', authenticate, passwordLimiter, userController.changePassword);
router.post('/staff', authenticate, authorize('admin'), userController.createStaffAccount);
router.get('/', authenticate, authorize('librarian', 'admin'), userController.getAllUsers);

module.exports = router;