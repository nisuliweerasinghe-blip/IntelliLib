const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Book = require('../models/Book');

const DAY = 24 * 60 * 60 * 1000;
let counter = 0;

async function makeUser(role = 'student', extra = {}) {
  counter += 1;
  return User.create({
    name: `${role} ${counter}`,
    email: `${role}${counter}@test.com`,
    password: await bcrypt.hash('secret123', 4),
    role,
    ...extra
  });
}

async function makeBook(extra = {}) {
  counter += 1;
  const totalQty = extra.totalQty ?? 1;

  return Book.create({
    title: `Book ${counter}`,
    author: 'Test Author',
    isbn: `ISBN-${counter}`,
    totalQty,
    availableQty: totalQty,
    ...extra
  });
}

function tokenFor(user, { ageSeconds = 0 } = {}) {
  const issuedAt = Math.floor(Date.now() / 1000) - ageSeconds;

  return jwt.sign(
    { id: user._id, role: user.role, iat: issuedAt },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function auth(user, options) {
  return ['Authorization', `Bearer ${tokenFor(user, options)}`];
}

async function eventually(check, tries = 30) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return check();
    } catch (err) {
      if (attempt >= tries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

module.exports = { DAY, makeUser, makeBook, tokenFor, auth, eventually };