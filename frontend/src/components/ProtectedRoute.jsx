import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, requires2FASetup } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/control-panel/login" state={{ from: location }} replace />;
  }

  // If 2FA is required but not set up, redirect to Security page
  // (but allow access to the security page itself)
  if (requires2FASetup && !location.pathname.includes('/security')) {
    return <Navigate to="/control-panel/security" replace />;
  }

  return children;
}
