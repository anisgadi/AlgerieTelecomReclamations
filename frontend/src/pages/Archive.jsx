import { useEffect, useState } from "react";
import api from "../api/axios";

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

export default function Archive() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(null);

  const fetch = async () => {
    try {
      const { data } = await api.get("/claims");
      setClaims(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const sendFeedback = async (id, satisfait) => {
    setFeedbackLoading(id + satisfait);
    try {
      await api.patch(`/claims/${id}/feedback`, { satisfait });
      await fetch();
    } finally {
      setFeedbackLoading(null);
    }
  };

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
      {claims.map((c) => (
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

          {/* Réponse du service */}
          {c.reponseActuelle && (
            <div
              style={{
                background: "var(--violet-bg)",
                border: "1px solid var(--violet-border)",
                borderRadius: "var(--radius)",
                padding: "1rem",
                marginTop: ".75rem",
              }}
            >
              <div
                style={{
                  fontSize: ".78rem",
                  fontWeight: 700,
                  color: "var(--violet)",
                  marginBottom: ".4rem",
                  textTransform: "uppercase",
                }}
              >
                Réponse du service
              </div>
              <p style={{ fontSize: ".875rem" }}>{c.reponseActuelle.texte}</p>
              <div
                style={{ display: "flex", gap: ".75rem", marginTop: ".875rem" }}
              >
                <button
                  className="btn btn-sm btn-primary"
                  disabled={!!feedbackLoading}
                  onClick={() => sendFeedback(c._id, true)}
                >
                  Satisfait
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  disabled={!!feedbackLoading}
                  onClick={() => sendFeedback(c._id, false)}
                >
                  Pas satisfait
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
