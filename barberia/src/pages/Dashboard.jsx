import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  // Gestión de usuarios deshabilitada hasta migrar a backend
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    console.log("Usuario recuperado:", user);
    if (!user) {
      setLoading(false);
      navigate("/login");
      return;
    }
    setCurrentUser(user);
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Funciones de edición/eliminación de usuarios deshabilitadas hasta migrar a backend

  if (loading) {
    return (
      <div className="dashboard-container">
        <p>Cargando...</p>
      </div>
    );
  }

  const isAdmin = currentUser?.isAdmin;

  return (
    <div className="dashboard-container">
      <nav className="dashboard-navbar">
        <div className="navbar-content">
          <h2>Barbería K-19</h2>
          <div className="navbar-user">
            <span>{currentUser?.fullName}</span>
            <button onClick={handleLogout} className="btn-logout">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Bienvenido, {currentUser?.fullName}!</h1>
          <p>Panel de administración del sistema de barbería</p>
          {isAdmin && <span className="admin-badge">Administrador</span>}
        </div>

        {/* Gestión de usuarios deshabilitada hasta migrar a backend */}

        {!isAdmin && (
          <div className="user-profile-section">
            <h2>Mi Perfil</h2>
            <div className="profile-card">
              <p>
                <strong>Nombre:</strong> {currentUser?.fullName}
              </p>
              <p>
                <strong>Email:</strong> {currentUser?.email}
              </p>
              <p>
                <strong>Miembro desde:</strong>{" "}
                {new Date(currentUser?.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
