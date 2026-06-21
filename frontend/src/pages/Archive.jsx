import { useEffect, useState } from "react";
import api from "../api/axios";
import ClaimThread from "../components/ClaimThread";
import RdvPanel from "../components/RdvPanel";

const STATUT_LABELS = {
  deposee: "Déposée",
  en_triage: "En triage",
  dirigee_service: "Dirigée",
  en_traitement: "En traitement",
  reponse_envoyee: "Réponse reçue",
  mal_traitee: "Mal traitée",
  resolue: "Résolue",
  archivee: "Archivée",
};
const BADGE_CLASSES = {
  deposee: "badge-gris",
  en_triage: "badge-violet",
  dirigee_service: "badge-violet",
  en_traitement: "badge-orange",
  reponse_envoyee: "badge-orange",
  mal_traitee: "badge-rouge",
  resolue: "badge-vert",
  archivee: "badge-vert",
};
const STEPS = [
  "deposee",
  "en_triage",
  "dirigee_service",
  "en_traitement",
  "reponse_envoyee",
  "resolue",
];
const PCT = {
  deposee: 10,
  en_triage: 25,
  dirigee_service: 40,
  en_traitement: 55,
  reponse_envoyee: 75,
  mal_traitee: 55,
  resolue: 100,
  archivee: 100,
};

// Construit le fil de discussion (rétro-compatible avec les anciennes réclamations)
function threadMessages(c) {
  const conv = c.conversation || [];
  if (conv.length) return conv;
  const msgs = [];
  (c.historique || []).forEach((h) =>
    msgs.push({
      role: h.service || "service1",
      texte: h.texte,
      type: "message",
      date: h.date,
    }),
  );
  if (c.reponseActuelle)
    msgs.push({
      role: c.reponseActuelle.service || "service1",
      texte: c.reponseActuelle.texte,
      type: "message",
      date: c.reponseActuelle.date,
    });
  return msgs;
}

function serviceARepondu(c) {
  return (
    (c.conversation || []).some(
      (m) => m.role !== "client" && m.type === "message",
    ) ||
    !!c.reponseActuelle ||
    (c.historique || []).length > 0
  );
}

