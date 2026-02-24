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

  // Asigna una imagen según palabras clave en el nombre del servicio
  const getImagenServicio = (nombre) => {
    const n = nombre?.toLowerCase() || "";
    if (
      n.includes("mascarilla") ||
      n.includes("facial") ||
      n.includes("limpieza")
    )
      return "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&h=300&fit=crop";
    if (n.includes("tinte") || n.includes("color") || n.includes("tintura"))
      return "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&h=300&fit=crop";
    if (n.includes("barba") && (n.includes("corte") || n.includes("+")))
      return "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&h=300&fit=crop";
    if (n.includes("barba") || n.includes("afeitado") || n.includes("bigote"))
      return "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=500&h=300&fit=crop";
    if (
      n.includes("corte") ||
      n.includes("cabello") ||
      n.includes("pelo") ||
      n.includes("hair")
    )
      return "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&h=300&fit=crop";
    if (n.includes("cejas") || n.includes("depilacion"))
      return "https://images.unsplash.com/photo-1560066984-138daaa0eda3?w=500&h=300&fit=crop";
    // Imagen por defecto de barbería
    return "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=500&h=300&fit=crop";
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

        {/* VISTA CLIENTES: Tarjetas con foto */}
        {currentUser?.rol !== "admin" && (
          <div>
            {servicios.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-2xl mb-2">💈</p>
                <p>No hay servicios disponibles por el momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {servicios.map((servicio) => (
                  <div
                    key={servicio.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                  >
                    {/* Imagen del servicio */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={getImagenServicio(servicio.nombre)}
                        alt={servicio.nombre}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        onError={(e) => {
                          e.target.src =
                            "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=500&h=300&fit=crop";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute bottom-3 left-4 text-white font-bold text-lg drop-shadow">
                        {servicio.nombre}
                      </span>
                      <span className="absolute top-3 right-3 bg-white/90 text-emerald-700 font-extrabold text-sm px-3 py-1 rounded-full shadow">
                        ${Number(servicio.precio).toLocaleString()}
                      </span>
                    </div>

                    {/* Contenido */}
                    <div className="p-5 flex flex-col flex-1">
                      <p className="text-gray-600 text-sm mb-4 flex-1">
                        {servicio.descripcion}
                      </p>
                      <div className="flex items-center justify-between mb-4">
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                          ⏱️ {servicio.duracion} min
                        </span>
                        <span className="text-xs text-gray-400">
                          #{servicio.id}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          navigate("/citas", {
                            state: { openForm: true, servicio_id: servicio.id },
                          })
                        }
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 py-2.5 rounded-xl font-bold transition transform hover:scale-105 shadow-md"
                      >
                        📅 Agendar ahora
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISTA ADMIN: Tabla con miniatura */}
        {currentUser?.rol === "admin" && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm sm:text-base">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Foto
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
                        colSpan="7"
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
                        <td className="px-4 sm:px-6 py-3">
                          <img
                            src={getImagenServicio(servicio.nombre)}
                            alt={servicio.nombre}
                            className="w-16 h-12 object-cover rounded-lg shadow"
                            onError={(e) => {
                              e.target.src =
                                "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200&h=120&fit=crop";
                            }}
                          />
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Servicios;
