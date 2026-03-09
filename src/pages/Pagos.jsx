import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";
import { API_URL } from "../config/api";

/* helpers */
const fmtMonto = (v) =>
  isNaN(Number(v)) ? "0" : Number(v).toLocaleString("es-CO");

const fmtFecha = (str) => {
  if (!str) return "N/A";
  return new Date(str)
    .toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .replace(" de ", "/")
    .replace(" de ", "/")
    .toUpperCase();
};

const fmtMes = (clave) => {
  if (!clave) return "N/A";
  const [anio, mes] = clave.split("-");
  return new Date(Number(anio), parseInt(mes) - 1)
    .toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    .replace(" de ", "/")
    .toUpperCase();
};

const ESTADO_BADGE = {
  completado: "bg-green-100 text-green-700",
  aprobado: "bg-green-100 text-green-700", // alias legacy
  pendiente_aprobacion: "bg-yellow-100 text-yellow-700",
  pendiente: "bg-yellow-100 text-yellow-700", // alias legacy
  rechazado: "bg-red-100 text-red-700",
  reembolsado: "bg-purple-100 text-purple-700",
};

const ESTADO_LABEL = {
  completado: "Completado",
  aprobado: "Completado",
  pendiente_aprobacion: "En revisión",
  pendiente: "Pendiente",
  rechazado: "Rechazado",
  reembolsado: "Reembolsado",
};

// Los comprobantes pueden ser base64, path /uploads/... o filename
const getComprobanteUrl = (comprobante) => {
  if (!comprobante) return null;
  if (comprobante.startsWith("data:") || comprobante.startsWith("http"))
    return comprobante;
  if (comprobante.startsWith("/")) return `${API_URL}${comprobante}`;
  return `${API_URL}/uploads/comprobantes/${comprobante}`;
};

// Prefiere comprobante_url (campo nuevo del backend) sobre comprobante raw
const getImagenComprobante = (pago) =>
  pago?.comprobante_url || getComprobanteUrl(pago?.comprobante);

