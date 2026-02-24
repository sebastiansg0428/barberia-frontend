import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";
import { API_URL } from "../config/api";

function Citas() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [citas, setCitas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [horasDisponibles, setHorasDisponibles] = useState([]);
  const [loadingHoras, setLoadingHoras] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    usuario_id: "",
    servicio_id: "",
    fecha: "",
    hora: "",
    estado: "pendiente",
    notas: "",
  });

  const [pagoAhora, setPagoAhora] = useState(false);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [comprobante, setComprobante] = useState(null);

  const handleComprobanteChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setComprobante(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("⚠️ El archivo supera los 5MB");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setComprobante(reader.result);
    reader.readAsDataURL(file);
  };

  const getCitas = async (userId = null) => {
    try {
      const response = await fetch(`${API_URL}/citas`);
      if (!response.ok) throw new Error("Error al obtener citas");
      const data = await response.json();
      let citasData = Array.isArray(data.citas) ? data.citas : [];
      // Si es cliente, filtrar solo sus citas
      if (userId) {
        citasData = citasData.filter(
          (c) => Number(c.id_usuario) === Number(userId),
        );
      }
      setCitas(citasData);
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
      setUsuarios(Array.isArray(data.usuarios) ? data.usuarios : []);
    } catch (error) {
      console.error(error);
    }
  };

  const getServicios = async () => {
    try {
      const response = await fetch(`${API_URL}/servicios`);
      if (!response.ok) throw new Error("Error al obtener servicios");
      const data = await response.json();
      setServicios(Array.isArray(data.servicios) ? data.servicios : []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Si cambia la fecha, cargar horas disponibles
    if (name === "fecha" && value) {
      await checkDisponibilidad(value);
    }
  };

  const checkDisponibilidad = async (fecha) => {
    if (!fecha) return;
    setLoadingHoras(true);
    try {
      // Generar horas de 8am a 8pm cada 30 minutos
      const todasLasHoras = [];
      for (let h = 8; h <= 19; h++) {
        todasLasHoras.push(`${h.toString().padStart(2, "0")}:00`);
        if (h < 19) todasLasHoras.push(`${h.toString().padStart(2, "0")}:30`);
      }

      // Consultar citas existentes para esa fecha
      const response = await fetch(`${API_URL}/citas`);
      const data = await response.json();
      const citasFecha = Array.isArray(data.citas)
        ? data.citas.filter((c) => {
            // Excluir la cita actual si estamos editando
            if (editId && c.id === editId) return false;
            // Usar fecha_hora que viene del backend
            const fechaCita =
              c.fecha_hora?.split("T")[0] || c.fecha_hora?.substring(0, 10);
            return fechaCita === fecha && c.estado !== "cancelada";
          })
        : [];

      // Extraer horas del campo fecha_hora (formato: HH:MM)
      const horasOcupadas = citasFecha.map((c) =>
        c.fecha_hora?.substring(11, 16),
      );
      const horasLibres = todasLasHoras.filter(
        (h) => !horasOcupadas.includes(h),
      );

      setHorasDisponibles(horasLibres);
    } catch (error) {
      console.error("Error al verificar disponibilidad:", error);
      setHorasDisponibles([]);
    } finally {
      setLoadingHoras(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar que hay hora disponible seleccionada
    if (!formData.hora) {
      alert("⚠️ Por favor selecciona una hora disponible");
      return;
    }

    let newCita = null;
    try {
      // Construir fecha_hora en formato correcto (YYYY-MM-DD HH:MM:SS)
      let fechaHora = "";
      if (formData.fecha && formData.hora) {
        // Asegurar que la fecha tenga el formato correcto YYYY-MM-DD
        const fechaObj = new Date(formData.fecha + "T00:00:00");
        const year = fechaObj.getFullYear();
        const month = String(fechaObj.getMonth() + 1).padStart(2, "0");
        const day = String(fechaObj.getDate()).padStart(2, "0");
        const fechaFormateada = `${year}-${month}-${day}`;

        // Asegurar formato HH:MM:SS
        const horaCompleta =
          formData.hora.length === 5 ? `${formData.hora}:00` : formData.hora;
        fechaHora = `${fechaFormateada} ${horaCompleta}`;
      }
      // Construir el objeto para el backend
      const dataToSubmit = {
        id_usuario: formData.usuario_id || currentUser.id,
        id_servicio: formData.servicio_id,
        fecha_hora: fechaHora,
        estado: formData.estado || "pendiente",
        notas: formData.notas,
      };

      // Si el cliente eligió pagar ahora, incluir método de pago
      if (pagoAhora && metodoPago) {
        dataToSubmit.metodo_pago = metodoPago;
      }

      if (editId) {
        // Actualizar cita - usar PUT para actualización completa
        const response = await fetch(`${API_URL}/citas/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSubmit),
        });

        if (!response.ok) {
          const error = await response.json();
          if (response.status === 409) {
            alert(
              "❌ " +
                (error.error ||
                  "Esta hora ya está ocupada. Por favor elige otra hora."),
            );
          } else {
            alert(
              "❌ Error al actualizar la cita: " +
                (error.error || "Error desconocido"),
            );
          }
          return;
        }

        setCitas((prev) =>
          prev.map((c) => (c.id === editId ? { ...c, ...dataToSubmit } : c)),
        );
        setEditId(null);
        alert("✅ Cita actualizada exitosamente");
      } else {
        // Crear cita
        const response = await fetch(`${API_URL}/citas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSubmit),
        });

        if (!response.ok) {
          const error = await response.json();
          if (response.status === 409) {
            alert(
              "❌ " +
                (error.error ||
                  "Esta hora ya está ocupada. Por favor elige otra hora."),
            );
            // Recargar disponibilidad
            await checkDisponibilidad(formData.fecha);
          } else {
            alert(
              "❌ Error al crear la cita: " +
                (error.error || "Error desconocido"),
            );
          }
          return;
        }

        const citaCreada = await response.json();
        newCita = citaCreada;

        // Auto-registrar pago si eligió pagar ahora
        if (pagoAhora) {
          const citaId = citaCreada?.cita?.id || citaCreada?.id;
          if (citaId) {
            const servicio = servicios.find(
              (s) => s.id === parseInt(formData.servicio_id),
            );
            const pagoPayload = {
              id_cita: citaId,
              monto: parseFloat(servicio?.precio || 0),
              metodo: metodoPago,
              fecha_pago: new Date().toISOString().split("T")[0],
            };
            if (comprobante) pagoPayload.comprobante = comprobante;
            try {
              await fetch(`${API_URL}/pagos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pagoPayload),
              });
            } catch (err) {
              console.error("Error al auto-registrar pago:", err);
            }
          }
        }

        alert(
          "✅ Cita creada exitosamente" +
            (pagoAhora ? " y pago registrado" : ""),
        );
        await getCitas(currentUser?.rol === "cliente" ? currentUser.id : null);
      }

      setFormData({
        usuario_id: "",
        servicio_id: "",
        fecha: "",
        hora: "",
        estado: "pendiente",
        notas: "",
      });
      setHorasDisponibles([]);
      setShowForm(false);
      setPagoAhora(false);
      setMetodoPago("efectivo");
      setComprobante(null);
    } catch (error) {
      console.error(error);
      alert(
        "❌ Error de conexión al guardar la cita. Verifica tu conexión e intenta de nuevo.",
      );
    }
  };

  const handleEdit = async (cita) => {
    setEditId(cita.id);
    // Extraer fecha y hora del campo fecha_hora
    const fechaFormateada = cita.fecha_hora?.substring(0, 10) || "";
    const horaFormateada = cita.fecha_hora?.substring(11, 16) || "";
    setFormData({
      usuario_id: cita.id_usuario,
      servicio_id: cita.id_servicio,
      fecha: fechaFormateada,
      hora: horaFormateada,
      estado: cita.estado,
      notas: cita.notas || "",
    });
    // Cargar disponibilidad para la fecha de la cita
    if (fechaFormateada) {
      await checkDisponibilidad(fechaFormateada);
    }
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta cita?")) return;
    try {
      const response = await fetch(`${API_URL}/citas/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg =
          errorData.error || errorData.message || `Error ${response.status}`;
        alert(`❌ No se pudo eliminar la cita: ${msg}`);
        return;
      }

      setCitas((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error(error);
      alert("❌ Error de conexión al eliminar la cita");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("¿Seguro que deseas cancelar esta cita?")) return;
    try {
      await fetch(`${API_URL}/citas/${id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "cancelada" }),
      });
      setCitas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, estado: "cancelada" } : c)),
      );
    } catch (error) {
      console.error(error);
      alert("Error al cancelar la cita");
    }
  };

  const handleCancelForm = () => {
    setFormData({
      usuario_id: "",
      servicio_id: "",
      fecha: "",
      hora: "",
      estado: "pendiente",
      notas: "",
    });
    setHorasDisponibles([]);
    setEditId(null);
    setShowForm(false);
    setPagoAhora(false);
    setMetodoPago("efectivo");
    setComprobante(null);
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
    const userId = user.rol === "cliente" ? user.id : null;
    Promise.all([getCitas(userId), getUsuarios(), getServicios()]).finally(() =>
      setLoading(false),
    );
  }, [navigate]);

  // Detectar si viene del botón "Agendar" de servicios
  useEffect(() => {
    if (location.state?.openForm && !loading) {
      setShowForm(true);
      if (location.state.servicio_id) {
        setFormData((prev) => ({
          ...prev,
          servicio_id: location.state.servicio_id,
        }));
      }
      // Limpiar el state para que no se abra de nuevo si recarga
      window.history.replaceState({}, document.title);
    }
  }, [location.state, loading]);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar Responsive */}
      <nav className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg sticky top-0 z-50">
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
              <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                📅{" "}
                {currentUser?.rol === "admin"
                  ? "Gestión de Citas"
                  : "Mis Citas"}
              </h1>
              <p className="text-gray-600 text-base sm:text-lg">
                Total de citas:{" "}
                <span className="font-bold text-teal-600">{citas.length}</span>
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:from-cyan-600 hover:via-teal-600 hover:to-emerald-700 transform transition hover:scale-105 shadow-lg w-full sm:w-auto"
            >
              {showForm ? "✕ Cancelar" : "+ Nueva Cita"}
            </button>
          </div>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-6 sm:mb-8 border border-gray-100">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
              {editId ? "✏️ Editar Cita" : "➕ Crear Nueva Cita"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Solo mostrar selector de cliente si es admin */}
                {currentUser?.rol === "admin" && (
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
                )}

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
                    min={new Date().toISOString().split("T")[0]}
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
                    ⏰ Hora {loadingHoras && "(Cargando...)"}
                  </label>
                  {!formData.fecha ? (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                      👆 Primero selecciona una fecha
                    </div>
                  ) : loadingHoras ? (
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                      ⌛ Verificando disponibilidad...
                    </div>
                  ) : horasDisponibles.length === 0 ? (
                    <div className="w-full px-4 py-3 border border-red-300 rounded-lg bg-red-50 text-red-600">
                      ❌ No hay horas disponibles para esta fecha
                    </div>
                  ) : (
                    <>
                      <select
                        id="hora"
                        name="hora"
                        required
                        value={formData.hora}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                      >
                        <option value="">Seleccione una hora</option>
                        {horasDisponibles.map((hora) => (
                          <option key={hora} value={hora}>
                            {hora}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-sm text-green-600">
                        ✅ {horasDisponibles.length} hora(s) disponible(s) para
                        esta fecha
                      </p>
                    </>
                  )}
                </div>

                {/* Solo mostrar estado si es admin */}
                {currentUser?.rol === "admin" && (
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
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Opción de pago */}
              <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50 col-span-1 md:col-span-2">
                <div className="flex items-center gap-3 mb-2">
                  <input
                    id="pagoAhora"
                    type="checkbox"
                    checked={pagoAhora}
                    onChange={(e) => {
                      setPagoAhora(e.target.checked);
                      setComprobante(null);
                    }}
                    className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="pagoAhora"
                    className="text-sm font-semibold text-gray-700"
                  >
                    💳 ¿Registrar pago al crear la cita?
                  </label>
                </div>
                {pagoAhora && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        💳 Método de Pago
                      </label>
                      <select
                        id="metodoPago"
                        value={metodoPago}
                        onChange={(e) => {
                          setMetodoPago(e.target.value);
                          setComprobante(null);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white"
                      >
                        <option value="efectivo">💵 Efectivo</option>
                        <option value="tarjeta">💳 Tarjeta</option>
                        <option value="transferencia">🏦 Transferencia</option>
                      </select>
                    </div>
                    {(metodoPago === "tarjeta" ||
                      metodoPago === "transferencia") && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          📎 Comprobante de pago{" "}
                          {comprobante && (
                            <span className="text-emerald-600 font-bold">
                              ✅ Adjunto
                            </span>
                          )}
                        </label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleComprobanteChange}
                          className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 transition"
                        />
                        {comprobante &&
                          comprobante.startsWith("data:image") && (
                            <img
                              src={comprobante}
                              alt="Comprobante"
                              className="mt-2 max-h-32 rounded-lg border object-contain"
                            />
                          )}
                        <p className="mt-1 text-xs text-gray-500">
                          Imágenes (JPG, PNG) o PDF · Máx. 5MB
                        </p>
                      </div>
                    )}
                  </div>
                )}
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

              <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white py-3 px-6 rounded-lg font-bold hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700 transition transform hover:scale-105 shadow-md"
                >
                  {editId ? "💾 Actualizar" : "➕ Crear Cita"}
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

        {/* Tabla de Citas */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm sm:text-base">
              <thead className="bg-gray-50">
                <tr>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Servicio
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hora
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        #{cita.id}
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {cita.nombre_usuario ||
                            getUsuarioNombre(cita.id_usuario)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className="text-sm text-gray-600 font-semibold">
                          {cita.nombre_servicio ||
                            getServicioNombre(cita.id_servicio)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900 font-semibold">
                            {cita.fecha_hora
                              ? cita.fecha_hora.split(" ")[0] ||
                                cita.fecha_hora.substring(0, 10)
                              : "N/A"}
                          </span>
                          <span className="sm:hidden text-xs font-bold text-teal-600">
                            {cita.fecha_hora
                              ? cita.fecha_hora.includes("T")
                                ? cita.fecha_hora.substring(11, 16)
                                : cita.fecha_hora.substring(11, 16)
                              : ""}
                          </span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-teal-600">
                          ⏰{" "}
                          {cita.fecha_hora
                            ? cita.fecha_hora.includes("T")
                              ? cita.fecha_hora.substring(11, 16)
                              : cita.fecha_hora.substring(11, 16)
                            : ""}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            cita.estado === "completada"
                              ? "bg-blue-100 text-blue-800"
                              : cita.estado === "cancelada"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {cita.estado}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col sm:flex-row gap-2">
                          {currentUser?.rol === "admin" ? (
                            <>
                              <button
                                onClick={() => handleEdit(cita)}
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 px-3 py-1.5 rounded-lg font-semibold transition transform hover:scale-105 shadow-md text-xs sm:text-sm"
                              >
                                ✏️ Editar
                              </button>
                              {cita.estado === "completada" && (
                                <button
                                  onClick={() => navigate("/pagos")}
                                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 px-3 py-1.5 rounded-lg font-semibold transition transform hover:scale-105 shadow-md text-xs sm:text-sm"
                                >
                                  💰 Pago
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(cita.id)}
                                className="bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 px-3 py-1.5 rounded-lg font-semibold transition transform hover:scale-105 shadow-md text-xs sm:text-sm"
                              >
                                🗑️ Eliminar
                              </button>
                            </>
                          ) : (
                            cita.estado !== "cancelada" &&
                            cita.estado !== "completada" && (
                              <button
                                onClick={() => handleCancel(cita.id)}
                                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 px-3 py-1.5 rounded-lg font-semibold transition transform hover:scale-105 shadow-md text-xs sm:text-sm w-full"
                              >
                                ❌ Cancelar
                              </button>
                            )
                          )}
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
