const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', categoryController.getCategories);
router.post('/', authenticate, authorize('librarian', 'admin'), categoryController.createCategory);
router.put('/:id', authenticate, authorize('librarian', 'admin'), categoryController.renameCategory);
router.delete('/:id', authenticate, authorize('admin'), categoryController.deleteCategory);

module.exports = router;