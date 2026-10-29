const Category = require('../models/Category');
const Book = require('../models/Book');

const cleanName = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const nameProblem = (name) => {
  if (!name) return 'Enter a category name';
  if (name.length > 40) return 'Category names can be at most 40 characters';
  return null;
};

exports.getCategories = async (req, res) => {
  try {
    const [categories, counts] = await Promise.all([
      Category.find().collation({ locale: 'en' }).sort({ name: 1 }).lean(),
      Book.aggregate([
        { $match: { category: { $ne: null } } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    const byId = {};
    counts.forEach((c) => {
      byId[c._id.toString()] = c.count;
    });

    res.status(200).json(
      categories.map((c) => ({
        _id: c._id,
        name: c.name,
        bookCount: byId[c._id.toString()] || 0
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const name = cleanName(req.body.name);
    const problem = nameProblem(name);
    if (problem) {
      return res.status(400).json({ error: problem });
    }

    const category = await Category.create({ name });

    res.status(201).json({ _id: category._id, name: category.name, bookCount: 0 });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }
    res.status(400).json({ error: err.message });
  }
};

exports.renameCategory = async (req, res) => {
  try {
    const name = cleanName(req.body.name);
    const problem = nameProblem(name);
    if (problem) {
      return res.status(400).json({ error: problem });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true, runValidators: true }
    );
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const bookCount = await Book.countDocuments({ category: category._id });

    res.status(200).json({ _id: category._id, name: category.name, bookCount });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }
    res.status(400).json({
      error: err.name === 'CastError' ? 'Invalid category ID format' : err.message
    });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const inUse = await Book.countDocuments({ category: req.params.id });
    if (inUse > 0) {
      return res.status(400).json({
        error: `${inUse} ${inUse === 1 ? 'book uses' : 'books use'} this category. Move ${inUse === 1 ? 'it' : 'them'} to another category before deleting.`
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(200).json({ message: 'Category deleted' });
  } catch (err) {
    res.status(400).json({
      error: err.name === 'CastError' ? 'Invalid category ID format' : err.message
    });
  }
};