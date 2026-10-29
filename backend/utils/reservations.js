const mongoose = require('mongoose');
const Book = require('../models/Book');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const sendEmail = require('./sendEmail');

const HOLD_DAYS = 3;
const DAY = 24 * 60 * 60 * 1000;

async function passCopyOn(bookId, session) {
  const next = await Reservation.findOneAndUpdate(
    { book: bookId, status: 'waiting' },
    { $set: { status: 'ready', readyAt: new Date() } },
    { sort: { requestedAt: 1 }, new: true, session }
  );

  if (next) return next;

  await Book.updateOne({ _id: bookId }, { $inc: { availableQty: 1 } }, { session });
  return null;
}

async function notifyReady(reservation) {
  try {
    const [student, book] = await Promise.all([
      User.findById(reservation.student).select('name email'),
      Book.findById(reservation.book).select('title')
    ]);

    if (!student || !book) return;

    sendEmail(
      student.email,
      'Your reserved book is ready!',
      `Hi ${student.name}, "${book.title}" is now set aside for you. Please collect it from the library desk within ${HOLD_DAYS} days, or it will go to the next person on the waiting list.`
    );
  } catch (err) {
    console.error('Could not send the reservation email:', err.message);
  }
}

async function expireOverdueHolds() {
  const cutoff = new Date(Date.now() - HOLD_DAYS * DAY);
  const overdue = await Reservation.find({
    status: 'ready',
    readyAt: { $lt: cutoff }
  }).select('book');

  let released = 0;

  for (const item of overdue) {
    const session = await mongoose.startSession();
    let next = null;
    let expired = false;

    try {
      session.startTransaction();

      const claimed = await Reservation.findOneAndUpdate(
        { _id: item._id, status: 'ready' },
        { $set: { status: 'expired' } },
        { session }
      );

      if (claimed) {
        next = await passCopyOn(item.book, session);
      }

      await session.commitTransaction();
      expired = Boolean(claimed);
    } catch (err) {
      await session.abortTransaction().catch(() => {});
      next = null;
      console.error('Could not expire a reservation hold:', err.message);
    } finally {
      session.endSession();
    }

    if (expired) released++;
    if (next) await notifyReady(next);
  }

  return released;
}

function startHoldSweeper() {
  const run = async () => {
    try {
      const released = await expireOverdueHolds();
      if (released > 0) {
        console.log(`Released ${released} expired reservation hold(s)`);
      }
    } catch (err) {
      console.error('Reservation sweep failed:', err.message);
    }
  };

  run();
  setInterval(run, 60 * 60 * 1000);
}

module.exports = { HOLD_DAYS, passCopyOn, notifyReady, expireOverdueHolds, startHoldSweeper };