function Pagos() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [comprobanteModal, setComprobanteModal] = useState(null); // URL base64 de la imagen a ver

  /* --- admin state --- */
  const [pagos, setPagos] = useState([]);
  const [pagoStats, setPagoStats] = useState(null);
  const [citas, setCitas] = useState([]);
  // pagosPorCita: Map { citaId -> pago } obtenido via /pagos/cita/:id
  // Workaround al bug del backend donde GET /pagos puede devolver []
  const [pagosPendientes, setPagosPendientes] = useState([]); // GET /pagos/pendientes
  const [reporte, setReporte] = useState(null);
  const [loadingRep, setLoadingRep] = useState(false);
  const [filtros, setFiltros] = useState({
    estado: "",
    metodo: "",
    fecha_desde: "",
    fecha_hasta: "",
  });
  const [repFiltros, setRepFiltros] = useState({
    fecha_desde: "",
    fecha_hasta: "",
  });
  const [showFormAdmin, setShowFormAdmin] = useState(false);
  const [formAdmin, setFormAdmin] = useState({
    id_cita: "",
    monto: "",
    metodo: "efectivo",
    notas: "",
    propina: "",
    descuento: "",
    es_abono: false,
  });

  /* --- cliente state --- */
  const [misPagos, setMisPagos] = useState([]);
  const [citasUsuario, setCitasUsuario] = useState([]);
  // formComprobante: { citaId, metodo, archivo } — formulario inline de subida
  const [formComprobante, setFormComprobante] = useState(null);

  /* --- notificaciones --- */
  const [notificaciones, setNotificaciones] = useState([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  /* --- historial pago --- */
  const [historialModal, setHistorialModal] = useState(null); // { pagoId, data }

  /* --- pago mixto --- */
  const [showFormMixto, setShowFormMixto] = useState(false);
  const [formMixto, setFormMixto] = useState({
    id_cita: "",
    pagos: [
      { metodo: "efectivo", monto: "" },
      { metodo: "transferencia", monto: "" },
    ],
    notas: "",
  });
  // Comprobantes por índice de método digital: { 1: File, ... }
  const [comprobantesMixto, setComprobantesMixto] = useState({});

  /* ========== FETCH ADMIN ========== */
  const getPagos = async (params = {}) => {
    try {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "")),
      ).toString();
      const res = await fetch(
        qs ? `${API_URL}/pagos?${qs}` : `${API_URL}/pagos`,
      );
      const data = await res.json();
      const lista = Array.isArray(data.pagos) ? data.pagos : [];
      setPagos(lista);
    } catch {
      setPagos([]);
    }
  };

  const getCitas = async () => {
    try {
      const res = await fetch(`${API_URL}/citas`);
      const data = await res.json();
      setCitas(Array.isArray(data.citas) ? data.citas : []);
    } catch {
      setCitas([]);
    }
  };

  const getPagosPendientes = async () => {
    try {
      const res = await fetch(`${API_URL}/pagos/pendientes`);
      const data = await res.json();
      // Nuevo formato del backend: { pendientes: [...], total: N }
      setPagosPendientes(
        Array.isArray(data.pendientes)
          ? data.pendientes
          : Array.isArray(data.pagos)
            ? data.pagos
            : Array.isArray(data)
              ? data
              : [],
      );
    } catch {
      setPagosPendientes([]);
    }
  };

  const getPagoStats = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/dashboard/pagos-stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: userId }),
      });
      const data = await res.json();
      setPagoStats(data);
    } catch {
      setPagoStats(null);
    }
  };

  const getReporte = async () => {
    setLoadingRep(true);
    try {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(repFiltros).filter(([, v]) => v !== ""),
        ),
      ).toString();
      const res = await fetch(
        qs
          ? `${API_URL}/reportes/ingresos?${qs}`
          : `${API_URL}/reportes/ingresos`,
      );
      const data = await res.json();
      setReporte(data);
    } catch {
      setReporte(null);
    } finally {
      setLoadingRep(false);
    }
  };

  /* ========== SUBIR COMPROBANTE (cliente) ========== */
  const handleSubirComprobante = async (e) => {
    e.preventDefault();
    const { citaId, metodo, archivo } = formComprobante || {};
    if (!archivo) {
      alert("Selecciona un comprobante");
      return;
    }
    const fd = new FormData();
    fd.append("id_cita", citaId);
    fd.append("id_usuario", currentUser.id);
    fd.append("metodo", metodo);
    fd.append("comprobante", archivo);
    try {
      const res = await fetch(`${API_URL}/pagos`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + (err.error || "desconocido"));
        return;
      }
      alert("\u2705 Comprobante enviado. El admin lo revisar\u00e1 pronto.");
      setFormComprobante(null);
      await Promise.all([
        getMisPagos(currentUser.id),
        getCitasUsuario(currentUser.id),
      ]);
    } catch {
      alert("Error de conexi\u00f3n");
    }
  };

  /* ========== FETCH CLIENTE ========== */
  const getMisPagos = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/mis-pagos?id_usuario=${userId}`);
      const data = await res.json();
      setMisPagos(Array.isArray(data.pagos) ? data.pagos : []);
    } catch {
      setMisPagos([]);
    }
  };

  const getCitasUsuario = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/citas`);
      const data = await res.json();
      const todas = Array.isArray(data.citas) ? data.citas : [];
      setCitasUsuario(
        todas.filter((c) => Number(c.id_usuario) === Number(userId)),
      );
    } catch {
      setCitasUsuario([]);
    }
  };

  /* ========== NUEVAS FUNCIONES ========== */
  const getNotificaciones = async (userId) => {
    try {
      const res = await fetch(
        `${API_URL}/notificaciones?id_usuario=${userId}&leida=false`,
      );
      const data = await res.json();
      setNotificaciones(
        Array.isArray(data.notificaciones)
          ? data.notificaciones
          : Array.isArray(data)
            ? data
            : [],
      );
    } catch {
      setNotificaciones([]);
    }
  };

  const marcarNotifLeida = async (id) => {
    try {
      await fetch(`${API_URL}/notificaciones/${id}/leer`, { method: "PATCH" });
      setNotificaciones((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const marcarTodasLeidas = async () => {
    if (!currentUser) return;
    try {
      await fetch(`${API_URL}/notificaciones/leer-todas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: currentUser.id }),
      });
      setNotificaciones([]);
    } catch {}
  };

  const getHistorialPago = async (pagoId) => {
    try {
      const res = await fetch(`${API_URL}/pagos/${pagoId}/historial`);
      const data = await res.json();
      setHistorialModal({
        pagoId,
        data: Array.isArray(data.historial)
          ? data.historial
          : Array.isArray(data)
            ? data
            : [],
      });
    } catch {
      setHistorialModal({ pagoId, data: [] });
    }
  };

  const handleSubmitMixto = async (e) => {
    e.preventDefault();
    const METODOS_DIGITALES = [
      "transferencia",
      "nequi",
      "daviplata",
      "tarjeta",
    ];
    const limpiarMonto = (v) =>
      // Solo elimina puntos de miles (seguidos de exactamente 3 dígitos)
      // "20.000" → 20000 ✅  |  "4.91" → 4.91 ✅  |  "1.000.000" → 1000000 ✅
      parseFloat(
        String(v)
          .replace(/\.(?=\d{3}(?:\.|$))/g, "")
          .replace(",", "."),
      ) || 0;
    const pagosValidos = formMixto.pagos.filter(
      (p) => p.monto && limpiarMonto(p.monto) > 0,
    );
    // Validar que todos los montos válidos sumen algo
    if (pagosValidos.length < 2) {
      alert("⚠️ Ingresa monto en al menos 2 métodos de pago.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/admin/pagos/mixto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_cita: parseInt(formMixto.id_cita),
          id_admin: currentUser.id,
          admin_note: formMixto.notas || "",
          pagos: pagosValidos.map((p) => ({
            metodo: p.metodo,
            monto: limpiarMonto(p.monto),
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + (err.error || "desconocido"));
        return;
      }
      alert("✅ Pago mixto registrado exitosamente");
      setFormMixto({
        id_cita: "",
        pagos: [
          { metodo: "efectivo", monto: "" },
          { metodo: "transferencia", monto: "" },
        ],
        notas: "",
      });
      setComprobantesMixto({});
      setShowFormMixto(false);
      await refrescarAdmin();
    } catch {
      alert("Error de conexion");
    }
  };

  /* ========== ACCIONES ADMIN ========== */
  const refrescarAdmin = () =>
    Promise.all([
      getPagos(filtros),
      getPagosPendientes(),
      getCitas(),
      getPagoStats(currentUser.id),
      getNotificaciones(currentUser.id),
    ]);

  const handleAprobar = async (id) => {
    if (!window.confirm("Aprobar este pago? La cita quedara como completada."))
      return;
    const admin_note = window.prompt("Nota para el cliente (opcional):") ?? "";
    if (admin_note === null) return; // canceló
    try {
      const res = await fetch(`${API_URL}/pagos/${id}/aprobar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: currentUser.id, admin_note }),
      });
      if (!res.ok) {
        const e = await res.json();
        alert("Error: " + (e.error || "desconocido"));
        return;
      }
      alert("Pago aprobado");
      await refrescarAdmin();
    } catch {
      alert("Error de conexion");
    }
  };

  const handleRechazar = async (id) => {
    const admin_note = window.prompt("Motivo del rechazo (opcional):");
    if (admin_note === null) return;
    try {
      const res = await fetch(`${API_URL}/pagos/${id}/rechazar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: currentUser.id, admin_note }),
      });
      if (!res.ok) {
        const e = await res.json();
        alert("Error: " + (e.error || "desconocido"));
        return;
      }
      alert("Pago rechazado");
      await refrescarAdmin();
    } catch {
      alert("Error de conexion");
    }
  };

  const handleSolicitarInfo = async (id) => {
    const admin_note = window.prompt("¿Qué información necesitas del cliente?");
    if (!admin_note) return;
    try {
      const res = await fetch(`${API_URL}/pagos/${id}/solicitar-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: currentUser.id, admin_note }),
      });
      if (!res.ok) {
        const e = await res.json();
        alert("Error: " + (e.error || "desconocido"));
        return;
      }
      alert("Solicitud de información enviada al cliente.");
      await refrescarAdmin();
    } catch {
      alert("Error de conexion");
    }
  };

  const handleReembolsar = async (id) => {
    if (
      !window.confirm(
        "¿Reembolsar este pago? El estado cambiará a 'reembolsado'.",
      )
    )
      return;
    const admin_note = window.prompt("Motivo del reembolso (opcional):") ?? "";
    if (admin_note === null) return;
    try {
      const res = await fetch(`${API_URL}/pagos/${id}/reembolsar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: currentUser.id, admin_note }),
      });
      if (!res.ok) {
        const e = await res.json();
        alert("Error: " + (e.error || "desconocido"));
        return;
      }
      alert("Pago reembolsado.");
      await refrescarAdmin();
    } catch {
      alert("Error de conexion");
    }
  };

  const handleCancelarPago = async (id, esAdmin = false) => {
    if (
      !window.confirm(
        "¿Cancelar este pago? Se eliminará el comprobante asociado.",
      )
    )
      return;
    try {
      const res = await fetch(`${API_URL}/pagos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json();
        alert("Error: " + (e.error || "desconocido"));
        return;
      }
      alert("Pago cancelado correctamente.");
      if (esAdmin) {
        await refrescarAdmin();
      } else {
        await getMisPagos(currentUser.id);
      }
    } catch {
      alert("Error de conexion");
    }
  };

  const handleCompletarYCobrar = async (cita) => {
    // Usar saldo pendiente si está disponible (con pagos parciales previos)
    const saldo =
      cita.saldo_pendiente !== undefined && cita.saldo_pendiente !== null
        ? parseFloat(cita.saldo_pendiente)
        : parseFloat(cita.precio || 0);

    if (
      !window.confirm(
        `¿Registrar cobro en efectivo de $${fmtMonto(saldo)} para ${cita.nombre_usuario || "cliente"}?${
          saldo < parseFloat(cita.precio || 0)
            ? `\n(Precio total: $${fmtMonto(cita.precio)} — saldo restante: $${fmtMonto(saldo)})`
            : ""
        }`,
      )
    )
      return;
    try {
      const resPago = await fetch(`${API_URL}/admin/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_cita: cita.id,
          id_admin: currentUser.id,
          monto_recibido: saldo,
          metodo: "efectivo",
        }),
      });
      if (!resPago.ok) {
        const e = await resPago.json();
        alert("Error al registrar pago: " + (e.error || "desconocido"));
        return;
      }
      alert("✅ Pago registrado exitosamente");
      await refrescarAdmin();
    } catch {
      alert("Error de conexion");
    }
  };

  const handlePagoEfectivo = async (cita) => {
    let metodo = cita.metodo_pago;

    // Si no hay método definido, el admin elige
    if (!metodo) {
      const opciones = [
        "efectivo",
        "transferencia",
        "nequi",
        "daviplata",
        "tarjeta",
      ];
      const elegido = window.prompt(
        `El cliente no tiene método de pago asignado.\nElige método:\n${opciones.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\n(escribe el nombre del método)`,
        "efectivo",
      );
      if (!elegido) return;
      metodo = elegido.trim().toLowerCase();
      if (!opciones.includes(metodo)) {
        alert("⚠️ Método no válido. Usa: " + opciones.join(", "));
        return;
      }
    }

    const esEfectivo = metodo === "efectivo";
    const metodoLabel =
      {
        efectivo: "efectivo",
        transferencia: "transferencia",
        tarjeta: "tarjeta",
        nequi: "Nequi",
        daviplata: "Daviplata",
      }[metodo] || metodo;

    if (
      !window.confirm(
        `Registrar pago por ${metodoLabel} de $${fmtMonto(cita.precio)} para ${cita.nombre_usuario || "cliente"}?`,
      )
    )
      return;

    // Usar saldo pendiente si hay pagos parciales previos
    const saldoPendiente =
      cita.saldo_pendiente !== undefined && cita.saldo_pendiente !== null
        ? parseFloat(cita.saldo_pendiente)
        : parseFloat(cita.precio || 0);

    let montoRecibido = saldoPendiente;
    let cambio = 0;

    if (esEfectivo) {
      const hint =
        saldoPendiente < parseFloat(cita.precio || 0)
          ? `Precio total: $${fmtMonto(cita.precio)} | Ya abonado: $${fmtMonto(parseFloat(cita.precio || 0) - saldoPendiente)}\nSaldo pendiente: $${fmtMonto(saldoPendiente)}`
          : `Servicio: $${fmtMonto(cita.precio)}`;
      const montoRecibidoStr = window.prompt(
        `💵 ¿Cuánto dinero recibiste del cliente?\n${hint}`,
        saldoPendiente,
      );
      if (montoRecibidoStr === null) return;
      montoRecibido = parseFloat(montoRecibidoStr);
      if (isNaN(montoRecibido) || montoRecibido <= 0) {
        alert("⚠️ Ingresa un monto válido.");
        return;
      }
      cambio =
        montoRecibido > saldoPendiente ? montoRecibido - saldoPendiente : 0;
    }

    try {
      const body = {
        id_cita: cita.id,
        id_admin: currentUser.id,
        monto_recibido: montoRecibido,
        metodo,
      };

      // Siempre usar POST /admin/pagos (unificado desde backend)
      const endpoint = `${API_URL}/admin/pagos`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json();
        alert("Error: " + (e.error || "desconocido"));
        return;
      }
      alert(
        esEfectivo && cambio > 0
          ? `✅ Pago registrado. Cambio: $${fmtMonto(cambio)}`
          : `✅ Pago por ${metodoLabel} registrado: $${fmtMonto(montoRecibido)}`,
      );
      await refrescarAdmin();
    } catch {
      alert("Error de conexion");
    }
  };

  const handleSubmitAdmin = async (e) => {
    e.preventDefault();
    try {
      const cita = citas.find((c) => c.id === parseInt(formAdmin.id_cita));
      const res = await fetch(`${API_URL}/admin/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_cita: parseInt(formAdmin.id_cita),
          id_admin: currentUser.id,
          monto_recibido: parseFloat(formAdmin.monto),
          metodo: formAdmin.metodo,
          notas: formAdmin.notas,
          propina: formAdmin.propina ? parseFloat(formAdmin.propina) : 0,
          descuento: formAdmin.descuento ? parseFloat(formAdmin.descuento) : 0,
          es_abono: formAdmin.es_abono,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        alert("Error: " + (e.error || "desconocido"));
        return;
      }
      alert("Pago registrado exitosamente");
      setFormAdmin({
        id_cita: "",
        monto: "",
        metodo: "efectivo",
        notas: "",
        propina: "",
        descuento: "",
        es_abono: false,
      });
      setShowFormAdmin(false);
      await refrescarAdmin();
    } catch {
      alert("Error de conexion");
    }
  };

  /* ========== LIFECYCLE ========== */
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate("/login");
      return;
    }
    setCurrentUser(user);
    if (user.rol === "admin") {
      Promise.all([
        getPagos({}),
        getPagosPendientes(),
        getCitas(),
        getPagoStats(user.id),
        getNotificaciones(user.id),
      ]).finally(() => setLoading(false));

      // Polling: refrescar comprobantes pendientes + citas cada 30 segundos
      const intervalo = setInterval(() => {
        getPagosPendientes();
        getCitas();
        getNotificaciones(user.id);
      }, 30_000);
      return () => clearInterval(intervalo);
    } else {
      Promise.all([
        getMisPagos(user.id),
        getCitasUsuario(user.id),
        getNotificaciones(user.id),
      ]).finally(() => setLoading(false));
    }
  }, [navigate]);

  /* ========== DERIVADOS ========== */
  // Combina GET /pagos/pendientes con datos JOIN de GET /citas (id_pago, estado_pago, metodo_pago).
  // Cubre el caso donde /pagos/pendientes no incluye un pago porque la cita ya
  // estaba "completada" al momento de la consulta.
  const pendientesAprobacion = (() => {
    const base = [...pagosPendientes];
    citas.forEach((c) => {
      const esDigital =
        c.metodo_pago === "transferencia" ||
        c.metodo_pago === "tarjeta" ||
        c.metodo_pago === "nequi" ||
        c.metodo_pago === "daviplata";
      const esPendiente = c.estado_pago === "pendiente_aprobacion";
      const yaEsta = base.some((p) => p.id === c.id_pago);
      if (c.id_pago && esPendiente && esDigital && !yaEsta) {
        // Buscar en pagos (GET /pagos) para obtener comprobante_url real
        const pagoCompleto = pagos.find((p) => p.id === c.id_pago);
        // Construir objeto pago desde los campos JOIN de cita
        base.push(
          pagoCompleto || {
            id: c.id_pago,
            id_cita: c.id,
            monto: c.precio,
            metodo: c.metodo_pago,
            estado: c.estado_pago,
            nombre_cliente: c.nombre_usuario,
            nombre_servicio: c.nombre_servicio,
            fecha_cita: c.fecha_hora,
            estado_cita: c.estado,
            comprobante: null,
            comprobante_url: null,
          },
        );
      }
    });
    return base;
  })();

  // IDs de citas que tienen comprobante pendiente de revisión
  const citasConPagoPendiente = new Set(
    pendientesAprobacion.map((p) => p.id_cita),
  );

  // Citas pendientes de cobro: reservadas/confirmadas/completadas sin pago completo
  // Usa saldo_pendiente del backend (#10) cuando está disponible
  const citasSinPago = citas
    .filter(
      (c) =>
        c.estado === "completada" ||
        c.estado === "confirmada" ||
        c.estado === "reservada",
    )
    // Excluir citas ya pagadas en caja (efectivo + completado)
    .filter(
      (c) => !(c.metodo_pago === "efectivo" && c.estado_pago === "completado"),
    )
    .filter((c) => {
      if (citasConPagoPendiente.has(c.id)) return false;
      // Preferir saldo_pendiente del backend
      if (c.saldo_pendiente !== undefined && c.saldo_pendiente !== null) {
        return parseFloat(c.saldo_pendiente) > 0;
      }
      // Fallback: calcular desde array de pagos
      const totalAbonado = pagos
        .filter(
          (p) =>
            p.id_cita === c.id &&
            (p.estado === "completado" || p.estado === "aprobado"),
        )
        .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
      return totalAbonado < parseFloat(c.precio || 0);
    })
    .map((c) => {
      const totalAbonado =
        c.saldo_pendiente !== undefined && c.saldo_pendiente !== null
          ? parseFloat(c.precio || 0) - parseFloat(c.saldo_pendiente || 0)
          : pagos
              .filter(
                (p) =>
                  p.id_cita === c.id &&
                  (p.estado === "completado" || p.estado === "aprobado"),
              )
              .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
      return {
        ...c,
        _totalAbonado: totalAbonado,
        _saldoPendiente:
          c.saldo_pendiente !== undefined
            ? parseFloat(c.saldo_pendiente)
            : parseFloat(c.precio || 0) - totalAbonado,
        _pagoRechazado:
          c.estado_pago === "rechazado"
            ? {
                id: c.id_pago,
                metodo: c.metodo_pago,
                estado: c.estado_pago,
                comprobante: null,
                comprobante_url: null,
              }
            : pagos.find(
                (p) => p.id_cita === c.id && p.estado === "rechazado",
              ) || null,
      };
    });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando pagos...</p>
        </div>
      </div>
    );

  /* ========== RENDER ========== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Modal historial de pago */}
      {historialModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setHistorialModal(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setHistorialModal(null)}
              className="absolute top-3 right-3 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg transition"
            >
              ×
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              📋 Historial del Pago #{historialModal.pagoId}
            </h3>
            {historialModal.data.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                Sin historial de cambios registrado.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {historialModal.data.map((h, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {h.estado_anterior ? `${h.estado_anterior} → ` : ""}
                        <span className="text-violet-700">
                          {h.estado_nuevo || h.estado || ""}
                        </span>
                      </p>
                      {(h.nota || h.admin_note) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          💬 {h.nota || h.admin_note}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {fmtFecha(h.created_at || h.fecha)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Modal visor de comprobante */}
      {comprobanteModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setComprobanteModal(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setComprobanteModal(null)}
              className="absolute top-3 right-3 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg transition"
            >
              ×
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              📎 Comprobante de pago
            </h3>
            <img
              src={comprobanteModal}
              alt="Comprobante"
              className="w-full rounded-lg border border-gray-200 object-contain max-h-[70vh]"
            />
            <a
              href={comprobanteModal}
              download="comprobante.png"
              className="mt-3 inline-block text-sm text-violet-600 underline"
            >
              ↓ Descargar imagen
            </a>
          </div>
        </div>
      )}
      {/* NAVBAR */}
      <nav className="bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h2 className="text-xl sm:text-2xl font-bold">Barberia K-19</h2>
            <button
              className="sm:hidden border rounded px-3 py-2 border-white"
              onClick={() => setMenuOpen(!menuOpen)}
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
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition"
              >
                Ir al Dashboard
              </button>
              {/* Campana notificaciones */}
              <div className="relative">
                <button
                  onClick={() => setNotifPanelOpen(!notifPanelOpen)}
                  className="relative bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
                >
                  🔔
                  {notificaciones.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {notificaciones.length > 9 ? "9+" : notificaciones.length}
                    </span>
                  )}
                </button>
                {notifPanelOpen && (
                  <div
                    className="absolute right-0 top-12 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 z-50 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="font-bold text-gray-800 text-sm">
                        Notificaciones
                      </span>
                      {notificaciones.length > 0 && (
                        <button
                          onClick={marcarTodasLeidas}
                          className="text-xs text-violet-600 hover:underline"
                        >
                          Marcar todas leídas
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                      {notificaciones.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">
                          Sin notificaciones nuevas
                        </p>
                      ) : (
                        notificaciones.map((n) => (
                          <div
                            key={n.id}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">
                                {n.titulo || n.tipo || "Notificación"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {n.mensaje}
                              </p>
                              <p className="text-xs text-gray-400">
                                {fmtFecha(n.created_at || n.fecha)}
                              </p>
                            </div>
                            <button
                              onClick={() => marcarNotifLeida(n.id)}
                              className="text-gray-400 hover:text-red-500 text-xl font-bold transition flex-shrink-0"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-sm px-3 py-1 bg-white/10 rounded-full">
                Usuario: {currentUser?.nombre}
              </span>
              <button
                onClick={handleLogout}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition"
              >
                Salir
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
                className="w-full bg-white/20 px-4 py-2 rounded-lg font-semibold text-left"
              >
                Ir al Dashboard
              </button>
              <div className="px-4 py-2 text-sm bg-white/10 rounded-lg">
                Usuario: {currentUser?.nombre}
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="w-full bg-white/20 px-4 py-2 rounded-lg font-semibold text-left"
              >
                Cerrar Sesion
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ════════════════════════════════════════════════
            ADMIN
        ════════════════════════════════════════════════ */}
        {currentUser?.rol === "admin" && (
          <>
            {/* Estadisticas */}
            {pagoStats && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-violet-200">
                <h2 className="text-xl font-bold text-violet-700 mb-5">
                  Estadisticas de Pagos
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-violet-50 p-5 rounded-xl text-center">
                    <p className="text-sm font-semibold text-violet-600">
                      Total Pagos
                    </p>
                    <p className="text-3xl font-bold text-violet-800">
                      {pagoStats.totalPagos ?? 0}
                    </p>
                  </div>
                  <div className="bg-green-50 p-5 rounded-xl text-center">
                    <p className="text-sm font-semibold text-green-600">
                      Ingresos
                    </p>
                    <p className="text-3xl font-bold text-green-800">
                      ${fmtMonto(pagoStats.totalMontoPagado)}
                    </p>
                  </div>
                  <div className="bg-amber-50 p-5 rounded-xl text-center">
                    <p className="text-sm font-semibold text-amber-600">
                      Pendientes
                    </p>
                    <p className="text-3xl font-bold text-amber-800">
                      {pendientesAprobacion.length}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-5 rounded-xl text-center">
                    <p className="text-sm font-semibold text-blue-600">
                      Metodos
                    </p>
                    <p className="text-3xl font-bold text-blue-800">
                      {Array.isArray(pagoStats.pagosPorMetodo)
                        ? pagoStats.pagosPorMetodo.length
                        : 0}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mb-5">
                  {Array.isArray(pagoStats.pagosPorMetodo) &&
                    pagoStats.pagosPorMetodo.map((item, i) => (
                      <div
                        key={i}
                        className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-semibold capitalize"
                      >
                        {item.metodo}:{" "}
                        <span className="text-violet-600">{item.total}</span> ·{" "}
                        <span className="text-green-600">
                          ${fmtMonto(item.montoTotal?.trim())}
                        </span>
                      </div>
                    ))}
                </div>
                {Array.isArray(pagoStats.pagosPorMes) &&
                  pagoStats.pagosPorMes.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Mes
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Pagos
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Monto
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pagoStats.pagosPorMes.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-semibold capitalize">
                                {fmtMes(item.mes)}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {item.total}
                              </td>
                              <td className="px-4 py-3 font-bold text-green-600">
                                ${fmtMonto(item.montoTotal?.trim())}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            )}

            {/* Comprobantes por revisar */}
            <div
              className={`border rounded-xl p-5 ${pendientesAprobacion.length > 0 ? "bg-yellow-50 border-yellow-300" : "bg-gray-50 border-gray-200"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className={`text-lg font-bold ${pendientesAprobacion.length > 0 ? "text-yellow-800" : "text-gray-500"}`}
                >
                  {pendientesAprobacion.length > 0
                    ? `⏳ Comprobantes por revisar (${pendientesAprobacion.length})`
                    : "✅ Sin comprobantes pendientes"}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    Auto-actualiza cada 30s
                  </span>
                  <button
                    onClick={() => {
                      getPagosPendientes();
                      getCitas();
                    }}
                    className="text-xs bg-white hover:bg-gray-100 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg font-semibold transition"
                  >
                    🔄 Actualizar ahora
                  </button>
                </div>
              </div>
              {pendientesAprobacion.length > 0 && (
                <div className="space-y-3">
                  {pendientesAprobacion.map((pago) => (
                    <div
                      key={pago.id}
                      className="bg-white rounded-xl p-4 border border-yellow-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs text-gray-400">
                            Pago #{pago.id}
                          </span>
                          <span className="font-bold text-gray-800">
                            {pago.nombre_cliente || "Cliente"}
                          </span>
                          {pago.nombre_servicio && (
                            <span className="text-sm text-gray-600">
                              {pago.nombre_servicio}
                            </span>
                          )}
                          <span className="font-bold text-green-700">
                            $
                            {fmtMonto(
                              pago.total || pago.subtotal || pago.monto,
                            )}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs capitalize">
                            {pago.metodo === "transferencia"
                              ? "🏦 Transferencia"
                              : pago.metodo === "tarjeta"
                                ? "💳 Tarjeta"
                                : pago.metodo === "nequi"
                                  ? "🟣 Nequi"
                                  : pago.metodo === "daviplata"
                                    ? "🔴 Daviplata"
                                    : pago.metodo}
                          </span>
                          <span className="text-xs text-gray-400">
                            Cita:{" "}
                            {fmtFecha(
                              (pago.fecha_cita || pago.fecha)?.substring(0, 10),
                            )}
                          </span>
                          {pago.estado_cita && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs capitalize">
                              Cita {pago.estado_cita}
                            </span>
                          )}
                        </div>
                        {(pago.comprobante || pago.comprobante_url) && (
                          <div className="flex items-center gap-3 mt-1">
                            <img
                              src={getImagenComprobante(pago)}
                              alt="Comprobante"
                              className="w-14 h-14 object-cover rounded-lg border border-yellow-200 cursor-pointer hover:scale-105 transition shadow"
                              onClick={() =>
                                setComprobanteModal(getImagenComprobante(pago))
                              }
                            />
                            <button
                              onClick={() =>
                                setComprobanteModal(getImagenComprobante(pago))
                              }
                              className="text-xs text-violet-600 underline font-semibold hover:text-violet-800"
                            >
                              🔍 Ver comprobante
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleAprobar(pago.id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition"
                        >
                          ✅ Aprobar
                        </button>
                        <button
                          onClick={() => handleRechazar(pago.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition"
                        >
                          ❌ Rechazar
                        </button>
                        <button
                          onClick={() => handleSolicitarInfo(pago.id)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition"
                        >
                          ❓ Pedir info
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cobros pendientes */}
            {citasSinPago.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-amber-800 mb-4">
                  Citas pendientes de cobro ({citasSinPago.length})
                </h3>
                <div className="space-y-3">
                  {citasSinPago.map((cita) => (
                    <div
                      key={cita.id}
                      className="bg-white rounded-xl p-4 border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs text-gray-400">
                          #{cita.id}
                        </span>
                        <span className="font-bold text-gray-800">
                          {cita.nombre_usuario || "Cliente"}
                        </span>
                        <span className="text-sm text-gray-600">
                          {cita.nombre_servicio}
                        </span>
                        <span className="font-bold text-green-700">
                          ${fmtMonto(cita.precio)}
                        </span>
                        {/* Badge método de pago del cliente */}
                        {cita.metodo_pago ? (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              cita.metodo_pago === "efectivo"
                                ? "bg-amber-100 text-amber-700"
                                : cita.metodo_pago === "nequi"
                                  ? "bg-purple-100 text-purple-700"
                                  : cita.metodo_pago === "daviplata"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {cita.metodo_pago === "efectivo"
                              ? "💵 Efectivo"
                              : cita.metodo_pago === "transferencia"
                                ? "🏦 Transferencia"
                                : cita.metodo_pago === "nequi"
                                  ? "🟣 Nequi"
                                  : cita.metodo_pago === "daviplata"
                                    ? "🔴 Daviplata"
                                    : cita.metodo_pago === "tarjeta"
                                      ? "💳 Tarjeta"
                                      : cita.metodo_pago}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-400">
                            💳 Pendiente de pago
                          </span>
                        )}
                        {cita._totalAbonado > 0 && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                            Abonado: ${fmtMonto(cita._totalAbonado)}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {fmtFecha(cita.fecha_hora?.substring(0, 10))}
                        </span>
                        {/* Progreso de pago */}
                        {cita._totalAbonado > 0 && (
                          <div className="w-full mt-1">
                            <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                              <span>
                                {Math.round(
                                  (cita._totalAbonado /
                                    parseFloat(cita.precio || 1)) *
                                    100,
                                )}
                                % pagado
                              </span>
                              <span>
                                Pendiente: $
                                {fmtMonto(
                                  Math.max(
                                    0,
                                    parseFloat(cita.precio || 0) -
                                      cita._totalAbonado,
                                  ),
                                )}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.round((cita._totalAbonado / parseFloat(cita.precio || 1)) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {/* Thumbnail del comprobante rechazado si existe */}
                        {(cita._pagoRechazado?.comprobante ||
                          cita._pagoRechazado?.comprobante_url) && (
                          <img
                            src={getImagenComprobante(cita._pagoRechazado)}
                            alt="Comprobante rechazado"
                            className="w-10 h-10 object-cover rounded-lg border border-red-200 cursor-pointer hover:scale-110 transition shadow opacity-60"
                            onClick={() =>
                              setComprobanteModal(
                                getImagenComprobante(cita._pagoRechazado),
                              )
                            }
                            title="Ver comprobante rechazado"
                          />
                        )}
                      </div>
                      {cita._pagoRechazado ? (
                        <div className="flex flex-col gap-1 items-end">
                          <span className="text-xs text-red-500 font-semibold">
                            Comprobante rechazado
                          </span>
                          {/* Botón adaptado por metodo_pago */}
                          {cita.metodo_pago === null ? (
                            <button
                              onClick={() => handlePagoEfectivo(cita)}
                              className="bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 text-white px-5 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap"
                            >
                              💰 Registrar pago
                            </button>
                          ) : cita.metodo_pago === "transferencia" ||
                            cita.metodo_pago === "nequi" ||
                            cita.metodo_pago === "daviplata" ? (
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                                🔍 En revisión de comprobante
                              </span>
                              <button
                                onClick={() => handlePagoEfectivo(cita)}
                                className="text-xs text-gray-500 underline hover:text-gray-700 transition"
                              >
                                Registrar manualmente
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handlePagoEfectivo(cita)}
                              className={`text-white px-5 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap ${
                                cita.metodo_pago === "efectivo"
                                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                  : "bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
                              }`}
                            >
                              {cita.metodo_pago === "efectivo"
                                ? "💵 Cobrar en efectivo"
                                : cita.metodo_pago === "tarjeta"
                                  ? "💳 Confirmar pago tarjeta"
                                  : "✅ Confirmar pago"}
                            </button>
                          )}
                        </div>
                      ) : /* ----- Card sin pago rechazado ----- */
                      cita.metodo_pago === null ? (
                        // Caso 1: sin método definido → botón neutral
                        <button
                          onClick={() => handlePagoEfectivo(cita)}
                          className="bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 text-white px-5 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap"
                        >
                          💰 Registrar pago
                        </button>
                      ) : cita.metodo_pago === "transferencia" ||
                        cita.metodo_pago === "nequi" ||
                        cita.metodo_pago === "daviplata" ? (
                        // Caso 2: digital → comprobante en revisión
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                            🔍 En revisión de comprobante
                          </span>
                          <button
                            onClick={() => handlePagoEfectivo(cita)}
                            className="text-xs text-gray-500 underline hover:text-gray-700 transition"
                          >
                            Registrar manualmente
                          </button>
                        </div>
                      ) : cita.metodo_pago === "efectivo" &&
                        cita.estado_pago === "completado" ? (
                        // Caso 3: ya pagó en caja (fallback por si no fue filtrado)
                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-semibold">
                          ✅ Pagado en caja
                        </span>
                      ) : (
                        // Caso efectivo pendiente → cobrar
                        <button
                          onClick={() => handlePagoEfectivo(cita)}
                          className={`text-white px-5 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap ${
                            cita.metodo_pago === "efectivo"
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                              : "bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600"
                          }`}
                        >
                          {cita.metodo_pago === "efectivo"
                            ? "💵 Cobrar en efectivo"
                            : cita.metodo_pago === "tarjeta"
                              ? "💳 Confirmar pago tarjeta"
                              : "✅ Confirmar pago"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Header + boton */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                  Gestion de Pagos
                </h1>
                <p className="text-gray-500 mt-1">{pagos.length} pago(s)</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setShowFormAdmin(!showFormAdmin);
                    setShowFormMixto(false);
                  }}
                  className="bg-gradient-to-r from-violet-500 to-pink-600 hover:from-violet-600 hover:to-pink-700 text-white px-5 py-3 rounded-lg font-bold transition shadow-lg"
                >
                  {showFormAdmin ? "✕ Cancelar" : "+ Pago Manual"}
                </button>
                <button
                  onClick={() => {
                    setShowFormMixto(!showFormMixto);
                    setShowFormAdmin(false);
                  }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-5 py-3 rounded-lg font-bold transition shadow-lg"
                >
                  {showFormMixto ? "✕ Cancelar" : "💰 Pago Mixto"}
                </button>
              </div>
            </div>

            {/* Formulario manual */}
            {showFormAdmin && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-5">
                  Registrar Pago Manual
                </h3>
                <form onSubmit={handleSubmitAdmin} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Cita
                      </label>
                      <select
                        required
                        value={formAdmin.id_cita}
                        onChange={(e) => {
                          const c = citas.find(
                            (x) => x.id === parseInt(e.target.value),
                          );
                          const totalAbonado = pagos
                            .filter(
                              (p) =>
                                p.id_cita === parseInt(e.target.value) &&
                                (p.estado === "completado" ||
                                  p.estado === "aprobado"),
                            )
                            .reduce((s, p) => s + parseFloat(p.monto || 0), 0);
                          const pendiente = Math.max(
                            0,
                            parseFloat(c?.precio || 0) - totalAbonado,
                          );
                          setFormAdmin({
                            ...formAdmin,
                            id_cita: e.target.value,
                            monto:
                              pendiente > 0
                                ? String(pendiente)
                                : c?.precio || "",
                          });
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition"
                      >
                        <option value="">Seleccione una cita</option>
                        {citas
                          .filter(
                            (c) =>
                              c.estado === "reservada" ||
                              c.estado === "confirmada" ||
                              c.estado === "completada",
                          )
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              #{c.id} - {c.nombre_usuario} - {c.nombre_servicio}{" "}
                              (${fmtMonto(c.precio)}) —{" "}
                              {c.fecha_hora?.substring(0, 10)}
                            </option>
                          ))}
                      </select>
                      {/* Progreso de abonos si ya hay pagos parciales */}
                      {formAdmin.id_cita &&
                        (() => {
                          const citaSel = citas.find(
                            (c) => c.id === parseInt(formAdmin.id_cita),
                          );
                          const abonadoSel = pagos
                            .filter(
                              (p) =>
                                p.id_cita === parseInt(formAdmin.id_cita) &&
                                (p.estado === "completado" ||
                                  p.estado === "aprobado"),
                            )
                            .reduce((s, p) => s + parseFloat(p.monto || 0), 0);
                          const precio = parseFloat(citaSel?.precio || 0);
                          if (abonadoSel <= 0) return null;
                          const pct = Math.min(
                            100,
                            Math.round((abonadoSel / precio) * 100),
                          );
                          return (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Abonado: ${fmtMonto(abonadoSel)}</span>
                                <span>
                                  Pendiente: $
                                  {fmtMonto(Math.max(0, precio - abonadoSel))}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Monto
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formAdmin.monto}
                        onChange={(e) =>
                          setFormAdmin({ ...formAdmin, monto: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Metodo
                      </label>
                      <select
                        value={formAdmin.metodo}
                        onChange={(e) =>
                          setFormAdmin({ ...formAdmin, metodo: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition"
                      >
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="nequi">Nequi</option>
                        <option value="daviplata">Daviplata</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Propina (opcional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formAdmin.propina}
                        onChange={(e) =>
                          setFormAdmin({
                            ...formAdmin,
                            propina: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Descuento (opcional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formAdmin.descuento}
                        onChange={(e) =>
                          setFormAdmin({
                            ...formAdmin,
                            descuento: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Notas (opcional)
                      </label>
                      <input
                        type="text"
                        value={formAdmin.notas}
                        onChange={(e) =>
                          setFormAdmin({ ...formAdmin, notas: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition"
                        placeholder="Observaciones..."
                      />
                    </div>
                  </div>
                  {/* Es abono */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formAdmin.es_abono}
                      onChange={(e) =>
                        setFormAdmin({
                          ...formAdmin,
                          es_abono: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded accent-violet-600"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      💰 Registrar como abono (pago parcial)
                    </span>
                    {formAdmin.es_abono && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        El monto puede ser menor al total del servicio
                      </span>
                    )}
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3 rounded-lg font-bold transition"
                    >
                      Registrar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFormAdmin(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-bold transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Formulario pago mixto */}
            {showFormMixto && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-200">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  💰 Pago Mixto
                </h3>
                <p className="text-sm text-gray-500 mb-5">
                  Registra un pago usando más de un método (ej: parte efectivo +
                  parte Nequi).
                </p>
                <form onSubmit={handleSubmitMixto} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cita
                    </label>
                    <select
                      required
                      value={formMixto.id_cita}
                      onChange={(e) =>
                        setFormMixto({ ...formMixto, id_cita: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <option value="">Seleccione una cita</option>
                      {citas
                        .filter(
                          (c) =>
                            c.estado === "reservada" ||
                            c.estado === "confirmada" ||
                            c.estado === "completada",
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            #{c.id} — {c.nombre_usuario} — {c.nombre_servicio}{" "}
                            (${fmtMonto(c.precio)})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      Métodos de pago
                    </label>
                    {formMixto.pagos.map((p, i) => {
                      const esDigital = [
                        "transferencia",
                        "nequi",
                        "daviplata",
                        "tarjeta",
                      ].includes(p.metodo);
                      const tieneComprobante = !!comprobantesMixto[i];
                      return (
                        <div key={i} className="space-y-2">
                          <div className="flex gap-3 items-center">
                            <select
                              value={p.metodo}
                              onChange={(e) => {
                                const updated = [...formMixto.pagos];
                                updated[i] = {
                                  ...updated[i],
                                  metodo: e.target.value,
                                };
                                setFormMixto({ ...formMixto, pagos: updated });
                                // limpiar comprobante si cambia a efectivo
                                setComprobantesMixto((prev) => {
                                  const next = { ...prev };
                                  delete next[i];
                                  return next;
                                });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="efectivo">💵 Efectivo</option>
                              <option value="transferencia">
                                🏦 Transferencia
                              </option>
                              <option value="nequi">🟣 Nequi</option>
                              <option value="daviplata">🔴 Daviplata</option>
                              <option value="tarjeta">💳 Tarjeta</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Monto (ej: 20.000)"
                              value={p.monto}
                              onChange={(e) => {
                                const updated = [...formMixto.pagos];
                                updated[i] = {
                                  ...updated[i],
                                  monto: e.target.value,
                                };
                                setFormMixto({ ...formMixto, pagos: updated });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                            {formMixto.pagos.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = formMixto.pagos.filter(
                                    (_, idx) => idx !== i,
                                  );
                                  setFormMixto({
                                    ...formMixto,
                                    pagos: updated,
                                  });
                                  setComprobantesMixto((prev) => {
                                    const next = { ...prev };
                                    delete next[i];
                                    return next;
                                  });
                                }}
                                className="text-red-400 hover:text-red-600 font-bold text-xl"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          {/* Comprobante obligatorio para métodos digitales */}
                          {esDigital && (
                            <div className="ml-1 pl-3 border-l-2 border-violet-300">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                📎 Comprobante {p.metodo}{" "}
                                <span className="text-red-500">
                                  *obligatorio
                                </span>
                                {tieneComprobante && (
                                  <span className="text-green-600 ml-2">
                                    ✅ Adjunto
                                  </span>
                                )}
                              </label>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  if (file.size > 5 * 1024 * 1024) {
                                    alert("⚠️ El archivo supera los 5MB");
                                    e.target.value = "";
                                    return;
                                  }
                                  setComprobantesMixto((prev) => ({
                                    ...prev,
                                    [i]: file,
                                  }));
                                }}
                                className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:font-semibold file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200 transition"
                              />
                              <p className="text-xs text-gray-400 mt-0.5">
                                JPG, PNG o PDF · Máx. 5 MB
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        setFormMixto({
                          ...formMixto,
                          pagos: [
                            ...formMixto.pagos,
                            { metodo: "efectivo", monto: "" },
                          ],
                        })
                      }
                      className="text-sm text-blue-600 hover:underline"
                    >
                      + Agregar método
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notas (opcional)
                    </label>
                    <input
                      type="text"
                      value={formMixto.notas}
                      onChange={(e) =>
                        setFormMixto({ ...formMixto, notas: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                      placeholder="Observaciones..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-lg font-bold transition"
                    >
                      Registrar Pago Mixto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFormMixto(false);
                        setComprobantesMixto({});
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-bold transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow p-5 border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4">Filtrar Pagos</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Estado
                  </label>
                  <select
                    value={filtros.estado}
                    onChange={(e) =>
                      setFiltros({ ...filtros, estado: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Todos</option>
                    <option value="pendiente_aprobacion">En revisión</option>
                    <option value="completado">Completado</option>
                    <option value="rechazado">Rechazado</option>
                    <option value="reembolsado">Reembolsado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Metodo
                  </label>
                  <select
                    value={filtros.metodo}
                    onChange={(e) =>
                      setFiltros({ ...filtros, metodo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Todos</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="nequi">Nequi</option>
                    <option value="daviplata">Daviplata</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={filtros.fecha_desde}
                    onChange={(e) =>
                      setFiltros({ ...filtros, fecha_desde: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={filtros.fecha_hasta}
                    onChange={(e) =>
                      setFiltros({ ...filtros, fecha_hasta: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => getPagos(filtros)}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition"
                >
                  Filtrar
                </button>
                <button
                  onClick={() => {
                    setFiltros({
                      estado: "",
                      metodo: "",
                      fecha_desde: "",
                      fecha_hasta: "",
                    });
                    getPagos({});
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-lg font-semibold text-sm transition"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Tabla de pagos */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Todos los Pagos</h3>
                <span className="text-sm text-gray-400">
                  {pagos.length} resultado(s)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "ID",
                        "Cliente",
                        "Servicio",
                        "Monto",
                        "Metodo",
                        "Estado",
                        "Fecha",
                        "Comprobante",
                        "Acciones",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pagos.length === 0 ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="px-6 py-10 text-center text-gray-400"
                        >
                          Sin resultados para los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      pagos.map((pago) => {
                        const citaInfo = citas.find(
                          (c) => c.id === pago.id_cita,
                        );
                        const estadoKey = pago.estado || "pendiente";
                        return (
                          <tr key={pago.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500 font-semibold">
                              #{pago.id}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {pago.nombre_cliente?.trim() || "N/A"}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {citaInfo?.nombre_servicio ||
                                `Cita #${pago.id_cita}`}
                            </td>
                            <td className="px-4 py-3 font-bold text-green-700">
                              ${fmtMonto(pago.total || pago.subtotal)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs capitalize">
                                {pago.metodo}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${ESTADO_BADGE[estadoKey] || "bg-gray-100 text-gray-600"}`}
                              >
                                {estadoKey}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                              {fmtFecha(pago.paid_at || pago.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              {pago.comprobante || pago.comprobante_url ? (
                                <button
                                  onClick={() =>
                                    setComprobanteModal(
                                      getImagenComprobante(pago),
                                    )
                                  }
                                  className="flex items-center gap-2 group"
                                >
                                  <img
                                    src={getImagenComprobante(pago)}
                                    alt="Comprobante"
                                    className="w-10 h-10 object-cover rounded-lg border border-gray-200 group-hover:scale-105 transition shadow"
                                  />
                                  <span className="text-xs text-violet-600 underline">
                                    🔍 Ver
                                  </span>
                                </button>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                {(estadoKey === "pendiente_aprobacion" ||
                                  estadoKey === "pendiente" ||
                                  estadoKey === "rechazado") && (
                                  <button
                                    onClick={() =>
                                      handleCancelarPago(pago.id, true)
                                    }
                                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap"
                                  >
                                    🗑️ Cancelar
                                  </button>
                                )}
                                {estadoKey === "completado" && (
                                  <button
                                    onClick={() => handleReembolsar(pago.id)}
                                    className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap"
                                  >
                                    🔄 Reembolsar
                                  </button>
                                )}
                                <button
                                  onClick={() => getHistorialPago(pago.id)}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap"
                                >
                                  📋 Historial
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reporte de Ingresos */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Reporte de Ingresos
              </h3>
              <div className="flex flex-wrap gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={repFiltros.fecha_desde}
                    onChange={(e) =>
                      setRepFiltros({
                        ...repFiltros,
                        fecha_desde: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={repFiltros.fecha_hasta}
                    onChange={(e) =>
                      setRepFiltros({
                        ...repFiltros,
                        fecha_hasta: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={getReporte}
                    disabled={loadingRep}
                    className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-semibold text-sm transition"
                  >
                    {loadingRep ? "Calculando..." : "Generar Reporte"}
                  </button>
                </div>
              </div>
              {reporte && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-xl text-center">
                      <p className="text-xs font-semibold text-green-600">
                        Total Ingresos
                      </p>
                      <p className="text-2xl font-bold text-green-800">
                        ${fmtMonto(reporte.totalIngresos)}
                      </p>
                    </div>
                    <div className="bg-violet-50 p-4 rounded-xl text-center">
                      <p className="text-xs font-semibold text-violet-600">
                        Total Pagos
                      </p>
                      <p className="text-2xl font-bold text-violet-800">
                        {reporte.totalPagos ?? 0}
                      </p>
                    </div>
                    {reporte.promedio && (
                      <div className="bg-blue-50 p-4 rounded-xl text-center">
                        <p className="text-xs font-semibold text-blue-600">
                          Promedio por pago
                        </p>
                        <p className="text-2xl font-bold text-blue-800">
                          ${fmtMonto(reporte.promedio)}
                        </p>
                      </div>
                    )}
                  </div>
                  {Array.isArray(reporte.detalle) &&
                    reporte.detalle.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Fecha
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Pagos
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Monto
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {reporte.detalle.map((d, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-semibold">
                                  {fmtFecha(d.fecha || d.dia)}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {d.total}
                                </td>
                                <td className="px-4 py-3 font-bold text-green-700">
                                  ${fmtMonto(d.monto || d.montoTotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════
            CLIENTE
        ════════════════════════════════════════════════ */}
        {currentUser?.rol !== "admin" && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent mb-1">
                Mis Pagos
              </h1>
              <p className="text-gray-500">
                {misPagos.length} pago(s) registrado(s)
              </p>
            </div>

            {/* Estado de citas */}
            {citasUsuario.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-violet-700 mb-4">
                  Estado de mis citas
                </h3>
                <div className="space-y-3">
                  {citasUsuario.map((cita) => {
                    // Preferir campos JOIN de cita, complementar con misPagos
                    const pagoCita = misPagos.find(
                      (p) => p.id_cita === cita.id,
                    );
                    const estadoPago =
                      cita.estado_pago || pagoCita?.estado || null;
                    const metodoPago =
                      cita.metodo_pago || pagoCita?.metodo || null;

                    const yaCompletado =
                      estadoPago === "completado" || estadoPago === "aprobado";
                    const enRevision =
                      estadoPago === "pendiente_aprobacion" &&
                      metodoPago !== null;
                    const sinPago =
                      !metodoPago && !estadoPago && cita.estado !== "cancelada";
                    const rechazado = estadoPago === "rechazado";
                    const citaFormAbierto = formComprobante?.citaId === cita.id;

                    return (
                      <div
                        key={cita.id}
                        className={`flex flex-col p-4 rounded-xl border gap-3 ${
                          yaCompletado
                            ? "bg-green-50 border-green-200"
                            : rechazado
                              ? "bg-red-50 border-red-200"
                              : enRevision
                                ? "bg-yellow-50 border-yellow-200"
                                : sinPago
                                  ? "bg-gray-50 border-dashed border-gray-300"
                                  : cita.estado === "completada"
                                    ? "bg-amber-50 border-amber-200"
                                    : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        {/* Fila principal: info + badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-gray-800">
                              {cita.nombre_servicio ||
                                `Servicio #${cita.id_servicio}`}
                            </span>
                            <span className="text-sm text-gray-500">
                              Fecha:{" "}
                              {fmtFecha(cita.fecha_hora?.substring(0, 10))}
                            </span>
                            <span className="font-bold text-green-700 text-sm">
                              ${fmtMonto(cita.precio)}
                            </span>
                            {metodoPago && (
                              <span className="text-xs text-gray-400 capitalize">
                                Método: {metodoPago}
                              </span>
                            )}
                          </div>

                          {/* Badge de estado */}
                          {yaCompletado ? (
                            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-green-100 text-green-700 self-start">
                              ✅ Pago completado
                            </span>
                          ) : rechazado ? (
                            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-700 self-start">
                              ❌ Comprobante rechazado
                            </span>
                          ) : enRevision ? (
                            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-yellow-100 text-yellow-700 self-start">
                              🕐 En revisión
                            </span>
                          ) : estadoPago === "reembolsado" ? (
                            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-purple-100 text-purple-700 self-start">
                              🔄 Reembolsado
                            </span>
                          ) : cita.estado === "cancelada" ? (
                            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-red-100 text-red-700 self-start">
                              ❌ Cancelada
                            </span>
                          ) : sinPago ? (
                            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-gray-100 text-gray-500 self-start">
                              💳 Sin pago registrado
                            </span>
                          ) : (
                            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-amber-100 text-amber-700 self-start">
                              📋 Reservada
                            </span>
                          )}
                        </div>

                        {/* Acción: subir comprobante (cuando no hay pago o fue rechazado) */}
                        {(sinPago || rechazado) &&
                          cita.estado !== "cancelada" && (
                            <div className="border-t border-gray-200 pt-3">
                              {!citaFormAbierto ? (
                                <button
                                  onClick={() =>
                                    setFormComprobante({
                                      citaId: cita.id,
                                      metodo: "transferencia",
                                      archivo: null,
                                    })
                                  }
                                  className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition"
                                >
                                  📤{" "}
                                  {rechazado
                                    ? "Reintentar pago"
                                    : "Registrar pago"}
                                </button>
                              ) : (
                                <form
                                  onSubmit={handleSubirComprobante}
                                  className="flex flex-col gap-3"
                                >
                                  <p className="text-xs font-semibold text-gray-600">
                                    Elige cómo deseas pagar:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {[
                                      ["transferencia", "🏦 Transferencia"],
                                      ["nequi", "🟣 Nequi"],
                                      ["daviplata", "🔴 Daviplata"],
                                      ["tarjeta", "💳 Tarjeta"],
                                    ].map(([val, label]) => (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() =>
                                          setFormComprobante((prev) => ({
                                            ...prev,
                                            metodo: val,
                                          }))
                                        }
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                                          formComprobante.metodo === val
                                            ? "bg-violet-600 text-white border-violet-600"
                                            : "bg-white text-gray-600 border-gray-300 hover:border-violet-400"
                                        }`}
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                                      Comprobante de pago
                                    </label>
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      required
                                      onChange={(e) =>
                                        setFormComprobante((prev) => ({
                                          ...prev,
                                          archivo: e.target.files[0],
                                        }))
                                      }
                                      className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="submit"
                                      className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
                                    >
                                      Enviar comprobante
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setFormComprobante(null)}
                                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </form>
                              )}
                            </div>
                          )}

                        {/* Info: en revisión → cliente no puede hacer nada más */}
                        {enRevision && (
                          <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-200">
                            🕐 Tu comprobante está siendo revisado. Te
                            notificaremos cuando sea aprobado.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Historial de pagos */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Historial de Pagos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "Servicio",
                        "Monto",
                        "Metodo",
                        "Estado",
                        "Fecha",
                        "Acciones",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {misPagos.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-6 py-10 text-center text-gray-400"
                        >
                          No tienes pagos registrados aun.
                        </td>
                      </tr>
                    ) : (
                      misPagos.map((pago) => {
                        const estadoKey = pago.estado || "pendiente";
                        const citaInfo = citasUsuario.find(
                          (c) => c.id === pago.id_cita,
                        );
                        return (
                          <tr key={pago.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {citaInfo?.nombre_servicio ||
                                `Cita #${pago.id_cita}`}
                            </td>
                            <td className="px-4 py-3 font-bold text-green-700">
                              ${fmtMonto(pago.total || pago.subtotal)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs capitalize">
                                {pago.metodo}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${ESTADO_BADGE[estadoKey] || "bg-gray-100 text-gray-600"}`}
                              >
                                {ESTADO_LABEL[estadoKey] || estadoKey}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                              {fmtFecha(pago.paid_at || pago.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                {(estadoKey === "pendiente" ||
                                  estadoKey === "pendiente_aprobacion" ||
                                  estadoKey === "rechazado") && (
                                  <button
                                    onClick={() =>
                                      handleCancelarPago(pago.id, false)
                                    }
                                    className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap"
                                  >
                                    🗑️ Cancelar
                                  </button>
                                )}
                                <button
                                  onClick={() => getHistorialPago(pago.id)}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap"
                                >
                                  📋 Historial
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
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

export default Pagos;
