const request = require('supertest');
const app = require('../app');
const Book = require('../models/Book');
const BorrowRecord = require('../models/BorrowRecord');
const Category = require('../models/Category');
const Reservation = require('../models/Reservation');
const { DAY, makeUser, makeBook, auth } = require('./helpers');

describe('adding a book', () => {
  const add = (librarian, body) =>
    request(app).post('/api/books').set(...auth(librarian)).send(body);

  test('puts every copy on the shelf and generates a QR code', async () => {
    const librarian = await makeUser('librarian');

    const res = await add(librarian, {
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: '9780441172719',
      totalQty: 3
    });

    expect(res.status).toBe(201);
    expect(res.body.availableQty).toBe(3);
    expect(res.body.qrCode).toMatch(/^data:image\/png;base64,/);
  });

  test.each([
    ['a missing title', { author: 'A', isbn: '1', totalQty: 1 }, /required/i],
    ['zero copies', { title: 'T', author: 'A', isbn: '1', totalQty: 0 }, /copies/i],
    [
      'a category that does not exist',
      { title: 'T', author: 'A', isbn: '1', totalQty: 1, category: '507f1f77bcf86cd799439011' },
      /category/i
    ]
  ])('refuses %s', async (_label, body, message) => {
    const librarian = await makeUser('librarian');

    const res = await add(librarian, body);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
  });

  test('refuses an ISBN that is already used', async () => {
    const librarian = await makeUser('librarian');
    const body = { title: 'Dune', author: 'Frank Herbert', isbn: '123', totalQty: 1 };

    await add(librarian, body);
    const res = await add(librarian, { ...body, title: 'Another' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already uses this ISBN/i);
  });
});

describe('editing a book', () => {
  const edit = (user, book, changes) =>
    request(app)
      .put(`/api/books/${book._id}`)
      .set(...auth(user))
      .send({
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        totalQty: book.totalQty,
        ...changes
      });

  test('new copies go on the shelf when the total goes up', async () => {
    const librarian = await makeUser('librarian');
    const book = await makeBook({ totalQty: 3, availableQty: 1 });

    const res = await edit(librarian, book, { totalQty: 5 });

    expect(res.status).toBe(200);
    expect(res.body.totalQty).toBe(5);
    expect(res.body.availableQty).toBe(3);
  });

  test('the total cannot drop below the copies that are out', async () => {
    const librarian = await makeUser('librarian');
    const book = await makeBook({ totalQty: 3, availableQty: 1 }); // 2 copies are out

    const res = await edit(librarian, book, { totalQty: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/2 copies are checked out/i);

    const stored = await Book.findById(book._id);
    expect(stored.totalQty).toBe(3);
    expect(stored.availableQty).toBe(1);
  });

  test('ignores attempts to set the stock numbers directly', async () => {
    const librarian = await makeUser('librarian');
    const book = await makeBook({ totalQty: 3, availableQty: 1 });

    const res = await edit(librarian, book, { availableQty: 99, qrCode: 'hacked' });

    expect(res.status).toBe(200);
    const stored = await Book.findById(book._id);
    expect(stored.availableQty).toBe(1);
    expect(stored.qrCode).not.toBe('hacked');
  });

  test('refuses an ISBN that another book already uses', async () => {
    const librarian = await makeUser('librarian');
    const first = await makeBook();
    const second = await makeBook();

    const res = await edit(librarian, second, { isbn: first.isbn });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already uses this ISBN/i);
  });
});

describe('deleting a book', () => {
  const remove = (user, book) =>
    request(app).delete(`/api/books/${book._id}`).set(...auth(user));

  test('is refused while a copy is out, and allowed once it is back', async () => {
    const admin = await makeUser('admin');
    const student = await makeUser('student');
    const book = await makeBook({ totalQty: 1, availableQty: 0 });
    const loan = await BorrowRecord.create({
      book: book._id,
      student: student._id,
      dueDate: new Date(Date.now() + DAY)
    });

    const blocked = await remove(admin, book);
    expect(blocked.status).toBe(400);
    expect(blocked.body.error).toMatch(/still checked out/i);

    await BorrowRecord.updateOne({ _id: loan._id }, { status: 'returned', returnedAt: new Date() });

    const allowed = await remove(admin, book);
    expect(allowed.status).toBe(200);
    expect(await BorrowRecord.countDocuments()).toBe(1); // the history stays
  });

  test('is refused while a reservation is active', async () => {
    const admin = await makeUser('admin');
    const student = await makeUser('student');
    const book = await makeBook({ totalQty: 1, availableQty: 0 });
    await Reservation.create({
      book: book._id,
      student: student._id,
      status: 'ready',
      readyAt: new Date()
    });

    const res = await remove(admin, book);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reservation/i);
  });
});

