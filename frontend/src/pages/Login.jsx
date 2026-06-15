import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === "client" ? "/" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="container page"
      style={{ maxWidth: 420, paddingTop: "4rem" }}
    >
      <div className="card">
        <h2
          style={{
            fontWeight: 700,
            marginBottom: "1.5rem",
            color: "var(--violet)",
          }}
        >
          Connexion
        </h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
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
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "100%", marginTop: ".5rem" }}
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <p
          style={{
            textAlign: "center",
            marginTop: "1.25rem",
            fontSize: ".85rem",
            color: "var(--gris-600)",
          }}
        >
          Pas encore de compte ?{" "}
          <Link
            to="/register"
            style={{ color: "var(--violet)", fontWeight: 600 }}
          >
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
