const Joi = require('joi');
const Booking = require('../models/Booking');
const { sendEmail } = require('../utils/email');
const { bookingApprovedTemplate, bookingRejectedTemplate } = require('../utils/emailTemplates');
const { updateBookingSchema } = require('../validations/booking');

const bookingSchema = Joi.object({
  functionName: Joi.string().trim().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  venue: Joi.string().trim().required()
});

exports.createBooking = async (req, res) => {
  try {
    const { error, value } = bookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const booking = await Booking.create({
      user: req.user.sub,
      functionName: value.functionName,
      startDate: value.startDate,
      endDate: value.endDate,
      venue: value.venue
    });

    return res.status(201).json(booking);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.sub }).sort({ createdAt: -1 });
    return res.status(200).json(bookings);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const isValidId = require('mongoose').Types.ObjectId.isValid(id);
    if (!isValidId) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }

    const booking = await Booking.findById(id).populate('user');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!booking.user.equals(req.user.sub)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { error, value } = updateBookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Apply only provided fields
    if (value.functionName !== undefined) booking.functionName = value.functionName;
    if (value.startDate !== undefined) booking.startDate = value.startDate;
    if (value.endDate !== undefined) booking.endDate = value.endDate;
    if (value.venue !== undefined) booking.venue = value.venue;

    await booking.save();
    return res.status(200).json(booking);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const isValidId = require('mongoose').Types.ObjectId.isValid(id);
    if (!isValidId) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!booking.user.equals(req.user.sub)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await booking.deleteOne();
    return res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// Admin: list all bookings
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({}).sort({ createdAt: -1 });
    return res.status(200).json(bookings);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// Admin: change booking status (confirmed | rejected)
exports.changeBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const isValidId = require('mongoose').Types.ObjectId.isValid(id);
    if (!isValidId) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }

    const { status } = req.body || {};
    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = status;
    await booking.save();

    // Send notification email to booking owner, if available
    try {
      let recipientEmail;
      let recipientName = 'there';
      if (booking.user && booking.user.email) {
        recipientEmail = booking.user.email;
        recipientName = booking.user.name || recipientName;
      } else if (booking.user) {
        const User = require('../models/User');
        const userDoc = await User.findById(booking.user);
        if (userDoc) {
          recipientEmail = userDoc.email;
          recipientName = userDoc.name || recipientName;
        }
      }
      if (recipientEmail) {
        const to = recipientEmail;
        const subject = status === 'confirmed' ? 'Booking Confirmed' : 'Booking Rejected';
        const html = status === 'confirmed'
          ? bookingApprovedTemplate({ name: recipientName, booking })
          : bookingRejectedTemplate({ name: recipientName, booking });
        await sendEmail({ to, subject, html });
      }
    } catch (emailErr) {
      // Do not fail the request if email sending fails
    }

    return res.status(200).json(booking);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};