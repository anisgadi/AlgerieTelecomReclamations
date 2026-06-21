import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const SERVICE_ROLES = [
  "service_clientele",
  "service1",
  "service2",
  "service3",
  "service4",
];

// Calcule le nombre de notifications selon le rôle
function countNotifs(claims, role) {
  if (role === "client")
    return claims.filter((c) => c.statut === "reponse_envoyee").length;
  if (role === "service_clientele")
    return claims.filter((c) => ["deposee", "en_triage"].includes(c.statut))
      .length;
  if (SERVICE_ROLES.includes(role))
    return claims.filter((c) =>
      ["dirigee_service", "mal_traitee"].includes(c.statut),
    ).length;
  return 0;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notif, setNotif] = useState(0);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const clientLinks = [
    { to: "/forum", label: "Forum" },
    { to: "/deposer", label: "Déposer une réclamation" },
    { to: "/archives", label: "Mes archives" },
  ];
  const serviceLinks = [
    { to: "/dashboard", label: "Tableau de bord" },
    { to: "/forum", label: "Forum" },
  ];
  const adminLinks = [
    { to: "/admin", label: "Administration" },
    { to: "/forum", label: "Forum" },
  ];

  const links = !user
    ? []
    : user.role === "client"
      ? clientLinks
      : user.role === "admin"
        ? adminLinks
        : serviceLinks;
  const isActive = (path) => location.pathname === path;

  // Lien qui doit porter la pastille de notification
  const notifPath =
    user?.role === "client"
      ? "/archives"
      : SERVICE_ROLES.includes(user?.role)
        ? "/dashboard"
        : null;

  // Récupère les réclamations et calcule les notifications (sauf admin)
  useEffect(() => {
    if (!user || !notifPath) {
      setNotif(0);
      return;
    }
    let alive = true;
    const load = async () => {
      try {
        const { data } = await api.get("/claims");
        if (alive) setNotif(countNotifs(data, user.role));
      } catch {
        /* silencieux */
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user, notifPath, location.pathname]);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            height: "32px",
          }}
        >
          <img
            src="/logo-at-violet.png"
            alt="AT Logo"
            style={{ width: "45px", height: "45px", objectFit: "contain" }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: "1",
            }}
          >
            <span
              style={{
                color: "#7600dc",
                fontSize: "10px",
                fontWeight: "700",
                fontFamily: "Sora, sans-serif",
              }}
            >
              TÉLÉCOM
            </span>
            <span
              style={{
                color: "#18181b",
                fontSize: "10px",
                fontWeight: "600",
                fontFamily: "Sora, sans-serif",
                marginTop: "3px",
              }}
            >
              RECLAMATIONS
            </span>
          </div>
        </div>
      </Link>

      <div className="navbar-links">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={"nav-link" + (isActive(l.to) ? " active" : "")}
            style={
              isActive(l.to)
                ? { color: "var(--violet)", borderBottomColor: "var(--violet)" }
                : {}
            }
          >
            {l.label}
            {l.to === notifPath && notif > 0 && (
              <span className="nav-notif">{notif > 99 ? "99+" : notif}</span>
            )}
          </Link>
        ))}
      </div>

      <div className="navbar-right">
        {user ? (
          <>
            <Link to="/profil" style={{ textDecoration: "none" }}>
              <div className="user-chip">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                {user.prenom} {user.nom?.[0]}.
              </div>
            </Link>
            <button
              className="btn-logout"
              onClick={handleLogout}
              title="Déconnexion"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <Link to="/login">
              <button className="btn btn-secondary btn-sm">Connexion</button>
            </Link>
            <Link to="/register">
              <button className="btn btn-primary btn-sm">Inscription</button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
