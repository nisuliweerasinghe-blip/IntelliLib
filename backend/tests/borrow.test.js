const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Book = require('../models/Book');
const User = require('../models/User');
const BorrowRecord = require('../models/BorrowRecord');
const { DAY, makeUser, makeBook, auth } = require('./helpers');

jest.mock('../utils/sendEmail', () => jest.fn());

const issue = (librarian, book, student) =>
  request(app)
    .post('/api/borrow/issue')
    .set(...auth(librarian))
    .send({ bookId: book._id, studentId: student._id });

const giveBack = (librarian, recordId) =>
  request(app)
    .post('/api/borrow/return')
    .set(...auth(librarian))
    .send({ recordId });

const makeLoan = (book, student, { dueInDays = 14 } = {}) =>
  BorrowRecord.create({
    book: book._id,
    student: student._id,
    dueDate: new Date(Date.now() + dueInDays * DAY)
  });

describe('issuing a book', () => {
  test('lowers the shelf count and sets a due date 14 days away', async () => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student');
    const book = await makeBook({ totalQty: 2 });

    const res = await issue(librarian, book, student);

    expect(res.status).toBe(201);
    expect((await Book.findById(book._id)).availableQty).toBe(1);

    const days = (new Date(res.body.record.dueDate) - Date.now()) / DAY;
    expect(Math.round(days)).toBe(14);
  });

  test('refuses when no copy is on the shelf, and creates no loan', async () => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student');
    const book = await makeBook({ totalQty: 1, availableQty: 0 });

    const res = await issue(librarian, book, student);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no copies/i);
    expect(await BorrowRecord.countDocuments()).toBe(0);
    expect((await Book.findById(book._id)).availableQty).toBe(0);
  });

  test('gives the last copy to only one of two simultaneous requests', async () => {
    const librarian = await makeUser('librarian');
    const first = await makeUser('student');
    const second = await makeUser('student');
    const book = await makeBook({ totalQty: 1 });

    const results = await Promise.all([
      issue(librarian, book, first),
      issue(librarian, book, second)
    ]);

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect((await Book.findById(book._id)).availableQty).toBe(0);
    expect(await BorrowRecord.countDocuments()).toBe(1);
  });

  test('blocks fines above Rs. 500 but allows exactly Rs. 500', async () => {
    const librarian = await makeUser('librarian');
    const book = await makeBook({ totalQty: 2 });
    const over = await makeUser('student', { outstandingFine: 501 });
    const exact = await makeUser('student', { outstandingFine: 500 });

    const blocked = await issue(librarian, book, over);
    expect(blocked.status).toBe(400);
    expect(blocked.body.error).toMatch(/fines/i);

    const allowed = await issue(librarian, book, exact);
    expect(allowed.status).toBe(201);
  });

  test('refuses a second copy of a book the student already has', async () => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student');
    const book = await makeBook({ totalQty: 2 });

    await issue(librarian, book, student);
    const second = await issue(librarian, book, student);

    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/already has a copy/i);
  });

  test('only student accounts can borrow', async () => {
    const librarian = await makeUser('librarian');
    const otherStaff = await makeUser('librarian');
    const book = await makeBook();

    const res = await issue(librarian, book, otherStaff);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/only student accounts/i);
  });

  test('answers a malformed id with a clear message', async () => {
    const librarian = await makeUser('librarian');

    const res = await request(app)
      .post('/api/borrow/issue')
      .set(...auth(librarian))
      .send({ bookId: 'not-an-id', studentId: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid ID format');
  });
});

describe('returning a book', () => {
  test('on time: no fine, and the copy goes back on the shelf', async () => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student');
    const book = await makeBook({ totalQty: 1, availableQty: 0 });
    const loan = await makeLoan(book, student);

    const res = await giveBack(librarian, loan._id);

    expect(res.status).toBe(200);
    expect(res.body.fine).toBe(0);
    expect(res.body.handedToReservation).toBe(false);
    expect((await Book.findById(book._id)).availableQty).toBe(1);
    expect((await BorrowRecord.findById(loan._id)).status).toBe('returned');
  });

  test('late: Rs. 10 per full day, added to what the student already owes', async () => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student', { outstandingFine: 100 });
    const book = await makeBook({ totalQty: 1, availableQty: 0 });
    const loan = await makeLoan(book, student, { dueInDays: -(3 + 1 / 24) }); // 3 days and an hour late

    const res = await giveBack(librarian, loan._id);

    expect(res.body.fine).toBe(30);
    expect((await User.findById(student._id)).outstandingFine).toBe(130);
    expect((await BorrowRecord.findById(loan._id)).fineAmount).toBe(30);
  });

  test('less than one full day late is free', async () => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student');
    const book = await makeBook({ totalQty: 1, availableQty: 0 });
    const loan = await makeLoan(book, student, { dueInDays: -0.5 });

    const res = await giveBack(librarian, loan._id);

    expect(res.body.fine).toBe(0);
    expect((await User.findById(student._id)).outstandingFine).toBe(0);
  });

  test('the same loan cannot be returned twice', async () => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student');
    const book = await makeBook({ totalQty: 1, availableQty: 0 });
    const loan = await makeLoan(book, student);

    const first = await giveBack(librarian, loan._id);
    const second = await giveBack(librarian, loan._id);

    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/already been returned/i);
    expect((await Book.findById(book._id)).availableQty).toBe(1);
  });

  test('two simultaneous returns put back only one copy', async () => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student');
    const book = await makeBook({ totalQty: 1, availableQty: 0 });
    const loan = await makeLoan(book, student);

    const results = await Promise.all([
      giveBack(librarian, loan._id),
      giveBack(librarian, loan._id)
    ]);

    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect((await Book.findById(book._id)).availableQty).toBe(1);
  });
});

describe('my loans', () => {
  test('a student sees only their own loans', async () => {
    const mine = await makeUser('student');
    const other = await makeUser('student');
    const book = await makeBook({ totalQty: 2 });
    await makeLoan(book, mine);
    await makeLoan(book, other);

    const res = await request(app).get('/api/borrow/mine').set(...auth(mine));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].student).toBe(String(mine._id));
  });
});