const mongoose = require("mongoose");

// Sous-schéma pour l'historique des réponses
const ResponseSchema = new mongoose.Schema({
  service: { type: String }, // ex: 'service1'
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  texte: { type: String, required: true },
  date: { type: Date, default: Date.now },
  satisfait: { type: Boolean, default: null }, // null = en attente, true/false = réponse client
});

const ClaimSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Contenu
    typeReclamation: {
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
    },
    texte: { type: String, required: true, maxlength: 2000 },
    photos: [{ type: String }], // chemins des fichiers (max 5)

    // Workflow
    statut: {
      type: String,
      enum: [
        "deposee", // Client vient de déposer
        "en_triage", // Service clientèle l'examine
        "dirigee_service", // Routée vers un service technique
        "en_traitement", // Service technique la prend en charge
        "reponse_envoyee", // Service a répondu, attente avis client
        "mal_traitee", // Client non satisfait, relancée
        "resolue", // Client satisfait
        "archivee", // Archivage final
      ],
      default: "deposee",
    },

    serviceAssigne: {
      type: String,
      enum: [
        "service_clientele",
        "service1",
        "service2",
        "service3",
        "service4",
      ],
      default: "service_clientele",
    },

    // Marqueur spécial
    marqueurMalTraite: { type: Boolean, default: false },

    // Suivi
    historique: [ResponseSchema],
    reponseActuelle: ResponseSchema,

    // Coordonnées géo du client (snapshot au moment du dépôt)
    geoLocation: {
      lat: Number,
      lng: Number,
      wilaya: String,
    },

    // Publication forum
    publieeForumId: { type: mongoose.Schema.Types.ObjectId, ref: "ForumPost" },

    // Auto-archivage : 15j après réponse
    dateReponse: { type: Date },

    // Pris en charge par admin (marqueur vert sur carte)
    priseEnChargeAdmin: { type: Boolean, default: false },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Calcul du pourcentage de progression
ClaimSchema.virtual("progressionPct").get(function () {
  const map = {
    deposee: 10,
    en_triage: 25,
    dirigee_service: 40,
    en_traitement: 55,
    reponse_envoyee: 75,
    mal_traitee: 55,
    resolue: 100,
    archivee: 100,
  };
  return map[this.statut] || 0;
});

ClaimSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Claim", ClaimSchema);
