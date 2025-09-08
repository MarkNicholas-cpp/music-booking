const nodemailer = require('nodemailer');

const host = process.env.EMAIL_HOST;
const port = Number(process.env.EMAIL_PORT || 587);
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const fromName = process.env.EMAIL_FROM_NAME || 'Music Booking Team';
const fromEmail = process.env.EMAIL_FROM_EMAIL || user;

let transporter;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host,
            port,
            secure: false,
            auth: { user, pass }
        });
    }
    return transporter;
}

async function sendEmail({ to, subject, html }) {
    const tx = getTransporter();
    const from = `${fromName} <${fromEmail}>`;
    await tx.sendMail({ from, to, subject, html });
}

module.exports = { sendEmail };


