const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Book = require('../models/Book');
const Payment = require('../models/Payment');
const { makeUser, makeBook, auth } = require('./helpers');

describe('registration', () => {
  test('always creates a student, even when the request asks for admin', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ name: 'Sneaky', email: 'sneaky@test.com', password: 'abcdef', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('student');
    expect((await User.findOne({ email: 'sneaky@test.com' })).role).toBe('student');
  });

  test('never sends the password back, and stores only a hash', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ name: 'Nimal', email: 'nimal@test.com', password: 'abcdef' });

    expect(res.body).not.toHaveProperty('password');

    const stored = await User.findOne({ email: 'nimal@test.com' });
    expect(stored.password).not.toBe('abcdef');
    expect(stored.password).toMatch(/^\$2[aby]\$/);
  });

  test('rejects a password shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ name: 'Nimal', email: 'nimal@test.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 6/i);
  });

  test('treats emails that differ only in capitals as the same account', async () => {
    await request(app)
      .post('/api/users/register')
      .send({ name: 'Nimal', email: 'Nimal@Test.com', password: 'abcdef' });

    const res = await request(app)
      .post('/api/users/register')
      .send({ name: 'Nimal Again', email: 'nimal@test.com', password: 'abcdef' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already registered/i);
  });
});

describe('signing in', () => {
  test('returns a token and never a password hash', async () => {
    const user = await makeUser('student');

    const res = await request(app)
      .post('/api/users/login')
      .send({ email: user.email, password: 'secret123' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.role).toBe('student');
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('gives the same vague answer for a wrong password and an unknown email', async () => {
    const user = await makeUser('student');

    const wrongPassword = await request(app)
      .post('/api/users/login')
      .send({ email: user.email, password: 'nope' });
    const unknownEmail = await request(app)
      .post('/api/users/login')
      .send({ email: 'ghost@test.com', password: 'secret123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
  });
});

describe('who can reach what', () => {
  test('a request without a token is refused', async () => {
    const res = await request(app).get('/api/users');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  test('students cannot list users; staff can, without password hashes', async () => {
    const student = await makeUser('student');
    const librarian = await makeUser('librarian');

    const denied = await request(app).get('/api/users').set(...auth(student));
    expect(denied.status).toBe(403);

    const allowed = await request(app).get('/api/users').set(...auth(librarian));
    expect(allowed.status).toBe(200);
    expect(allowed.body).toHaveLength(2);
    allowed.body.forEach((u) => expect(u).not.toHaveProperty('password'));
  });

  test('only an admin can create staff accounts', async () => {
    const librarian = await makeUser('librarian');
    const admin = await makeUser('admin');
    const body = { name: 'New Lib', email: 'newlib@test.com', password: 'abcdef', role: 'librarian' };

    const byLibrarian = await request(app).post('/api/users/staff').set(...auth(librarian)).send(body);
    expect(byLibrarian.status).toBe(403);

    const byAdmin = await request(app).post('/api/users/staff').set(...auth(admin)).send(body);
    expect(byAdmin.status).toBe(201);
    expect(byAdmin.body.role).toBe('librarian');

    const badRole = await request(app)
      .post('/api/users/staff')
      .set(...auth(admin))
      .send({ ...body, email: 'other@test.com', role: 'student' });
    expect(badRole.status).toBe(400);
  });

  test('only an admin can delete a book', async () => {
    const librarian = await makeUser('librarian');
    const admin = await makeUser('admin');
    const book = await makeBook();

    const byLibrarian = await request(app).delete(`/api/books/${book._id}`).set(...auth(librarian));
    expect(byLibrarian.status).toBe(403);
    expect(await Book.countDocuments()).toBe(1);

    const byAdmin = await request(app).delete(`/api/books/${book._id}`).set(...auth(admin));
    expect(byAdmin.status).toBe(200);
    expect(await Book.countDocuments()).toBe(0);
  });

  test('the waiting list (which shows other students\' emails) is staff only', async () => {
    const student = await makeUser('student');
    const librarian = await makeUser('librarian');
    const book = await makeBook({ totalQty: 1, availableQty: 0 });

    const denied = await request(app).get(`/api/reservations/${book._id}`).set(...auth(student));
    expect(denied.status).toBe(403);

    const allowed = await request(app).get(`/api/reservations/${book._id}`).set(...auth(librarian));
    expect(allowed.status).toBe(200);
  });

  test('a student can read only their own payment history', async () => {
    const mine = await makeUser('student');
    const other = await makeUser('student');
    const librarian = await makeUser('librarian');

    const stolen = await request(app).get(`/api/payments/${other._id}`).set(...auth(mine));
    expect(stolen.status).toBe(403);

    const own = await request(app).get(`/api/payments/${mine._id}`).set(...auth(mine));
    expect(own.status).toBe(200);

    const byStaff = await request(app).get(`/api/payments/${other._id}`).set(...auth(librarian));
    expect(byStaff.status).toBe(200);
  });

  test.each([
    ['post', '/api/borrow/issue'],
    ['post', '/api/borrow/return'],
    ['post', '/api/payments'],
    ['post', '/api/categories'],
    ['get', '/api/analytics/summary'],
    ['get', '/api/analytics/overdue']
  ])('keeps %s %s for staff only', async (method, path) => {
    const student = await makeUser('student');
    const req = request(app)[method](path).set(...auth(student));

    const res = method === 'post' ? await req.send({}) : await req;

    expect(res.status).toBe(403);
  });
});

describe('sessions', () => {
  test('a demoted user loses staff powers immediately', async () => {
    const librarian = await makeUser('librarian');
    const header = auth(librarian); // this token still says "librarian"

    await User.updateOne({ _id: librarian._id }, { role: 'student' });

    const res = await request(app).get('/api/users').set(...header);
    expect(res.status).toBe(403);
  });

  test('the token of a deleted account stops working', async () => {
    const user = await makeUser('student');
    const header = auth(user);

    await User.deleteOne({ _id: user._id });

    const res = await request(app).get('/api/users/me').set(...header);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/no longer exists/i);
  });

  test('a token issued before a password change is rejected', async () => {
    const user = await makeUser('student');
    const oldHeader = auth(user, { ageSeconds: 120 });

    await User.updateOne({ _id: user._id }, { passwordChangedAt: new Date() });

    const stale = await request(app).get('/api/users/me').set(...oldHeader);
    expect(stale.status).toBe(401);
    expect(stale.body.error).toMatch(/password was changed/i);

    const fresh = await request(app).get('/api/users/me').set(...auth(user));
    expect(fresh.status).toBe(200);
  });
});

describe('changing a password', () => {
  const change = (header, currentPassword, newPassword) =>
    request(app)
      .put('/api/users/me/password')
      .set(...header)
      .send({ currentPassword, newPassword });

  test('a wrong current password is refused with 400, so the user stays signed in', async () => {
    const user = await makeUser('student');

    const res = await change(auth(user), 'wrong-one', 'brandnew1');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not correct/i);
  });

  test('the new password must be different from the current one', async () => {
    const user = await makeUser('student');

    const res = await change(auth(user), 'secret123', 'secret123');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/different/i);
  });

  test('changes the password, ends old sessions, and returns a fresh token', async () => {
    const user = await makeUser('student');
    const oldHeader = auth(user, { ageSeconds: 120 });

    const res = await change(oldHeader, 'secret123', 'brandnew1');
    expect(res.status).toBe(200);

    const oldSession = await request(app).get('/api/users/me').set(...oldHeader);
    expect(oldSession.status).toBe(401);

    const newSession = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${res.body.token}`);
    expect(newSession.status).toBe(200);

    const newLogin = await request(app)
      .post('/api/users/login')
      .send({ email: user.email, password: 'brandnew1' });
    expect(newLogin.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/users/login')
      .send({ email: user.email, password: 'secret123' });
    expect(oldLogin.status).toBe(401);
  });
});

describe('payments', () => {
  const pay = (librarian, student, amount) =>
    request(app)
      .post('/api/payments')
      .set(...auth(librarian))
      .send({ studentId: student._id, amount });

  test('records a payment and lowers the balance', async () => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student', { outstandingFine: 100 });

    const res = await pay(librarian, student, 40);

    expect(res.status).toBe(201);
    expect(res.body.remainingFine).toBe(60);
    expect((await User.findById(student._id)).outstandingFine).toBe(60);
    expect(await Payment.countDocuments()).toBe(1);
  });

  test.each([[0], [-50], ['abc']])('rejects the amount %p and changes nothing', async (amount) => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student', { outstandingFine: 100 });

    const res = await pay(librarian, student, amount);

    expect(res.status).toBe(400);
    expect((await User.findById(student._id)).outstandingFine).toBe(100);
    expect(await Payment.countDocuments()).toBe(0);
  });

  test('rejects paying more than is owed', async () => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student', { outstandingFine: 100 });

    const res = await pay(librarian, student, 500);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exceeds/i);
    expect((await User.findById(student._id)).outstandingFine).toBe(100);
    expect(await Payment.countDocuments()).toBe(0);
  });

  test('rejects an unknown student', async () => {
    const librarian = await makeUser('librarian');

    const res = await pay(librarian, { _id: new mongoose.Types.ObjectId() }, 10);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('two simultaneous payments cannot push the balance below zero', async () => {
    const librarian = await makeUser('librarian');
    const student = await makeUser('student', { outstandingFine: 100 });

    const results = await Promise.all([
      pay(librarian, student, 100),
      pay(librarian, student, 100)
    ]);

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect((await User.findById(student._id)).outstandingFine).toBe(0);
    expect(await Payment.countDocuments()).toBe(1);
  });
});