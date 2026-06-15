const router = require("express").Router();
const ctrl = require("../controllers/claimController");
const { protect, restrictTo } = require("../middleware/auth");
const upload = require("../middleware/upload");

const services = [
  "service_clientele",
  "service1",
  "service2",
  "service3",
  "service4",
];

router.post(
  "/",
  protect,
  restrictTo("client"),
  upload.array("photos", 5),
  ctrl.create,
);
router.get("/", protect, ctrl.list);
router.patch(
  "/:id/assign",
  protect,
  restrictTo("service_clientele"),
  ctrl.assign,
);
router.patch("/:id/respond", protect, restrictTo(...services), ctrl.respond);
router.patch("/:id/feedback", protect, restrictTo("client"), ctrl.feedback);
router.patch(
  "/:id/return",
  protect,
  restrictTo(...services),
  ctrl.returnToClientele,
);
router.post(
  "/:id/contact",
  protect,
  restrictTo(...services, "admin"),
  ctrl.contactClient,
);

module.exports = router;
