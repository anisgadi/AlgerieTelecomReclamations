import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const SERVICES = ["service1", "service2", "service3", "service4"];
const SERVICE_LABELS = {
  service1: "Service Technique 1",
  service2: "Service Technique 2",
  service3: "Service Technique 3",
  service4: "Service Technique 4",
  service_clientele: "Service Clientèle",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reponses, setReponses] = useState({});
  const [contactForm, setContactForm] = useState(null); // { claimId, type }
  const [contactMsg, setContactMsg] = useState("");

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

  const assign = async (id, serviceAssigne, typeReclamation) => {
    await api.patch(`/claims/${id}/assign`, {
      serviceAssigne,
      typeReclamation,
    });
    load();
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

  return (
    <div className="container page">
      <h1 className="page-title">
        Tableau de bord — {SERVICE_LABELS[user?.role] || user?.role}
      </h1>

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
              Contacter le client via{" "}
              {contactForm.type === "email" ? "Email" : "SMS"}
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
          style={{ textAlign: "center", color: "var(--gris-400)" }}
        >
          Aucune réclamation en attente.
        </div>
      )}

      {claims.map((c) => (
        <div
          key={c._id}
          className="card"
          style={{
            marginBottom: "1rem",
            borderLeft: c.marqueurMalTraite
              ? "4px solid var(--rouge)"
              : "4px solid var(--violet-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: ".5rem",
              marginBottom: ".75rem",
            }}
          >
            <div>
              {c.marqueurMalTraite && (
                <span
                  className="badge badge-rouge"
                  style={{ marginRight: ".5rem" }}
                >
                  Mal traité
                </span>
              )}
              <span style={{ fontWeight: 700, fontSize: ".9rem" }}>
                {c.client?.prenom} {c.client?.nom}
              </span>
              <span
                style={{
                  color: "var(--gris-400)",
                  fontSize: ".8rem",
                  marginLeft: ".75rem",
                }}
              >
                {c.client?.wilaya} · {c.client?.typeAbonnement}
              </span>
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
                marginBottom: ".3rem",
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

          {/* Historique réponses précédentes */}
          {c.historique?.length > 0 && (
            <div
              style={{
                background: "var(--gris-100)",
                borderRadius: "var(--radius)",
                padding: ".75rem",
                marginBottom: "1rem",
                fontSize: ".82rem",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: ".4rem",
                  color: "var(--gris-600)",
                }}
              >
                Historique
              </div>
              {c.historique.map((h, i) => (
                <div
                  key={i}
                  style={{
                    paddingBottom: ".4rem",
                    borderBottom: "1px solid var(--gris-200)",
                    marginBottom: ".4rem",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{h.service}</span> :{" "}
                  {h.texte}
                  <span
                    style={{
                      marginLeft: ".5rem",
                      color: h.satisfait ? "var(--vert)" : "var(--rouge)",
                      fontWeight: 700,
                    }}
                  >
                    {h.satisfait === true
                      ? "✓ Satisfait"
                      : h.satisfait === false
                        ? "✗ Non satisfait"
                        : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions service_clientele */}
          {user?.role === "service_clientele" && c.statut !== "resolue" && (
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {SERVICES.map((s) => (
                <button
                  key={s}
                  className="btn btn-secondary btn-sm"
                  onClick={() => assign(c._id, s, c.typeReclamation)}
                >
                  → {SERVICE_LABELS[s]}
                </button>
              ))}
            </div>
          )}

          {/* Actions services techniques */}
          {SERVICES.includes(user?.role) && (
            <div>
              <div
                style={{
                  display: "flex",
                  gap: ".75rem",
                  marginBottom: ".75rem",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => returnClaim(c._id)}
                >
                  Renvoyer au service clientèle
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setContactForm({ id: c._id, type: "email" })}
                >
                  Email client
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setContactForm({ id: c._id, type: "sms" })}
                >
                  SMS client
                </button>
              </div>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Votre réponse..."
                  value={reponses[c._id] || ""}
                  onChange={(e) =>
                    setReponses((r) => ({ ...r, [c._id]: e.target.value }))
                  }
                  style={{ minHeight: "unset", flex: 1 }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  style={{ alignSelf: "flex-end" }}
                  onClick={() => respond(c._id)}
                >
                  Répondre
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
