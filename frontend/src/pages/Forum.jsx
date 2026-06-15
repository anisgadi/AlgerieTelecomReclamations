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

export default function Forum() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [section, setSection] = useState("libre");
  const [filtre, setFiltre] = useState("Tous");
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
  const [lightbox, setLightbox] = useState(null); // { photos: [], index: 0 }
  const fileRef = useRef();

  const isService = user && SERVICES.includes(user.role);
  const isAdmin = user?.role === "admin";
  const canModerate = isService || isAdmin;

  const load = async () => {
    setLoading(true);
    try {
      const params = { section };
      if (filtre !== "Tous") params.typeProbleme = filtre;
      const { data } = await api.get("/forum", { params });
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [section, filtre]);

  // Fermer lightbox avec Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (!lightbox) return;
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight")
        setLightbox((l) => ({
          ...l,
          index: (l.index + 1) % l.photos.length,
        }));
      if (e.key === "ArrowLeft")
        setLightbox((l) => ({
          ...l,
          index: (l.index - 1 + l.photos.length) % l.photos.length,
        }));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightbox]);

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
    const prev = () =>
      setLightbox({
        photos,
        index: (index - 1 + photos.length) % photos.length,
      });
    const next = () =>
      setLightbox({ photos, index: (index + 1) % photos.length });

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
        {/* Fermer */}
        <button
          onClick={() => setLightbox(null)}
          style={{
            position: "absolute",
            top: 20,
            right: 24,
            background: "rgba(255,255,255,.12)",
            border: "none",
            borderRadius: "50%",
            width: 44,
            height: 44,
            color: "white",
            fontSize: "1.2rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>

        {/* Précédent */}
        {photos.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            style={{
              position: "absolute",
              left: 20,
              background: "rgba(255,255,255,.12)",
              border: "none",
              borderRadius: "50%",
              width: 52,
              height: 52,
              color: "white",
              fontSize: "1.6rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>
        )}

        {/* Image */}
        <img
          src={`http://localhost:5000/uploads/${photos[index]}`}
          alt=""
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: "90vw",
            maxHeight: "88vh",
            objectFit: "contain",
            borderRadius: 10,
            boxShadow: "0 8px 48px rgba(0,0,0,.7)",
            cursor: "default",
          }}
        />

        {/* Suivant */}
        {photos.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            style={{
              position: "absolute",
              right: 20,
              background: "rgba(255,255,255,.12)",
              border: "none",
              borderRadius: "50%",
              width: 52,
              height: 52,
              color: "white",
              fontSize: "1.6rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ›
          </button>
        )}

        {/* Indicateurs */}
        {photos.length > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: 24,
              display: "flex",
              gap: 6,
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
                  width: i === index ? 24 : 8,
                  height: 8,
                  borderRadius: 99,
                  cursor: "pointer",
                  background: i === index ? "white" : "rgba(255,255,255,.35)",
                  transition: "all .2s",
                }}
              />
            ))}
          </div>
        )}

        {/* Compteur */}
        {photos.length > 1 && (
          <div
            style={{
              position: "absolute",
              top: 24,
              left: 24,
              background: "rgba(0,0,0,.5)",
              color: "white",
              padding: "4px 12px",
              borderRadius: 99,
              fontSize: ".8rem",
              fontWeight: 600,
            }}
          >
            {index + 1} / {photos.length}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container page">
      <Lightbox />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <h1 className="page-title" style={{ margin: 0 }}>
          Forum communautaire
        </h1>
        {user && (section === "libre" || isService) && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm(!showForm)}
          >
            + Nouveau post
          </button>
        )}
      </div>

      {/* Formulaire nouveau post */}
      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".75rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "var(--violet-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "var(--violet)",
                fontSize: ".9rem",
              }}
            >
              {user.prenom?.[0]}
              {user.nom?.[0]}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: ".875rem" }}>
                {user.prenom} {user.nom}
              </div>
              <select
                className="form-select"
                style={{
                  padding: "2px 8px",
                  fontSize: ".75rem",
                  height: "auto",
                  marginTop: 2,
                }}
                value={newPost.typeProbleme}
                onChange={(e) =>
                  setNewPost({ ...newPost, typeProbleme: e.target.value })
                }
              >
                {TYPES.filter((t) => t !== "Tous").map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <form onSubmit={submitPost}>
            <div className="form-group">
              <input
                className="form-input"
                required
                placeholder="Titre de votre publication"
                value={newPost.titre}
                onChange={(e) =>
                  setNewPost({ ...newPost, titre: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <textarea
                className="form-textarea"
                required
                placeholder="Décrivez votre question ou problème..."
                rows={4}
                value={newPost.contenu}
                onChange={(e) =>
                  setNewPost({ ...newPost, contenu: e.target.value })
                }
              />
            </div>

            {/* Prévisualisation photos */}
            {postPhotosPrev.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    postPhotosPrev.length === 1
                      ? "1fr"
                      : postPhotosPrev.length === 2
                        ? "1fr 1fr"
                        : "repeat(3, 1fr)",
                  gap: 3,
                  marginBottom: "1rem",
                  borderRadius: 10,
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
                        display: "block",
                      }}
                    />
                    {/* Badge +X sur la 3ème si plus de 3 */}
                    {i === 2 && postPhotosPrev.length > 3 && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,.55)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.4rem",
                          fontWeight: 800,
                          color: "white",
                        }}
                      >
                        +{postPhotosPrev.length - 3}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        background: "rgba(0,0,0,.6)",
                        border: "none",
                        borderRadius: "50%",
                        width: 24,
                        height: 24,
                        color: "white",
                        cursor: "pointer",
                        fontSize: 12,
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
                  gap: 6,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--gris-600)",
                  fontFamily: "inherit",
                  fontWeight: 600,
                  fontSize: ".83rem",
                  padding: "6px 12px",
                  borderRadius: 8,
                  transition: "background .18s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "var(--gris-100)")
                }
                onMouseOut={(e) => (e.currentTarget.style.background = "none")}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Photo/vidéo
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePostPhotos}
              />
              <div style={{ display: "flex", gap: ".5rem" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setShowForm(false);
                    setPostPhotos([]);
                    setPostPhotosPrev([]);
                  }}
                >
                  Annuler
                </button>
                <button className="btn btn-primary btn-sm">Publier</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filtres section */}
      <div
        style={{
          display: "flex",
          gap: ".5rem",
          flexWrap: "wrap",
          marginBottom: ".875rem",
        }}
      >
        {[
          ["libre", "Questions libres"],
          ["validee", "Réponses officielles"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`btn btn-sm ${section === key ? "btn-primary" : "btn-secondary"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtres type */}
      <div
        style={{
          display: "flex",
          gap: ".4rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        {["Tous", ...TYPES].map((t) => (
          <button
            key={t}
            onClick={() => setFiltre(t)}
            style={{
              padding: "3px 12px",
              borderRadius: 99,
              border: "1.5px solid",
              fontSize: ".77rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all .15s",
              background: filtre === t ? "var(--violet)" : "transparent",
              color: filtre === t ? "#fff" : "var(--gris-600)",
              borderColor: filtre === t ? "var(--violet)" : "var(--gris-200)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div
          style={{
            color: "var(--gris-400)",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          Chargement...
        </div>
      )}

      {/* Posts */}
      {posts.map((post) => {
        const isOfficial = post.isServicePost;
        const hasLiked = user && post.likes?.includes(user._id);
        const showCmts = openComments[post._id];
        const canDelete = canModerate || post.auteur?._id === user?._id;
        const photos = post.photos || [];

        return (
          <div
            key={post._id}
            style={{
              background: isOfficial
                ? "linear-gradient(135deg,#6d00cc,#9900d8)"
                : "white",
              border: isOfficial ? "none" : "1px solid var(--gris-200)",
              borderRadius: 16,
              padding: "1.25rem 1.5rem",
              marginBottom: ".875rem",
              color: isOfficial ? "white" : "inherit",
              boxShadow: "0 1px 4px rgba(0,0,0,.06)",
            }}
          >
            {/* En-tête */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: ".875rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: ".75rem" }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: isOfficial
                      ? "rgba(255,255,255,.2)"
                      : "var(--violet-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: ".9rem",
                    color: isOfficial ? "white" : "var(--violet)",
                  }}
                >
                  {isOfficial
                    ? post.auteur?.role
                        ?.replace("service", "S")
                        .replace("_clientele", "C")
                        .replace(/\d/, "")
                    : `${post.auteur?.prenom?.[0] || ""}${post.auteur?.nom?.[0] || ""}`}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: ".875rem" }}>
                    {isOfficial
                      ? post.auteur?.role?.replace(/_/g, " ").toUpperCase()
                      : `${post.auteur?.prenom || ""} ${post.auteur?.nom?.[0] || ""}.`}
                  </div>
                  <div
                    style={{ fontSize: ".72rem", opacity: 0.65, marginTop: 2 }}
                  >
                    {new Date(post.createdAt).toLocaleDateString("fr-DZ", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {" · "}
                    <span
                      style={{
                        padding: "1px 8px",
                        borderRadius: 99,
                        fontSize: ".7rem",
                        fontWeight: 600,
                        background: isOfficial
                          ? "rgba(255,255,255,.2)"
                          : "var(--violet-bg)",
                        color: isOfficial ? "white" : "var(--violet)",
                      }}
                    >
                      {post.typeProbleme}
                    </span>
                  </div>
                </div>
              </div>
              <div
                style={{ display: "flex", gap: ".4rem", alignItems: "center" }}
              >
                {isOfficial && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: "rgba(255,255,255,.2)",
                      borderRadius: 99,
                      padding: "2px 10px",
                      fontSize: ".72rem",
                      fontWeight: 700,
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                    Officiel
                  </span>
                )}
                {canModerate && !isOfficial && section === "libre" && (
                  <button
                    onClick={() => validerPost(post._id)}
                    style={{
                      background: "var(--violet-bg)",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: ".72rem",
                      fontWeight: 600,
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
                        ? "rgba(255,255,255,.15)"
                        : "#fef2f2",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 8px",
                      color: isOfficial ? "white" : "var(--rouge)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
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

            {/* Contenu */}
            <div style={{ marginBottom: ".875rem" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "1rem",
                  marginBottom: ".4rem",
                }}
              >
                {post.titre}
              </div>
              <div
                style={{
                  fontSize: ".875rem",
                  lineHeight: 1.65,
                  opacity: isOfficial ? 0.9 : 1,
                }}
              >
                {post.contenu}
              </div>
            </div>

            {/* ── PHOTOS 1:1 avec lightbox ── */}
            {photos.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    photos.length === 1
                      ? "1fr"
                      : photos.length === 2
                        ? "1fr 1fr"
                        : "repeat(3, 1fr)",
                  gap: 3,
                  marginBottom: ".875rem",
                  borderRadius: 12,
                  overflow: "hidden",
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
                        transition: "transform .25s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.transform = "scale(1.04)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    />
                    {/* Badge +X sur la 3ème si plus de 3 photos */}
                    {i === 2 && photos.length > 3 && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,.58)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.6rem",
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

            {/* Footer actions */}
            <div
              style={{
                display: "flex",
                gap: ".5rem",
                paddingTop: ".75rem",
                borderTop: isOfficial
                  ? "1px solid rgba(255,255,255,.2)"
                  : "1px solid var(--gris-200)",
              }}
            >
              <button
                onClick={() => toggleLike(post._id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: hasLiked
                    ? isOfficial
                      ? "rgba(255,255,255,.2)"
                      : "#fff0f3"
                    : "none",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 14px",
                  cursor: user ? "pointer" : "default",
                  color: hasLiked
                    ? "#e11d48"
                    : isOfficial
                      ? "rgba(255,255,255,.8)"
                      : "var(--gris-600)",
                  fontFamily: "inherit",
                  fontWeight: 600,
                  fontSize: ".83rem",
                  transition: "all .15s",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={hasLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {post.likes?.length || 0} J'aime
              </button>

              <button
                onClick={() =>
                  setOpenComments((o) => ({
                    ...o,
                    [post._id]: !o[post._id],
                  }))
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "none",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 600,
                  fontSize: ".83rem",
                  color: isOfficial
                    ? "rgba(255,255,255,.8)"
                    : "var(--gris-600)",
                  transition: "all .15s",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {post.commentaires?.length || 0} Commentaires
              </button>
            </div>

            {/* Section commentaires */}
            {showCmts && (
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "1rem",
                  borderTop: isOfficial
                    ? "1px solid rgba(255,255,255,.15)"
                    : "1px solid var(--gris-100)",
                }}
              >
                {post.commentaires?.map((c) => (
                  <div
                    key={c._id}
                    style={{
                      display: "flex",
                      gap: ".6rem",
                      marginBottom: ".75rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: isOfficial
                          ? "rgba(255,255,255,.2)"
                          : "var(--violet-bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: ".75rem",
                        color: isOfficial ? "white" : "var(--violet)",
                      }}
                    >
                      {c.isService
                        ? c.auteur?.role?.[0]?.toUpperCase()
                        : `${c.auteur?.prenom?.[0] || ""}${c.auteur?.nom?.[0] || ""}`}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          background: isOfficial
                            ? "rgba(255,255,255,.15)"
                            : "var(--gris-100)",
                          borderRadius: "0 12px 12px 12px",
                          padding: "8px 12px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: ".78rem",
                            marginBottom: 2,
                          }}
                        >
                          {c.isService
                            ? c.auteur?.role?.replace(/_/g, " ").toUpperCase()
                            : `${c.auteur?.prenom || ""} ${c.auteur?.nom?.[0] || ""}.`}
                        </div>
                        <div style={{ fontSize: ".83rem" }}>{c.texte}</div>
                      </div>
                      <div
                        style={{
                          fontSize: ".7rem",
                          opacity: 0.6,
                          marginTop: 3,
                          paddingLeft: 4,
                        }}
                      >
                        {new Date(c.date).toLocaleDateString("fr-DZ")}
                        {canModerate && (
                          <button
                            onClick={() => deleteComment(post._id, c._id)}
                            style={{
                              marginLeft: 8,
                              background: "none",
                              border: "none",
                              color: "var(--rouge)",
                              cursor: "pointer",
                              fontSize: ".7rem",
                              fontWeight: 600,
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
                      gap: ".6rem",
                      alignItems: "center",
                      marginTop: ".5rem",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: isOfficial
                          ? "rgba(255,255,255,.2)"
                          : "var(--violet-bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: ".75rem",
                        color: isOfficial ? "white" : "var(--violet)",
                      }}
                    >
                      {user.prenom?.[0]}
                      {user.nom?.[0]}
                    </div>
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
                        padding: "8px 14px",
                        border: isOfficial
                          ? "1px solid rgba(255,255,255,.3)"
                          : "1.5px solid var(--gris-200)",
                        borderRadius: 99,
                        fontFamily: "inherit",
                        fontSize: ".83rem",
                        outline: "none",
                        background: isOfficial
                          ? "rgba(255,255,255,.12)"
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
                        width: 34,
                        height: 34,
                        cursor: "pointer",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
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
        );
      })}
    </div>
  );
}
