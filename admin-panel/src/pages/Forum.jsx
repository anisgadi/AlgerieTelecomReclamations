import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Forum() {
  const [posts, setPosts] = useState([]);
  const [section, setSection] = useState("libre");

  const load = async () => {
    const { data } = await api.get("/forum", { params: { section } });
    setPosts(data);
  };
  useEffect(() => {
    load();
  }, [section]);

  const deletePost = async (id) => {
    if (!window.confirm("Supprimer cette publication ?")) return;
    await api.delete(`/forum/${id}`);
    load();
  };

  const deleteComment = async (postId, commentId) => {
    await api.delete(`/forum/${postId}/comment/${commentId}`);
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.25rem" }}>
        {[
          ["libre", "Questions libres"],
          ["validee", "Réponses officielles"],
        ].map(([k, v]) => (
          <button
            key={k}
            onClick={() => setSection(k)}
            className={`btn btn-sm ${section === k ? "btn-violet" : "btn-outline"}`}
          >
            {v}
          </button>
        ))}
      </div>

      {posts.map((post) => (
        <div
          key={post._id}
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            marginBottom: ".875rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: ".75rem",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: ".9rem",
                  color: "var(--text)",
                }}
              >
                {post.titre}
              </div>
              <div
                style={{
                  fontSize: ".75rem",
                  color: "var(--text-3)",
                  marginTop: 3,
                }}
              >
                {post.auteur?.prenom} {post.auteur?.nom} ·{" "}
                {new Date(post.createdAt).toLocaleDateString("fr-DZ")} ·{" "}
                <span
                  className="badge badge-violet"
                  style={{ fontSize: ".67rem" }}
                >
                  {post.typeProbleme}
                </span>
              </div>
            </div>
            <button
              className="btn btn-danger btn-xs"
              onClick={() => deletePost(post._id)}
            >
              Supprimer
            </button>
          </div>
          <p
            style={{
              fontSize: ".83rem",
              color: "var(--text-2)",
              marginBottom: ".875rem",
            }}
          >
            {post.contenu}
          </p>

          {/* Commentaires */}
          {post.commentaires?.length > 0 && (
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: ".75rem",
              }}
            >
              <div
                style={{
                  fontSize: ".72rem",
                  color: "var(--text-3)",
                  marginBottom: ".5rem",
                  fontWeight: 700,
                }}
              >
                COMMENTAIRES ({post.commentaires.length})
              </div>
              {post.commentaires.map((c) => (
                <div
                  key={c._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    padding: ".4rem .6rem",
                    background: "var(--bg-3)",
                    borderRadius: 6,
                    marginBottom: ".3rem",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: ".78rem",
                        color: "var(--text)",
                      }}
                    >
                      {c.auteur?.prenom} {c.auteur?.nom}
                    </span>
                    <span
                      style={{
                        fontSize: ".78rem",
                        color: "var(--text-2)",
                        marginLeft: 8,
                      }}
                    >
                      {c.texte}
                    </span>
                  </div>
                  <button
                    className="btn btn-danger btn-xs"
                    onClick={() => deleteComment(post._id, c._id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