describe('categories', () => {
  test('a name that differs only by capitals is refused', async () => {
    const librarian = await makeUser('librarian');

    await request(app).post('/api/categories').set(...auth(librarian)).send({ name: 'Fiction' });
    const dup = await request(app).post('/api/categories').set(...auth(librarian)).send({ name: 'fiction' });

    expect(dup.status).toBe(400);
    expect(dup.body.error).toMatch(/already exists/i);
  });

  test('cannot be deleted while books use it, and only by an admin', async () => {
    const librarian = await makeUser('librarian');
    const admin = await makeUser('admin');
    const category = await Category.create({ name: 'Science' });
    await makeBook({ category: category._id });

    const byLibrarian = await request(app).delete(`/api/categories/${category._id}`).set(...auth(librarian));
    expect(byLibrarian.status).toBe(403);

    const inUse = await request(app).delete(`/api/categories/${category._id}`).set(...auth(admin));
    expect(inUse.status).toBe(400);
    expect(inUse.body.error).toMatch(/this category/i);

    await Book.deleteMany({});
    const allowed = await request(app).delete(`/api/categories/${category._id}`).set(...auth(admin));
    expect(allowed.status).toBe(200);
  });

  test('the list shows how many books each category holds', async () => {
    const science = await Category.create({ name: 'Science' });
    await Category.create({ name: 'History' });
    await makeBook({ category: science._id });
    await makeBook({ category: science._id });

    const res = await request(app).get('/api/categories');

    expect(res.body.map((c) => [c.name, c.bookCount])).toEqual([
      ['History', 0],
      ['Science', 2]
    ]);
  });
});

describe('recommendations', () => {
  const loan = (book, student) =>
    BorrowRecord.create({
      book: book._id,
      student: student._id,
      dueDate: new Date(Date.now() + DAY)
    });

  test('counts each reader once, however many times they borrowed', async () => {
    const x = await makeBook();
    const y = await makeBook();
    const alice = await makeUser('student');
    const bob = await makeUser('student');

    await loan(x, alice);
    await loan(x, bob);
    await loan(y, alice);
    await loan(y, alice);
    await loan(y, alice);

    const res = await request(app).get(`/api/recommendations/${x._id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].book._id).toBe(String(y._id));
    expect(res.body[0].count).toBe(1);
  });

  test('does not crash when a recommended book has been deleted', async () => {
    const x = await makeBook();
    const y = await makeBook();
    const alice = await makeUser('student');

    await loan(x, alice);
    await loan(y, alice);
    await Book.deleteOne({ _id: y._id });

    const res = await request(app).get(`/api/recommendations/${x._id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('dashboard numbers', () => {
  const loan = (book, student, dueInDays) =>
    BorrowRecord.create({
      book: book._id,
      student: student._id,
      dueDate: new Date(Date.now() + dueInDays * DAY)
    });

  test('the summary matches the shelf, the loans and the overdue loans', async () => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student');
    const a = await makeBook({ totalQty: 3, availableQty: 1 });
    await makeBook({ totalQty: 1 });
    await loan(a, student, 5);
    await loan(a, student, -2); // overdue

    const res = await request(app).get('/api/analytics/summary').set(...auth(librarian));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalBooks: 2,
      totalIssued: 2,
      totalOverdue: 1,
      totalAvailableCopies: 2
    });
  });

  test('the most borrowed list puts the most popular book first', async () => {
    const student = await makeUser('student');
    const popular = await makeBook({ totalQty: 3 });
    const quiet = await makeBook({ totalQty: 3 });
    await loan(quiet, student, 5);
    await loan(popular, student, 5);
    await loan(popular, student, 5);

    const res = await request(app).get('/api/analytics/most-borrowed');

    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe(popular.title);
    expect(res.body[0].borrowCount).toBe(2);
  });
});