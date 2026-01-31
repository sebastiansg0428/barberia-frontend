// Servicio para consumir la API de servicios
const API_URL = "http://localhost:3000/servicios";

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
