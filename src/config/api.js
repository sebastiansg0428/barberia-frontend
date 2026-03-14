// Configuración centralizada de la API
// Si hay variable de entorno explícita, usarla.
// Si no, usar el mismo host desde donde se sirve el frontend (funciona en PC y celular).
export const API_URL =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:3000`;
