require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('Library System API is running');
});

const PORT = process.env.PORT || 5000;

const bookRoutes = require('./routes/bookRoutes');
app.use('/api/books', bookRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const borrowRoutes = require('./routes/borrowRoutes');
app.use('/api/borrow', borrowRoutes);

const reservationRoutes = require('./routes/reservationRoutes');
app.use('/api/reservations', reservationRoutes);

const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);

const recommendationRoutes = require('./routes/recommendationRoutes');
app.use('/api/recommendations', recommendationRoutes);

const analyticsRoutes = require('./routes/analyticsRoutes');
app.use('/api/analytics', analyticsRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



