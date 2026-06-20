import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import ClaimThread from "../components/ClaimThread";
import RdvPanel from "../components/RdvPanel";

const SERVICES = ["service1", "service2", "service3", "service4"];
const SERVICE_LABELS = {
  service1: "Service Technique 1",
  service2: "Service Technique 2",
  service3: "Service Technique 3",
  service4: "Service Technique 4",
  service_clientele: "Service Clientèle",
};

function tempsEcoule(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

function TimerBar({ createdAt, urgente }) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const heures = diff / 3600000;
  const pct = Math.min((heures / 24) * 100, 100);
  const color = urgente
    ? "#ef4444"
    : heures > 18
      ? "#f97316"
      : heures > 12
        ? "#f59e0b"
        : "#22c55e";

  return (
    <div style={{ marginBottom: ".6rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 3,
        }}
      >
        <span style={{ fontSize: ".7rem", fontWeight: 600, color }}>
          {urgente ? "⚠ URGENTE — " : ""}
          {tempsEcoule(createdAt)}
        </span>
        <span style={{ fontSize: ".7rem", color: "var(--gris-400)" }}>
          {urgente ? "Dépasse 24h" : `${Math.round(pct)}% du délai`}
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: "var(--gris-200)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 99,
            transition: "width .5s",
            boxShadow: urgente ? `0 0 6px ${color}` : "none",
          }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reponses, setReponses] = useState({});
  const [contactForm, setContactForm] = useState(null);
  const [contactMsg, setContactMsg] = useState("");
  const [rdvBusy, setRdvBusy] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/claims");
      setClaims(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const assign = async (id, serviceAssigne) => {
    try {
      await api.patch(`/claims/${id}/assign`, { serviceAssigne });
      load();
    } catch (err) {
      alert("Erreur: " + (err.response?.data?.message || err.message));
    }
  };

  const respond = async (id) => {
    if (!reponses[id]?.trim()) return;
    await api.patch(`/claims/${id}/respond`, { texte: reponses[id] });
    setReponses((r) => ({ ...r, [id]: "" }));
    load();
  };

  const returnClaim = async (id) => {
    await api.patch(`/claims/${id}/return`);
    load();
  };

  const scheduleRdv = async (id, date) => {
    setRdvBusy(id);
    try {
      await api.post(`/claims/${id}/rdv`, { date });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setRdvBusy(null);
    }
  };

  const cancelRdv = async (id) => {
    if (!confirm("Annuler ce rendez-vous ?")) return;
    setRdvBusy(id);
    try {
      await api.patch(`/claims/${id}/rdv/cancel`);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setRdvBusy(null);
    }
  };

  const reportRdv = async (id, payload) => {
    setRdvBusy(id);
    try {
      await api.patch(`/claims/${id}/rdv/report`, payload);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setRdvBusy(null);
    }
  };

  const sendContact = async () => {
    if (!contactMsg.trim()) return;
    await api.post(`/claims/${contactForm.id}/contact`, {
      message: contactMsg,
      type: contactForm.type,
    });
    setContactForm(null);
    setContactMsg("");
    alert("Message envoyé !");
  };

  if (loading)
    return (
      <div className="container page" style={{ color: "var(--gris-400)" }}>
        Chargement...
      </div>
    );

  const urgentes = claims.filter((c) => c.urgente);
  const normales = claims.filter((c) => !c.urgente);

  const cardProps = {
    user,
    reponses,
    setReponses,
    onAssign: assign,
    onRespond: respond,
    onReturn: returnClaim,
    onContact: (id, type) => setContactForm({ id, type }),
    onScheduleRdv: scheduleRdv,
    onCancelRdv: cancelRdv,
    onReportRdv: reportRdv,
    rdvBusy,
  };

  return (
    <div className="container page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>
          {SERVICE_LABELS[user?.role] || user?.role}
        </h1>
        <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
          {urgentes.length > 0 && (
            <span
              style={{
                background: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
                borderRadius: 99,
                padding: "4px 12px",
                fontSize: ".78rem",
                fontWeight: 700,
                animation: "pulse-red 2s infinite",
              }}
            >
              {urgentes.length} urgente{urgentes.length > 1 ? "s" : ""}
            </span>
          )}
          <span style={{ fontSize: ".78rem", color: "var(--gris-400)" }}>
            {claims.length} réclamation{claims.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
          50% { box-shadow: 0 0 0 4px rgba(239,68,68,0.2); }
        }
        @keyframes border-pulse {
          0%, 100% { border-color: #ef4444; }
          50% { border-color: #fca5a5; }
        }
      `}</style>

      {/* Modal contact */}
      {contactForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.4)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="card" style={{ width: 440, maxWidth: "90vw" }}>
            <h3 style={{ marginBottom: "1rem", fontWeight: 700 }}>
              Contacter via {contactForm.type === "email" ? "Email" : "SMS"}
            </h3>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: ".75rem" }}>
              <button className="btn btn-primary btn-sm" onClick={sendContact}>
                Envoyer
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setContactForm(null)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {claims.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: "center",
            color: "var(--gris-400)",
            padding: "3rem",
          }}
        >
          Aucune réclamation en attente.
        </div>
      )}

      {/* ── SECTION URGENTES ── */}
      {urgentes.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".5rem",
              marginBottom: ".75rem",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef4444",
                boxShadow: "0 0 0 3px rgba(239,68,68,.2)",
                animation: "pulse-red 1.5s infinite",
              }}
            />
            <span
              style={{
                fontSize: ".8rem",
                fontWeight: 700,
                color: "#dc2626",
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}
            >
              Réclamations urgentes — non traitées depuis plus de 24h
            </span>
          </div>

          {urgentes.map((c) => (
            <ClaimCard key={c._id} claim={c} {...cardProps} urgent />
          ))}
        </div>
      )}

      {/* ── SECTION NORMALES ── */}
      {normales.length > 0 && (
        <div>
          {urgentes.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".5rem",
                marginBottom: ".75rem",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--violet)",
                }}
              />
              <span
                style={{
                  fontSize: ".8rem",
                  fontWeight: 700,
                  color: "var(--gris-600)",
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                En cours de traitement
              </span>
            </div>
          )}
          {normales.map((c) => (
            <ClaimCard key={c._id} claim={c} {...cardProps} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── COMPOSANT CARTE RÉCLAMATION ──────────────────────────
function ClaimCard({
  claim: c,
  user,
  reponses,
  setReponses,
  onAssign,
  onRespond,
  onReturn,
  onContact,
  onScheduleRdv,
  onCancelRdv,
  onReportRdv,
  rdvBusy,
  urgent,
}) {
  const [expanded, setExpanded] = useState(urgent);

  const threadMsgs = c.conversation?.length
    ? c.conversation
    : [
        ...(c.historique || []).map((h) => ({
          role: h.service || "service1",
          texte: h.texte,
          type: "message",
          date: h.date,
        })),
        ...(c.reponseActuelle
          ? [
              {
                role: c.reponseActuelle.service || "service1",
                texte: c.reponseActuelle.texte,
                type: "message",
                date: c.reponseActuelle.date,
              },
            ]
          : []),
      ];

  return (
    <div
      style={{
        background: urgent ? "#fff5f5" : "white",
        border: urgent ? "2px solid #ef4444" : "1px solid var(--gris-200)",
        borderRadius: 14,
        marginBottom: ".75rem",
        overflow: "hidden",
        animation: urgent ? "border-pulse 2s infinite" : "none",
        boxShadow: urgent
          ? "0 4px 16px rgba(239,68,68,.12)"
          : "0 1px 4px rgba(0,0,0,.05)",
      }}
    >
      <div
        style={{
          height: 3,
          background: urgent
            ? "linear-gradient(90deg, #ef4444, #f97316)"
            : c.marqueurMalTraite
              ? "#ef4444"
              : "linear-gradient(90deg, var(--violet), var(--violet-clair))",
        }}
      />

      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: ".875rem 1.25rem",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".5rem",
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            {urgent && (
              <span
                style={{
                  background: "#ef4444",
                  color: "white",
                  borderRadius: 99,
                  padding: "2px 10px",
                  fontSize: ".7rem",
                  fontWeight: 800,
                  letterSpacing: ".03em",
                }}
              >
                URGENT
              </span>
            )}
            {c.marqueurMalTraite && (
              <span
                style={{
                  background: "#fef2f2",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  borderRadius: 99,
                  padding: "2px 9px",
                  fontSize: ".7rem",
                  fontWeight: 700,
                }}
              >
                Mal traité
              </span>
            )}
            <span style={{ fontWeight: 700, fontSize: ".9rem" }}>
              {c.client?.prenom} {c.client?.nom}
            </span>
            <span style={{ fontSize: ".78rem", color: "var(--gris-400)" }}>
              {c.client?.wilaya}
              {c.client?.typeAbonnement && ` · ${c.client.typeAbonnement}`}
            </span>
          </div>

          <TimerBar createdAt={c.createdAt} urgente={urgent || c.urgente} />

          {c.typeReclamation && (
            <span
              style={{
                fontSize: ".73rem",
                fontWeight: 600,
                color: "var(--violet)",
                background: "var(--violet-bg)",
                padding: "2px 8px",
                borderRadius: 99,
                border: "1px solid var(--violet-border)",
              }}
            >
              {c.typeReclamation}
            </span>
          )}
        </div>

        <div
          style={{
            color: "var(--gris-400)",
            transition: "transform .2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
            marginLeft: "1rem",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div
          style={{
            padding: "0 1.25rem 1.25rem",
            borderTop: "1px solid var(--gris-100)",
          }}
        >
          <p
            style={{
              fontSize: ".875rem",
              color: "var(--gris-600)",
              margin: ".875rem 0",
              lineHeight: 1.6,
            }}
          >
            {c.texte}
          </p>

          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              flexWrap: "wrap",
              fontSize: ".78rem",
              color: "var(--gris-600)",
              background: "var(--gris-50)",
              borderRadius: 8,
              padding: ".6rem .875rem",
              marginBottom: ".875rem",
            }}
          >
            <span>📧 {c.client?.email}</span>
            {c.client?.mobile && <span>📱 {c.client.mobile}</span>}
            <span>
              🕐 Déposée le {new Date(c.createdAt).toLocaleDateString("fr-DZ")}
            </span>
          </div>

          {/* Fil de discussion avec le client */}
          {threadMsgs.length > 0 && (
            <div style={{ marginBottom: ".875rem" }}>
              <div
                style={{
                  fontSize: ".73rem",
                  fontWeight: 700,
                  color: "var(--gris-400)",
                  marginBottom: ".25rem",
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}
              >
                Discussion
              </div>
              <ClaimThread messages={threadMsgs} viewerSide="agent" />
            </div>
          )}

          {/* Actions service_clientele */}
          {user?.role === "service_clientele" && (
            <div>
              <div
                style={{
                  fontSize: ".75rem",
                  fontWeight: 700,
                  color: "var(--gris-400)",
                  marginBottom: ".5rem",
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}
              >
                Router vers
              </div>
              <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                {SERVICES.map((s) => (
                  <button
                    key={s}
                    className="btn btn-secondary btn-sm"
                    onClick={() => onAssign(c._id, s)}
                  >
                    {SERVICE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions services techniques */}
          {SERVICES.includes(user?.role) && (
            <div>
              <div
                style={{
                  display: "flex",
                  gap: ".5rem",
                  flexWrap: "wrap",
                  marginBottom: ".75rem",
                }}
              >
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onReturn(c._id)}
                >
                  Renvoyer au service clientèle
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onContact(c._id, "email")}
                >
                  📧 Email client
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onContact(c._id, "sms")}
                >
                  📱 SMS client
                </button>
              </div>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Votre réponse au client..."
                  value={reponses[c._id] || ""}
                  onChange={(e) =>
                    setReponses((r) => ({ ...r, [c._id]: e.target.value }))
                  }
                  style={{ minHeight: "unset", flex: 1 }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  style={{ alignSelf: "flex-end" }}
                  onClick={() => onRespond(c._id)}
                >
                  Répondre
                </button>
              </div>

              {/* Rendez-vous d'intervention */}
              <RdvPanel
                rdv={c.rendezVous}
                viewerSide="agent"
                busy={rdvBusy === c._id}
                handlers={{
                  onSchedule: (date) => onScheduleRdv(c._id, date),
                  onCancel: () => onCancelRdv(c._id),
                  onReport: (payload) => onReportRdv(c._id, payload),
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
