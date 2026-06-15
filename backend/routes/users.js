const router = require("express").Router();
const { protect, restrictTo } = require("../middleware/auth");
const User = require("../models/User");

// Admin crée un compte agent
router.post("/", protect, restrictTo("admin"), async (req, res) => {
  try {
    const { nom, prenom, email, password, role } = req.body;
    const allowed = [
      "service_clientele",
      "service1",
      "service2",
      "service3",
      "service4",
    ];
    if (!allowed.includes(role))
      return res.status(400).json({ message: "Rôle invalide" });
    if (await User.findOne({ email }))
      return res.status(409).json({ message: "Email déjà utilisé" });
    const user = await User.create({
      nom,
      prenom,
      email,
      password,
      role,
      emailVerified: true,
      createdBy: req.user._id,
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lister les agents (admin)
router.get("/", protect, restrictTo("admin"), async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "client" } }).select(
      "-password",
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Modifier mobile/email (client) ou mot de passe (tous)
router.patch("/me", protect, async (req, res) => {
  try {
    const allowed = req.user.role === "client" ? ["mobile", "email"] : [];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k]) updates[k] = req.body[k];
    });
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Désactiver un compte (admin)
router.patch("/:id/toggle", protect, restrictTo("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isActive = !user.isActive;
    await user.save();
    res.json({ isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
