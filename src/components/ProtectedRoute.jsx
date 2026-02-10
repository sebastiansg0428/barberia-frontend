import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../services/authService';

/**
 * Componente que protege las rutas que requieren autenticación
 */
function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
