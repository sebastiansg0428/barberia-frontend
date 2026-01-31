import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";

function Citas() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [citas, setCitas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    usuario_id: "",
    servicio_id: "",
    fecha: "",
    hora: "",
    estado: "pendiente",
    notas: "",
  });

  const getCitas = async () => {
    try {
      const response = await fetch("http://localhost:3000/citas");
      if (!response.ok) throw new Error("Error al obtener citas");
      const data = await response.json();
      setCitas(Array.isArray(data.citas) ? data.citas : []);
    } catch (error) {
      console.error(error);
      setCitas([]);
    }
  };

  const getUsuarios = async () => {
    try {
      const response = await fetch("http://localhost:3000/usuarios");
      if (!response.ok) throw new Error("Error al obtener usuarios");
      const data = await response.json();
      setUsuarios(Array.isArray(data.usuarios) ? data.usuarios : []);
    } catch (error) {
      console.error(error);
    }
  };

  const getServicios = async () => {
    try {
      const response = await fetch("http://localhost:3000/servicios");
      if (!response.ok) throw new Error("Error al obtener servicios");
      const data = await response.json();
      setServicios(Array.isArray(data.servicios) ? data.servicios : []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        // Actualizar cita
        await fetch(`http://localhost:3000/citas/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        setCitas((prev) =>
          prev.map((c) => (c.id === editId ? { ...c, ...formData } : c)),
        );
        setEditId(null);
      } else {
        // Crear cita
        const response = await fetch("http://localhost:3000/citas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const newCita = await response.json();
        await getCitas(); // Recargar para obtener datos completos
      }
      setFormData({
        usuario_id: "",
        servicio_id: "",
        fecha: "",
        hora: "",
        estado: "pendiente",
        notas: "",
      });
      setShowForm(false);
    } catch (error) {
      console.error(error);
      alert("Error al guardar la cita");
    }
  };

  const handleEdit = (cita) => {
    setEditId(cita.id);
    setFormData({
      usuario_id: cita.usuario_id,
      servicio_id: cita.servicio_id,
      fecha: cita.fecha?.split("T")[0] || "",
      hora: cita.hora,
      estado: cita.estado,
      notas: cita.notas || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta cita?")) return;
    try {
      await fetch(`http://localhost:3000/citas/${id}`, {
        method: "DELETE",
      });
      setCitas((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error(error);
      alert("Error al eliminar la cita");
    }
  };

  const handleCancel = () => {
    setFormData({
      usuario_id: "",
      servicio_id: "",
      fecha: "",
      hora: "",
      estado: "pendiente",
      notas: "",
    });
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
    if (user.rol !== "admin") {
      navigate("/dashboard");
      return;
    }
    setCurrentUser(user);
    Promise.all([getCitas(), getUsuarios(), getServicios()]).finally(() =>
      setLoading(false),
    );
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Cargando citas...</p>
        </div>
      </div>
    );
  }

  const getUsuarioNombre = (id) => {
    const usuario = usuarios.find((u) => u.id === parseInt(id));
    return usuario ? usuario.nombre : "N/A";
  };

  const getServicioNombre = (id) => {
    const servicio = servicios.find((s) => s.id === parseInt(id));
    return servicio ? servicio.nombre : "N/A";
  };

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
                📅 Gestión de Citas
              </h1>
              <p className="text-gray-600 text-lg">
                Total de citas:{" "}
                <span className="font-bold text-purple-600">
                  {citas.length}
                </span>
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:from-purple-700 hover:to-indigo-700 transform transition hover:scale-105 shadow-lg"
            >
              {showForm ? "✕ Cancelar" : "+ Nueva Cita"}
            </button>
          </div>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {editId ? "✏️ Editar Cita" : "➕ Crear Nueva Cita"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="usuario_id"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    👤 Cliente
                  </label>
                  <select
                    id="usuario_id"
                    name="usuario_id"
                    required
                    value={formData.usuario_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  >
                    <option value="">Seleccione un cliente</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nombre} - {usuario.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="servicio_id"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    💈 Servicio
                  </label>
                  <select
                    id="servicio_id"
                    name="servicio_id"
                    required
                    value={formData.servicio_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  >
                    <option value="">Seleccione un servicio</option>
                    {servicios.map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.nombre} - $
                        {Number(servicio.precio).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="fecha"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    📆 Fecha
                  </label>
                  <input
                    id="fecha"
                    name="fecha"
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hora"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    ⏰ Hora
                  </label>
                  <input
                    id="hora"
                    name="hora"
                    type="time"
                    required
                    value={formData.hora}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label
                    htmlFor="estado"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    📊 Estado
                  </label>
                  <select
                    id="estado"
                    name="estado"
                    required
                    value={formData.estado}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="notas"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  📝 Notas
                </label>
                <textarea
                  id="notas"
                  name="notas"
                  rows="3"
                  value={formData.notas}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="Notas adicionales sobre la cita..."
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition transform hover:scale-105"
                >
                  {editId ? "💾 Actualizar Cita" : "➕ Crear Cita"}
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

        {/* Tabla de Citas */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Servicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {citas.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay citas disponibles. ¡Crea la primera!
                    </td>
                  </tr>
                ) : (
                  citas.map((cita) => (
                    <tr key={cita.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        #{cita.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {getUsuarioNombre(cita.usuario_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {getServicioNombre(cita.servicio_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {cita.fecha
                            ? new Date(cita.fecha).toLocaleDateString("es-ES")
                            : "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-indigo-600">
                          ⏰ {cita.hora}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            cita.estado === "confirmada"
                              ? "bg-green-100 text-green-800"
                              : cita.estado === "completada"
                                ? "bg-blue-100 text-blue-800"
                                : cita.estado === "cancelada"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {cita.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(cita)}
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded font-semibold transition"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDelete(cita.id)}
                            className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded font-semibold transition"
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
      </div>
    </div>
  );
}

export default Citas;
