import { useState } from "react";
import { fmtDateTime } from "./ClaimThread";

// Convertit une Date en valeur d'input datetime-local (YYYY-MM-DDTHH:mm), en heure locale
function toLocalInput(d) {
  const dt = d ? new Date(d) : new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

const STATUT_RDV = {
  propose: { label: "Proposé", cls: "badge-orange" },
  confirme: { label: "Confirmé", cls: "badge-vert" },
  annule: { label: "Annulé", cls: "badge-rouge" },
  termine: { label: "Terminé", cls: "badge-violet" },
};

function Stars({ note }) {
  if (!note) return null;
  return (
    <span style={{ color: "#f59e0b", letterSpacing: 1 }}>
      {"★".repeat(note)}
      <span style={{ color: "var(--gris-200)" }}>{"★".repeat(5 - note)}</span>
    </span>
  );
}

/**
 * Panneau de gestion du rendez-vous d'intervention.
 * @param {object}   rdv         claim.rendezVous (peut être absent)
 * @param {string}   viewerSide  'client' | 'agent'
 * @param {object}   handlers    { onSchedule, onAccept, onUpdate, onCancel, onReport }
 * @param {boolean}  busy
 */
export default function RdvPanel({ rdv, viewerSide, handlers, busy }) {
  const isAgent = viewerSide === "agent";
  const minVal = toLocalInput(new Date());

  const exists = rdv && rdv.date && rdv.statut !== "annule";
  const passed = exists && new Date(rdv.date).getTime() < Date.now();
  const termine = rdv?.statut === "termine";

  const [picker, setPicker] = useState(toLocalInput(rdv?.date));
  const [editing, setEditing] = useState(false);
  const [compteRendu, setCompteRendu] = useState("");
  const [note, setNote] = useState(0);

  const wrap = {
    background: "white",
    border: "1px solid var(--violet-border)",
    borderRadius: 12,
    padding: ".85rem 1rem",
    marginTop: ".75rem",
  };
  const titleRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ".5rem",
    marginBottom: ".6rem",
  };
  const title = {
    fontSize: ".72rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".04em",
    color: "var(--violet)",
  };

  // ── Aucun RDV (ou annulé) ───────────────────────────────
  if (!exists && !termine) {
    return (
      <div style={wrap}>
        <div style={titleRow}>
          <span style={title}>📅 Rendez-vous d'intervention</span>
          {rdv?.statut === "annule" && (
            <span className="badge badge-rouge">Annulé</span>
          )}
        </div>

        {isAgent ? (
          <div
            style={{
              display: "flex",
              gap: ".5rem",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label" style={{ fontSize: ".75rem" }}>
                Date et heure proposées
              </label>
              <input
                type="datetime-local"
                className="form-input"
                min={minVal}
                value={picker}
                onChange={(e) => setPicker(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              disabled={busy || !picker}
              onClick={() =>
                handlers.onSchedule(new Date(picker).toISOString())
              }
            >
              {rdv?.statut === "annule" ? "Reprogrammer" : "Planifier"}
            </button>
          </div>
        ) : (
          <p
            style={{ fontSize: ".82rem", color: "var(--gris-600)", margin: 0 }}
          >
            {rdv?.statut === "annule"
              ? "Le rendez-vous a été annulé. Le technicien peut en proposer un nouveau."
              : "Aucun rendez-vous planifié pour le moment. Le technicien vous proposera un créneau."}
          </p>
        )}
      </div>
    );
  }

  const st = STATUT_RDV[rdv.statut] || STATUT_RDV.propose;

  return (
    <div style={wrap}>
      <div style={titleRow}>
        <span style={title}>📅 Rendez-vous d'intervention</span>
        <span className={`badge ${st.cls}`}>{st.label}</span>
      </div>

      <div
        style={{
          fontSize: ".95rem",
          fontWeight: 700,
          color: "var(--gris-900)",
          marginBottom: ".15rem",
        }}
      >
        {fmtDateTime(rdv.date)}
      </div>
      <div
        style={{
          fontSize: ".72rem",
          color: "var(--gris-400)",
          marginBottom: ".6rem",
        }}
      >
        {rdv.proposePar === "client"
          ? "Créneau choisi par le client"
          : "Créneau proposé par le service technique"}
        {passed && !termine && " · le créneau est passé"}
      </div>

      {/* ── Compte-rendu d'intervention (terminé) ── */}
      {termine && rdv.intervention?.effectuee && (
        <div
          style={{
            background: "var(--violet-bg)",
            border: "1px solid var(--violet-border)",
            borderRadius: 10,
            padding: ".7rem .85rem",
            fontSize: ".83rem",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: ".25rem",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Compte-rendu d'intervention</span>
            <Stars note={rdv.intervention.note} />
          </div>
          <p
            style={{
              margin: 0,
              color: "var(--gris-600)",
              whiteSpace: "pre-wrap",
            }}
          >
            {rdv.intervention.compteRendu}
          </p>
        </div>
      )}

      {/* ── ACTIONS CLIENT ── */}
      {!isAgent && !termine && !passed && (
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          {rdv.statut === "propose" && (
            <button
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => handlers.onAccept()}
            >
              Accepter ce créneau
            </button>
          )}
          {!editing ? (
            <>
              <button
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() => {
                  setPicker(toLocalInput(rdv.date));
                  setEditing(true);
                }}
              >
                Choisir un autre créneau
              </button>
              <button
                className="btn btn-danger btn-sm"
                disabled={busy}
                onClick={() => handlers.onCancel()}
              >
                Annuler
              </button>
            </>
          ) : (
            <div
              style={{
                display: "flex",
                gap: ".5rem",
                flexWrap: "wrap",
                alignItems: "flex-end",
                width: "100%",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="form-label" style={{ fontSize: ".75rem" }}>
                  Votre créneau
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  min={minVal}
                  value={picker}
                  onChange={(e) => setPicker(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                disabled={busy || !picker}
                onClick={() => {
                  handlers.onUpdate(new Date(picker).toISOString());
                  setEditing(false);
                }}
              >
                Valider
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(false)}
              >
                Retour
              </button>
            </div>
          )}
        </div>
      )}

      {!isAgent && !termine && passed && (
        <p style={{ fontSize: ".8rem", color: "var(--gris-600)", margin: 0 }}>
          Le créneau est passé. Le technicien va renseigner le compte-rendu de
          l'intervention.
        </p>
      )}

      {/* ── ACTIONS AGENT ── */}
      {isAgent && !termine && (
        <div>
          {/* Avant le créneau : reprogrammer / annuler */}
          {!passed && (
            <div
              style={{
                display: "flex",
                gap: ".5rem",
                flexWrap: "wrap",
                marginBottom: ".5rem",
              }}
            >
              {!editing ? (
                <>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={busy}
                    onClick={() => {
                      setPicker(toLocalInput(rdv.date));
                      setEditing(true);
                    }}
                  >
                    Reprogrammer
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={busy}
                    onClick={() => handlers.onCancel()}
                  >
                    Annuler le RDV
                  </button>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: ".5rem",
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                    width: "100%",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <input
                      type="datetime-local"
                      className="form-input"
                      min={minVal}
                      value={picker}
                      onChange={(e) => setPicker(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={busy || !picker}
                    onClick={() => {
                      handlers.onSchedule(new Date(picker).toISOString());
                      setEditing(false);
                    }}
                  >
                    Mettre à jour
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditing(false)}
                  >
                    Retour
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Après le créneau : noter l'intervention (gating temporel) */}
          {passed ? (
            <div
              style={{
                background: "var(--gris-50)",
                border: "1px solid var(--gris-200)",
                borderRadius: 10,
                padding: ".7rem .85rem",
              }}
            >
              <div
                style={{
                  fontSize: ".78rem",
                  fontWeight: 700,
                  marginBottom: ".4rem",
                }}
              >
                Noter l'intervention
              </div>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Compte-rendu de l'intervention réalisée..."
                value={compteRendu}
                onChange={(e) => setCompteRendu(e.target.value)}
                style={{ minHeight: "unset", marginBottom: ".4rem" }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".75rem",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".25rem",
                  }}
                >
                  <span
                    style={{ fontSize: ".75rem", color: "var(--gris-600)" }}
                  >
                    Appréciation :
                  </span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      onClick={() => setNote(n === note ? 0 : n)}
                      style={{
                        cursor: "pointer",
                        fontSize: "1.1rem",
                        color: n <= note ? "#f59e0b" : "var(--gris-200)",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={busy || !compteRendu.trim()}
                  onClick={() =>
                    handlers.onReport({ compteRendu, note: note || undefined })
                  }
                >
                  Enregistrer le compte-rendu
                </button>
              </div>
            </div>
          ) : (
            <p
              style={{
                fontSize: ".75rem",
                color: "var(--gris-400)",
                margin: 0,
              }}
            >
              L'intervention pourra être notée une fois le créneau passé.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
