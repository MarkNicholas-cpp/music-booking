require('dotenv').config({ debug: false });
const express = require('express');
const connectDB = require('./config/db');

const app = express();

const authRoutes = require('./routes/authRoutes');

// Connect to DB
connectDB();

// Middleware (basic JSON parsing for future use)
app.use(express.json());

// Health route
app.get('/', (req, res) => {
  res.json({ message: 'API running' });
});
app.use('/api/auth', authRoutes);

const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/bookings', bookingRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

module.exports = app;


