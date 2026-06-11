import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';

// Auth Actions
import { loadUserFromStorage } from './store/authSlice';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import ExaminerLayout from './layouts/ExaminerLayout';

// Pages
import Login from './pages/Login';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageTests from './pages/admin/ManageTests';
import CreateTest from './pages/admin/CreateTest';
import QuestionBank from './pages/admin/QuestionBank';
import AdminResults from './pages/admin/Results';
import ManageEmails from './pages/admin/ManageEmails';

// Examiner Pages
import ExaminerDashboard from './pages/examiner/Dashboard';
import ExaminerTests from './pages/examiner/Tests';
import MCQTest from './pages/examiner/MCQTest';
import GradedResult from './pages/examiner/Result';

// Guards
import PrivateRoute from './routes/PrivateRoute';
import AdminRoute from './routes/AdminRoute';
import ExaminerRoute from './routes/ExaminerRoute';

function App() {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '16px',
            padding: '12px 18px',
            fontSize: '14px'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff'
            }
          }
        }}
      />
      
      <Routes>
        {/* Split Login Routes */}
        <Route path="/admin/login" element={<Login isAdminRoute={true} />} />
        <Route path="/examiner/login" element={<Login isAdminRoute={false} />} />

        {/* Legacy redirect */}
        <Route path="/login" element={<Navigate to="/examiner/login" replace />} />

        {/* Admin Portal Protected Routes */}
        <Route 
          path="/admin" 
          element={
            <PrivateRoute>
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="tests" element={<ManageTests />} />
          <Route path="tests/create" element={<CreateTest />} />
          <Route path="questions" element={<QuestionBank />} />
          <Route path="emails" element={<ManageEmails />} />
          <Route path="results" element={<AdminResults />} />
        </Route>

        {/* Examiner Assessment Portal Protected Routes */}
        <Route 
          path="/examiner" 
          element={
            <PrivateRoute>
              <ExaminerRoute>
                <ExaminerLayout />
              </ExaminerRoute>
            </PrivateRoute>
          }
        >
          <Route index element={<ExaminerDashboard />} />
          <Route path="tests" element={<ExaminerTests />} />
          <Route path="test/:id" element={<MCQTest />} />
          <Route path="result/:id" element={<GradedResult />} />
        </Route>

        {/* Default Landing Page Redirect */}
        <Route path="/" element={<Navigate to="/examiner/login" replace />} />
        
        {/* 404 Catch All */}
        <Route path="*" element={<Navigate to="/examiner/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
