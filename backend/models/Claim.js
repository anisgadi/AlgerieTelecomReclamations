const mongoose = require("mongoose");

// Sous-schéma pour l'historique des réponses
const ResponseSchema = new mongoose.Schema({
  service: { type: String }, // ex: 'service1'
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  texte: { type: String, required: true },
  date: { type: Date, default: Date.now },
  satisfait: { type: Boolean, default: null }, // null = en attente, true/false = réponse client
});

// Sous-schéma pour la conversation continue client <-> service technique.
// Permet l'échange de messages jusqu'à résolution.
const MessageSchema = new mongoose.Schema({
  expediteur: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  // role de l'expéditeur : 'client' | 'service1'..'service4' | 'service_clientele'
  role: { type: String, required: true },
  texte: { type: String, required: true, maxlength: 2000 },
  // 'message' = écrit par un humain, 'systeme' = événement auto (RDV, intervention...)
  type: { type: String, enum: ["message", "systeme"], default: "message" },
  date: { type: Date, default: Date.now },
});

// Sous-schéma pour le compte-rendu d'intervention (rempli après le RDV)
const InterventionSchema = new mongoose.Schema({
  effectuee: { type: Boolean, default: false },
  compteRendu: { type: String, maxlength: 2000 },
  note: { type: Number, min: 1, max: 5 }, // appréciation de l'intervention par l'agent
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  date: { type: Date },
});

// Sous-schéma pour le rendez-vous d'intervention
const RendezVousSchema = new mongoose.Schema({
  date: { type: Date }, // créneau planifié (date + heure)
  statut: {
    type: String,
    // propose = proposé par l'agent, en attente du client
    // confirme = accepté/choisi par le client
    // annule = annulé par l'une des parties
    // termine = intervention notée (RDV passé)
    enum: ["propose", "confirme", "annule", "termine"],
  },
  proposePar: { type: String }, // role de la dernière personne ayant fixé le créneau
  historiqueDates: [
    {
      date: Date,
      par: String, // role
      le: { type: Date, default: Date.now },
    },
  ],
  intervention: { type: InterventionSchema, default: () => ({}) },
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
    urgente: { type: Boolean, default: false },

    // Suivi
    historique: [ResponseSchema],
    reponseActuelle: ResponseSchema,

    // Conversation continue client <-> service (échange jusqu'à résolution)
    conversation: [MessageSchema],

    // Rendez-vous d'intervention planifié par l'agent technique
    rendezVous: { type: RendezVousSchema, default: undefined },

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
