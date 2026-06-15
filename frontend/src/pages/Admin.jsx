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

export default function Admin() {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    role: "service1",
  });
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("agents");

  const loadAgents = async () => {
    const { data } = await api.get("/users");
    setAgents(data);
  };
  const loadStats = async () => {
    const { data } = await api.get("/claims");
    const total = data.length;
    const resolues = data.filter(
      (c) => c.statut === "resolue" || c.statut === "archivee",
    ).length;
    const malTraitees = data.filter((c) => c.marqueurMalTraite).length;
    const parService = ROLES.reduce((acc, r) => {
      acc[r] = data.filter((c) => c.serviceAssigne === r).length;
      return acc;
    }, {});
    setStats({ total, resolues, malTraitees, parService });
  };

  useEffect(() => {
    loadAgents();
    loadStats();
  }, []);

  const createAgent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await api.post("/users", form);
      setMsg({ type: "success", text: "Compte agent créé." });
      setForm({
        nom: "",
        prenom: "",
        email: "",
        password: "",
        role: "service1",
      });
      loadAgents();
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Erreur" });
    } finally {
      setLoading(false);
    }
  };

  const toggleAgent = async (id) => {
    await api.patch(`/users/${id}/toggle`);
    loadAgents();
  };

  return (
    <div className="container page">
      <h1 className="page-title">Administration</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.5rem" }}>
        {[
          ["agents", "Agents"],
          ["stats", "Statistiques"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`btn btn-sm ${tab === key ? "btn-primary" : "btn-secondary"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Onglet Agents */}
      {tab === "agents" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.25rem",
            alignItems: "start",
          }}
        >
          {/* Formulaire création */}
          <div className="card">
            <h3
              style={{
                fontWeight: 700,
                marginBottom: "1.25rem",
                fontSize: "1rem",
              }}
            >
              Créer un compte agent
            </h3>
            {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
            <form onSubmit={createAgent}>
              <div className="form-group">
                <label className="form-label">
                  Nom<span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Service<span className="req">*</span>
                </label>
                <select
                  className="form-select"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary btn-sm" disabled={loading}>
                {loading ? "Création..." : "Créer le compte"}
              </button>
            </form>
          </div>

          {/* Liste des agents */}
          <div className="card">
            <h3
              style={{
                fontWeight: 700,
                marginBottom: "1.25rem",
                fontSize: "1rem",
              }}
            >
              Agents ({agents.length})
            </h3>
            {agents.map((a) => (
              <div
                key={a._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: ".6rem 0",
                  borderBottom: "1px solid var(--gris-100)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: ".875rem" }}>
                    {a.prenom} {a.nom}
                  </div>
                  <div style={{ fontSize: ".75rem", color: "var(--gris-400)" }}>
                    {a.email}
                  </div>
                  <span className="badge badge-violet" style={{ marginTop: 3 }}>
                    {ROLE_LABELS[a.role] || a.role}
                  </span>
                </div>
                <button
                  onClick={() => toggleAgent(a._id)}
                  className={`btn btn-sm ${a.isActive ? "btn-danger" : "btn-secondary"}`}
                >
                  {a.isActive ? "Désactiver" : "Activer"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onglet Statistiques */}
      {tab === "stats" && stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: "1rem",
          }}
        >
          {[
            {
              label: "Total réclamations",
              val: stats.total,
              color: "var(--violet)",
            },
            { label: "Résolues", val: stats.resolues, color: "var(--vert)" },
            {
              label: "Mal traitées",
              val: stats.malTraitees,
              color: "var(--rouge)",
            },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign: "center" }}>
              <div
                style={{ fontSize: "2.5rem", fontWeight: 800, color: s.color }}
              >
                {s.val}
              </div>
              <div
                style={{
                  fontSize: ".85rem",
                  color: "var(--gris-600)",
                  marginTop: ".3rem",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
          {ROLES.map((r) => (
            <div key={r} className="card" style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "var(--violet)",
                }}
              >
                {stats.parService[r]}
              </div>
              <div
                style={{
                  fontSize: ".8rem",
                  color: "var(--gris-600)",
                  marginTop: ".3rem",
                }}
              >
                {ROLE_LABELS[r]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
