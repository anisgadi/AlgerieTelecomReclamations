import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api/axios";

// Fix icône Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const WILAYAS = [
  "Adrar",
  "Chlef",
  "Laghouat",
  "Oum El Bouaghi",
  "Batna",
  "Béjaïa",
  "Biskra",
  "Béchar",
  "Blida",
  "Bouira",
  "Tamanrasset",
  "Tébessa",
  "Tlemcen",
  "Tiaret",
  "Tizi Ouzou",
  "Alger",
  "Djelfa",
  "Jijel",
  "Sétif",
  "Saïda",
  "Skikda",
  "Sidi Bel Abbès",
  "Annaba",
  "Guelma",
  "Constantine",
  "Médéa",
  "Mostaganem",
  "M'Sila",
  "Mascara",
  "Ouargla",
  "Oran",
  "El Bayadh",
  "Illizi",
  "Bordj Bou Arreridj",
  "Boumerdès",
  "El Tarf",
  "Tindouf",
  "Tissemsilt",
  "El Oued",
  "Khenchela",
  "Souk Ahras",
  "Tipaza",
  "Mila",
  "Aïn Defla",
  "Naâma",
  "Aïn Témouchent",
  "Ghardaïa",
  "Relizane",
  "Timimoun",
  "Bordj Badji Mokhtar",
  "Ouled Djellal",
  "Béni Abbès",
  "In Salah",
  "In Guezzam",
  "Touggourt",
  "Djanet",
  "El M'Ghair",
  "El Meniaa",
];

function MapPicker({ position, onSelect }) {
  useMapEvents({ click: (e) => onSelect(e.latlng) });
  return position ? <Marker position={position} /> : null;
}

export default function Register() {
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    confirm: "",
    telephone: "",
    mobile: "",
    wilaya: "",
    typeAbonnement: "Fibre",
    codeImmatriculation: "",
  });
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const autoLocate = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setError("Géolocalisation refusée par le navigateur");
        setGeoLoading(false);
      },
    );
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    if (form.mobile && !/^(05|06|07)\d{8}$/.test(form.mobile))
      return setError("Numéro mobile invalide (05/06/07 + 8 chiffres)");
    if (form.telephone && !/^\d{9}$/.test(form.telephone))
      return setError("Numéro fixe invalide (9 chiffres)");
    if (form.password !== form.confirm)
      return setError("Les mots de passe ne correspondent pas");
    if (form.password.length < 8)
      return setError("Mot de passe minimum 8 caractères");
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        adresse: position
          ? { coordonnees: { lat: position.lat, lng: position.lng } }
          : undefined,
      };
      const { data } = await api.post("/auth/register", payload);
      setUserId(data.userId);
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message || "Erreur lors de la création du compte",
      );
    } finally {
      setLoading(false);
    }
  };

  const submitVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/verify-email", { userId, code });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Code invalide");
    } finally {
      setLoading(false);
    }
  };

  if (step === 2)
    return (
      <div
        className="container page"
        style={{ maxWidth: 420, paddingTop: "4rem" }}
      >
        <div className="card">
          <h2
            style={{
              fontWeight: 700,
              marginBottom: ".5rem",
              color: "var(--violet)",
            }}
          >
            Vérifiez votre email
          </h2>
          <p
            style={{
              color: "var(--gris-600)",
              fontSize: ".875rem",
              marginBottom: "1.5rem",
            }}
          >
            Code envoyé à <strong>{form.email}</strong>
          </p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submitVerify}>
            <div className="form-group">
              <label className="form-label">
                Code à 6 chiffres<span className="req">*</span>
              </label>
              <input
                className="form-input"
                style={{
                  fontSize: "1.4rem",
                  letterSpacing: "10px",
                  textAlign: "center",
                }}
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={loading}
            >
              {loading ? "Vérification..." : "Confirmer mon compte"}
            </button>
          </form>
        </div>
      </div>
    );

  return (
    <div
      className="container page"
      style={{ maxWidth: 620, paddingTop: "2rem" }}
    >
      <div className="card">
        <h2
          style={{
            fontWeight: 700,
            marginBottom: "1.5rem",
            color: "var(--violet)",
          }}
        >
          Créer un compte client
        </h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submitRegister}>
          {/* Identité */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 1rem",
            }}
          >
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 1rem",
            }}
          >
            <div className="form-group">
              <label className="form-label">
                Téléphone fixe <span className="opt">(9 chiffres)</span>
              </label>
              <input
                className="form-input"
                placeholder="023XXXXXX"
                maxLength={9}
                value={form.telephone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setForm({ ...form, telephone: v });
                }}
                pattern="\d{9}"
                title="9 chiffres (numéro fixe algérien)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Mobile <span className="opt">(05/06/07 + 8 chiffres)</span>
              </label>
              <input
                className="form-input"
                placeholder="06XXXXXXXX"
                maxLength={10}
                value={form.mobile}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setForm({ ...form, mobile: v });
                }}
              />
              {form.mobile && !/^(05|06|07)\d{8}$/.test(form.mobile) && (
                <span style={{ fontSize: ".75rem", color: "var(--rouge)" }}>
                  Entrer un numéro mobile valide
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 1rem",
            }}
          >
            <div className="form-group">
              <label className="form-label">
                Wilaya<span className="req">*</span>
              </label>
              <select
                className="form-select"
                required
                value={form.wilaya}
                onChange={set("wilaya")}
              >
                <option value="">-- Sélectionner --</option>
                {WILAYAS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Type d'abonnement</label>
              <select
                className="form-select"
                value={form.typeAbonnement}
                onChange={set("typeAbonnement")}
              >
                <option value="Fibre">Fibre</option>
                <option value="ADSL">ADSL</option>
              </select>
            </div>
          </div>

          {/* Carte de localisation */}
          <div className="form-group">
            <label className="form-label">
              Adresse sur la carte
              <span className="opt">
                {" "}
                (cliquez sur la carte ou utilisez la géolocalisation)
              </span>
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginBottom: ".75rem", alignSelf: "flex-start" }}
              onClick={autoLocate}
              disabled={geoLoading}
            >
              {geoLoading ? "Localisation..." : "Ma position actuelle"}
            </button>
            {position && (
              <div
                className="alert alert-info"
                style={{ marginBottom: ".5rem" }}
              >
                Position : {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              </div>
            )}
            <div
              style={{
                height: "220px",
                borderRadius: "var(--radius)",
                overflow: "hidden",
                border: "1.5px solid var(--gris-200)",
              }}
            >
              <MapContainer
                center={position || [28.0339, 1.6596]}
                zoom={position ? 13 : 5}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapPicker position={position} onSelect={setPosition} />
              </MapContainer>
            </div>
          </div>

          {/* Mot de passe */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 1rem",
            }}
          >
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
            <div className="form-group">
              <label className="form-label">
                Confirmer<span className="req">*</span>
              </label>
              <input
                className="form-input"
                type="password"
                required
                value={form.confirm}
                onChange={set("confirm")}
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%", marginTop: ".5rem" }}
            disabled={loading}
          >
            {loading ? "Création en cours..." : "Créer mon compte"}
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
          Déjà un compte ?{" "}
          <Link to="/login" style={{ color: "var(--violet)", fontWeight: 600 }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
