import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";
import { API_URL } from "../config/api";

function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    rol: "",
  });

  const [metrics, setMetrics] = useState({
    totalUsuarios: 0,
    totalCitas: 0,
    totalServicios: 0,
    citasPorEstado: [],
    citasPorDia: [],
    citasPorMes: [],
  });

  const getUsuarios = async () => {
    try {
      const response = await fetch(`${API_URL}/usuarios`);
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
    setEditForm({
      nombre: user.nombre,
      email: user.email,
      telefono: user.telefono || "",
      rol: user.rol,
    });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSave = async (id) => {
    try {
      await fetch(`${API_URL}/usuarios/${id}`, {
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
      await fetch(`${API_URL}/usuarios/${id}`, { method: "DELETE" });
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
      Promise.all([
        getUsuarios(),
        fetch(`${API_URL}/dashboard/stats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_usuario: user.id }),
        }).then((r) => r.json()),
      ])
        .then(([_, stats]) => {
          setMetrics({
            totalUsuarios: stats.totalUsuarios || 0,
            totalCitas: stats.totalCitas || 0,
            totalServicios: stats.totalServicios || 0,
            citasPorEstado: stats.citasPorEstado || [],
            citasPorDia: Array.isArray(stats.citasPorDia)
              ? stats.citasPorDia
              : [],
            citasPorMes: Array.isArray(stats.citasPorMes)
              ? stats.citasPorMes
              : [],
          });
        })
        .catch((error) => {
          console.error("Error al obtener métricas:", error);
          setMetrics({
            totalUsuarios: 0,
            totalCitas: 0,
            totalServicios: 0,
            citasPorEstado: [],
            citasPorDia: [],
            citasPorMes: [],
          });
        })
        .finally(() => setLoading(false));
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
      <nav className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <h2 className="text-2xl font-bold">✂️ Barbería K-19</h2>
            {/* Botón hamburguesa en móvil */}
            <button
              className="sm:hidden flex items-center px-3 py-2 border rounded text-white border-white ml-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Abrir menú"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            {/* Menú */}
            <div
              className={`flex-col sm:flex-row sm:flex items-center space-y-2 sm:space-y-0 sm:space-x-4 absolute sm:static top-16 left-0 w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 sm:bg-none p-4 sm:p-0 transition-all duration-200 z-40 ${menuOpen ? "flex" : "hidden sm:flex"}`}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/servicios");
                }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition w-full sm:w-auto"
              >
                💈 Gestión de Servicios
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/citas");
                }}
                className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition w-full sm:w-auto"
              >
                📅 Gestión de Citas
              </button>
              <span className="text-sm w-full sm:w-auto text-center">
                👤 {currentUser?.nombre}
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold w-full sm:w-auto text-center">
                {currentUser?.rol}
              </span>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition w-full sm:w-auto"
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
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-8 mb-8">
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
            {/* Métricas Dashboard */}
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                📊 Métricas del Sistema
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-purple-50 p-6 rounded-xl shadow text-center">
                  <p className="text-lg font-semibold text-purple-700">
                    Usuarios
                  </p>
                  <p className="text-3xl font-bold">{metrics.totalUsuarios}</p>
                </div>
                <div className="bg-green-50 p-6 rounded-xl shadow text-center">
                  <p className="text-lg font-semibold text-green-700">Citas</p>
                  <p className="text-3xl font-bold">{metrics.totalCitas}</p>
                </div>
                <div className="bg-indigo-50 p-6 rounded-xl shadow text-center">
                  <p className="text-lg font-semibold text-indigo-700">
                    Servicios
                  </p>
                  <p className="text-3xl font-bold">{metrics.totalServicios}</p>
                </div>
              </div>
              {/* Citas por estado */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">Citas por Estado</h3>
                <div className="flex flex-wrap gap-4">
                  {Array.isArray(metrics.citasPorEstado) ? (
                    metrics.citasPorEstado.map((item) => (
                      <div
                        key={item.estado}
                        className="bg-gray-100 px-4 py-2 rounded-lg font-semibold"
                      >
                        {item.estado}:{" "}
                        <span className="text-purple-600 font-bold">
                          {item.total}
                        </span>
                      </div>
                    ))
                  ) : metrics.citasPorEstado &&
                    typeof metrics.citasPorEstado === "object" ? (
                    Object.entries(metrics.citasPorEstado).map(
                      ([estado, total]) => (
                        <div
                          key={estado}
                          className="bg-gray-100 px-4 py-2 rounded-lg font-semibold"
                        >
                          {estado}:{" "}
                          <span className="text-purple-600 font-bold">
                            {total}
                          </span>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-gray-500">No hay datos disponibles</p>
                  )}
                </div>
              </div>
              {/* Citas por día */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">Citas por Día</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs sm:text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(metrics.citasPorDia) &&
                      metrics.citasPorDia.length > 0 ? (
                        metrics.citasPorDia.map((item, index) => (
                          <tr key={item.dia || item.fecha || index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.dia || item.fecha
                                ? new Date(
                                    item.dia || item.fecha,
                                  ).toLocaleDateString("es-ES")
                                : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-purple-600">
                              {item.total}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="2"
                            className="px-6 py-4 text-center text-gray-500"
                          >
                            No hay datos disponibles
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Citas por mes */}
              <div>
                <h3 className="text-xl font-bold mb-2">Citas por Mes</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(metrics.citasPorMes) &&
                      metrics.citasPorMes.length > 0 ? (
                        metrics.citasPorMes.map((item) => (
                          <tr key={item.mes}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.mes}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-purple-600">
                              {item.total}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="2"
                            className="px-6 py-4 text-center text-gray-500"
                          >
                            No hay datos disponibles
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Gestión de Usuarios */}
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-8 mb-8">
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
                <table className="min-w-full text-xs sm:text-sm divide-y divide-gray-200">
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
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