export default function Archive() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [replies, setReplies] = useState({});

  const fetchClaims = async () => {
    try {
      const { data } = await api.get("/claims");
      setClaims(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  // Rafraîchissement périodique pour récupérer les réponses du service
  useEffect(() => {
    const t = setInterval(fetchClaims, 30000);
    return () => clearInterval(t);
  }, []);

  const sendFeedback = async (id, satisfait) => {
    setBusyId(id);
    try {
      await api.patch(`/claims/${id}/feedback`, { satisfait });
      await fetchClaims();
    } finally {
      setBusyId(null);
    }
  };

  const sendReply = async (id) => {
    const texte = replies[id]?.trim();
    if (!texte) return;
    setBusyId(id);
    try {
      await api.post(`/claims/${id}/message`, { texte });
      setReplies((r) => ({ ...r, [id]: "" }));
      await fetchClaims();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const rdvAction = async (fn) => {
    try {
      await fn();
      await fetchClaims();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const rdvHandlers = (id) => ({
    onAccept: () =>
      rdvAction(async () => {
        setBusyId(id);
        try {
          await api.patch(`/claims/${id}/rdv/accept`);
        } finally {
          setBusyId(null);
        }
      }),
    onUpdate: (date) =>
      rdvAction(async () => {
        setBusyId(id);
        try {
          await api.patch(`/claims/${id}/rdv`, { date });
        } finally {
          setBusyId(null);
        }
      }),
    onCancel: () =>
      rdvAction(async () => {
        if (!confirm("Annuler ce rendez-vous ?")) return;
        setBusyId(id);
        try {
          await api.patch(`/claims/${id}/rdv/cancel`);
        } finally {
          setBusyId(null);
        }
      }),
  });

  if (loading)
    return (
      <div className="container page" style={{ color: "var(--gris-400)" }}>
        Chargement...
      </div>
    );

  return (
    <div className="container page">
      <h1 className="page-title">Mes réclamations</h1>
      {claims.length === 0 && (
        <div
          className="card"
          style={{ textAlign: "center", color: "var(--gris-400)" }}
        >
          Aucune réclamation pour le moment.
        </div>
      )}
      {claims.map((c) => {
        const closed = ["resolue", "archivee"].includes(c.statut);
        const messages = threadMessages(c);
        const peutEchanger = serviceARepondu(c) && !closed;
        return (
          <div key={c._id} className="card" style={{ marginBottom: "1rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: ".75rem",
              }}
            >
              <div>
                <span
                  className={`badge ${BADGE_CLASSES[c.statut] || "badge-gris"}`}
                >
                  {STATUT_LABELS[c.statut]}
                </span>
                {c.marqueurMalTraite && (
                  <span
                    className="badge badge-rouge"
                    style={{ marginLeft: ".4rem" }}
                  >
                    Mal traité
                  </span>
                )}
              </div>
              <span style={{ fontSize: ".75rem", color: "var(--gris-400)" }}>
                {new Date(c.createdAt).toLocaleDateString("fr-DZ")}
              </span>
            </div>

            {c.typeReclamation && (
              <div
                style={{
                  fontSize: ".8rem",
                  color: "var(--violet)",
                  fontWeight: 600,
                  marginBottom: ".4rem",
                }}
              >
                {c.typeReclamation}
              </div>
            )}
            <p
              style={{
                fontSize: ".875rem",
                color: "var(--gris-600)",
                marginBottom: "1rem",
              }}
            >
              {c.texte}
            </p>

            {/* Barre de progression */}
            <div className="progress-wrap">
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${PCT[c.statut] || 0}%` }}
                />
              </div>
              <div className="progress-steps">
                {STEPS.map((s, i) => {
                  const pct = PCT[c.statut] || 0;
                  const done = pct >= PCT[s];
                  const active = c.statut === s;
                  return (
                    <div
                      key={i}
                      className={`p-step ${done ? "done" : ""} ${active ? "active" : ""}`}
                    >
                      <div className="p-dot" />
                      <span className="p-label">
                        {
                          {
                            deposee: "Déposée",
                            en_triage: "Triage",
                            dirigee_service: "Dirigée",
                            en_traitement: "Traitement",
                            reponse_envoyee: "Réponse",
                            resolue: "Résolue",
                          }[s]
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fil de discussion */}
            {messages.length > 0 && (
              <ClaimThread messages={messages} viewerSide="client" />
            )}

            {/* Rendez-vous d'intervention */}
            {(c.rendezVous || serviceARepondu(c)) &&
              !["deposee", "en_triage"].includes(c.statut) && (
                <RdvPanel
                  rdv={c.rendezVous}
                  viewerSide="client"
                  busy={busyId === c._id}
                  handlers={rdvHandlers(c._id)}
                />
              )}

            {/* Zone d'échange + décision */}
            {peutEchanger && (
              <div style={{ marginTop: ".85rem" }}>
                <div
                  style={{
                    display: "flex",
                    gap: ".5rem",
                    alignItems: "flex-end",
                  }}
                >
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Répondre au service..."
                    value={replies[c._id] || ""}
                    onChange={(e) =>
                      setReplies((r) => ({ ...r, [c._id]: e.target.value }))
                    }
                    style={{ minHeight: "unset", flex: 1 }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={
                      busyId === c._id || !(replies[c._id] || "").trim()
                    }
                    onClick={() => sendReply(c._id)}
                    style={{ alignSelf: "flex-end" }}
                  >
                    Envoyer
                  </button>
                </div>

                {c.reponseActuelle && (
                  <div
                    style={{
                      display: "flex",
                      gap: ".6rem",
                      marginTop: ".6rem",
                    }}
                  >
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={busyId === c._id}
                      onClick={() => sendFeedback(c._id, true)}
                    >
                      ✓ Problème résolu
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={busyId === c._id}
                      onClick={() => sendFeedback(c._id, false)}
                    >
                      Toujours pas résolu
                    </button>
                  </div>
                )}
              </div>
            )}

            {closed && c.statut === "resolue" && (
              <div
                style={{
                  marginTop: ".75rem",
                  fontSize: ".82rem",
                  color: "var(--vert)",
                  fontWeight: 600,
                }}
              >
                ✓ Réclamation résolue
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
