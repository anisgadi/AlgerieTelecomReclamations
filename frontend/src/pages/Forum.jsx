import { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

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
const SERVICES = [
  "service_clientele",
  "service1",
  "service2",
  "service3",
  "service4",
];
const TYPE_COLORS = {
  "Nouvelle Installation": "#8b5cf6",
  "Link Instable": "#f97316",
  "Pas de tonalité téléphone": "#06b6d4",
  "Déconnexion fréquente (Link Stable)": "#f59e0b",
  "Chute de débit / Débit faible": "#ec4899",
  "Coupure totale de service": "#ef4444",
  "Problèmes de routage / Ping élevé": "#3b82f6",
  "Absence de couverture": "#6366f1",
  "Problèmes de facturation / Jours non consommés": "#14b8a6",
  "Problèmes de rechargement (E-paiement non validé)": "#84cc16",
  "Instabilité du Wi-Fi (Modem)": "#f97316",
  "Câbles extérieurs endommagés": "#a78bfa",
  Autre: "#6b7280",
  Général: "#7600dc",
};

export default function Forum() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [section, setSection] = useState("libre");
  const [filtres, setFiltres] = useState({
    types: [], // types de problème sélectionnés (multi)
    tri: "recent", // recent | likes | commentaires
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newPost, setNewPost] = useState({
    titre: "",
    contenu: "",
    typeProbleme: "Général",
  });
  const [postPhotos, setPostPhotos] = useState([]);
  const [postPhotosPrev, setPostPhotosPrev] = useState([]);
  const [comments, setComments] = useState({});
  const [openComments, setOpenComments] = useState({});
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef();

  const isService = user && SERVICES.includes(user.role);
  const isAdmin = user?.role === "admin";
  const canModerate = isService || isAdmin;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/forum", { params: { section } });
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [section]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!lightbox) return;
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight")
        setLightbox((l) => ({ ...l, index: (l.index + 1) % l.photos.length }));
      if (e.key === "ArrowLeft")
        setLightbox((l) => ({
          ...l,
          index: (l.index - 1 + l.photos.length) % l.photos.length,
        }));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightbox]);

  // Filtrage et tri côté client
  const filteredPosts = posts
    .filter(
      (p) =>
        filtres.types.length === 0 || filtres.types.includes(p.typeProbleme),
    )
    .sort((a, b) => {
      if (filtres.tri === "likes")
        return (b.likes?.length || 0) - (a.likes?.length || 0);
      if (filtres.tri === "commentaires")
        return (b.commentaires?.length || 0) - (a.commentaires?.length || 0);
      return new Date(b.createdAt) - new Date(a.createdAt); // recent
    });

  const toggleType = (t) => {
    setFiltres((f) => ({
      ...f,
      types: f.types.includes(t)
        ? f.types.filter((x) => x !== t)
        : [...f.types, t],
    }));
  };

  const toggleLike = async (id) => {
    if (!user) return;
    await api.patch(`/forum/${id}/like`);
    load();
  };

  const handlePostPhotos = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setPostPhotos(files);
    setPostPhotosPrev(files.map((f) => URL.createObjectURL(f)));
  };

  const removePhoto = (i) => {
    setPostPhotos((p) => p.filter((_, idx) => idx !== i));
    setPostPhotosPrev((p) => p.filter((_, idx) => idx !== i));
  };

  const submitPost = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("titre", newPost.titre);
    fd.append("contenu", newPost.contenu);
    fd.append("typeProbleme", newPost.typeProbleme);
    fd.append("section", isService ? "validee" : "libre");
    postPhotos.forEach((p) => fd.append("photos", p));
    await api.post("/forum", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setNewPost({ titre: "", contenu: "", typeProbleme: "Général" });
    setPostPhotos([]);
    setPostPhotosPrev([]);
    setShowForm(false);
    load();
  };

  const deletePost = async (id) => {
    if (!window.confirm("Supprimer cette publication ?")) return;
    await api.delete(`/forum/${id}`);
    load();
  };

  const deleteComment = async (postId, commentId) => {
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    await api.delete(`/forum/${postId}/comment/${commentId}`);
    load();
  };

  const addComment = async (id) => {
    if (!comments[id]?.trim()) return;
    await api.post(`/forum/${id}/comment`, { texte: comments[id] });
    setComments((c) => ({ ...c, [id]: "" }));
    load();
  };

  const validerPost = async (id) => {
    await api.patch(`/forum/${id}/valider`);
    load();
  };

  // ── LIGHTBOX ────────────────────────────────────────────
  const Lightbox = () => {
    if (!lightbox) return null;
    const { photos, index } = lightbox;
    return (
      <div
        onClick={() => setLightbox(null)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,.93)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "zoom-out",
        }}
      >
        <button
          onClick={() => setLightbox(null)}
          style={{
            position: "absolute",
            top: 20,
            right: 24,
            background: "rgba(255,255,255,.1)",
            border: "none",
            borderRadius: "50%",
            width: 44,
            height: 44,
            color: "white",
            fontSize: "1.1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>
        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox({
                  photos,
                  index: (index - 1 + photos.length) % photos.length,
                });
              }}
              style={{
                position: "absolute",
                left: 16,
                background: "rgba(255,255,255,.1)",
                border: "none",
                borderRadius: "50%",
                width: 48,
                height: 48,
                color: "white",
                fontSize: "1.5rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ‹
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox({ photos, index: (index + 1) % photos.length });
              }}
              style={{
                position: "absolute",
                right: 16,
                background: "rgba(255,255,255,.1)",
                border: "none",
                borderRadius: "50%",
                width: 48,
                height: 48,
                color: "white",
                fontSize: "1.5rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ›
            </button>
            <div
              style={{
                position: "absolute",
                top: 20,
                left: 20,
                background: "rgba(0,0,0,.5)",
                color: "white",
                padding: "3px 10px",
                borderRadius: 99,
                fontSize: ".78rem",
                fontWeight: 600,
              }}
            >
              {index + 1} / {photos.length}
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 20,
                display: "flex",
                gap: 5,
              }}
            >
              {photos.map((_, i) => (
                <div
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox({ photos, index: i });
                  }}
                  style={{
                    width: i === index ? 22 : 7,
                    height: 7,
                    borderRadius: 99,
                    cursor: "pointer",
                    background: i === index ? "white" : "rgba(255,255,255,.3)",
                    transition: "all .2s",
                  }}
                />
              ))}
            </div>
          </>
        )}
        <img
          src={`http://localhost:5000/uploads/${photos[index]}`}
          alt=""
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: "88vw",
            maxHeight: "86vh",
            objectFit: "contain",
            borderRadius: 8,
            cursor: "default",
          }}
        />
      </div>
    );
  };

  const Avatar = ({ role, prenom, nom, isOfficial, size = 32 }) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: isOfficial ? "rgba(255,255,255,.2)" : "var(--violet-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.33,
        color: isOfficial ? "white" : "var(--violet)",
        border: isOfficial
          ? "1.5px solid rgba(255,255,255,.3)"
          : "1.5px solid var(--violet-border)",
      }}
    >
      {isOfficial
        ? role
            ?.replace("service", "")
            .replace("_clientele", "C")
            .replace(/\d/, "S") || "S"
        : `${prenom?.[0] || ""}${nom?.[0] || ""}`}
    </div>
  );

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "1.5rem 1rem 4rem",
        display: "flex",
        gap: "1.5rem",
        alignItems: "flex-start",
      }}
    >
      <Lightbox />

      {/* ── SIDEBAR GAUCHE ── */}
      <aside style={{ width: 220, flexShrink: 0, position: "sticky", top: 76 }}>
        {/* Section tabs */}
        <div
          style={{
            background: "white",
            border: "1px solid var(--gris-200)",
            borderRadius: 12,
            padding: ".75rem",
            marginBottom: ".875rem",
          }}
        >
          <div
            style={{
              fontSize: ".7rem",
              fontWeight: 700,
              color: "var(--gris-400)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              marginBottom: ".5rem",
            }}
          >
            Section
          </div>
          {[
            ["libre", "Questions libres"],
            ["validee", "Réponses officielles"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 10px",
                border: "none",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: ".82rem",
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 3,
                background: section === key ? "var(--violet)" : "transparent",
                color: section === key ? "white" : "var(--gris-600)",
                transition: "all .15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tri */}
        <div
          style={{
            background: "white",
            border: "1px solid var(--gris-200)",
            borderRadius: 12,
            padding: ".75rem",
            marginBottom: ".875rem",
          }}
        >
          <div
            style={{
              fontSize: ".7rem",
              fontWeight: 700,
              color: "var(--gris-400)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              marginBottom: ".5rem",
            }}
          >
            Trier par
          </div>
          {[
            ["recent", "Récentes", "⏱"],
            ["likes", "Plus aimées", "❤"],
            ["commentaires", "Plus commentées", "💬"],
          ].map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setFiltres((f) => ({ ...f, tri: key }))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                textAlign: "left",
                padding: "7px 10px",
                border: "none",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: ".82rem",
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 3,
                background:
                  filtres.tri === key ? "var(--violet-bg)" : "transparent",
                color:
                  filtres.tri === key ? "var(--violet)" : "var(--gris-600)",
                transition: "all .15s",
              }}
            >
              <span style={{ fontSize: ".8rem" }}>{icon}</span>
              {label}
              {filtres.tri === key && (
                <span
                  style={{
                    marginLeft: "auto",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--violet)",
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Filtres par type */}
        <div
          style={{
            background: "white",
            border: "1px solid var(--gris-200)",
            borderRadius: 12,
            padding: ".75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: ".5rem",
            }}
          >
            <div
              style={{
                fontSize: ".7rem",
                fontWeight: 700,
                color: "var(--gris-400)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              Type
            </div>
            {filtres.types.length > 0 && (
              <button
                onClick={() => setFiltres((f) => ({ ...f, types: [] }))}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: ".68rem",
                  fontWeight: 700,
                  color: "var(--violet)",
                  padding: 0,
                }}
              >
                Tout effacer
              </button>
            )}
          </div>
          <div
            style={{
              maxHeight: 320,
              overflowY: "auto",
              scrollbarWidth: "none",
            }}
          >
            {TYPES.map((t) => {
              const active = filtres.types.includes(t);
              const color = TYPE_COLORS[t] || "#7600dc";
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    width: "100%",
                    textAlign: "left",
                    padding: "5px 8px",
                    border: "none",
                    borderRadius: 7,
                    fontFamily: "inherit",
                    fontSize: ".75rem",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    marginBottom: 2,
                    background: active ? color + "12" : "transparent",
                    color: active ? color : "var(--gris-600)",
                    transition: "all .12s",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: color,
                      flexShrink: 0,
                      opacity: active ? 1 : 0.4,
                    }}
                  />
                  <span style={{ lineHeight: 1.3 }}>{t}</span>
                  {active && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: ".65rem",
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Résumé filtres actifs */}
        {filtres.types.length > 0 && (
          <div
            style={{
              marginTop: ".75rem",
              padding: ".6rem .75rem",
              background: "var(--violet-bg)",
              borderRadius: 8,
              border: "1px solid var(--violet-border)",
            }}
          >
            <div
              style={{
                fontSize: ".7rem",
                fontWeight: 700,
                color: "var(--violet)",
                marginBottom: 3,
              }}
            >
              {filtres.types.length} filtre{filtres.types.length > 1 ? "s" : ""}{" "}
              actif{filtres.types.length > 1 ? "s" : ""}
            </div>
            <div
              style={{
                fontSize: ".7rem",
                color: "var(--violet)",
                opacity: 0.8,
              }}
            >
              {filteredPosts.length} résultat
              {filteredPosts.length > 1 ? "s" : ""}
            </div>
          </div>
        )}
      </aside>

      {/* ── CONTENU PRINCIPAL ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
              Forum communautaire
            </h1>
            <div
              style={{
                fontSize: ".75rem",
                color: "var(--gris-400)",
                marginTop: 2,
              }}
            >
              {filteredPosts.length} publication
              {filteredPosts.length > 1 ? "s" : ""}
              {filtres.types.length > 0 &&
                ` · ${filtres.types.length} filtre${filtres.types.length > 1 ? "s" : ""}`}
            </div>
          </div>
          {user && (section === "libre" || isService) && (
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "var(--violet)",
                color: "white",
                border: "none",
                borderRadius: 99,
                padding: "7px 14px",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: ".8rem",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(118,0,220,.28)",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Publier
            </button>
          )}
        </div>

        {/* Formulaire nouveau post */}
        {showForm && (
          <div
            style={{
              background: "white",
              border: "1px solid var(--gris-200)",
              borderRadius: 14,
              padding: ".875rem 1rem",
              marginBottom: ".875rem",
              boxShadow: "0 4px 16px rgba(118,0,220,.07)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".5rem",
                marginBottom: ".75rem",
              }}
            >
              <Avatar
                role={user?.role}
                prenom={user?.prenom}
                nom={user?.nom}
                isOfficial={isService}
                size={34}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: ".82rem" }}>
                  {user?.prenom} {user?.nom}
                </div>
                <select
                  value={newPost.typeProbleme}
                  onChange={(e) =>
                    setNewPost({ ...newPost, typeProbleme: e.target.value })
                  }
                  style={{
                    border: "none",
                    background: "none",
                    color: TYPE_COLORS[newPost.typeProbleme] || "var(--violet)",
                    fontFamily: "inherit",
                    fontWeight: 600,
                    fontSize: ".72rem",
                    cursor: "pointer",
                    padding: 0,
                    outline: "none",
                  }}
                >
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <form onSubmit={submitPost}>
              <input
                required
                placeholder="Titre"
                value={newPost.titre}
                onChange={(e) =>
                  setNewPost({ ...newPost, titre: e.target.value })
                }
                style={{
                  width: "100%",
                  border: "none",
                  borderBottom: "1.5px solid var(--gris-200)",
                  padding: "5px 0",
                  fontFamily: "inherit",
                  fontSize: ".9rem",
                  fontWeight: 700,
                  outline: "none",
                  marginBottom: ".6rem",
                  background: "transparent",
                }}
              />
              <textarea
                required
                placeholder="Décrivez votre problème..."
                rows={3}
                value={newPost.contenu}
                onChange={(e) =>
                  setNewPost({ ...newPost, contenu: e.target.value })
                }
                style={{
                  width: "100%",
                  border: "none",
                  fontFamily: "inherit",
                  fontSize: ".83rem",
                  outline: "none",
                  resize: "none",
                  background: "transparent",
                }}
              />
              {postPhotosPrev.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      postPhotosPrev.length === 1
                        ? "1fr"
                        : postPhotosPrev.length === 2
                          ? "1fr 1fr"
                          : "repeat(3,1fr)",
                    gap: 3,
                    marginTop: ".6rem",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  {postPhotosPrev.slice(0, 3).map((src, i) => (
                    <div
                      key={i}
                      style={{ position: "relative", paddingBottom: "100%" }}
                    >
                      <img
                        src={src}
                        alt=""
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "rgba(0,0,0,.6)",
                          border: "none",
                          borderRadius: "50%",
                          width: 20,
                          height: 20,
                          color: "white",
                          cursor: "pointer",
                          fontSize: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: ".75rem",
                  paddingTop: ".75rem",
                  borderTop: "1px solid var(--gris-200)",
                }}
              >
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#22c55e",
                    fontFamily: "inherit",
                    fontWeight: 600,
                    fontSize: ".78rem",
                    padding: "4px 8px",
                    borderRadius: 6,
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Photo
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handlePostPhotos}
                />
                <div style={{ display: "flex", gap: ".4rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setPostPhotos([]);
                      setPostPhotosPrev([]);
                    }}
                    style={{
                      background: "none",
                      border: "1px solid var(--gris-200)",
                      borderRadius: 7,
                      padding: "5px 12px",
                      fontFamily: "inherit",
                      fontSize: ".78rem",
                      cursor: "pointer",
                      color: "var(--gris-600)",
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    style={{
                      background: "var(--violet)",
                      color: "white",
                      border: "none",
                      borderRadius: 7,
                      padding: "5px 14px",
                      fontFamily: "inherit",
                      fontWeight: 700,
                      fontSize: ".78rem",
                      cursor: "pointer",
                    }}
                  >
                    Publier
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {loading && (
          <div
            style={{
              textAlign: "center",
              color: "var(--gris-400)",
              padding: "3rem 0",
            }}
          >
            Chargement...
          </div>
        )}
        {!loading && filteredPosts.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--gris-400)",
              padding: "3rem 0",
              fontSize: ".875rem",
            }}
          >
            Aucune publication trouvée.
          </div>
        )}

        {/* ── POSTS COMPACTS ── */}
        {filteredPosts.map((post) => {
          const isOfficial = post.isServicePost;
          const hasLiked = user && post.likes?.includes(user._id);
          const showCmts = openComments[post._id];
          const canDelete = canModerate || post.auteur?._id === user?._id;
          const photos = post.photos || [];
          const typeColor = TYPE_COLORS[post.typeProbleme] || "#7600dc";

          return (
            <div
              key={post._id}
              style={{
                background: isOfficial
                  ? "linear-gradient(135deg,#5c00b0,#8800cc)"
                  : "white",
                border: isOfficial ? "none" : "1px solid var(--gris-200)",
                borderRadius: 12,
                marginBottom: ".6rem",
                color: isOfficial ? "white" : "inherit",
                overflow: "hidden",
                boxShadow: isOfficial
                  ? "0 3px 14px rgba(118,0,220,.2)"
                  : "0 1px 3px rgba(0,0,0,.04)",
              }}
            >
              {/* Bande couleur */}
              {!isOfficial && (
                <div
                  style={{ height: 2.5, background: typeColor, opacity: 0.65 }}
                />
              )}

              <div style={{ padding: ".875rem 1rem" }}>
                {/* En-tête compact */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: ".5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".5rem",
                    }}
                  >
                    <Avatar
                      role={post.auteur?.role}
                      prenom={post.auteur?.prenom}
                      nom={post.auteur?.nom}
                      isOfficial={isOfficial}
                      size={32}
                    />
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: ".82rem" }}>
                          {isOfficial
                            ? post.auteur?.role
                                ?.replace(/_/g, " ")
                                .toUpperCase()
                            : `${post.auteur?.prenom || ""} ${post.auteur?.nom?.[0] || ""}.`}
                        </span>
                        {isOfficial && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: ".65rem",
                              fontWeight: 700,
                              background: "rgba(255,255,255,.2)",
                              borderRadius: 99,
                              padding: "1px 6px",
                            }}
                          >
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                            Officiel
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: ".65rem",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 99,
                            background: isOfficial
                              ? "rgba(255,255,255,.15)"
                              : typeColor + "15",
                            color: isOfficial ? "white" : typeColor,
                            border: isOfficial
                              ? "none"
                              : `1px solid ${typeColor}30`,
                          }}
                        >
                          {post.typeProbleme}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: ".67rem",
                          opacity: 0.55,
                          marginTop: 1,
                        }}
                      >
                        {new Date(post.createdAt).toLocaleDateString("fr-DZ", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions modération */}
                  <div
                    style={{
                      display: "flex",
                      gap: 3,
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {canModerate && !isOfficial && section === "libre" && (
                      <button
                        onClick={() => validerPost(post._id)}
                        style={{
                          background: "var(--violet-bg)",
                          border: "none",
                          borderRadius: 6,
                          padding: "2px 8px",
                          fontSize: ".68rem",
                          fontWeight: 700,
                          color: "var(--violet)",
                          cursor: "pointer",
                        }}
                      >
                        Valider
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => deletePost(post._id)}
                        style={{
                          background: isOfficial
                            ? "rgba(255,255,255,.1)"
                            : "none",
                          border: "none",
                          borderRadius: 5,
                          padding: "3px 5px",
                          color: isOfficial
                            ? "rgba(255,255,255,.6)"
                            : "var(--gris-400)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Titre + texte tronqué */}
                <div style={{ marginBottom: photos.length > 0 ? ".6rem" : 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: ".88rem",
                      marginBottom: ".2rem",
                      lineHeight: 1.3,
                    }}
                  >
                    {post.titre}
                  </div>
                  <div
                    style={{
                      fontSize: ".8rem",
                      lineHeight: 1.55,
                      opacity: isOfficial ? 0.88 : 0.75,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {post.contenu}
                  </div>
                </div>

                {/* Photos compactes */}
                {photos.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        photos.length === 1
                          ? "200px"
                          : photos.length === 2
                            ? "1fr 1fr"
                            : "repeat(3,1fr)",
                      gap: 2,
                      marginBottom: ".6rem",
                      borderRadius: 8,
                      overflow: "hidden",
                      maxWidth: photos.length === 1 ? 200 : "100%",
                    }}
                  >
                    {photos.slice(0, 3).map((ph, i) => (
                      <div
                        key={i}
                        style={{
                          position: "relative",
                          paddingBottom: "100%",
                          cursor: "zoom-in",
                          overflow: "hidden",
                        }}
                        onClick={() => setLightbox({ photos, index: i })}
                      >
                        <img
                          src={`http://localhost:5000/uploads/${ph}`}
                          alt=""
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            transition: "transform .2s",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.transform = "scale(1.05)")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.transform = "scale(1)")
                          }
                        />
                        {i === 2 && photos.length > 3 && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(0,0,0,.55)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.2rem",
                              fontWeight: 800,
                              color: "white",
                            }}
                          >
                            +{photos.length - 3}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Stats discrètes */}
                {(post.likes?.length > 0 || post.commentaires?.length > 0) && (
                  <div
                    style={{
                      display: "flex",
                      gap: ".75rem",
                      fontSize: ".68rem",
                      opacity: 0.5,
                      marginBottom: ".5rem",
                      paddingBottom: ".5rem",
                      borderBottom: isOfficial
                        ? "1px solid rgba(255,255,255,.12)"
                        : "1px solid var(--gris-200)",
                    }}
                  >
                    {post.likes?.length > 0 && (
                      <span>{post.likes.length} j'aime</span>
                    )}
                    {post.commentaires?.length > 0 && (
                      <span>
                        {post.commentaires.length} commentaire
                        {post.commentaires.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}

                {/* Boutons actions */}
                <div style={{ display: "flex", gap: 3 }}>
                  <button
                    onClick={() => toggleLike(post._id)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      background: hasLiked
                        ? isOfficial
                          ? "rgba(255,255,255,.15)"
                          : "#fff0f3"
                        : "none",
                      border: "none",
                      borderRadius: 7,
                      padding: "5px 0",
                      cursor: user ? "pointer" : "default",
                      color: hasLiked
                        ? "#e11d48"
                        : isOfficial
                          ? "rgba(255,255,255,.7)"
                          : "var(--gris-600)",
                      fontFamily: "inherit",
                      fontWeight: 600,
                      fontSize: ".75rem",
                      transition: "all .15s",
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill={hasLiked ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    J'aime
                  </button>

                  <button
                    onClick={() =>
                      setOpenComments((o) => ({
                        ...o,
                        [post._id]: !o[post._id],
                      }))
                    }
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      background: showCmts
                        ? isOfficial
                          ? "rgba(255,255,255,.15)"
                          : "var(--violet-bg)"
                        : "none",
                      border: "none",
                      borderRadius: 7,
                      padding: "5px 0",
                      cursor: "pointer",
                      color: showCmts
                        ? isOfficial
                          ? "white"
                          : "var(--violet)"
                        : isOfficial
                          ? "rgba(255,255,255,.7)"
                          : "var(--gris-600)",
                      fontFamily: "inherit",
                      fontWeight: 600,
                      fontSize: ".75rem",
                      transition: "all .15s",
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Commenter
                  </button>
                </div>

                {/* Commentaires */}
                {showCmts && (
                  <div
                    style={{
                      marginTop: ".75rem",
                      paddingTop: ".75rem",
                      borderTop: isOfficial
                        ? "1px solid rgba(255,255,255,.12)"
                        : "1px solid var(--gris-100)",
                    }}
                  >
                    {post.commentaires?.map((c) => (
                      <div
                        key={c._id}
                        style={{
                          display: "flex",
                          gap: ".4rem",
                          marginBottom: ".5rem",
                          alignItems: "flex-start",
                        }}
                      >
                        <Avatar
                          role={c.auteur?.role}
                          prenom={c.auteur?.prenom}
                          nom={c.auteur?.nom}
                          isOfficial={c.isService}
                          size={26}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              background: isOfficial
                                ? "rgba(255,255,255,.1)"
                                : "var(--gris-100)",
                              borderRadius: "0 9px 9px 9px",
                              padding: "5px 9px",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: ".7rem",
                                marginBottom: 2,
                              }}
                            >
                              {c.isService
                                ? c.auteur?.role
                                    ?.replace(/_/g, " ")
                                    .toUpperCase()
                                : `${c.auteur?.prenom || ""} ${c.auteur?.nom?.[0] || ""}.`}
                            </div>
                            <div style={{ fontSize: ".77rem" }}>{c.texte}</div>
                          </div>
                          <div
                            style={{
                              fontSize: ".63rem",
                              opacity: 0.45,
                              marginTop: 2,
                              paddingLeft: 4,
                              display: "flex",
                              gap: 8,
                            }}
                          >
                            {new Date(c.date).toLocaleDateString("fr-DZ")}
                            {canModerate && (
                              <button
                                onClick={() => deleteComment(post._id, c._id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--rouge)",
                                  cursor: "pointer",
                                  fontSize: ".63rem",
                                  fontWeight: 700,
                                  padding: 0,
                                }}
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {user && (
                      <div
                        style={{
                          display: "flex",
                          gap: ".4rem",
                          alignItems: "center",
                          marginTop: ".4rem",
                        }}
                      >
                        <Avatar
                          role={user?.role}
                          prenom={user?.prenom}
                          nom={user?.nom}
                          isOfficial={isService}
                          size={26}
                        />
                        <input
                          placeholder="Écrire un commentaire..."
                          value={comments[post._id] || ""}
                          onChange={(e) =>
                            setComments((c) => ({
                              ...c,
                              [post._id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" && addComment(post._id)
                          }
                          style={{
                            flex: 1,
                            padding: "6px 12px",
                            border: isOfficial
                              ? "1px solid rgba(255,255,255,.2)"
                              : "1.5px solid var(--gris-200)",
                            borderRadius: 99,
                            fontFamily: "inherit",
                            fontSize: ".77rem",
                            outline: "none",
                            background: isOfficial
                              ? "rgba(255,255,255,.08)"
                              : "var(--gris-50)",
                            color: isOfficial ? "white" : "inherit",
                          }}
                        />
                        <button
                          onClick={() => addComment(post._id)}
                          style={{
                            background: "var(--violet)",
                            border: "none",
                            borderRadius: "50%",
                            width: 30,
                            height: 30,
                            cursor: "pointer",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
