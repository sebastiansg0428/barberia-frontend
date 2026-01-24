import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, getAllUsers, deleteUser, updateUser } from '../services/authService';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    loadUsers();
  }, [navigate]);

  const loadUsers = () => {
    setLoading(true);
    try {
      const allUsers = getAllUsers();
      setUsers(allUsers);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        deleteUser(userId);
        loadUsers();
        if (currentUser.id === userId) {
          handleLogout();
        }
      } catch (err) {
        alert('Error al eliminar usuario: ' + err.message);
      }
    }
  };

  const handleEditClick = (user) => {
    setEditingUser(user.id);
    setEditForm({
      email: user.email,
      fullName: user.fullName
    });
  };

  const handleEditSubmit = (userId) => {
    try {
      updateUser(userId, editForm);
      setEditingUser(null);
      loadUsers();
      if (currentUser.id === userId) {
        setCurrentUser(getCurrentUser());
      }
    } catch (err) {
      alert('Error al actualizar usuario: ' + err.message);
    }
  };

  if (loading) {
    return <div className="dashboard-container"><p>Cargando...</p></div>;
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

        {isAdmin && (
          <div className="users-section">
            <h2>Gestión de Usuarios</h2>
            <p className="users-count">Total de usuarios: {users.length}</p>

            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Fecha de Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className={editingUser === user.id ? 'editing' : ''}>
                      <td>
                        {editingUser === user.id ? (
                          <input
                            type="text"
                            value={editForm.fullName}
                            onChange={(e) =>
                              setEditForm({ ...editForm, fullName: e.target.value })
                            }
                          />
                        ) : (
                          user.fullName
                        )}
                      </td>
                      <td>
                        {editingUser === user.id ? (
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) =>
                              setEditForm({ ...editForm, email: e.target.value })
                            }
                          />
                        ) : (
                          user.email
                        )}
                      </td>
                      <td>
                        <span className={user.isAdmin ? 'role-admin' : 'role-user'}>
                          {user.isAdmin ? 'Admin' : 'Usuario'}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        {editingUser === user.id ? (
                          <>
                            <button
                              className="btn-save"
                              onClick={() => handleEditSubmit(user.id)}
                            >
                              Guardar
                            </button>
                            <button
                              className="btn-cancel"
                              onClick={() => setEditingUser(null)}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-edit"
                              onClick={() => handleEditClick(user)}
                            >
                              Editar
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={users.length === 1}
                            >
                              Eliminar
                            </button>
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
                <strong>Miembro desde:</strong> {new Date(currentUser?.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
