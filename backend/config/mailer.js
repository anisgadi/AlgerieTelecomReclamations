const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envoie un email générique
 * @param {string} to - Destinataire
 * @param {string} subject - Sujet
 * @param {string} html - Corps HTML
 */
const sendMail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"Algérie Télécom" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

/**
 * Template email de vérification
 */
const sendVerificationEmail = (to, code) =>
  sendMail(
    to,
    "Confirmation de votre compte — Algérie Télécom",
    `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px;">
      <img src="https://www.algerietelecom.dz/img/logo.png" alt="Algérie Télécom" height="40"/>
      <h2 style="color:#7600dc;">Confirmez votre adresse email</h2>
      <p>Votre code de confirmation est :</p>
      <div style="font-size:32px;font-weight:bold;color:#7600dc;letter-spacing:8px;text-align:center;padding:16px;">
        ${code}
      </div>
      <p style="color:#666;font-size:12px;">Ce code expire dans 24 heures.</p>
    </div>
  `,
  );

/**
 * Template notification réclamation
 */
const sendClaimNotification = (to, message) =>
  sendMail(
    to,
    "Mise à jour de votre réclamation — Algérie Télécom",
    `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;background:#f9f9f9;border-radius:8px;">
      <img src="https://www.algerietelecom.dz/img/logo.png" alt="Algérie Télécom" height="40"/>
      <h2 style="color:#7600dc;">Mise à jour de votre réclamation</h2>
      <p>${message}</p>
    </div>
  `,
  );

module.exports = { sendMail, sendVerificationEmail, sendClaimNotification };
