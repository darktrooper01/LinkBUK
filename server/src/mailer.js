// Sends email to students. If SMTP is not configured the message is only written to the log,
// so the rest of the system keeps working while the owner sets up a mail account.
const nodemailer = require("nodemailer");

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000,
  });
  return transporter;
}

// Returns "sent", "skipped" (mail not configured) or "failed". Never throws.
async function sendMail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) { console.log(`[mail skipped] to ${to}: ${subject}`); return "skipped"; }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
    return "sent";
  } catch (e) {
    console.error("[mail failed]", e.message);
    return "failed";
  }
}
module.exports = { sendMail };
