import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user } = useAuth();
  return (
    <div>
      <div className="hero">
        <div className="container">
          <h1>
            Vos réclamations,
            <br />
            traitées rapidement
          </h1>
          <p>
            Déposez, suivez et résolvez vos problèmes avec Algérie Télécom en
            toute simplicité.
          </p>
          <div className="hero-actions">
            {user?.role === "client" ? (
              <Link to="/deposer">
                <button className="btn-white">Déposer une réclamation</button>
              </Link>
            ) : !user ? (
              <>
                <Link to="/register">
                  <button className="btn-white">Créer un compte</button>
                </Link>
                <Link to="/login">
                  <button className="btn-white-outline">Se connecter</button>
                </Link>
              </>
            ) : (
              <Link to="/dashboard">
                <button className="btn-white">Tableau de bord</button>
              </Link>
            )}
            <Link to="/forum">
              <button className="btn-white-outline">Voir le forum</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
