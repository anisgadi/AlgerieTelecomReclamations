const router = require("express").Router();
const { protect, restrictTo } = require("../middleware/auth");
const ForumPost = require("../models/ForumPost");
const upload = require("../middleware/upload");

const services = [
  "service_clientele",
  "service1",
  "service2",
  "service3",
  "service4",
];

// Lister les posts avec filtres
router.get("/", async (req, res) => {
  try {
    const { section, typeProbleme, sort = "-createdAt" } = req.query;
    const query = {};
    if (section) query.section = section;
    if (typeProbleme) query.typeProbleme = typeProbleme;
    const posts = await ForumPost.find(query)
      .populate("auteur", "nom prenom role")
      .populate("commentaires.auteur", "nom prenom role")
      .sort(sort)
      .limit(50);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Créer un post (avec ou sans photos)
router.post("/", protect, upload.array("photos", 5), async (req, res) => {
  try {
    const { titre, contenu, typeProbleme, section } = req.body;

    if (!titre || !contenu)
      return res.status(400).json({ message: "Titre et contenu obligatoires" });

    const isServicePost =
      services.includes(req.user.role) || req.user.role === "admin";

    if (section === "validee" && !isServicePost)
      return res.status(403).json({ message: "Réservé aux services" });

    const photos = req.files?.map((f) => f.filename) || [];

    const post = await ForumPost.create({
      auteur: req.user._id,
      isServicePost,
      titre,
      contenu,
      typeProbleme: typeProbleme || "Général",
      photos,
      section: isServicePost ? section || "validee" : "libre",
    });

    // Repopuler avant de renvoyer
    await post.populate("auteur", "nom prenom role");
    res.status(201).json(post);
  } catch (err) {
    console.error("Erreur création post:", err);
    res.status(500).json({ message: err.message });
  }
});

// Like / Unlike
router.patch("/:id/like", protect, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post introuvable" });
    const idx = post.likes.indexOf(req.user._id);
    if (idx === -1) post.likes.push(req.user._id);
    else post.likes.splice(idx, 1);
    await post.save();
    res.json({ likes: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Ajouter un commentaire
router.post("/:id/comment", protect, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post introuvable" });
    post.commentaires.push({
      auteur: req.user._id,
      texte: req.body.texte,
      isService: services.includes(req.user.role),
    });
    await post.save();
    await post.populate("auteur", "nom prenom role");
    await post.populate("commentaires.auteur", "nom prenom role");
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Valider une question libre (service uniquement)
router.patch(
  "/:id/valider",
  protect,
  restrictTo(...services, "admin"),
  async (req, res) => {
    try {
      const post = await ForumPost.findById(req.params.id);
      if (!post) return res.status(404).json({ message: "Post introuvable" });
      post.section = "validee";
      post.isServicePost = true;
      await post.save();
      res.json(post);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// Supprimer un post
router.delete("/:id", protect, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post introuvable" });
    const canDelete =
      ["admin", ...services].includes(req.user.role) ||
      post.auteur.toString() === req.user._id.toString();
    if (!canDelete) return res.status(403).json({ message: "Non autorisé" });
    await post.deleteOne();
    res.json({ message: "Supprimé" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supprimer un commentaire
router.delete("/:id/comment/:commentId", protect, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post introuvable" });
    const canDelete = ["admin", ...services].includes(req.user.role);
    if (!canDelete) return res.status(403).json({ message: "Non autorisé" });
    post.commentaires = post.commentaires.filter(
      (c) => c._id.toString() !== req.params.commentId,
    );
    await post.save();
    res.json({ message: "Commentaire supprimé" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
