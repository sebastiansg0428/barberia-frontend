// Servicio para gestionar citas
import { API_URL } from '../config/api';

export const getCitas = async () => {
  const response = await fetch(`${API_URL}/citas`);
  if (!response.ok) throw new Error("Error al obtener citas");
  return await response.json();
};

export const getCitaById = async (id) => {
  const response = await fetch(`${API_URL}/citas/${id}`);
  if (!response.ok) throw new Error("Error al obtener cita");
  return await response.json();
};

export const crearCita = async (citaData) => {
  const response = await fetch(`${API_URL}/citas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(citaData),
  });
  if (!response.ok) throw new Error("Error al crear cita");
  return await response.json();
};

export const actualizarCita = async (id, citaData) => {
  const response = await fetch(`${API_URL}/citas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(citaData),
  });
  if (!response.ok) throw new Error("Error al actualizar cita");
  return await response.json();
};

export const eliminarCita = async (id) => {
  const response = await fetch(`${API_URL}/citas/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Error al eliminar cita");
  return await response.json();
};
