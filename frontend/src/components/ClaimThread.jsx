// Fil de discussion réutilisable client <-> service technique.
// Affiche les messages en bulles, alignés selon l'expéditeur,
// et les événements système (RDV, intervention) au centre.

const ROLE_LABELS = {
  client: "Vous",
  service_clientele: "Service Clientèle",
  service1: "Service Technique 1",
  service2: "Service Technique 2",
  service3: "Service Technique 3",
  service4: "Service Technique 4",
};

export function fmtDateTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function senderLabel(role, isViewerClient) {
  if (role === "client") return isViewerClient ? "Vous" : "Client";
  return ROLE_LABELS[role] || "Service";
}

/**
 * @param {Array}  messages   liste {role, texte, type, date}
 * @param {string} viewerSide 'client' | 'service' — de quel côté on regarde
 */
export default function ClaimThread({ messages = [], viewerSide = "client" }) {
  if (!messages.length) return null;

  const isViewerClient = viewerSide === "client";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: ".5rem",
        background: "var(--gris-50)",
        border: "1px solid var(--gris-200)",
        borderRadius: 12,
        padding: ".75rem",
        marginTop: ".75rem",
        maxHeight: 340,
        overflowY: "auto",
      }}
    >
      {messages.map((m, i) => {
        if (m.type === "systeme") {
          return (
            <div
              key={i}
              style={{
                alignSelf: "center",
                textAlign: "center",
                fontSize: ".72rem",
                color: "var(--gris-600)",
                background: "var(--violet-bg)",
                border: "1px solid var(--violet-border)",
                borderRadius: 99,
                padding: ".3rem .7rem",
                maxWidth: "92%",
              }}
            >
              {m.texte}
              <span style={{ color: "var(--gris-400)", marginLeft: ".4rem" }}>
                · {fmtDateTime(m.date)}
              </span>
            </div>
          );
        }

        const fromClient = m.role === "client";
        const mine = isViewerClient ? fromClient : !fromClient;

        return (
          <div
            key={i}
            style={{
              alignSelf: mine ? "flex-end" : "flex-start",
              maxWidth: "82%",
            }}
          >
            <div
              style={{
                fontSize: ".66rem",
                fontWeight: 700,
                color: mine ? "var(--violet)" : "var(--gris-400)",
                marginBottom: 2,
                textAlign: mine ? "right" : "left",
              }}
            >
              {senderLabel(m.role, isViewerClient)}
            </div>
            <div
              style={{
                background: mine ? "var(--violet)" : "white",
                color: mine ? "white" : "var(--gris-900)",
                border: mine ? "none" : "1px solid var(--gris-200)",
                borderRadius: 12,
                borderBottomRightRadius: mine ? 3 : 12,
                borderBottomLeftRadius: mine ? 12 : 3,
                padding: ".5rem .75rem",
                fontSize: ".85rem",
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                boxShadow: "0 1px 3px rgba(0,0,0,.06)",
              }}
            >
              {m.texte}
            </div>
            <div
              style={{
                fontSize: ".62rem",
                color: "var(--gris-400)",
                marginTop: 2,
                textAlign: mine ? "right" : "left",
              }}
            >
              {fmtDateTime(m.date)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
