
// Servicio de autenticación usando backend y localStorage para sesión
const CURRENT_USER_KEY = 'barberia_current_user';

// Login usando backend
export const login = async (email, password) => {
  const response = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error al iniciar sesión");
  }

  const data = await response.json();
  // Guarda el usuario en localStorage si quieres mantener la sesión
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.usuario));
  return data.usuario;
};


// Obtener usuario actual
export const getCurrentUser = () => {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
};

// Cerrar sesión
export const logout = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

// Verificar si el usuario está autenticado
export const isAuthenticated = () => {
  return getCurrentUser() !== null;
};
