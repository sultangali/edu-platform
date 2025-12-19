import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/authStore';
import LoadingScreen from '../common/LoadingScreen';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = allowedRoles.includes(user?.role);
    
    if (!hasRequiredRole) {
      // Redirect to home or show forbidden page
      return <Navigate to="/" replace />;
    }
  }

  // Render protected content
  return <Outlet />;
};

export default ProtectedRoute;

