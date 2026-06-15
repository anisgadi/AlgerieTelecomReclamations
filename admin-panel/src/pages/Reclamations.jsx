import { useEffect, useState } from "react";
import api from "../api/axios";

const STATUT_LABELS = {
  deposee: "Déposée",
  en_triage: "Triage",
  dirigee_service: "Dirigée",
  en_traitement: "Traitement",
  reponse_envoyee: "Réponse envoyée",
  mal_traitee: "Mal traitée",
  resolue: "Résolue",
  archivee: "Archivée",
};
const STATUT_BADGE = {
  deposee: "badge-gray",
  en_triage: "badge-violet",
  dirigee_service: "badge-violet",
  en_traitement: "badge-orange",
  reponse_envoyee: "badge-blue",
  mal_traitee: "badge-red",
  resolue: "badge-green",
  archivee: "badge-green",
};

export default function Reclamations() {
  const [claims, setClaims] = useState([]);
  const [filtre, setFiltre] = useState("tous");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/claims").then(({ data }) => setClaims(data));
  }, []);

  const filtered = claims.filter((c) => {
    const matchStatut = filtre === "tous" || c.statut === filtre;
    const matchSearch =
      !search ||
      `${c.client?.nom} ${c.client?.prenom} ${c.client?.email}`
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchStatut && matchSearch;
  });

  return (
    <div>
      {/* Filtres */}
      <div
        style={{
          display: "flex",
          gap: ".5rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
          alignItems: "center",
        }}
      >
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
            width: 220,
          }}
        />
        <select
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          className="form-select"
          style={{ width: "auto" }}
        >
          <option value="tous">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <span
          style={{
            marginLeft: "auto",
            fontSize: ".78rem",
            color: "var(--text-3)",
          }}
        >
          {filtered.length} réclamation{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Type</th>
              <th>Wilaya</th>
              <th>Service</th>
              <th>Statut</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c._id}>
                <td>
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>
                    {c.client?.prenom} {c.client?.nom}
                  </div>
                  <div
                    style={{
                      fontSize: ".72rem",
                      color: "var(--text-3)",
                      fontFamily: "'JetBrains Mono',monospace",
                    }}
                  >
                    {c.client?.email}
                  </div>
                </td>
                <td>
                  {c.typeReclamation || (
                    <span style={{ color: "var(--text-3)" }}>—</span>
                  )}
                </td>
                <td>{c.client?.wilaya || "—"}</td>
                <td>
                  <span
                    className="badge badge-violet"
                    style={{ fontSize: ".68rem" }}
                  >
                    {c.serviceAssigne?.replace(/_/g, " ")}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${STATUT_BADGE[c.statut] || "badge-gray"}`}
                  >
                    {STATUT_LABELS[c.statut] || c.statut}
                  </span>
                </td>
                <td
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: ".75rem",
                  }}
                >
                  {new Date(c.createdAt).toLocaleDateString("fr-DZ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
