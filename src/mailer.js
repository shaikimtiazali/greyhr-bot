const nodemailer = require("nodemailer");
require("dotenv").config({ override: true, quiet: true });
const logger = require("./utils/logger");

async function sendMail(subject, message, screenshotPath = null) {
  // ── KEY FIX: create transporter per call, not at module load ──
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

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
    // ── Better error detail ──
    logger.error(`Failed to send email: ${err.message}`);
    logger.error(
      `Email config — user: ${process.env.EMAIL_USER}, to: ${process.env.EMAIL_TO}`,
    );
  }
}

module.exports = sendMail;
