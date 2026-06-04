import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './Layout/Layout';
import Login from './pages/Login';
import NurseDashboard from './pages/NurseDashboard';
import StudentEntry from './pages/StudentEntry';
import StaffEntry from './pages/StaffEntry';
import Index from './pages/Index';
import {
  AddNewVisit,
  BmiCalculator,
  Inventory,
  MasterList,
  MedicalDocs,
  MedicalQR,
  MonthlyReport,
  RegisterNurse,
} from './pages/ClinicPages';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/index" element={<Index />} />
        
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<NurseDashboard />} />
          <Route path="/add-visit" element={<AddNewVisit />} />
          <Route path="/student-entry" element={<StudentEntry />} />
          <Route path="/staff-entry" element={<StaffEntry />} />
          <Route path="/bmi-calculator" element={<BmiCalculator />} />
          <Route path="/medical-docs" element={<MedicalDocs />} />
          <Route path="/medical-qr" element={<MedicalQR />} />
          <Route path="/master-list" element={<MasterList />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/register-nurse" element={<RegisterNurse />} />
          <Route path="/monthly-report" element={<MonthlyReport />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
