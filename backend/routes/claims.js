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

// Conversation continue : le client répond dans le fil
router.post("/:id/message", protect, restrictTo("client"), ctrl.clientReply);

// Rendez-vous d'intervention
const servicesTech = ["service1", "service2", "service3", "service4"];
router.post("/:id/rdv", protect, restrictTo(...servicesTech), ctrl.scheduleRdv);
router.patch("/:id/rdv", protect, restrictTo("client"), ctrl.clientUpdateRdv);
router.patch("/:id/rdv/accept", protect, restrictTo("client"), ctrl.acceptRdv);
router.patch(
  "/:id/rdv/cancel",
  protect,
  restrictTo("client", ...servicesTech),
  ctrl.cancelRdv,
);
router.patch(
  "/:id/rdv/report",
  protect,
  restrictTo(...servicesTech),
  ctrl.reportRdv,
);

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
