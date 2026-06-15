const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware de vérification JWT
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Non autorisé — token manquant" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user)
      return res.status(401).json({ message: "Utilisateur introuvable" });
    next();
  } catch {
    res.status(401).json({ message: "Token invalide" });
  }
};

// Factory de restriction par rôle(s)
const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Accès refusé — rôle insuffisant" });
    }
    next();
  };

module.exports = { protect, restrictTo };
