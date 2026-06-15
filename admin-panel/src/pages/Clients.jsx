import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // On récupère toutes les réclamations pour avoir les clients
    api.get("/claims").then(({ data }) => {
      const map = {};
      data.forEach((c) => {
        if (c.client?._id && !map[c.client._id])
          map[c.client._id] = {
            ...c.client,
            nbReclamations: 0,
            nbResolues: 0,
          };
        if (c.client?._id) {
          map[c.client._id].nbReclamations++;
          if (["resolue", "archivee"].includes(c.statut))
            map[c.client._id].nbResolues++;
        }
      });
      setClients(Object.values(map));
    });
  }, []);

  const filtered = clients.filter(
    (c) =>
      !search ||
      `${c.nom} ${c.prenom} ${c.email} ${c.wilaya}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <div>
      <div style={{ marginBottom: "1.25rem" }}>
        <input
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "7px 12px",
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--text)",
            fontFamily: "inherit",
            fontSize: ".83rem",
            outline: "none",
            width: 260,
          }}
        />
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Mobile</th>
              <th>Wilaya</th>
              <th>Abonnement</th>
              <th>Réclamations</th>
              <th>Résolues</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>
                    {c.prenom} {c.nom}
                  </div>
                  <div
                    style={{
                      fontSize: ".72rem",
                      color: "var(--text-3)",
                      fontFamily: "'JetBrains Mono',monospace",
                    }}
                  >
                    {c.email}
                  </div>
                </td>
                <td
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: ".78rem",
                  }}
                >
                  {c.mobile || "—"}
                </td>
                <td>{c.wilaya || "—"}</td>
                <td>
                  {c.typeAbonnement ? (
                    <span
                      className={`badge ${c.typeAbonnement === "Fibre" ? "badge-blue" : "badge-orange"}`}
                    >
                      {c.typeAbonnement}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    color: "var(--violet-2)",
                    fontWeight: 700,
                  }}
                >
                  {c.nbReclamations}
                </td>
                <td
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    color: "var(--green)",
                    fontWeight: 700,
                  }}
                >
                  {c.nbResolues}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
