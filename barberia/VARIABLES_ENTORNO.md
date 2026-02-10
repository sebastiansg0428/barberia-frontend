# Variables de Entorno

## Configuración

Este proyecto usa variables de entorno para configurar la URL del backend.

### Archivos:

- `.env` - Variables de entorno para desarrollo (NO subir a git)
- `.env.example` - Plantilla de ejemplo para las variables de entorno
- `src/config/api.js` - Configuración centralizada de la API

### Variables disponibles:

```env
VITE_API_URL=http://localhost:3000
```

### Uso:

1. Copia el archivo `.env.example` a `.env`:

   ```bash
   copy .env.example .env
   ```

2. Modifica `.env` con tu configuración local:

   ```env
   VITE_API_URL=http://localhost:3000
   ```

3. Para producción, cambia la URL:
   ```env
   VITE_API_URL=https://tu-api-produccion.com
   ```

### Nota importante:

- Las variables de entorno en Vite deben comenzar con el prefijo `VITE_`
- Después de cambiar el archivo `.env`, debes reiniciar el servidor de desarrollo
- El archivo `.env` está en `.gitignore` para evitar subir credenciales al repositorio

### Archivos actualizados:

Todos los siguientes archivos ahora usan la variable de entorno:

- `src/services/authService.js`
- `src/services/servicioService.js`
- `src/services/citaService.js`
- `src/pages/Dashboard.jsx`
- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/pages/servicios.jsx`
- `src/pages/Citas.jsx`
