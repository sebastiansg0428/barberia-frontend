import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";
import { API_URL } from "../config/api";

function Pagos() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [pagoStats, setPagoStats] = useState(null); // Estadísticas de pagos
  const [citas, setCitas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    id_cita: "",
    monto: "",
    metodo: "efectivo",
  });

  const getPagos = async () => {
    try {
      const response = await fetch(`${API_URL}/pagos`);
      if (!response.ok) throw new Error("Error al obtener pagos");
      const data = await response.json();
      console.log("Pagos recibidos del backend:", data.pagos);
      setPagos(Array.isArray(data.pagos) ? data.pagos : []);
    } catch (error) {
      console.error(error);
      setPagos([]);
    }
  };

  const getCitas = async () => {
    try {
      const response = await fetch(`${API_URL}/citas`);
      if (!response.ok) throw new Error("Error al obtener citas");
      const data = await response.json();
      // Filtrar solo citas completadas sin pago registrado
      const citasData = Array.isArray(data.citas) ? data.citas : [];
      const citasCompletadas = citasData.filter(
        (c) => c.estado === "completada",
      );
      setCitas(citasCompletadas);
    } catch (error) {
      console.error(error);
      setCitas([]);
    }
  };

  const getUsuarios = async () => {
    try {
      const response = await fetch(`${API_URL}/usuarios`);
      if (!response.ok) throw new Error("Error al obtener usuarios");
      const data = await response.json();
      console.log("Usuarios cargados:", data.usuarios);
      setUsuarios(Array.isArray(data.usuarios) ? data.usuarios : []);
    } catch (error) {
      console.error(error);
      setUsuarios([]);
    }
  };

  const getNombreUsuario = (id_usuario) => {
    const usuario = usuarios.find((u) => u.id === parseInt(id_usuario));
    return usuario ? usuario.nombre : "N/A";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Si cambia la cita, autocompletar el monto con el precio del servicio
    if (name === "id_cita" && value) {
      const citaSeleccionada = citas.find((c) => c.id === parseInt(value));
      if (citaSeleccionada) {
        setFormData({
          ...formData,
          [name]: value,
          monto: citaSeleccionada.precio || "",
        });
        return;
      }
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar datos antes de enviar
    if (!formData.id_cita || !formData.monto) {
      alert("⚠️ Por favor completa todos los campos obligatorios");
      return;
    }

    try {
      // Construir objeto con los tipos correctos para el backend
      const pagoData = {
        id_cita: parseInt(formData.id_cita),
        monto: parseFloat(formData.monto),
        metodo: formData.metodo,
        fecha_pago: new Date().toISOString().split("T")[0], // Fecha actual YYYY-MM-DD
      };

      console.log("Enviando datos del pago:", pagoData);

      const response = await fetch(`${API_URL}/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pagoData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Error del backend:", error);
        alert(
          "❌ Error al registrar pago: " +
            (error.error || error.message || "Error desconocido"),
        );
        return;
      }

      const result = await response.json();
      console.log("Pago registrado:", result);

      alert("✅ Pago registrado exitosamente");
      await getPagos();
      setFormData({
        id_cita: "",
        monto: "",
        metodo: "efectivo",
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error de conexión:", error);
      alert("❌ Error de conexión al registrar el pago");
    }
  };

  const handleCancelForm = () => {
    setFormData({
      id_cita: "",
      monto: "",
      metodo: "efectivo",
    });
    setShowForm(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Obtener estadísticas de pagos (solo admin)
  const getPagoStats = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/dashboard/pagos-stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: userId }),
      });
      if (!response.ok)
        throw new Error("Error al obtener estadísticas de pagos");
      const data = await response.json();
      setPagoStats(data);
    } catch (error) {
      console.error(error);
      setPagoStats(null);
    }
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
        getPagos(),
        getCitas(),
        getUsuarios(),
        getPagoStats(user.id),
      ]).finally(() => setLoading(false));
    } else {
      // Cliente solo ve sus pagos, usando el endpoint filtrado por id_usuario
      Promise.all([
        fetch(`${API_URL}/pagos?id_usuario=${user.id}`).then((r) => r.json()),
        getUsuarios(),
      ])
        .then(([data]) => {
          const pagosUsuario = Array.isArray(data.pagos) ? data.pagos : [];
          setPagos(pagosUsuario);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Cargando pagos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar Responsive */}
      <nav className="bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h2 className="text-xl sm:text-2xl font-bold">✂️ Barbería K-19</h2>

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
        {/* Estadísticas de Pagos - Solo Admin */}
        {currentUser?.rol === "admin" && pagoStats && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-6 sm:mb-8 border border-violet-200">
            <h2 className="text-2xl font-bold text-violet-700 mb-4 flex items-center gap-2">
              📊 Estadísticas de Pagos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-violet-50 p-6 rounded-xl shadow text-center">
                <p className="text-lg font-semibold text-violet-700">
                  Total Pagos
                </p>
                <p className="text-3xl font-bold">
                  {pagoStats.totalPagos ?? 0}
                </p>
              </div>
              <div className="bg-green-50 p-6 rounded-xl shadow text-center">
                <p className="text-lg font-semibold text-green-700">
                  Monto Total
                </p>
                <p className="text-3xl font-bold">
                  ${Number(pagoStats.totalMontoPagado).toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-50 p-6 rounded-xl shadow text-center">
                <p className="text-lg font-semibold text-blue-700">
                  Métodos Distintos
                </p>
                <p className="text-3xl font-bold">
                  {Array.isArray(pagoStats.pagosPorMetodo)
                    ? pagoStats.pagosPorMetodo.length
                    : 0}
                </p>
              </div>
            </div>
            {/* Pagos por método */}
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2">Pagos por Método</h3>
              <div className="flex flex-wrap gap-4">
                {Array.isArray(pagoStats.pagosPorMetodo) &&
                pagoStats.pagosPorMetodo.length > 0 ? (
                  pagoStats.pagosPorMetodo.map((item) => (
                    <div
                      key={item.metodo}
                      className="bg-gray-100 px-4 py-2 rounded-lg font-semibold capitalize"
                    >
                      {item.metodo}:{" "}
                      <span className="text-violet-600 font-bold">
                        {item.total}
                      </span>{" "}
                      ({" "}
                      <span className="text-green-600">
                        $
                        {!isNaN(Number(item.montoTotal?.trim()))
                          ? Number(item.montoTotal?.trim()).toLocaleString()
                          : 0}
                      </span>
                      )
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No hay datos disponibles</p>
                )}
              </div>
            </div>
            {/* Pagos por mes */}
            <div>
              <h3 className="text-xl font-bold mb-2">Pagos por Mes</h3>
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
                    {pagos.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          No hay pagos registrados.
                        </td>
                      </tr>
                    ) : (
                      pagos.map((pago) => (
                        <tr key={pago.id} className="hover:bg-gray-50">
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            #{pago.id}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-violet-600">
                              {(() => {
                                const cita = citas.find(
                                  (c) => c.id === pago.id_cita,
                                );
                                return cita
                                  ? cita.nombre_servicio
                                  : `Cita #${pago.id_cita}`;
                              })()}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">
                              {pago.nombre_cliente
                                ? pago.nombre_cliente.trim()
                                : "N/A"}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-green-600">
                              $
                              {!isNaN(Number(pago.monto))
                                ? Number(pago.monto).toLocaleString()
                                : 0}
                            </span>
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                              {pago.metodo}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {pago.fecha_pago
                              ? new Date(pago.fecha_pago).toLocaleDateString(
                                  "es-ES",
                                )
                              : "N/A"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-6 sm:mb-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent mb-2">
                💸{" "}
                {currentUser?.rol === "admin"
                  ? "Gestión de Pagos"
                  : "Mis Pagos"}
              </h1>
              <p className="text-gray-600 text-base sm:text-lg">
                Total de pagos:{" "}
                <span className="font-bold text-violet-600">
                  {pagos.length}
                </span>
              </p>
            </div>
            {currentUser?.rol === "admin" && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-gradient-to-r from-violet-500 via-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg font-bold hover:from-violet-600 hover:via-purple-600 hover:to-pink-700 transform transition hover:scale-105 shadow-lg w-full sm:w-auto"
              >
                {showForm ? "✕ Cancelar" : "+ Registrar Pago"}
              </button>
            )}
          </div>
        </div>

        {/* Formulario - Solo Admin */}
        {showForm && currentUser?.rol === "admin" && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-6 sm:mb-8 border border-gray-100">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
              ➕ Registrar Nuevo Pago
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="id_cita"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    📅 Cita
                  </label>
                  <select
                    id="id_cita"
                    name="id_cita"
                    required
                    value={formData.id_cita}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  >
                    <option value="">Seleccione una cita completada</option>
                    {citas.map((cita) => (
                      <option key={cita.id} value={cita.id}>
                        #{cita.id} - {cita.nombre_usuario} -{" "}
                        {cita.nombre_servicio} (
                        {cita.fecha_hora?.substring(0, 10)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="monto"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    💰 Monto
                  </label>
                  <input
                    id="monto"
                    name="monto"
                    type="number"
                    step="0.01"
                    required
                    value={formData.monto}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                    placeholder="Ej: 25000"
                  />
                </div>

                <div>
                  <label
                    htmlFor="metodo"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    💳 Método de Pago
                  </label>
                  <select
                    id="metodo"
                    name="metodo"
                    required
                    value={formData.metodo}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white py-3 px-6 rounded-lg font-bold hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700 transition transform hover:scale-105 shadow-md"
                >
                  ➕ Registrar Pago
                </button>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white py-3 px-6 rounded-lg font-bold hover:from-gray-500 hover:to-gray-600 transition shadow-md"
                >
                  ✕ Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabla de Pagos */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm sm:text-base">
              <thead className="bg-gray-50">
                <tr>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cita
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagos.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay pagos registrados.
                    </td>
                  </tr>
                ) : (
                  pagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-gray-50">
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        #{pago.id}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-violet-600">
                          {(() => {
                            const cita = citas.find(
                              (c) => c.id === pago.id_cita,
                            );
                            return cita
                              ? cita.nombre_servicio
                              : `Cita #${pago.id_cita}`;
                          })()}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {pago.nombre_cliente
                            ? pago.nombre_cliente.trim()
                            : "N/A"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-green-600">
                          $
                          {!isNaN(Number(pago.monto))
                            ? Number(pago.monto).toLocaleString()
                            : 0}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                          {pago.metodo}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pago.fecha_pago
                          ? new Date(pago.fecha_pago).toLocaleDateString(
                              "es-ES",
                            )
                          : "N/A"}
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

export default Pagos;
