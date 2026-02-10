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
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h2 className="text-2xl font-bold">✂️ Barbería K-19</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition"
              >
                ← Dashboard
              </button>
              <span className="text-sm">👤 {currentUser?.nombre}</span>
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
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                💈{" "}
                {currentUser?.rol === "admin"
                  ? "Gestión de Servicios"
                  : "Servicios Disponibles"}
              </h1>
              <p className="text-gray-600 text-lg">
                Total de servicios:{" "}
                <span className="font-bold text-purple-600">
                  {servicios.length}
                </span>
              </p>
            </div>
            {currentUser?.rol === "admin" && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:from-purple-700 hover:to-indigo-700 transform transition hover:scale-105 shadow-lg"
              >
                {showForm ? "✕ Cancelar" : "+ Nuevo Servicio"}
              </button>
            )}
          </div>
        </div>

        {/* Formulario - Solo Admin */}
        {showForm && currentUser?.rol === "admin" && (
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
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

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition transform hover:scale-105"
                >
                  {editId ? "💾 Actualizar Servicio" : "➕ Crear Servicio"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-bold hover:bg-gray-300 transition"
                >
                  ✕ Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabla de Servicios */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duración
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        #{servicio.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {servicio.nombre}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {servicio.descripcion}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-green-600">
                          ${Number(servicio.precio).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          ⏱️ {servicio.duracion} min
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {currentUser?.rol === "admin" ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(servicio)}
                              className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded font-semibold transition"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleDelete(servicio.id)}
                              className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded font-semibold transition"
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
                            className="bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 rounded font-semibold transition"
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
