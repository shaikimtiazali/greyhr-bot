const nodemailer = require("nodemailer");
require("dotenv").config({ override: true, quiet: true });
const logger = require("./utils/logger");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an email via Gmail SMTP.
 * @param {string} subject - Email subject
 * @param {string} message - Plain text body
 * @param {string|null} screenshotPath - Optional path to screenshot file to attach
 */
async function sendMail(subject, message, screenshotPath = null) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    subject,
    text: message,
  };

  if (screenshotPath) {
    mailOptions.attachments = [
      {
        filename: "screenshot.png",
        path: screenshotPath,
      },
    ];
  }

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email sent: "${subject}"`);
  } catch (err) {
    logger.error("Failed to send email:", err.message);
  }
}

module.exports = sendMail;
