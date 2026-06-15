const router = require("express").Router();
const ctrl = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/register", ctrl.register);
router.post("/verify-email", ctrl.verifyEmail);
router.post("/login", ctrl.login);
router.patch("/change-password", protect, ctrl.changePassword);
router.get("/me", protect, (req, res) => res.json(req.user));

module.exports = router;
