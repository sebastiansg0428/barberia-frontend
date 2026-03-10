import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_URL } from "../config/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al iniciar sesión");
      }

      localStorage.setItem(
        "barberia_current_user",
        JSON.stringify(data.usuario),
      );
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-stone-800 to-zinc-900 px-4 py-12 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500 rounded-full filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-400 rounded-full filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-yellow-400 rounded-full filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-lg p-10 rounded-3xl shadow-2xl relative z-10 border border-white/20">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-500 to-yellow-400 rounded-2xl flex items-center justify-center mb-4 shadow-lg transform hover:scale-110 transition-transform duration-300">
            <span className="text-4xl">✂️</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 bg-clip-text text-transparent mb-2">
            Barbería K-19
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            Inicia sesión en tu cuenta
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl animate-shake">
            <div className="flex items-center">
              <span className="text-2xl mr-3">❌</span>
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"
            >
              <span className="text-lg">📧</span>
              <span>Correo Electrónico</span>
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3.5 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-500 transition-all duration-200 hover:border-gray-400"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"
            >
              <span className="text-lg">🔒</span>
              <span>Contraseña</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3.5 border-2 border-gray-300 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-500 transition-all duration-200 hover:border-gray-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-bold rounded-xl text-white bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-600 hover:via-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-4 focus:ring-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105 hover:shadow-xl shadow-lg"
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
                Iniciando sesión...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                Iniciar Sesión
              </span>
            )}
          </button>

          <div className="text-center pt-4">
            <p className="text-gray-600 text-base">
              ¿No tienes cuenta?{" "}
              <Link
                to="/register"
                className="font-bold text-amber-600 hover:text-amber-700 transition-colors duration-200 underline underline-offset-4 decoration-2 decoration-amber-400 hover:decoration-amber-600"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
