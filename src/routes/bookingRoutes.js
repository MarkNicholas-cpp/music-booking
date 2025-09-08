const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createBooking, getMyBookings, updateBooking, deleteBooking } = require('../controllers/bookingController');

// Simple JWT auth middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

router.post('/', authenticate, createBooking);
router.get('/', authenticate, getMyBookings);
router.put('/:id', authenticate, updateBooking);
router.delete('/:id', authenticate, deleteBooking);

module.exports = router;
