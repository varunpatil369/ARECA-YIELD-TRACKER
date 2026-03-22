import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  user: User | null;
  isAuthReady: boolean;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, isAuthReady, children }) => {
  const location = useLocation();

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save the current location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
