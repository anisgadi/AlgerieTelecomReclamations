const Claim = require("../models/Claim");
const User = require("../models/User");
const { sendClaimNotification, sendMail } = require("../config/mailer");

// POST /api/claims — Dépôt par le client
exports.create = async (req, res) => {
  try {
    const { typeReclamation, texte } = req.body;
    const photos = req.files?.map((f) => f.filename) || [];

    if (photos.length > 5)
      return res.status(400).json({ message: "Maximum 5 photos" });

    const client = await User.findById(req.user._id);
    const claim = await Claim.create({
      client: req.user._id,
      typeReclamation,
      texte,
      photos,
      geoLocation: client.adresse?.coordonnees
        ? { ...client.adresse.coordonnees, wilaya: client.wilaya }
        : undefined,
    });

    res.status(201).json(claim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/claims — Liste selon le rôle
exports.list = async (req, res) => {
  try {
    let query = {};
    const { role, _id } = req.user;

    if (role === "client") {
      query = { client: _id };
    } else if (role === "service_clientele") {
      query = {
        serviceAssigne: "service_clientele",
        statut: { $nin: ["resolue", "archivee"] },
      };
    } else if (role.startsWith("service")) {
      query = {
        serviceAssigne: role,
        statut: { $nin: ["resolue", "archivee"] },
      };
    }

    const claims = await Claim.find(query)
      .populate(
        "client",
        "nom prenom email mobile wilaya typeAbonnement adresse",
      )
      .sort({ createdAt: -1 });

    const now = Date.now();
    const SEUIL = 24 * 60 * 60 * 1000;

    // Mise à jour urgente sans bloquer si erreur
    for (const c of claims) {
      try {
        const enAttente = !["resolue", "archivee", "reponse_envoyee"].includes(
          c.statut,
        );
        const depasse = now - new Date(c.createdAt).getTime() > SEUIL;
        const devraitEtreUrgente = enAttente && depasse;

        if (devraitEtreUrgente !== Boolean(c.urgente)) {
          await Claim.findByIdAndUpdate(c._id, { urgente: devraitEtreUrgente });
          c.urgente = devraitEtreUrgente;
        }
      } catch (e) {
        console.warn("Erreur urgente pour claim", c._id, e.message);
      }
    }

    // Tri : urgentes > mal traitées > reste
    claims.sort((a, b) => {
      if (a.urgente && !b.urgente) return -1;
      if (!a.urgente && b.urgente) return 1;
      if (a.marqueurMalTraite && !b.marqueurMalTraite) return -1;
      if (!a.marqueurMalTraite && b.marqueurMalTraite) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(claims);
  } catch (err) {
    console.error("Erreur list claims:", err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/claims/:id/assign — Triage par service_clientele
exports.assign = async (req, res) => {
  try {
    const { typeReclamation, serviceAssigne } = req.body;
    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ message: "Réclamation introuvable" });
    }

    claim.typeReclamation = typeReclamation || claim.typeReclamation;
    claim.serviceAssigne = serviceAssigne;
    claim.statut = "dirigee_service";
    claim.urgente = false;

    const saved = await claim.save();
    res.json(saved);
  } catch (err) {
    console.error("Erreur assign:", err);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/claims/:id/respond — Réponse du service (alimente la conversation)
exports.respond = async (req, res) => {
  try {
    const { texte } = req.body;
    if (!texte || !texte.trim())
      return res.status(400).json({ message: "Message vide" });

    const claim = await Claim.findById(req.params.id).populate(
      "client",
      "email nom",
    );

    if (!claim)
      return res.status(404).json({ message: "Réclamation introuvable" });

    // Seul le service auquel la réclamation est affectée peut répondre
    if (
      req.user.role !== claim.serviceAssigne &&
      req.user.role !== "service_clientele"
    ) {
      return res
        .status(403)
        .json({ message: "Réclamation non affectée à votre service" });
    }

    claim.reponseActuelle = {
      service: req.user.role,
      agentId: req.user._id,
      texte,
    };
    // Ajout au fil de discussion
    claim.conversation.push({
      expediteur: req.user._id,
      role: req.user.role,
      texte,
      type: "message",
    });

    claim.statut = "reponse_envoyee";
    claim.dateReponse = new Date();
    claim.marqueurMalTraite = false;
    claim.urgente = false;
    await claim.save();

    await sendClaimNotification(
      claim.client.email,
      `Le service a répondu à votre réclamation : "${texte.substring(0, 100)}..."`,
    ).catch(() => {});

    res.json(claim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/claims/:id/message — Réponse du client dans le fil de discussion
exports.clientReply = async (req, res) => {
  try {
    const { texte } = req.body;
    if (!texte || !texte.trim())
      return res.status(400).json({ message: "Message vide" });

    const claim = await Claim.findById(req.params.id);
    if (!claim)
      return res.status(404).json({ message: "Réclamation introuvable" });

    if (String(claim.client) !== String(req.user._id))
      return res.status(403).json({ message: "Accès refusé" });

    if (["resolue", "archivee"].includes(claim.statut))
      return res
        .status(400)
        .json({ message: "Cette réclamation est clôturée" });

    claim.conversation.push({
      expediteur: req.user._id,
      role: "client",
      texte,
      type: "message",
    });

    // Le client relance : rouvrir côté service pour qu'il reprenne la main
    if (claim.statut === "reponse_envoyee") claim.statut = "en_traitement";
    // Une réponse écrite par le client lève le marqueur "mal traité" rouge
    claim.marqueurMalTraite = false;

    await claim.save();
    res.json(claim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/claims/:id/feedback — Retour client (satisfait/pas satisfait)
exports.feedback = async (req, res) => {
  try {
    const { satisfait } = req.body;
    const claim = await Claim.findById(req.params.id);

    if (!claim)
      return res.status(404).json({ message: "Réclamation introuvable" });

    if (satisfait) {
      if (claim.reponseActuelle) {
        claim.historique.push({
          ...claim.reponseActuelle.toObject(),
          satisfait: true,
        });
      }
      claim.statut = "resolue";
      claim.reponseActuelle = undefined;
    } else {
      if (claim.reponseActuelle) {
        claim.historique.push({
          ...claim.reponseActuelle.toObject(),
          satisfait: false,
        });
      }
      claim.statut = "mal_traitee";
      claim.marqueurMalTraite = true;
      claim.reponseActuelle = undefined;
    }

    await claim.save();
    res.json(claim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/claims/:id/return — Service renvoie au service clientèle
exports.returnToClientele = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    claim.serviceAssigne = "service_clientele";
    claim.statut = "en_triage";
    await claim.save();
    res.json(claim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/claims/:id/contact — Email direct au client
exports.contactClient = async (req, res) => {
  try {
    const { message, type } = req.body; // type: 'email' | 'sms'
    const claim = await Claim.findById(req.params.id).populate("client");

    if (type === "email") {
      await sendMail(
        claim.client.email,
        "Message du service Algérie Télécom",
        `<p>${message}</p>`,
      );
    }
    res.json({
      success: true,
      smsLink:
        type === "sms"
          ? `sms:${claim.client.mobile}?body=${encodeURIComponent(message)}`
          : null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── RENDEZ-VOUS D'INTERVENTION ──────────────────────────────────────────

// Format date FR lisible pour les messages système
function formatRdv(d) {
  try {
    return new Date(d).toLocaleString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(d).toISOString();
  }
}

// POST /api/claims/:id/rdv — L'agent technique planifie (ou re-propose) un RDV
exports.scheduleRdv = async (req, res) => {
  try {
    const { date } = req.body;
    const claim = await Claim.findById(req.params.id);
    if (!claim)
      return res.status(404).json({ message: "Réclamation introuvable" });

    if (claim.serviceAssigne !== req.user.role)
      return res
        .status(403)
        .json({ message: "Réclamation non affectée à votre service" });

    const d = new Date(date);
    if (isNaN(d.getTime()))
      return res.status(400).json({ message: "Date invalide" });
    if (d.getTime() < Date.now())
      return res
        .status(400)
        .json({ message: "Le créneau doit être dans le futur" });

    claim.rendezVous = {
      date: d,
      statut: "propose",
      proposePar: req.user.role,
      historiqueDates: [{ date: d, par: req.user.role }],
      intervention: {},
    };

    claim.conversation.push({
      expediteur: req.user._id,
      role: req.user.role,
      type: "systeme",
      texte: `Rendez-vous proposé pour le ${formatRdv(d)}. Le client peut le confirmer ou choisir un autre créneau.`,
    });

    await claim.save();
    res.json(claim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/claims/:id/rdv — Le client choisit/modifie le créneau
exports.clientUpdateRdv = async (req, res) => {
  try {
    const { date } = req.body;
    const claim = await Claim.findById(req.params.id);
    if (!claim)
      return res.status(404).json({ message: "Réclamation introuvable" });

    if (String(claim.client) !== String(req.user._id))
      return res.status(403).json({ message: "Accès refusé" });

    if (!claim.rendezVous || !claim.rendezVous.date)
      return res.status(400).json({ message: "Aucun rendez-vous à modifier" });

    if (claim.rendezVous.statut === "termine")
      return res
        .status(400)
        .json({
          message: "Intervention déjà réalisée, modification impossible",
        });

    const d = new Date(date);
    if (isNaN(d.getTime()))
      return res.status(400).json({ message: "Date invalide" });
    if (d.getTime() < Date.now())
      return res
        .status(400)
        .json({ message: "Le créneau doit être dans le futur" });

    claim.rendezVous.date = d;
    claim.rendezVous.statut = "confirme";
    claim.rendezVous.proposePar = "client";
    claim.rendezVous.historiqueDates.push({ date: d, par: "client" });

    claim.conversation.push({
      expediteur: req.user._id,
      role: "client",
      type: "systeme",
      texte: `Le client a choisi le créneau du ${formatRdv(d)} (rendez-vous confirmé).`,
    });

    await claim.save();
    res.json(claim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/claims/:id/rdv/accept — Le client accepte le créneau proposé tel quel
exports.acceptRdv = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim)
      return res.status(404).json({ message: "Réclamation introuvable" });

    if (String(claim.client) !== String(req.user._id))
      return res.status(403).json({ message: "Accès refusé" });

    if (!claim.rendezVous || !claim.rendezVous.date)
      return res.status(400).json({ message: "Aucun rendez-vous à confirmer" });

    claim.rendezVous.statut = "confirme";
    claim.conversation.push({
      expediteur: req.user._id,
      role: "client",
      type: "systeme",
      texte: `Le client a confirmé le rendez-vous du ${formatRdv(claim.rendezVous.date)}.`,
    });

    await claim.save();
    res.json(claim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/claims/:id/rdv/cancel — Annulation par le client ou l'agent
exports.cancelRdv = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim)
      return res.status(404).json({ message: "Réclamation introuvable" });

    const isOwner = String(claim.client) === String(req.user._id);
    const isAssignedService = claim.serviceAssigne === req.user.role;
    if (!isOwner && !isAssignedService)
      return res.status(403).json({ message: "Accès refusé" });

    if (!claim.rendezVous || !claim.rendezVous.date)
      return res.status(400).json({ message: "Aucun rendez-vous à annuler" });

    if (claim.rendezVous.statut === "termine")
      return res.status(400).json({ message: "Intervention déjà réalisée" });

    claim.rendezVous.statut = "annule";
    claim.conversation.push({
      expediteur: req.user._id,
      role: req.user.role,
      type: "systeme",
      texte: `Rendez-vous annulé par ${isOwner ? "le client" : "le service technique"}.`,
    });

    await claim.save();
    res.json(claim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/claims/:id/rdv/report — L'agent note l'intervention (RDV passé uniquement)
exports.reportRdv = async (req, res) => {
  try {
    const { compteRendu, note } = req.body;
    const claim = await Claim.findById(req.params.id);
    if (!claim)
      return res.status(404).json({ message: "Réclamation introuvable" });

    if (claim.serviceAssigne !== req.user.role)
      return res
        .status(403)
        .json({ message: "Réclamation non affectée à votre service" });

    if (!claim.rendezVous || !claim.rendezVous.date)
      return res.status(400).json({ message: "Aucun rendez-vous planifié" });

    if (claim.rendezVous.statut === "annule")
      return res.status(400).json({ message: "Rendez-vous annulé" });

    // Gating clé : l'intervention ne peut être notée qu'une fois le créneau passé
    if (new Date(claim.rendezVous.date).getTime() > Date.now())
      return res.status(400).json({
        message:
          "Le rendez-vous n'a pas encore eu lieu — intervention non notable",
      });

    if (!compteRendu || !compteRendu.trim())
      return res.status(400).json({ message: "Compte-rendu requis" });

    const noteNum = note ? Number(note) : undefined;

    claim.rendezVous.intervention = {
      effectuee: true,
      compteRendu,
      note: noteNum,
      agentId: req.user._id,
      date: new Date(),
    };
    claim.rendezVous.statut = "termine";

    claim.conversation.push({
      expediteur: req.user._id,
      role: req.user.role,
      type: "systeme",
      texte: `Intervention réalisée${noteNum ? ` (appréciation : ${noteNum}/5)` : ""}. Compte-rendu : ${compteRendu}`,
    });

    await claim.save();
    res.json(claim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Tâche cron : auto-archivage après 15 jours (à appeler via node-cron)
exports.autoArchive = async () => {
  const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  await Claim.updateMany(
    { statut: "reponse_envoyee", dateReponse: { $lt: cutoff } },
    { statut: "archivee" },
  );
};
