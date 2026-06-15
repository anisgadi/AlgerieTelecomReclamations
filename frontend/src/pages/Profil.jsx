import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

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

export default function Profil() {
  const { user, setUser } = useAuth();
  const [infoForm, setInfoForm] = useState({
    mobile: user?.mobile || "",
    email: user?.email || "",
    wilaya: user?.wilaya || "",
    typeAbonnement: user?.typeAbonnement || "Fibre",
  });
  const [pwForm, setPwForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [infoMsg, setInfoMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const saveInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setInfoMsg(null);
    try {
      const { data } = await api.patch("/users/me", infoForm);
      setUser(data);
      setInfoMsg({ type: "success", text: "Informations mises à jour." });
    } catch (err) {
      setInfoMsg({
        type: "error",
        text: err.response?.data?.message || "Erreur",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm)
      return setPwMsg({
        type: "error",
        text: "Les mots de passe ne correspondent pas",
      });
    if (pwForm.newPassword.length < 8)
      return setPwMsg({ type: "error", text: "Minimum 8 caractères" });
    setLoading(true);
    setPwMsg(null);
    try {
      await api.post("/auth/change-password", {
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      });
      setPwMsg({ type: "success", text: "Mot de passe modifié." });
      setPwForm({ oldPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setPwMsg({
        type: "error",
        text: err.response?.data?.message || "Erreur",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page" style={{ maxWidth: 580 }}>
      <h1 className="page-title">Mon profil</h1>

      {/* Infos non modifiables */}
      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--violet-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.3rem",
              fontWeight: 700,
              color: "var(--violet)",
            }}
          >
            {user?.prenom?.[0]}
            {user?.nom?.[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
              {user?.prenom} {user?.nom}
            </div>
            <span className="badge badge-violet" style={{ marginTop: 3 }}>
              {user?.role?.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Infos modifiables (client seulement) */}
      {user?.role === "client" && (
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <h3
            style={{
              fontWeight: 700,
              marginBottom: "1.25rem",
              fontSize: "1rem",
            }}
          >
            Informations du compte
          </h3>
          {infoMsg && (
            <div className={`alert alert-${infoMsg.type}`}>{infoMsg.text}</div>
          )}
          <form onSubmit={saveInfo}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                value={infoForm.email}
                onChange={(e) =>
                  setInfoForm({ ...infoForm, email: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile</label>
              <input
                className="form-input"
                value={infoForm.mobile}
                onChange={(e) =>
                  setInfoForm({ ...infoForm, mobile: e.target.value })
                }
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
                <label className="form-label">Wilaya</label>
                <select
                  className="form-select"
                  value={infoForm.wilaya}
                  onChange={(e) =>
                    setInfoForm({ ...infoForm, wilaya: e.target.value })
                  }
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
                  value={infoForm.typeAbonnement}
                  onChange={(e) =>
                    setInfoForm({ ...infoForm, typeAbonnement: e.target.value })
                  }
                >
                  <option value="Fibre">Fibre</option>
                  <option value="ADSL">ADSL</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary btn-sm" disabled={loading}>
              Enregistrer
            </button>
          </form>
        </div>
      )}

      {/* Changement mot de passe (tous les rôles) */}
      <div className="card">
        <h3
          style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1rem" }}
        >
          Changer le mot de passe
        </h3>
        {pwMsg && (
          <div className={`alert alert-${pwMsg.type}`}>{pwMsg.text}</div>
        )}
        <form onSubmit={savePw}>
          <div className="form-group">
            <label className="form-label">
              Mot de passe actuel<span className="req">*</span>
            </label>
            <input
              className="form-input"
              type="password"
              required
              value={pwForm.oldPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, oldPassword: e.target.value })
              }
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
                Nouveau<span className="req">*</span>
              </label>
              <input
                className="form-input"
                type="password"
                required
                minLength={8}
                value={pwForm.newPassword}
                onChange={(e) =>
                  setPwForm({ ...pwForm, newPassword: e.target.value })
                }
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
                value={pwForm.confirm}
                onChange={(e) =>
                  setPwForm({ ...pwForm, confirm: e.target.value })
                }
              />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={loading}>
            Changer le mot de passe
          </button>
        </form>
      </div>
    </div>
  );
}
