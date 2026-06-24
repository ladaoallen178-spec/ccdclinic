import {
  Calculator,
  ClipboardList,
  FileBarChart,
  FolderOpen,
  Home,
  LogOut,
  Package,
  PlusCircle,
  QrCode,
  UserPlus,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getClinicStats } from '../utils/clinicData';
import { loadInventory, loadStaff, loadStudents, loadVisits } from '../services/clinicRecords';

function Sidebar() {
  const navigate = useNavigate();
  const [clinicStats, setClinicStats] = useState(getClinicStats);

  useEffect(() => {
    const refreshStats = () => setClinicStats(getClinicStats());
    Promise.all([loadStudents(), loadStaff(), loadVisits(), loadInventory()])
      .then(refreshStats)
      .catch(() => undefined);
    window.addEventListener('clinic-data-changed', refreshStats);
    window.addEventListener('storage', refreshStats);
    return () => {
      window.removeEventListener('clinic-data-changed', refreshStats);
      window.removeEventListener('storage', refreshStats);
    };
  }, []);

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/add-visit', label: 'Add New Visit', icon: PlusCircle },
    { to: '/student-entry', label: 'Students', icon: Users, badge: String(clinicStats.studentPending) },
    { to: '/staff-entry', label: 'Staff', icon: Users, badge: String(clinicStats.staffPending) },
    { to: '/bmi-calculator', label: 'BMI Calculator', icon: Calculator },
    { to: '/medical-docs', label: 'Medical Docs', icon: FolderOpen },
    { to: '/medical-qr', label: 'Medical QR', icon: QrCode },
    { to: '/master-list', label: 'Master List', icon: ClipboardList },
    { to: '/inventory', label: 'Inventory', icon: Package, badge: clinicStats.lowStock ? String(clinicStats.lowStock) : undefined },
    { to: '/register-nurse', label: 'Register Nurse', icon: UserPlus },
    { to: '/monthly-report', label: 'Monthly Report', icon: FileBarChart },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/images/logo.png" alt="CCD Clinic logo" />
        <strong>CCD Clinic</strong>
        <span>Health Services</span>
      </div>
      <nav>
        {links.map(({ to, label, icon: Icon, badge }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <Icon size={18} />
            <span>{label}</span>
            {badge ? <em>{badge}</em> : null}
          </NavLink>
        ))}
      </nav>
      <button className="logout-link" type="button" onClick={handleLogout}>
        <LogOut size={19} />
        <span>Logout</span>
      </button>
    </aside>
  );
}

export default Sidebar;


