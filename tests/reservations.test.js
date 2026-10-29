const request = require('supertest');
const app = require('../app');
const Book = require('../models/Book');
const Reservation = require('../models/Reservation');
const sendEmail = require('../utils/sendEmail');
const { expireOverdueHolds } = require('../utils/reservations');
const { DAY, makeUser, makeBook, auth, eventually } = require('./helpers');

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

const reserve = (student, book) =>
  request(app)
    .post('/api/reservations')
    .set(...auth(student))
    .send({ bookId: book._id });

const cancel = (student, reservationId) =>
  request(app)
    .delete(`/api/reservations/${reservationId}`)
    .set(...auth(student));

async function scene() {
  const librarian = await makeUser('librarian');
  const saman = await makeUser('student');
  const nimal = await makeUser('student');
  const kamal = await makeUser('student');
  const book = await makeBook({ totalQty: 1 });

  const loan = await issue(librarian, book, saman);

  return { librarian, saman, nimal, kamal, book, loanId: loan.body.record._id };
}

describe('joining the waiting list', () => {
  test('numbers students in the order they asked', async () => {
    const { nimal, kamal, book } = await scene();

    const first = await reserve(nimal, book);
    const second = await reserve(kamal, book);

    expect(first.status).toBe(201);
    expect(first.body.queuePosition).toBe(1);
    expect(second.body.queuePosition).toBe(2);
  });

  test('is refused while a copy is on the shelf', async () => {
    const nimal = await makeUser('student');
    const book = await makeBook({ totalQty: 1 });

    const res = await reserve(nimal, book);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/on the shelf/i);
  });

  test('is refused twice for the same book', async () => {
    const { nimal, book } = await scene();

    await reserve(nimal, book);
    const again = await reserve(nimal, book);

    expect(again.status).toBe(400);
    expect(again.body.error).toMatch(/already have an active reservation/i);
  });

  test('is refused for a book the student already has', async () => {
    const { saman, book } = await scene();

    const res = await reserve(saman, book);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already have this book/i);
  });

  test('is refused for staff accounts', async () => {
    const librarian = await makeUser('librarian');
    const book = await makeBook({ totalQty: 1, availableQty: 0 });

    const res = await reserve(librarian, book);

    expect(res.status).toBe(403);
  });
});

describe('when a copy comes back', () => {
  test('it is held for the first person in line, not put on the shelf', async () => {
    const { librarian, nimal, kamal, book, loanId } = await scene();
    await reserve(nimal, book);
    await reserve(kamal, book);

    const res = await giveBack(librarian, loanId);

    expect(res.body.handedToReservation).toBe(true);
    expect((await Book.findById(book._id)).availableQty).toBe(0);

    const first = await Reservation.findOne({ student: nimal._id });
    const second = await Reservation.findOne({ student: kamal._id });
    expect(first.status).toBe('ready');
    expect(first.readyAt).toBeInstanceOf(Date);
    expect(second.status).toBe('waiting');
  });

  test('the student whose copy is ready gets an email', async () => {
    const { librarian, nimal, book, loanId } = await scene();
    await reserve(nimal, book);

    await giveBack(librarian, loanId);

    await eventually(() =>
      expect(sendEmail).toHaveBeenCalledWith(
        nimal.email,
        expect.any(String),
        expect.stringContaining(book.title)
      )
    );
  });
});

