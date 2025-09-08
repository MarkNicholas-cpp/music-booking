const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getAllBookings, changeBookingStatus } = require('../controllers/bookingController');
const requireRole = require('../middlewares/requireRole');

// Reuse the same simple JWT auth middleware from bookings routes
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

router.get('/bookings', authenticate, requireRole('admin'), getAllBookings);
router.patch('/bookings/:id', authenticate, requireRole('admin'), changeBookingStatus);

module.exports = router;


