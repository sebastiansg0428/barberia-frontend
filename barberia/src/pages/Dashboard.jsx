
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";
import "./Dashboard.css";

const getUsuarios = async () => {
  const response = await fetch("http://localhost:3000/usuarios");
  if (!response.ok) throw new Error("Error al obtener usuarios");
  return await response.json();
};


function Dashboard() {

  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: "", email: "", rol: "" });

  // Edición de usuario
  const handleEditClick = (user) => {
    setEditUserId(user.id);
    setEditForm({ nombre: user.nombre, email: user.email, rol: user.rol });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSave = async (id) => {
    try {
      await fetch(`http://localhost:3000/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setUsuarios((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...editForm } : u))
      );
      setEditUserId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditCancel = () => {
    setEditUserId(null);
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
    try {
      await fetch(`http://localhost:3000/usuarios/${id}`, { method: "DELETE" });
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setCurrentUser(user);
    if (user.rol === "admin") {
      getUsuarios()
        .then((data) => setUsuarios(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [navigate]);

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="dashboard-container">
      <nav className="dashboard-navbar">
        <div className="navbar-content">
          <h2>Barbería K-19</h2>
          <div className="navbar-user">
            <span>{currentUser?.nombre}</span>
            <button onClick={handleLogout} className="btn-logout">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>
      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Bienvenido, {currentUser?.nombre}!</h1>
          <p>Panel de administración del sistema de barbería</p>
          <div className="profile-card">
            <p><strong>Email:</strong> {currentUser?.email}</p>
            <p><strong>Rol:</strong> {currentUser?.rol}</p>
            <p><strong>Miembro desde:</strong> {currentUser?.fecha_registro ? new Date(currentUser.fecha_registro).toLocaleDateString() : ''}</p>
          </div>
        </div>
        {/* Tabla de usuarios solo para admin */}
        {currentUser?.rol === "admin" && (
          <div className="users-section">
            <h2>Gestión de Usuarios</h2>
            <p className="users-count">Total de usuarios: {usuarios.length}</p>
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Fecha de Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>
                        {editUserId === user.id ? (
                          <input
                            type="text"
                            name="nombre"
                            value={editForm.nombre}
                            onChange={handleEditChange}
                          />
                        ) : (
                          user.nombre
                        )}
                      </td>
                      <td>
                        {editUserId === user.id ? (
                          <input
                            type="email"
                            name="email"
                            value={editForm.email}
                            onChange={handleEditChange}
                          />
                        ) : (
                          user.email
                        )}
                      </td>
                      <td>
                        {editUserId === user.id ? (
                          <select name="rol" value={editForm.rol} onChange={handleEditChange}>
                            <option value="admin">admin</option>
                            <option value="cliente">cliente</option>
                          </select>
                        ) : (
                          user.rol
                        )}
                      </td>
                      <td>{user.fecha_registro ? new Date(user.fecha_registro).toLocaleDateString() : ''}</td>
                      <td>
                        {editUserId === user.id ? (
                          <>
                            <button onClick={() => handleEditSave(user.id)} className="btn-save">Guardar</button>
                            <button onClick={handleEditCancel} className="btn-cancel">Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEditClick(user)} className="btn-edit">Editar</button>
                            <button onClick={() => handleDeleteUser(user.id)} className="btn-delete">Eliminar</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