describe('collecting a held copy', () => {
  test('only the student it is held for can have it', async () => {
    const { librarian, nimal, kamal, book, loanId } = await scene();
    await reserve(nimal, book);
    await reserve(kamal, book);
    await giveBack(librarian, loanId);

    const wrongStudent = await issue(librarian, book, kamal);
    expect(wrongStudent.status).toBe(400);
    expect(wrongStudent.body.error).toMatch(/no copies/i);

    const rightStudent = await issue(librarian, book, nimal);
    expect(rightStudent.status).toBe(201);
    expect(rightStudent.body.collectedReservation).toBe(true);
    expect((await Reservation.findOne({ student: nimal._id })).status).toBe('collected');
    expect((await Book.findById(book._id)).availableQty).toBe(0);
  });

  test('the copy passes down the line, and is shelved when nobody is left', async () => {
    const { librarian, nimal, kamal, book, loanId } = await scene();
    await reserve(nimal, book);
    await reserve(kamal, book);

    await giveBack(librarian, loanId); // held for Nimal
    const nimalLoan = await issue(librarian, book, nimal);

    const passed = await giveBack(librarian, nimalLoan.body.record._id); // held for Kamal
    expect(passed.body.handedToReservation).toBe(true);
    expect((await Reservation.findOne({ student: kamal._id })).status).toBe('ready');

    const kamalLoan = await issue(librarian, book, kamal);
    const last = await giveBack(librarian, kamalLoan.body.record._id);

    expect(last.body.handedToReservation).toBe(false);
    expect((await Book.findById(book._id)).availableQty).toBe(1);
  });
});

describe('leaving the waiting list', () => {
  test('a waiting student can leave, and the others move up', async () => {
    const { nimal, kamal, book } = await scene();
    const first = await reserve(nimal, book);
    await reserve(kamal, book);

    const res = await cancel(nimal, first.body._id);

    expect(res.status).toBe(200);
    expect((await Book.findById(book._id)).availableQty).toBe(0);

    const mine = await request(app).get('/api/reservations/mine').set(...auth(kamal));
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].position).toBe(1);
  });

  test('giving up a held copy passes it to the next person', async () => {
    const { librarian, nimal, kamal, book, loanId } = await scene();
    const first = await reserve(nimal, book);
    await reserve(kamal, book);
    await giveBack(librarian, loanId); // held for Nimal

    const res = await cancel(nimal, first.body._id);

    expect(res.status).toBe(200);
    expect((await Reservation.findOne({ student: kamal._id })).status).toBe('ready');
    expect((await Book.findById(book._id)).availableQty).toBe(0);
  });

  test('giving up a held copy shelves it when nobody else is waiting', async () => {
    const { librarian, nimal, book, loanId } = await scene();
    const first = await reserve(nimal, book);
    await giveBack(librarian, loanId);

    await cancel(nimal, first.body._id);

    expect((await Book.findById(book._id)).availableQty).toBe(1);
  });

  test('a student cannot cancel someone else\'s reservation', async () => {
    const { nimal, kamal, book } = await scene();
    const first = await reserve(nimal, book);

    const res = await cancel(kamal, first.body._id);

    expect(res.status).toBe(400);
    expect((await Reservation.findById(first.body._id)).status).toBe('waiting');
  });
});

describe('holds that are not collected', () => {
  test('expire after 3 days and pass the copy on', async () => {
    const { librarian, nimal, kamal, book, loanId } = await scene();
    await reserve(nimal, book);
    await reserve(kamal, book);
    await giveBack(librarian, loanId);
    await Reservation.updateOne({ student: nimal._id }, { readyAt: new Date(Date.now() - 4 * DAY) });

    const released = await expireOverdueHolds();

    expect(released).toBe(1);
    expect((await Reservation.findOne({ student: nimal._id })).status).toBe('expired');
    expect((await Reservation.findOne({ student: kamal._id })).status).toBe('ready');
    expect((await Book.findById(book._id)).availableQty).toBe(0);
  });

  test('put the copy back on the shelf when nobody else is waiting', async () => {
    const { librarian, nimal, book, loanId } = await scene();
    await reserve(nimal, book);
    await giveBack(librarian, loanId);
    await Reservation.updateOne({ student: nimal._id }, { readyAt: new Date(Date.now() - 4 * DAY) });

    await expireOverdueHolds();

    expect((await Book.findById(book._id)).availableQty).toBe(1);
  });

  test('are left alone while still inside the 3 days', async () => {
    const { librarian, nimal, book, loanId } = await scene();
    await reserve(nimal, book);
    await giveBack(librarian, loanId);
    await Reservation.updateOne({ student: nimal._id }, { readyAt: new Date(Date.now() - 2 * DAY) });

    const released = await expireOverdueHolds();

    expect(released).toBe(0);
    expect((await Reservation.findOne({ student: nimal._id })).status).toBe('ready');
  });
});