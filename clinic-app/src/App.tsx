import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layout/Layout";
import Login from "./pages/Login";
import NurseDashboard from "./pages/NurseDashboard";
import AddNewVisit from "./pages/AddNewVisit";
import Students from "./pages/Students";
import StudentsList from "./pages/StudentsList";
import Staff from "./pages/Staff";
import BmiCalculator from "./pages/BmiCalculator";
import MedicalDocuments from "./pages/MedicalDocuments";
import Inventory from "./pages/Inventory";
import MasterList from "./pages/MasterList";
import MonthlyReport from "./pages/MonthlyReport";
import RegisterNurse from "./pages/RegisterNurse";
import { isAuthenticated } from "./services/auth";

function RequireAuth() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<RequireAuth />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<NurseDashboard />} />
          <Route path="add-visit" element={<AddNewVisit />} />
          <Route path="students" element={<StudentsList />} />
          <Route path="student-entry" element={<Students />} />
          <Route path="student-list" element={<StudentsList />} />
          <Route path="staff" element={<Staff />} />
          <Route path="staff-entry" element={<Staff />} />
          <Route path="bmi" element={<BmiCalculator />} />
          {/* legacy/alternate paths: redirect to current routes */}
          <Route path="bmi-calculator" element={<Navigate to="bmi" replace />} />
          <Route path="medical-docs" element={<MedicalDocuments />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="master-list" element={<MasterList />} />
          <Route path="register-nurse" element={<RegisterNurse />} />
          <Route path="monthly-report" element={<MonthlyReport />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
