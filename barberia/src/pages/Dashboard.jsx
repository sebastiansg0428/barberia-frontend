import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";

function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({ nombre: "", email: "", rol: "" });

  const getUsuarios = async () => {
    try {
      const response = await fetch("http://localhost:3000/usuarios");
      if (!response.ok) throw new Error("Error al obtener usuarios");
      const data = await response.json();
      // El backend devuelve { usuarios: [...] }
      setUsuarios(Array.isArray(data.usuarios) ? data.usuarios : []);
    } catch (error) {
      console.error(error);
      setUsuarios([]);
    }
  };

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
        prev.map((u) => (u.id === id ? { ...u, ...editForm } : u)),
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
      getUsuarios().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h2 className="text-2xl font-bold">✂️ Barbería K-19</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm">👤 {currentUser?.nombre}</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold">
                {currentUser?.rol}
              </span>
              <button
                onClick={handleLogout}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition"
              >
                🚪 Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bienvenida */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ¡Bienvenido, {currentUser?.nombre}! 👋
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            Panel de administración del sistema de barbería
          </p>

          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border-l-4 border-purple-600">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 font-semibold">📧 Email</p>
                <p className="text-gray-900">{currentUser?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">👤 Rol</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                    currentUser?.rol === "admin"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-300 text-gray-700"
                  }`}
                >
                  {currentUser?.rol}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">
                  📅 Miembro desde
                </p>
                <p className="text-gray-900">
                  {currentUser?.fecha_registro
                    ? new Date(currentUser.fecha_registro).toLocaleDateString(
                        "es-ES",
                      )
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Admin */}
        {currentUser?.rol === "admin" && (
          <>
            {/* Gestión de Usuarios */}
            <div className="bg-white rounded-xl shadow-md p-8 mb-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    👥 Gestión de Usuarios
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Total de usuarios:{" "}
                    <span className="font-bold text-purple-600">
                      {usuarios.length}
                    </span>
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Teléfono
                      </th>

                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Registro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usuarios.map((user) => (
                      <tr
                        key={user.id}
                        className={
                          editUserId === user.id
                            ? "bg-purple-50"
                            : "hover:bg-gray-50"
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editUserId === user.id ? (
                            <input
                              type="text"
                              name="nombre"
                              value={editForm.nombre}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          ) : (
                            <span className="text-sm text-gray-900">
                              {user.nombre}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editUserId === user.id ? (
                            <input
                              type="email"
                              name="email"
                              value={editForm.email}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          ) : (
                            <span className="text-sm text-gray-900">
                              {user.email}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {editUserId === user.id ? (
                            <input
                              type="tel"
                              name="telefono"
                              value={editForm.telefono}
                              onChange={handleEditChange}
                              className="w-full px-2 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          ) : (
                            <span className="text-sm text-gray-900">
                              {user.telefono}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {editUserId === user.id ? (
                            <select
                              name="rol"
                              value={editForm.rol}
                              onChange={handleEditChange}
                              className="px-2 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="admin">admin</option>
                              <option value="cliente">cliente</option>
                            </select>
                          ) : (
                            <span
                              className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.rol === "admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {user.rol}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.fecha_registro
                            ? new Date(user.fecha_registro).toLocaleDateString(
                                "es-ES",
                              )
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {editUserId === user.id ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditSave(user.id)}
                                className="bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded font-semibold transition"
                              >
                                ✓ Guardar
                              </button>
                              <button
                                onClick={handleEditCancel}
                                className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1 rounded font-semibold transition"
                              >
                                ✕ Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditClick(user)}
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded font-semibold transition"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={user.id === currentUser.id}
                                className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botón Servicios */}
            <div className="text-center space-x-4">
              <button
                onClick={() => navigate("/servicios")}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transform transition hover:scale-105 shadow-lg"
              >
                🚀 Ir a Gestión de Servicios
              </button>
              <button
                onClick={() => navigate("/citas")}
                className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-teal-700 transform transition hover:scale-105 shadow-lg"
              >
                📅 Ir a Gestión de Citas
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
