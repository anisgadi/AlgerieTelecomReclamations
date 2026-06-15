import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
            style={{
              width: "45px",
              height: "45px",
              objectFit: "contain",
            }}
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
