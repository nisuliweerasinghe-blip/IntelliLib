const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./models/Book');
const User = require('./models/User');
const BorrowRecord = require('./models/BorrowRecord');

const DAY = 24 * 60 * 60 * 1000;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const books = await Book.find();
  const students = await User.find({ role: 'student' });

  if (books.length < 3 || students.length < 2) {
    console.log('Add at least 3 books and 2 students first.');
    process.exit(1);
  }

  // 1. Returned loans spread over the last 14 days.
  // Math.random() ** 2 skews the choice towards the first books, so some are more popular.
  const returned = [];
  for (let i = 0; i < 25; i++) {
    const daysAgo = 1 + Math.floor(Math.random() * 13);
    const issuedAt = new Date(Date.now() - daysAgo * DAY);
    const keptFor = Math.floor(Math.random() * (daysAgo + 1));

    returned.push({
      book: books[Math.floor(Math.random() ** 2 * books.length)]._id,
      student: pick(students)._id,
      issuedAt,
      dueDate: new Date(issuedAt.getTime() + 14 * DAY),
      returnedAt: new Date(issuedAt.getTime() + keptFor * DAY),
      status: 'returned'
    });
  }
  await BorrowRecord.insertMany(returned);

  // 2. Loans still out: a few on time, the rest overdue by different amounts.
  const daysSinceIssue = [1, 6, 10, 20, 22, 25, 25, 31, 38, 50];
  let created = 0;

  for (const daysAgo of daysSinceIssue) {
    const book = pick(books);

    // Take a copy off the shelf so stock stays consistent. Skip if none is left.
    const claimed = await Book.updateOne(
      { _id: book._id, availableQty: { $gt: 0 } },
      { $inc: { availableQty: -1 } }
    );
    if (claimed.modifiedCount === 0) continue;

    const issuedAt = new Date(Date.now() - daysAgo * DAY);
    await BorrowRecord.create({
      book: book._id,
      student: pick(students)._id,
      issuedAt,
      dueDate: new Date(issuedAt.getTime() + 14 * DAY),
      status: 'issued'
    });
    created++;
  }

  console.log(`Added ${returned.length} returned loans and ${created} active loans.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});