const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendVerificationEmail } = require("../config/mailer");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      codeImmatriculation,
      telephone,
      mobile,
      email,
      password,
      wilaya,
      adresse,
      typeAbonnement,
    } = req.body;

    if (!nom || !prenom || !email || !password)
      return res.status(400).json({ message: "Champs obligatoires manquants" });

    if (await User.findOne({ email }))
      return res.status(409).json({ message: "Email déjà utilisé" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({
      nom,
      prenom,
      codeImmatriculation,
      telephone,
      mobile,
      email,
      password,
      wilaya,
      adresse,
      typeAbonnement,
      role: "client",
      emailVerificationCode: code,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Tentative d'envoi email — ne bloque pas si ça échoue
    try {
      await sendVerificationEmail(email, code);
    } catch (mailErr) {
      console.warn("Email non envoyé (SMTP non configuré) :", mailErr.message);
    }

    res.status(201).json({
      message: "Compte créé. Vérifiez votre email.",
      userId: user._id,
      // En dev : on retourne le code directement si SMTP absent
      devCode: process.env.NODE_ENV !== "production" ? code : undefined,
    });
  } catch (err) {
    console.error("Erreur register:", err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/verify-email
exports.verifyEmail = async (req, res) => {
  try {
    const { userId, code } = req.body;
    const user = await User.findById(userId);

    if (!user || user.emailVerificationCode !== code)
      return res.status(400).json({ message: "Code invalide" });

    if (user.emailVerificationExpires < Date.now())
      return res.status(400).json({ message: "Code expiré" });

    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.json({ message: "Email vérifié", token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: "Identifiants incorrects" });

    if (!user.emailVerified && user.role === "client")
      return res.status(403).json({ message: "Email non vérifié" });

    if (!user.isActive)
      return res.status(403).json({ message: "Compte désactivé" });

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await user.comparePassword(oldPassword)))
      return res.status(400).json({ message: "Ancien mot de passe incorrect" });

    user.password = newPassword;
    await user.save();
    res.json({ message: "Mot de passe mis à jour" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
