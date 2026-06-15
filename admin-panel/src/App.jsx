import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAdmin } from "./context/AuthContext";
import AdminLayout from "./components/AdminLayout";
import LoginPage from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import Reclamations from "./pages/Reclamations";
import Forum from "./pages/Forum";
import Clients from "./pages/Clients";

function PrivateRoute({ children }) {
  const { admin } = useAdmin();
  return admin ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="agents" element={<Agents />} />
            <Route path="reclamations" element={<Reclamations />} />
            <Route path="forum" element={<Forum />} />
            <Route path="clients" element={<Clients />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
