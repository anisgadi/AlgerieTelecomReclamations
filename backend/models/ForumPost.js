const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  auteur: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  texte: { type: String, required: true, maxlength: 1000 },
  isService: { type: Boolean, default: false }, // pour le style visuel
  date: { type: Date, default: Date.now },
});

const ForumPostSchema = new mongoose.Schema(
  {
    auteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isServicePost: { type: Boolean, default: false }, // fond violet si vrai

    titre: { type: String, required: true, maxlength: 200 },
    contenu: { type: String, required: true, maxlength: 5000 },

    typeProbleme: {
      type: String,
      enum: [
        "Nouvelle Installation",
        "Link Instable",
        "Pas de tonalité téléphone",
        "Déconnexion fréquente (Link Stable)",
        "Chute de débit / Débit faible",
        "Coupure totale de service",
        "Problèmes de routage / Ping élevé",
        "Absence de couverture",
        "Problèmes de facturation / Jours non consommés",
        "Problèmes de rechargement (E-paiement non validé)",
        "Instabilité du Wi-Fi (Modem)",
        "Câbles extérieurs endommagés",
        "Autre",
      ],
      default: "Général",
    },

    // Section : 'libre' (clients) ou 'validee' (services)
    section: {
      type: String,
      enum: ["libre", "validee"],
      default: "libre",
    },

    // Si validée depuis une question libre
    valideeDepuis: { type: mongoose.Schema.Types.ObjectId, ref: "ForumPost" },
    claimSource: { type: mongoose.Schema.Types.ObjectId, ref: "Claim" },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    commentaires: [CommentSchema],

    tags: [String],
    photos: [{ type: String }],
  },
  { timestamps: true },
);

// Index pour les filtres croisés
ForumPostSchema.index({ section: 1, typeProbleme: 1, createdAt: -1 });

module.exports = mongoose.model("ForumPost", ForumPostSchema);
