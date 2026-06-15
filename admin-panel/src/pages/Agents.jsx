import { useState, useEffect } from "react";
import api from "../api/axios";

const ROLES = [
  "service_clientele",
  "service1",
  "service2",
  "service3",
  "service4",
];
const ROLE_LABELS = {
  service_clientele: "Service Clientèle",
  service1: "Service Technique 1",
  service2: "Service Technique 2",
  service3: "Service Technique 3",
  service4: "Service Technique 4",
};

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    role: "service1",
  });
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get("/users");
    setAgents(data);
  };
  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await api.post("/users", form);
      setMsg({ type: "success", text: "Compte agent créé avec succès." });
      setForm({
        nom: "",
        prenom: "",
        email: "",
        password: "",
        role: "service1",
      });
      load();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Erreur" });
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (id) => {
    await api.patch(`/users/${id}/toggle`);
    load();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        gap: "1.5rem",
        alignItems: "start",
      }}
    >
      {/* Formulaire */}
      <div
        style={{
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: "1.25rem",
            fontSize: ".875rem",
          }}
        >
          Créer un agent
        </div>
        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
        <form onSubmit={create}>
          <div className="form-group">
            <label className="form-label">
              Nom<span className="req">*</span>
            </label>
            <input
              className="form-input"
              required
              value={form.nom}
              onChange={set("nom")}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Prénom<span className="req">*</span>
            </label>
            <input
              className="form-input"
              required
              value={form.prenom}
              onChange={set("prenom")}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Email<span className="req">*</span>
            </label>
            <input
              className="form-input"
              type="email"
              required
              value={form.email}
              onChange={set("email")}
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Mot de passe<span className="req">*</span>
            </label>
            <input
              className="form-input"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={set("password")}
            />
          </div>
          <div className="form-group" style={{ marginBottom: "1.25rem" }}>
            <label className="form-label">
              Service<span className="req">*</span>
            </label>
            <select
              className="form-select"
              value={form.role}
              onChange={set("role")}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-violet"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Création..." : "Créer le compte"}
          </button>
        </form>
      </div>

      {/* Table agents */}
      <div className="table-card">
        <div className="table-header">
          <span className="table-title">Agents ({agents.length})</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Service</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a._id}>
                <td style={{ color: "var(--text)", fontWeight: 600 }}>
                  {a.prenom} {a.nom}
                </td>
                <td
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: ".78rem",
                  }}
                >
                  {a.email}
                </td>
                <td>
                  <span className="badge badge-violet">
                    {ROLE_LABELS[a.role] || a.role}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${a.isActive ? "badge-green" : "badge-red"}`}
                  >
                    {a.isActive ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td>
                  <button
                    className={`btn btn-xs ${a.isActive ? "btn-danger" : "btn-outline"}`}
                    onClick={() => toggle(a._id)}
                  >
                    {a.isActive ? "Désactiver" : "Activer"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
