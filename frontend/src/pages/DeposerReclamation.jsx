import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const TYPES = [
  "Nouvelle Installation",
  "Link Instable",
  "Pas de tonalité téléphone",
  "Déconnexion fréquente (Link Stable)",
  "Chute de débit / Débit faible",
  "Coupure totale de service",
  "Problèmes de routage / Ping élevé",
  "Absence de couverture",
  "Problèmes de facturation / Jours non consommés",
  "Problèmes de rechargement (E-paiement non validé)",
  "Instabilité du Wi-Fi (Modem)",
  "Câbles extérieurs endommagés",
  "Autre",
];

export default function DeposerReclamation() {
  const [form, setForm] = useState({ typeReclamation: "", texte: "" });
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) return setError("Maximum 5 photos");
    setPhotos(files);
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.texte.trim()) return setError("La description est obligatoire");
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("typeReclamation", form.typeReclamation);
      fd.append("texte", form.texte);
      photos.forEach((p) => fd.append("photos", p));
      await api.post("/claims", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(true);
      setTimeout(() => navigate("/archives"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors du dépôt");
    } finally {
      setLoading(false);
    }
  };

  if (success)
    return (
      <div
        className="container page"
        style={{ maxWidth: 520, paddingTop: "4rem", textAlign: "center" }}
      >
        <div className="card">
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ color: "var(--vert)", fontWeight: 700 }}>
            Réclamation déposée !
          </h2>
          <p style={{ color: "var(--gris-600)", marginTop: ".5rem" }}>
            Vous allez être redirigé vers vos archives...
          </p>
        </div>
      </div>
    );

  return (
    <div className="container page" style={{ maxWidth: 580 }}>
      <h1 className="page-title">Déposer une réclamation</h1>
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">
              Type de réclamation<span className="opt">(optionnel)</span>
            </label>
            <select
              className="form-select"
              value={form.typeReclamation}
              onChange={(e) =>
                setForm({ ...form, typeReclamation: e.target.value })
              }
            >
              <option value="">-- Sélectionner --</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              Description<span className="req">*</span>
            </label>
            <textarea
              className="form-textarea"
              rows={6}
              maxLength={2000}
              placeholder="Décrivez votre problème en détail..."
              value={form.texte}
              onChange={(e) => setForm({ ...form, texte: e.target.value })}
            />
            <span className="char-count">{form.texte.length}/2000</span>
          </div>
          <div className="form-group">
            <label className="form-label">
              Photos<span className="opt">(max 5)</span>
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotos}
              style={{ fontSize: ".83rem" }}
            />
            {photos.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: ".4rem",
                  marginTop: ".4rem",
                }}
              >
                {photos.map((p, i) => (
                  <span
                    key={i}
                    style={{
                      background: "var(--violet-bg)",
                      color: "var(--violet)",
                      padding: "2px 10px",
                      borderRadius: "99px",
                      fontSize: ".75rem",
                      fontWeight: 600,
                    }}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "100%", marginTop: ".5rem" }}
            disabled={loading}
          >
            {loading ? "Envoi en cours..." : "Déposer la réclamation"}
          </button>
        </form>
      </div>
    </div>
  );
}
