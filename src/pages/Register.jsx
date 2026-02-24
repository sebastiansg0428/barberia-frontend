import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import { API_URL } from "../config/api";

function Register() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    password: "",
    confirmPassword: "",
    rol: "cliente",
  });
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    // Si hay usuario logueado, obtenerlo
    const user = getCurrentUser && getCurrentUser();
    setCurrentUser(user);
    // Si no es admin, forzar rol cliente
    if (!user || user.rol !== "admin") {
      setFormData((prev) => ({ ...prev, rol: "cliente" }));
    }
  }, []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Por favor ingresa un email válido");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono,
          password: formData.password,
          rol: formData.rol,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al registrarse");
      }

      alert("✅ Usuario registrado exitosamente");
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 px-4 py-12 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-lg p-10 rounded-3xl shadow-2xl relative z-10 border border-white/20">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg transform hover:scale-110 transition-transform duration-300">
            <span className="text-4xl">✂️</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Barbería K-19
          </h1>
          <p className="text-gray-600 text-lg font-medium">Crea tu cuenta</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl animate-shake">
            <div className="flex items-center">
              <span className="text-2xl mr-3">❌</span>
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="nombre"
              className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"
            >
              <span className="text-lg">👤</span>
              <span>Nombre Completo</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              value={formData.nombre}
              onChange={handleChange}
              className="appearance-none relative block w-full px-4 py-3.5 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
              placeholder="Juan Pérez"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"
            >
              <span className="text-lg">📧</span>
              <span>Correo Electrónico</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="appearance-none relative block w-full px-4 py-3.5 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="telefono"
              className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"
            >
              <span className="text-lg">📱</span>
              <span>Teléfono</span>
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              required
              value={formData.telefono}
              onChange={handleChange}
              className="appearance-none relative block w-full px-4 py-3.5 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
              placeholder="+57 300 123 4567"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="rol"
              className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"
            >
              <span className="text-lg">🎭</span>
              <span>Rol</span>
            </label>
            <select
              id="rol"
              name="rol"
              value={formData.rol}
              onChange={handleChange}
              className="appearance-none relative block w-full px-4 py-3.5 border-2 border-gray-300 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400 bg-white"
              required
            >
              <option value="cliente">Usuario</option>
              <option value="barbero">Barbero</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"
            >
              <span className="text-lg">🔒</span>
              <span>Contraseña</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="appearance-none relative block w-full px-4 py-3.5 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"
            >
              <span className="text-lg">🔐</span>
              <span>Confirmar Contraseña</span>
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="appearance-none relative block w-full px-4 py-3.5 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-gray-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:via-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105 hover:shadow-xl shadow-lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Registrando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                Registrarse
              </span>
            )}
          </button>

          <div className="text-center pt-4">
            <p className="text-gray-600 text-base">
              ¿Ya tienes cuenta?{" "}
              <Link
                to="/login"
                className="font-bold text-purple-600 hover:text-purple-700 transition-colors duration-200 underline underline-offset-4 decoration-2 decoration-purple-400 hover:decoration-purple-600"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;
