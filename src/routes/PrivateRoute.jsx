import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import LoadingSkeleton from '../components/LoadingSkeleton';

export const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md p-6">
          <LoadingSkeleton type="dashboard" />
        </div>
      </div>
    );
  }

  if (!user) {
    const redirectPath = location.pathname.startsWith('/admin') ? '/admin/login' : '/examiner/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
