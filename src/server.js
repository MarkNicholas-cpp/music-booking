require('dotenv').config({ debug: false });
const express = require('express');
const connectDB = require('./config/db');

const app = express();

const cors = require("cors");

const allowedOrigins = [
  "http://localhost:5173", // Dev frontend
  "http://10.193.138.212:5173/"
  // "https://your-frontend-domain.com" // Your deployed frontend (add later)
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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


