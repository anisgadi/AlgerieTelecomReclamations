import { useEffect, useState } from "react";
import api from "../api/axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const SERVICES = [
  "service_clientele",
  "service1",
  "service2",
  "service3",
  "service4",
];
const SERVICE_SHORT = {
  service_clientele: "Clientèle",
  service1: "Serv. 1",
  service2: "Serv. 2",
  service3: "Serv. 3",
  service4: "Serv. 4",
};
const STATUT_LABELS = {
  deposee: "Déposée",
  en_triage: "Triage",
  dirigee_service: "Dirigée",
  en_traitement: "Traitement",
  reponse_envoyee: "Réponse",
  mal_traitee: "Mal traitée",
  resolue: "Résolue",
  archivee: "Archivée",
};
const COLORS = [
  "#9d4edd",
  "#c77dff",
  "#60a5fa",
  "#4ade80",
  "#fb923c",
  "#f87171",
  "#fbbf24",
  "#a78bfa",
];

export default function Dashboard() {
  const [claims, setClaims] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/claims"), api.get("/users")])
      .then(([c, u]) => {
        setClaims(c.data);
        setUsers(u.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div style={{ color: "var(--text-3)" }}>Chargement des données...</div>
    );

  // Calculs stats
  const total = claims.length;
  const resolues = claims.filter((c) =>
    ["resolue", "archivee"].includes(c.statut),
  ).length;
  const malTraitees = claims.filter((c) => c.marqueurMalTraite).length;
  const enCours = claims.filter(
    (c) => !["resolue", "archivee"].includes(c.statut),
  ).length;
  const txSatisfaction = total > 0 ? Math.round((resolues / total) * 100) : 0;

  // Par service
  const parService = SERVICES.map((s) => ({
    name: SERVICE_SHORT[s],
    total: claims.filter((c) => c.serviceAssigne === s).length,
    resolues: claims.filter(
      (c) =>
        c.serviceAssigne === s && ["resolue", "archivee"].includes(c.statut),
    ).length,
  }));

  // Par statut (pie)
  const parStatut = Object.entries(
    claims.reduce((acc, c) => {
      acc[c.statut] = (acc[c.statut] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name: STATUT_LABELS[name] || name, value }));

  // Par type réclamation
  const parType = Object.entries(
    claims.reduce((acc, c) => {
      const t = c.typeReclamation || "Non classé";
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Évolution par mois (6 derniers mois)
  const now = new Date();
  const parMois = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const label = d.toLocaleDateString("fr-DZ", {
      month: "short",
      year: "2-digit",
    });
    const count = claims.filter((c) => {
      const cd = new Date(c.createdAt);
      return (
        cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear()
      );
    }).length;
    return { name: label, count };
  });

  const tooltipStyle = {
    background: "#1a1a2e",
    border: "1px solid #2a2a40",
    borderRadius: 8,
    color: "#e8e8f0",
    fontSize: 12,
  };

  return (
    <div>
      {/* Stat cards */}
      <div className="stat-grid">
        {[
          {
            label: "Total réclamations",
            val: total,
            color: "violet",
            icon: "📋",
          },
          { label: "En cours", val: enCours, color: "orange", icon: "⏳" },
          { label: "Résolues", val: resolues, color: "green", icon: "✅" },
          { label: "Mal traitées", val: malTraitees, color: "red", icon: "⚠️" },
          {
            label: "Taux de satisfaction",
            val: `${txSatisfaction}%`,
            color: "blue",
            icon: "📊",
          },
          {
            label: "Agents actifs",
            val: users.filter((u) => u.isActive).length,
            color: "yellow",
            icon: "👥",
          },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.val}</div>
            <div className="stat-icon">{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Graphiques ligne 1 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        {/* Évolution mensuelle */}
        <div className="chart-card">
          <div className="chart-title">Évolution des réclamations (6 mois)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={parMois}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a40" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#9090b0", fontSize: 11 }}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "#9090b0", fontSize: 11 }}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#9d4edd"
                strokeWidth={2.5}
                dot={{ fill: "#9d4edd", r: 4 }}
                name="Réclamations"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Par statut (pie) */}
        <div className="chart-card">
          <div className="chart-title">Répartition par statut</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={parStatut}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {parStatut.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#9090b0" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Par service */}
      <div className="chart-card" style={{ marginBottom: "1.25rem" }}>
        <div className="chart-title">Réclamations par service</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={parService} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a40" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#9090b0", fontSize: 11 }}
              axisLine={false}
            />
            <YAxis tick={{ fill: "#9090b0", fontSize: 11 }} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#9090b0" }} />
            <Bar
              dataKey="total"
              name="Total"
              fill="#9d4edd"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="resolues"
              name="Résolues"
              fill="#4ade80"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Par type */}
      <div className="chart-card">
        <div className="chart-title">Réclamations par type</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={parType} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2a2a40"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: "#9090b0", fontSize: 11 }}
              axisLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: "#9090b0", fontSize: 11 }}
              axisLine={false}
              width={120}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="value"
              name="Nb"
              fill="#c77dff"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
