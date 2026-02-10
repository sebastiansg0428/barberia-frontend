import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";
import { API_URL } from "../config/api";

function Servicios() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    duracion: "",
  });

  const getServicios = async () => {
    try {
      const response = await fetch(`${API_URL}/servicios`);
      if (!response.ok) throw new Error("Error al obtener servicios");
      const data = await response.json();
      // El backend devuelve { servicios: [...] }
      setServicios(Array.isArray(data.servicios) ? data.servicios : []);
    } catch (error) {
      console.error(error);
      setServicios([]);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        // Actualizar servicio
        await fetch(`${API_URL}/servicios/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        setServicios((prev) =>
          prev.map((s) => (s.id === editId ? { ...s, ...formData } : s)),
        );
        setEditId(null);
      } else {
        // Crear servicio
        const response = await fetch(`${API_URL}/servicios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const newServicio = await response.json();
        setServicios([...servicios, newServicio.servicio]);
      }
      setFormData({ nombre: "", descripcion: "", precio: "", duracion: "" });
      setShowForm(false);
    } catch (error) {
      console.error(error);
      alert("Error al guardar el servicio");
    }
  };

  const handleEdit = (servicio) => {
    setEditId(servicio.id);
    setFormData({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      precio: servicio.precio,
      duracion: servicio.duracion,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este servicio?")) return;
    try {
      await fetch(`${API_URL}/servicios/${id}`, {
        method: "DELETE",
      });
      setServicios((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error(error);
      alert("Error al eliminar el servicio");
    }
  };

  const handleCancel = () => {
    setFormData({ nombre: "", descripcion: "", precio: "", duracion: "" });
    setEditId(null);
    setShowForm(false);
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
    getServicios().finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Cargando servicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar Responsive */}
      <nav className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h2 className="text-xl sm:text-2xl font-bold">✂️ Barbería K-19</h2>

            {/* Botón hamburguesa móvil */}
            <button
              className="sm:hidden flex items-center px-3 py-2 border rounded text-white border-white"
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

            {/* Menú desktop */}
            <div className="hidden sm:flex items-center space-x-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
              >
                ← Dashboard
              </button>
              <span className="text-sm px-3 py-1 bg-white/10 rounded-full">
                👤 {currentUser?.nombre}
              </span>
              <button
                onClick={handleLogout}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
              >
                🚪 Salir
              </button>
            </div>
          </div>

          {/* Menú móvil */}
          {menuOpen && (
            <div className="sm:hidden pb-4 space-y-2">
              <button
                onClick={() => {
                  navigate("/dashboard");
                  setMenuOpen(false);
                }}
                className="w-full bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition text-left"
              >
                ← Dashboard
              </button>
              <div className="px-4 py-2 text-sm bg-white/10 rounded-lg">
                👤 {currentUser?.nombre}
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="w-full bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition text-left"
              >
                🚪 Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-6 sm:mb-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                💈{" "}
                {currentUser?.rol === "admin"
                  ? "Gestión de Servicios"
                  : "Servicios Disponibles"}
              </h1>
              <p className="text-gray-600 text-base sm:text-lg">
                Total de servicios:{" "}
                <span className="font-bold text-indigo-600">
                  {servicios.length}
                </span>
              </p>
            </div>
            {currentUser?.rol === "admin" && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:from-cyan-600 hover:via-blue-600 hover:to-indigo-700 transform transition hover:scale-105 shadow-lg w-full sm:w-auto"
              >
                {showForm ? "✕ Cancelar" : "+ Nuevo Servicio"}
              </button>
            )}
          </div>
        </div>

        {/* Formulario - Solo Admin */}
        {showForm && currentUser?.rol === "admin" && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-6 sm:mb-8 border border-gray-100">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
              {editId ? "✏️ Editar Servicio" : "➕ Crear Nuevo Servicio"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="nombre"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    📝 Nombre del Servicio
                  </label>
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="Ej: Corte de cabello"
                  />
                </div>
                <div>
                  <label
                    htmlFor="precio"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    💰 Precio
                  </label>
                  <input
                    id="precio"
                    name="precio"
                    type="number"
                    step="0.01"
                    required
                    value={formData.precio}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="Ej: 25000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="duracion"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    ⏱️ Duración (minutos)
                  </label>
                  <input
                    id="duracion"
                    name="duracion"
                    type="number"
                    required
                    value={formData.duracion}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="Ej: 30"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="descripcion"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  📋 Descripción
                </label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  rows="3"
                  required
                  value={formData.descripcion}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="Describe el servicio..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white py-3 px-6 rounded-lg font-bold hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700 transition transform hover:scale-105 shadow-md"
                >
                  {editId ? "💾 Actualizar" : "➕ Crear Servicio"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white py-3 px-6 rounded-lg font-bold hover:from-gray-500 hover:to-gray-600 transition shadow-md"
                >
                  ✕ Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabla de Servicios */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm sm:text-base">
              <thead className="bg-gray-50">
                <tr>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duración
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {servicios.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay servicios disponibles. ¡Crea el primero!
                    </td>
                  </tr>
                ) : (
                  servicios.map((servicio) => (
                    <tr key={servicio.id} className="hover:bg-gray-50">
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        #{servicio.id}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {servicio.nombre}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {servicio.descripcion}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-emerald-600">
                          ${Number(servicio.precio).toLocaleString()}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          ⏱️ {servicio.duracion} min
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {currentUser?.rol === "admin" ? (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => handleEdit(servicio)}
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 px-3 py-1.5 rounded-lg font-semibold transition transform hover:scale-105 shadow-md text-xs sm:text-sm"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleDelete(servicio.id)}
                              className="bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 px-3 py-1.5 rounded-lg font-semibold transition transform hover:scale-105 shadow-md text-xs sm:text-sm"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              navigate("/citas", {
                                state: {
                                  openForm: true,
                                  servicio_id: servicio.id,
                                },
                              })
                            }
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 px-4 py-2 rounded-lg font-semibold transition transform hover:scale-105 shadow-md w-full sm:w-auto"
                          >
                            📅 Agendar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Servicios;
