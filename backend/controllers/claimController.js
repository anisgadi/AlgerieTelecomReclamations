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

    if (role === "client") query = { client: _id };
    else if (role === "service_clientele")
      query = {
        serviceAssigne: "service_clientele",
        statut: { $nin: ["resolue", "archivee"] },
      };
    else if (role.startsWith("service"))
      query = {
        serviceAssigne: role,
        statut: { $nin: ["resolue", "archivee"] },
      };
    // admin voit tout

    const claims = await Claim.find(query)
      .populate(
        "client",
        "nom prenom email mobile wilaya typeAbonnement adresse",
      )
      .sort({ createdAt: -1 });

    res.json(claims);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/claims/:id/assign — Triage par service_clientele
exports.assign = async (req, res) => {
  try {
    const { typeReclamation, serviceAssigne } = req.body;
    const claim = await Claim.findById(req.params.id);

    if (!claim)
      return res.status(404).json({ message: "Réclamation introuvable" });

    claim.typeReclamation = typeReclamation || claim.typeReclamation;
    claim.serviceAssigne = serviceAssigne;
    claim.statut = "dirigee_service";
    await claim.save();

    // Notification client
    const client = await User.findById(claim.client);
    await sendClaimNotification(
      client.email,
      `Votre réclamation a été dirigée vers le service compétent.`,
    );

    res.json(claim);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/claims/:id/respond — Réponse du service
exports.respond = async (req, res) => {
  try {
    const { texte } = req.body;
    const claim = await Claim.findById(req.params.id).populate(
      "client",
      "email nom",
    );

    if (!claim)
      return res.status(404).json({ message: "Réclamation introuvable" });

    claim.reponseActuelle = {
      service: req.user.role,
      agentId: req.user._id,
      texte,
    };
    claim.statut = "reponse_envoyee";
    claim.dateReponse = new Date();
    claim.marqueurMalTraite = false;
    await claim.save();

    await sendClaimNotification(
      claim.client.email,
      `Le service a répondu à votre réclamation : "${texte.substring(0, 100)}..."`,
    );

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
      // Archiver la réponse dans l'historique
      if (claim.reponseActuelle) {
        claim.historique.push({
          ...claim.reponseActuelle.toObject(),
          satisfait: true,
        });
      }
      claim.statut = "resolue";
      claim.reponseActuelle = undefined;
    } else {
      // Relancer avec marqueur rouge
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
    // SMS : simulation — retourner le numéro pour ouverture liens tel:
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

// Tâche cron : auto-archivage après 15 jours (à appeler via node-cron)
exports.autoArchive = async () => {
  const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  await Claim.updateMany(
    { statut: "reponse_envoyee", dateReponse: { $lt: cutoff } },
    { statut: "archivee" },
  );
};
