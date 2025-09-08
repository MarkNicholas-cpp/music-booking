const Joi = require('joi');

// All fields optional; if both dates provided, endDate must be after startDate
const updateBookingSchema = Joi.object({
    functionName: Joi.string().trim(),
    startDate: Joi.date(),
    endDate: Joi.date(),
    venue: Joi.string().trim()
})
    .min(1)
    .custom((value, helpers) => {
        if (value.startDate && value.endDate) {
            const start = new Date(value.startDate).getTime();
            const end = new Date(value.endDate).getTime();
            if (!(end > start)) {
                return helpers.error('any.invalid', {
                    message: 'endDate must be after startDate'
                });
            }
        }
        return value;
    }, 'start/end date relationship');

module.exports = { updateBookingSchema };


