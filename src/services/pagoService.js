import { API_URL } from "../config/api";

export const registrarPago = async (datosPago) => {
    try {
        const response = await fetch(`${API_URL}/pagos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosPago),
        });
        if (!response.ok) throw new Error("Error al registrar pago");
        return await response.json();
    } catch (error) {
        throw error;
    }
};

export const obtenerPagos = async () => {
    try {
        const response = await fetch(`${API_URL}/pagos`);
        if (!response.ok) throw new Error("Error al obtener pagos");
        return await response.json();
    } catch (error) {
        throw error;
    }
};

export const obtenerPagoPorId = async (id) => {
    try {
        const response = await fetch(`${API_URL}/pagos/${id}`);
        if (!response.ok) throw new Error("Error al obtener pago");
        return await response.json();
    } catch (error) {
        throw error;
    }
};

export const obtenerPagosPorCita = async (idCita) => {
    try {
        const response = await fetch(`${API_URL}/pagos/cita/${idCita}`);
        if (!response.ok) throw new Error("Error al obtener pagos de la cita");
        return await response.json();
    } catch (error) {
        throw error;
    }
};
