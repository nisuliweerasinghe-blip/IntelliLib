require('dotenv').config();

const mongoose = require('mongoose');

const REQUIRED = ['MONGO_URI', 'JWT_SECRET'];
const missing = REQUIRED.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required settings in .env: ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn('JWT_SECRET is shorter than 32 characters. Use a long random value before going live.');
}
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('EMAIL_USER or EMAIL_PASS is missing, so reservation emails will not be sent.');
}

const app = require('./app');
const { startHoldSweeper } = require('./utils/reservations');

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    startHoldSweeper();
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });