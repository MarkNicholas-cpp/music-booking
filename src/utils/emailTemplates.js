function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function bookingApprovedTemplate({ name, booking }) {
    return `
  <div style="font-family:Arial,sans-serif;">
    <h2>Booking Confirmed 🎉</h2>
    <p>Hi ${name},</p>
    <p>Your booking has been <strong>confirmed</strong>. Here are the details:</p>
    <ul>
      <li><strong>Function:</strong> ${booking.functionName}</li>
      <li><strong>Venue:</strong> ${booking.venue}</li>
      <li><strong>Start:</strong> ${formatDate(booking.startDate)}</li>
      <li><strong>End:</strong> ${formatDate(booking.endDate)}</li>
      <li><strong>Status:</strong> ${booking.status}</li>
    </ul>
    <p>Thanks for choosing us — see you at the event!</p>
  </div>`;
}

function bookingRejectedTemplate({ name, booking }) {
    return `
  <div style="font-family:Arial,sans-serif;">
    <h2>Booking Rejected ❌</h2>
    <p>Hi ${name},</p>
    <p>We're sorry to inform you that your booking was <strong>rejected</strong>.</p>
    <ul>
      <li><strong>Function:</strong> ${booking.functionName}</li>
      <li><strong>Venue:</strong> ${booking.venue}</li>
      <li><strong>Start:</strong> ${formatDate(booking.startDate)}</li>
      <li><strong>End:</strong> ${formatDate(booking.endDate)}</li>
      <li><strong>Status:</strong> ${booking.status}</li>
    </ul>
    <p>You can try booking a different slot or venue. If you need assistance, just reply to this email.</p>
  </div>`;
}

module.exports = { bookingApprovedTemplate, bookingRejectedTemplate };


