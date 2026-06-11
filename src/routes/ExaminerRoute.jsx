import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import LoadingSkeleton from '../components/LoadingSkeleton';

export const ExaminerRoute = ({ children }) => {
  const { user, loading, isExaminer } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md p-6">
          <LoadingSkeleton type="dashboard" />
        </div>
      </div>
    );
  }

  if (!user || !isExaminer) {
    return <Navigate to="/examiner/login" replace />;
  }

  return children;
};

export default ExaminerRoute;
