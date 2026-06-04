import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/add-visit': 'Add New Visit',
  '/student-entry': 'Students',
  '/staff-entry': 'Staff',
  '/bmi-calculator': 'BMI Calculator',
  '/medical-docs': 'Medical Docs',
  '/medical-qr': 'Medical QR',
  '/master-list': 'Master List',
  '/inventory': 'Inventory',
  '/register-nurse': 'Register Nurse',
  '/monthly-report': 'Monthly Report',
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function Header() {
  const location = useLocation();
  const [now, setNow] = useState(() => new Date());
  const title = useMemo(() => titles[location.pathname] ?? 'Dashboard', [location.pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="topbar-status">
        <div className="date-card">
          <strong>{formatDate(now)}</strong>
          <span>{formatTime(now)}</span>
        </div>
        <div className="admin-card">
          <strong>Master Admin</strong>
          <span>admin</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
