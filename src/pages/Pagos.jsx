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
  aprobado: "bg-green-100 text-green-700",
  pendiente: "bg-yellow-100 text-yellow-700",
  rechazado: "bg-red-100 text-red-700",
};

function Pagos() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  /* --- admin state --- */
  const [pagos, setPagos] = useState([]);
  const [pagoStats, setPagoStats] = useState(null);
  const [citas, setCitas] = useState([]);
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
  });

  /* --- cliente state --- */
  const [misPagos, setMisPagos] = useState([]);
  const [citasUsuario, setCitasUsuario] = useState([]);

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
      setPagos(Array.isArray(data.pagos) ? data.pagos : []);
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

  /* ========== ACCIONES ADMIN ========== */
  const refrescarAdmin = () =>
    Promise.all([getPagos(filtros), getCitas(), getPagoStats(currentUser.id)]);

  const handleAprobar = async (id) => {
    if (!window.confirm("Aprobar este pago? La cita quedara como completada."))
      return;
    try {
      const res = await fetch(`${API_URL}/pagos/${id}/aprobar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: currentUser.id }),
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
    const motivo = window.prompt("Motivo del rechazo (opcional):");
    if (motivo === null) return;
    try {
      const res = await fetch(`${API_URL}/pagos/${id}/rechazar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: currentUser.id, motivo }),
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

  const handleCompletarYCobrar = async (cita) => {
    if (
      !window.confirm(
        `¿Completar la cita y registrar pago en efectivo de $${fmtMonto(cita.precio)} para ${cita.nombre_usuario || "cliente"}?`,
      )
    )
      return;
    try {
      // 1. Marcar la cita como completada
      const resCita = await fetch(`${API_URL}/citas/${cita.id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "completada" }),
      });
      if (!resCita.ok) {
        const e = await resCita.json();
        alert("Error al completar cita: " + (e.error || "desconocido"));
        return;
      }
      // 2. Registrar el pago en efectivo
      const resPago = await fetch(`${API_URL}/admin/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_cita: cita.id,
          id_usuario: cita.id_usuario,
          monto: parseFloat(cita.precio || 0),
          metodo: "efectivo",
          fecha_pago: new Date().toISOString().split("T")[0],
        }),
      });
      if (!resPago.ok) {
        const e = await resPago.json();
        alert("Error al registrar pago: " + (e.error || "desconocido"));
        return;
      }
      alert("Cita completada y pago registrado exitosamente");
      await refrescarAdmin();
    } catch {
      alert("Error de conexion");
    }
  };

  const handlePagoEfectivo = async (cita) => {
    if (
      !window.confirm(
        `Registrar pago en efectivo de $${fmtMonto(cita.precio)} para ${cita.nombre_usuario || "cliente"}?`,
      )
    )
      return;
    try {
      const res = await fetch(`${API_URL}/admin/pagos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_cita: cita.id,
          id_usuario: cita.id_usuario,
          monto: parseFloat(cita.precio || 0),
          metodo: "efectivo",
          fecha_pago: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        alert("Error: " + (e.error || "desconocido"));
        return;
      }
      alert("Pago en efectivo registrado");
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
          id_usuario: cita?.id_usuario,
          monto: parseFloat(formAdmin.monto),
          metodo: formAdmin.metodo,
          notas: formAdmin.notas,
          fecha_pago: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        alert("Error: " + (e.error || "desconocido"));
        return;
      }
      alert("Pago registrado exitosamente");
      setFormAdmin({ id_cita: "", monto: "", metodo: "efectivo", notas: "" });
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
      Promise.all([getPagos({}), getCitas(), getPagoStats(user.id)]).finally(
        () => setLoading(false),
      );
    } else {
      Promise.all([getMisPagos(user.id), getCitasUsuario(user.id)]).finally(
        () => setLoading(false),
      );
    }
  }, [navigate]);

  /* ========== DERIVADOS ========== */
  const pendientesAprobacion = pagos.filter(
    (p) =>
      (p.estado === "pendiente" || !p.estado) &&
      (p.metodo === "tarjeta" || p.metodo === "transferencia"),
  );
  // Incluye citas pendientes/confirmadas Y completadas que no tienen pago aprobado
  const citasSinPago = citas.filter(
    (c) =>
      (c.estado === "completada" ||
        c.estado === "pendiente" ||
        c.estado === "confirmada") &&
      !pagos.some(
        (p) =>
          p.id_cita === c.id &&
          (p.estado === "aprobado" || p.metodo === "efectivo"),
      ),
  );

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
            {pendientesAprobacion.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-5">
                <h3 className="text-lg font-bold text-yellow-800 mb-4">
                  Comprobantes por revisar ({pendientesAprobacion.length})
                </h3>
                <div className="space-y-3">
                  {pendientesAprobacion.map((pago) => (
                    <div
                      key={pago.id}
                      className="bg-white rounded-xl p-4 border border-yellow-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs text-gray-400">
                            #{pago.id}
                          </span>
                          <span className="font-bold text-gray-800">
                            {pago.nombre_cliente || "Cliente"}
                          </span>
                          <span className="text-sm text-gray-500">
                            Cita #{pago.id_cita}
                          </span>
                          <span className="font-bold text-green-700">
                            ${fmtMonto(pago.monto)}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs capitalize">
                            {pago.metodo}
                          </span>
                          <span className="text-xs text-gray-400">
                            {fmtFecha(pago.fecha_pago)}
                          </span>
                        </div>
                        {pago.comprobante && (
                          <a
                            href={pago.comprobante}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-violet-600 underline"
                          >
                            Ver comprobante adjunto
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAprobar(pago.id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleRechazar(pago.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cobros pendientes en efectivo */}
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
                        <span className="text-xs text-gray-400">
                          {fmtFecha(cita.fecha_hora?.substring(0, 10))}
                        </span>
                      </div>
                      {cita.estado === "completada" ? (
                        <button
                          onClick={() => handlePagoEfectivo(cita)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-5 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap"
                        >
                          Cobrar en efectivo
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCompletarYCobrar(cita)}
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-5 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap"
                        >
                          Completar y cobrar
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
              <button
                onClick={() => setShowFormAdmin(!showFormAdmin)}
                className="bg-gradient-to-r from-violet-500 to-pink-600 hover:from-violet-600 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-bold transition shadow-lg"
              >
                {showFormAdmin ? "Cancelar" : "+ Registrar Pago Manual"}
              </button>
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
                          setFormAdmin({
                            ...formAdmin,
                            id_cita: e.target.value,
                            monto: c?.precio || "",
                          });
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 transition"
                      >
                        <option value="">Seleccione una cita completada</option>
                        {citas
                          .filter((c) => c.estado === "completada")
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              #{c.id} - {c.nombre_usuario} - {c.nombre_servicio}{" "}
                              ({c.fecha_hora?.substring(0, 10)})
                            </option>
                          ))}
                      </select>
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
                      </select>
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
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
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
                          colSpan="8"
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
                              ${fmtMonto(pago.monto)}
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
                              {fmtFecha(pago.fecha_pago)}
                            </td>
                            <td className="px-4 py-3">
                              {pago.comprobante ? (
                                <a
                                  href={pago.comprobante}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-violet-600 underline text-xs"
                                >
                                  Ver
                                </a>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
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
                    const pagoCita = misPagos.find(
                      (p) => p.id_cita === cita.id,
                    );
                    const estadoPago = pagoCita?.estado;
                    return (
                      <div
                        key={cita.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border gap-3 ${
                          estadoPago === "aprobado"
                            ? "bg-green-50 border-green-200"
                            : estadoPago === "rechazado"
                              ? "bg-red-50 border-red-200"
                              : pagoCita
                                ? "bg-yellow-50 border-yellow-200"
                                : cita.estado === "completada"
                                  ? "bg-amber-50 border-amber-200"
                                  : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-gray-800">
                            {cita.nombre_servicio ||
                              `Servicio #${cita.id_servicio}`}
                          </span>
                          <span className="text-sm text-gray-500">
                            Fecha: {fmtFecha(cita.fecha_hora?.substring(0, 10))}
                          </span>
                          {pagoCita && (
                            <span className="text-xs text-gray-400 capitalize">
                              Metodo: {pagoCita.metodo}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                            estadoPago === "aprobado"
                              ? "bg-green-100 text-green-700"
                              : estadoPago === "rechazado"
                                ? "bg-red-100 text-red-700"
                                : pagoCita
                                  ? "bg-yellow-100 text-yellow-700"
                                  : cita.estado === "completada"
                                    ? "bg-amber-100 text-amber-700"
                                    : cita.estado === "cancelada"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {estadoPago === "aprobado"
                            ? "Pago aprobado"
                            : estadoPago === "rechazado"
                              ? "Pago rechazado"
                              : pagoCita
                                ? "En revision"
                                : cita.estado === "completada"
                                  ? "Pago pendiente"
                                  : cita.estado === "cancelada"
                                    ? "Cancelada"
                                    : "Cita pendiente"}
                        </span>
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
                      {["Servicio", "Monto", "Metodo", "Estado", "Fecha"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {misPagos.length === 0 ? (
                      <tr>
                        <td
                          colSpan="5"
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
                              ${fmtMonto(pago.monto)}
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
                              {fmtFecha(pago.fecha_pago)}
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
