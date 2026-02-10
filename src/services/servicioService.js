// Servicio para consumir la API de servicios
import { API_URL as BASE_URL } from '../config/api';

const API_URL = `${BASE_URL}/servicios`;

export async function getServicios() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Error al obtener servicios");
    return await res.json();
}

export async function crearServicio(servicio) {
    const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(servicio),
    });
    if (!res.ok) throw new Error("Error al crear servicio");
    return await res.json();
}

export async function actualizarServicio(id, servicio) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(servicio),
    });
    if (!res.ok) throw new Error("Error al actualizar servicio");
    return await res.json();
}

export async function eliminarServicio(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE"
    });
    if (!res.ok) throw new Error("Error al eliminar servicio");
    return true;
}
