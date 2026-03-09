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
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [comprobante, setComprobante] = useState(null); // base64 para preview
  const [comprobanteFile, setComprobanteFile] = useState(null); // File para FormData
  const [loadingPago, setLoadingPago] = useState(false);
  // pasoPostCita: estado del flujo de pago post-creación
  // { tipo: "efectivo" | "pago", citaId, metodo, servicioId }
  const [pasoPostCita, setPasoPostCita] = useState(null);
  const [montoModal, setMontoModal] = useState(""); // monto parcial del comprobante
  const [formData, setFormData] = useState({
    usuario_id: "",
    servicio_id: "",
    fecha: "",
    hora: "",
    estado: "reservada",
    notas: "",
  });

  const handleComprobanteChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setComprobante(null);
      setComprobanteFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("⚠️ El archivo supera los 5MB");
      e.target.value = "";
      return;
    }
    // Guardar el File original para enviarlo con FormData
    setComprobanteFile(file);
    // Guardar base64 solo para mostrar la preview
    const reader = new FileReader();
    reader.onloadend = () => setComprobante(reader.result);
    reader.readAsDataURL(file);
  };

  const getCitas = async (userId = null) => {
    try {
      // Clientes usan el endpoint dedicado que retorna saldo_pendiente,
      // motivo_rechazo, barbero asignado y estado_pago desde el backend
      const url = userId
        ? `${API_URL}/mis-citas?id_usuario=${userId}`
        : `${API_URL}/citas`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Error al obtener citas");
      const data = await response.json();
      setCitas(Array.isArray(data.citas) ? data.citas : []);
    } catch (error) {
      console.error(error);
      setCitas([]);
    }
  };

  const getCitasBarbero = async (barberoId) => {
    try {
      const response = await fetch(
        `${API_URL}/barbero/citas?id_barbero=${barberoId}`,
      );
      if (!response.ok) throw new Error("Error al obtener citas del barbero");
      const data = await response.json();
      setCitas(Array.isArray(data.citas) ? data.citas : []);
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
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    // Recalcular disponibilidad si cambia la fecha o el servicio (afecta duración)
    if (name === "fecha" && value) {
      await checkDisponibilidad(value, newFormData.servicio_id);
    }
    if (name === "servicio_id" && newFormData.fecha) {
      await checkDisponibilidad(newFormData.fecha, value);
    }
  };

  const checkDisponibilidad = async (fecha, servicioId = null) => {
    if (!fecha) return;
    setLoadingHoras(true);
    try {
      // Helper: "HH:MM" → minutos desde medianoche
      const toMin = (hhmm) => {
        if (!hhmm) return 0;
        const [h, m] = hhmm.split(":").map(Number);
        return h * 60 + m;
      };

      // Generar slots de 05:30 a 23:30 cada 30 minutos
      const todasLasHoras = [];
      for (let min = 5 * 60 + 30; min <= 23 * 60 + 30; min += 30) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        todasLasHoras.push(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
        );
      }

      // Consultar citas existentes para esa fecha
      const response = await fetch(`${API_URL}/citas`);
      const data = await response.json();
      const citasFecha = Array.isArray(data.citas)
        ? data.citas.filter((c) => {
            if (editId && c.id === editId) return false;
            // substring(0,10) funciona con "2026-02-24T08:00" y "2026-02-24 08:00"
            const fechaCita = c.fecha_hora?.substring(0, 10);
            return fechaCita === fecha && c.estado !== "cancelada";
          })
        : [];

      // Bloques ocupados: [inicio, inicio + duración) en minutos
      const bloques = citasFecha.map((c) => {
        const svc = servicios.find(
          (s) => s.id === (c.id_servicio || parseInt(c.servicio_id)),
        );
        // duracion en minutos; si no existe el campo usar 60 como fallback seguro
        const duracion = svc?.duracion ? parseInt(svc.duracion) : 60;
        const inicio = toMin(c.fecha_hora?.substring(11, 16));
        return { inicio, fin: inicio + duracion };
      });

      // Duración del servicio que se intenta agendar
      const svcNuevo = servicios.find((s) => s.id === parseInt(servicioId));
      const duracionNueva = svcNuevo?.duracion
        ? parseInt(svcNuevo.duracion)
        : 60;

      // Un slot está libre si [slot, slot+duracionNueva) NO se solapa con ningún bloque ocupado
      const horasLibres = todasLasHoras.filter((h) => {
        const slotInicio = toMin(h);
        const slotFin = slotInicio + duracionNueva;
        return !bloques.some((b) => slotInicio < b.fin && slotFin > b.inicio);
      });

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
        servicios: [parseInt(formData.servicio_id)],
        fecha_hora: fechaHora,
        estado: formData.estado || "reservada",
        notas: formData.notas,
      };

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
        setFormData({
          usuario_id: "",
          servicio_id: "",
          fecha: "",
          hora: "",
          estado: "reservada",
          notas: "",
        });
        setHorasDisponibles([]);
        setShowForm(false);
        setMetodoPago("efectivo");
        setComprobante(null);
        setComprobanteFile(null);
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
            await checkDisponibilidad(formData.fecha, formData.servicio_id);
          } else {
            alert(
              "❌ Error al crear la cita: " +
                (error.error || "Error desconocido"),
            );
          }
          return;
        }

        const citaCreada = await response.json();

        const citaId =
          citaCreada?.cita?.id || citaCreada?.id_cita || citaCreada?.id;
        await getCitas(currentUser?.rol === "cliente" ? currentUser.id : null);

        // Resetear y cerrar el formulario principal
        setFormData({
          usuario_id: "",
          servicio_id: "",
          fecha: "",
          hora: "",
          estado: "reservada",
          notas: "",
        });
        setHorasDisponibles([]);
        setShowForm(false);

        // Guardar método elegido para el flujo post-cita
        const metodoElegido = metodoPago;
        setMetodoPago("efectivo");
        setComprobante(null);
        setComprobanteFile(null);

        // Disparar flujo según método
        if (metodoElegido === "efectivo" || !citaId) {
          // Mostrar banner de éxito
          setPasoPostCita({
            tipo: "efectivo",
            citaId,
            metodo: metodoElegido,
            servicioId: formData.servicio_id,
          });
        } else {
          // Mostrar modal para subir comprobante
          setPasoPostCita({
            tipo: "pago",
            citaId,
            metodo: metodoElegido,
            servicioId: formData.servicio_id,
          });
        }
      }
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
      await checkDisponibilidad(fechaFormateada, cita.id_servicio);
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

  // Cambia el estado de una cita sin abrir el formulario
  const handleCambiarEstado = async (id, nuevoEstado) => {
    const mensajes = {
      reservada: "¿Marcar esta cita como reservada?",
      confirmada: "¿Confirmar esta cita?",
      cancelada: "¿Cancelar esta cita?",
    };
    if (!window.confirm(mensajes[nuevoEstado] || "¿Cambiar estado?")) return;
    try {
      const response = await fetch(`${API_URL}/citas/${id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!response.ok) {
        const e = await response.json();
        alert("❌ Error: " + (e.error || "desconocido"));
        return;
      }
      setCitas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, estado: nuevoEstado } : c)),
      );
    } catch (error) {
      console.error(error);
      alert("❌ Error al cambiar el estado de la cita");
    }
  };

  // Marca la cita como completada (servicio prestado) usando el endpoint dedicado
  const handleCompletarCita = async (id) => {
    if (
      !window.confirm(
        "¿Marcar esta cita como completada? El servicio fue prestado.",
      )
    )
      return;
    try {
      const response = await fetch(`${API_URL}/citas/${id}/completar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const e = await response.json();
        alert("❌ Error: " + (e.error || "desconocido"));
        return;
      }
      setCitas((prev) =>
        prev.map((c) => (c.id === id ? { ...c, estado: "completada" } : c)),
      );
    } catch (error) {
      console.error(error);
      alert("❌ Error al completar la cita");
    }
  };

  const handleCancelForm = () => {
    setFormData({
      usuario_id: "",
      servicio_id: "",
      fecha: "",
      hora: "",
      estado: "reservada",
      notas: "",
    });
    setHorasDisponibles([]);
    setEditId(null);
    setShowForm(false);
    setMetodoPago("efectivo");
    setComprobante(null);
    setComprobanteFile(null);
  };

  // Subir comprobante desde el modal post-creación de cita
  const handleSubirComprobanteModal = async () => {
    if (!pasoPostCita) return;
    setLoadingPago(true);
    try {
      const servicio = servicios.find(
        (s) => s.id === parseInt(pasoPostCita.servicioId),
      );
      const precioTotal = parseFloat(servicio?.precio || 0);
      // Si el cliente ingresó un monto parcial, usarlo; si no, el precio completo
      const limpiarMonto = (v) =>
        parseFloat(
          String(v)
            .replace(/\.(?=\d{3}(?:\.|$))/g, "")
            .replace(",", "."),
        ) || 0;
      const montoEnviar = montoModal.trim()
        ? limpiarMonto(montoModal)
        : precioTotal;

      const formPago = new FormData();
      formPago.append("id_cita", pasoPostCita.citaId);
      formPago.append("id_usuario", currentUser.id);
      formPago.append("monto", montoEnviar);
      formPago.append("metodo", pasoPostCita.metodo);
      if (comprobanteFile)
        formPago.append("comprobante", comprobanteFile, comprobanteFile.name);

      const res = await fetch(`${API_URL}/pagos`, {
        method: "POST",
        body: formPago,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(
          "⚠️ Error al enviar el comprobante: " + (err.error || "desconocido"),
        );
        return;
      }

      setPasoPostCita(null);
      setComprobante(null);
      setComprobanteFile(null);
      setMontoModal("");
      await getCitas(currentUser?.rol === "cliente" ? currentUser.id : null);
      alert("✅ Comprobante enviado. El admin revisará tu pago pronto.");
    } catch {
      alert(
        "⚠️ No se pudo enviar el comprobante. Puedes intentarlo más tarde desde Pagos.",
      );
    } finally {
      setLoadingPago(false);
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
    if (user.rol === "barbero") {
      Promise.all([getCitasBarbero(user.id), getServicios()]).finally(() =>
        setLoading(false),
      );
    } else {
      const userId = user.rol === "cliente" ? user.id : null;
      Promise.all([getCitas(userId), getUsuarios(), getServicios()]).finally(
        () => setLoading(false),
      );
    }
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
                  : currentUser?.rol === "barbero"
                    ? "Mi Agenda"
                    : "Mis Citas"}
              </h1>
              <p className="text-gray-600 text-base sm:text-lg">
                Total de citas:{" "}
                <span className="font-bold text-teal-600">{citas.length}</span>
              </p>
            </div>
            {currentUser?.rol !== "barbero" && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:from-cyan-600 hover:via-teal-600 hover:to-emerald-700 transform transition hover:scale-105 shadow-lg w-full sm:w-auto"
              >
                {showForm ? "✕ Cancelar" : "+ Nueva Cita"}
              </button>
            )}
          </div>
        </div>

        {/* Formulario — solo para admin y cliente */}
        {showForm && currentUser?.rol !== "barbero" && (
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
                    min={(() => {
                      const h = new Date();
                      return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
                    })()}
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
                        {formData.hora
                          ? `✅ Hora seleccionada: ${formData.hora} · ${horasDisponibles.length} turno(s) libre(s) en total`
                          : `✅ ${horasDisponibles.length} turno(s) libre(s) para esta fecha`}
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
                      <option value="reservada">Reservada</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
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

              {/* Sección de pago — solo para clientes al CREAR (no editar) */}
              {currentUser?.rol !== "admin" && !editId && (
                <div className="border border-violet-200 rounded-xl p-4 bg-violet-50 col-span-1 md:col-span-2">
                  <p className="text-sm font-bold text-violet-700 mb-3">
                    💳 Método de Pago
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {[
                      "efectivo",
                      "transferencia",
                      "tarjeta",
                      "nequi",
                      "daviplata",
                    ].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setMetodoPago(m);
                          setComprobante(null);
                          setComprobanteFile(null);
                        }}
                        className={`py-2 px-3 rounded-lg text-sm font-semibold border-2 capitalize transition ${
                          metodoPago === m
                            ? "border-violet-600 bg-violet-600 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-violet-400"
                        }`}
                      >
                        {m === "efectivo"
                          ? "💵 Efectivo"
                          : m === "transferencia"
                            ? "🏦 Transferencia"
                            : m === "nequi"
                              ? "🟣 Nequi"
                              : m === "daviplata"
                                ? "🔴 Daviplata"
                                : "💳 Tarjeta"}
                      </button>
                    ))}
                  </div>

                  {metodoPago === "efectivo" && (
                    <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      💵 Pagarás en efectivo el día de tu cita en la barbería.
                    </p>
                  )}

                  {(metodoPago === "transferencia" ||
                    metodoPago === "tarjeta" ||
                    metodoPago === "nequi" ||
                    metodoPago === "daviplata") && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                      <p className="font-semibold mb-1">
                        📲 Pago digital seleccionado
                      </p>
                      <p>
                        Tras crear la cita se abrirá un paso adicional para que
                        subas el comprobante de tu transferencia/Nequi.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4">
                <button
                  type="submit"
                  disabled={loadingPago}
                  className="flex-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white py-3 px-6 rounded-lg font-bold hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700 transition transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingPago
                    ? "⏳ Enviando pago..."
                    : editId
                      ? "💾 Actualizar"
                      : "➕ Crear Cita"}
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
            {/* ===== VISTA BARBERO ===== */}
            {currentUser?.rol === "barbero" ? (
              <table className="min-w-full divide-y divide-gray-200 text-sm sm:text-base">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pago
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {citas.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-6 py-12 text-center text-gray-400"
                      >
                        No tienes citas asignadas.
                      </td>
                    </tr>
                  ) : (
                    citas.map((cita) => (
                      <tr key={cita.id} className="hover:bg-gray-50">
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          #{cita.id}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {cita.nombre_cliente ||
                              cita.nombre_usuario ||
                              "N/A"}
                          </p>
                          {cita.telefono_cliente && (
                            <p className="text-xs text-gray-500">
                              📞 {cita.telefono_cliente}
                            </p>
                          )}
                          {cita.email_cliente && (
                            <p className="text-xs text-gray-500">
                              ✉️ {cita.email_cliente}
                            </p>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className="text-sm text-gray-700 font-semibold">
                            {cita.nombre_servicio ||
                              getServicioNombre(cita.id_servicio)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 font-semibold">
                            {cita.fecha_hora
                              ? cita.fecha_hora.split(" ")[0] ||
                                cita.fecha_hora.substring(0, 10)
                              : "N/A"}
                          </span>
                          <span className="sm:hidden block text-xs font-bold text-teal-600">
                            {cita.fecha_hora
                              ? cita.fecha_hora.substring(11, 16)
                              : ""}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-teal-600">
                            ⏰{" "}
                            {cita.fecha_hora
                              ? cita.fecha_hora.substring(11, 16)
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
                                  : cita.estado === "confirmada"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {cita.estado === "reservada" && "📋 Reservada"}
                            {cita.estado === "confirmada" && "✅ Confirmada"}
                            {cita.estado === "completada" && "💈 Completada"}
                            {cita.estado === "cancelada" && "❌ Cancelada"}
                            {![
                              "reservada",
                              "confirmada",
                              "completada",
                              "cancelada",
                            ].includes(cita.estado) && cita.estado}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const ep = cita.estado_pago;
                            if (!ep)
                              return (
                                <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded-full text-xs">
                                  💳 Pendiente
                                </span>
                              );
                            if (ep === "pendiente_aprobacion")
                              return (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                                  ⏳ En revisión
                                </span>
                              );
                            if (ep === "completado")
                              return (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                  ✅ Pagado
                                </span>
                              );
                            if (ep === "rechazado")
                              return (
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                  ❌ Rechazado
                                </span>
                              );
                            return (
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs capitalize">
                                {ep}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
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
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pago
                    </th>
                    {currentUser?.rol === "cliente" && (
                      <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo
                      </th>
                    )}
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {citas.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
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
                                  : cita.estado === "confirmada"
                                    ? "bg-green-100 text-green-800"
                                    : cita.estado === "reservada"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {cita.estado === "reservada" && "📋 Reservada"}
                            {cita.estado === "confirmada" && "✅ Confirmada"}
                            {cita.estado === "completada" && "💈 Completada"}
                            {cita.estado === "cancelada" && "❌ Cancelada"}
                            {cita.estado !== "reservada" &&
                              cita.estado !== "confirmada" &&
                              cita.estado !== "completada" &&
                              cita.estado !== "cancelada" &&
                              cita.estado}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const ep = cita.estado_pago;
                            if (!ep)
                              return (
                                <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded-full text-xs">
                                  💳 Pendiente de pago
                                </span>
                              );
                            if (ep === "pendiente_aprobacion")
                              return (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                                  ⏳ En revisión
                                </span>
                              );
                            if (ep === "completado")
                              return (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                  ✅ Pagado
                                </span>
                              );
                            if (ep === "rechazado")
                              return (
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                  ❌ Rechazado
                                </span>
                              );
                            return (
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs capitalize">
                                {ep}
                              </span>
                            );
                          })()}
                        </td>
                        {/* Columna Saldo — solo clientes, datos de /mis-citas */}
                        {currentUser?.rol === "cliente" && (
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                            {cita.saldo_pendiente > 0 ? (
                              <span className="text-sm font-bold text-amber-600">
                                $
                                {Number(cita.saldo_pendiente).toLocaleString(
                                  "es-CO",
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-green-600 font-semibold">
                                ✓ Al día
                              </span>
                            )}
                            {cita.motivo_rechazo && (
                              <p
                                className="text-xs text-red-500 mt-1"
                                title={cita.motivo_rechazo}
                              >
                                ⚠️{" "}
                                {cita.motivo_rechazo.length > 30
                                  ? cita.motivo_rechazo.substring(0, 30) + "…"
                                  : cita.motivo_rechazo}
                              </p>
                            )}
                          </td>
                        )}
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-col sm:flex-row gap-2">
                            {currentUser?.rol === "admin" ? (
                              <>
                                {/* Completar: si está confirmada o reservada (usa PUT /completar) */}
                                {(cita.estado === "confirmada" ||
                                  cita.estado === "reservada") && (
                                  <button
                                    onClick={() => handleCompletarCita(cita.id)}
                                    className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 px-3 py-1.5 rounded-lg font-semibold transition transform hover:scale-105 shadow-md text-xs sm:text-sm"
                                  >
                                    💈 Completar
                                  </button>
                                )}
                                {/* Confirmar: si está reservada */}
                                {cita.estado === "reservada" && (
                                  <button
                                    onClick={() =>
                                      handleCambiarEstado(cita.id, "confirmada")
                                    }
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 px-3 py-1.5 rounded-lg font-semibold transition transform hover:scale-105 shadow-md text-xs sm:text-sm"
                                  >
                                    ✅ Confirmar
                                  </button>
                                )}
                                {cita.estado === "completada" && (
                                  <button
                                    onClick={() => navigate("/pagos")}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 px-3 py-1.5 rounded-lg font-semibold transition transform hover:scale-105 shadow-md text-xs sm:text-sm"
                                  >
                                    💰 Cobrar
                                  </button>
                                )}
                                {cita.estado !== "cancelada" &&
                                  cita.estado !== "completada" && (
                                    <button
                                      onClick={() =>
                                        handleCambiarEstado(
                                          cita.id,
                                          "cancelada",
                                        )
                                      }
                                      className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 px-3 py-1.5 rounded-lg font-semibold transition transform hover:scale-105 shadow-md text-xs sm:text-sm"
                                    >
                                      ❌ Cancelar
                                    </button>
                                  )}
                                <button
                                  onClick={() => handleEdit(cita)}
                                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 px-3 py-1.5 rounded-lg font-semibold transition transform hover:scale-105 shadow-md text-xs sm:text-sm"
                                >
                                  ✏️ Editar
                                </button>
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
            )}
          </div>
        </div>
      </div>

      {/* ===== MODAL / BANNER POST-CREACIÓN DE CITA ===== */}
      {pasoPostCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            {/* Banner efectivo */}
            {pasoPostCita.tipo === "efectivo" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">✅</span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      ¡Cita reservada!
                    </h3>
                    <p className="text-sm text-gray-500">
                      Tu cita quedó agendada correctamente.
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                  <p className="text-amber-800 font-semibold text-sm">
                    💵 Pagarás en efectivo el día de la cita en la barbería.
                  </p>
                </div>
                <button
                  onClick={() => setPasoPostCita(null)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 transition"
                >
                  Entendido
                </button>
              </>
            )}

            {/* Modal para subir comprobante */}
            {pasoPostCita.tipo === "pago" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">📤</span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      Sube tu comprobante
                    </h3>
                    <p className="text-sm text-gray-500">
                      Cita creada · ahora registra el pago
                    </p>
                  </div>
                </div>

                {/* Info de cuenta Nequi */}
                <div className="bg-green-50 border border-green-300 rounded-xl p-4 mb-4">
                  <p className="text-sm font-bold text-green-800 mb-1">
                    📲 Nequi — Barbería K-19
                  </p>
                  <p className="text-2xl font-extrabold text-green-700 tracking-widest">
                    320 732 8557
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Método seleccionado:{" "}
                    <span className="font-semibold capitalize">
                      {pasoPostCita.metodo}
                    </span>
                  </p>
                </div>

                {/* Monto a enviar */}
                {(() => {
                  const servicio = servicios.find(
                    (s) => s.id === parseInt(pasoPostCita.servicioId),
                  );
                  const precioTotal = parseFloat(servicio?.precio || 0);
                  const limpiar = (v) =>
                    parseFloat(
                      String(v)
                        .replace(/\.(?=\d{3}(?:\.|$))/g, "")
                        .replace(",", "."),
                    ) || 0;
                  const montoParcial = montoModal.trim()
                    ? limpiar(montoModal)
                    : null;
                  const saldoCaja =
                    montoParcial !== null ? precioTotal - montoParcial : null;
                  return (
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        💵 ¿Cuánto envías por{" "}
                        <span className="capitalize">
                          {pasoPostCita.metodo}
                        </span>
                        ?
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-semibold">$</span>
                        <input
                          type="text"
                          placeholder={`Total: ${precioTotal.toLocaleString("es-CO")}`}
                          value={montoModal}
                          onChange={(e) => setMontoModal(e.target.value)}
                          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400 transition"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Déjalo vacío si pagas el total por este método.
                      </p>
                      {saldoCaja !== null && saldoCaja > 0 && (
                        <div className="mt-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-sm text-amber-800">
                          💰 Saldo restante a pagar en caja:{" "}
                          <span className="font-bold">
                            ${saldoCaja.toLocaleString("es-CO")}
                          </span>
                        </div>
                      )}
                      {saldoCaja !== null && saldoCaja < 0 && (
                        <p className="mt-1 text-xs text-red-500">
                          ⚠️ El monto supera el precio del servicio.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* File input */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    📎 Comprobante de pago{" "}
                    {comprobante && (
                      <span className="text-green-600 ml-1">✅ Adjunto</span>
                    )}
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleComprobanteChange}
                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200 transition"
                  />
                  {comprobante && comprobante.startsWith("data:image") && (
                    <img
                      src={comprobante}
                      alt="Comprobante"
                      className="mt-2 max-h-40 rounded-lg border object-contain"
                    />
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    JPG, PNG o PDF · Máx. 5 MB
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSubirComprobanteModal}
                    disabled={loadingPago || !comprobanteFile}
                    className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-violet-600 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingPago ? "⏳ Enviando..." : "📤 Enviar comprobante"}
                  </button>
                  <button
                    onClick={() => {
                      setPasoPostCita(null);
                      setComprobante(null);
                      setComprobanteFile(null);
                      setMontoModal("");
                    }}
                    disabled={loadingPago}
                    className="px-4 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Después
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Puedes subir el comprobante más tarde desde la sección{" "}
                  <strong>Pagos</strong>.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Citas;
