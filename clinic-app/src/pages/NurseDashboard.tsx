import {
  Briefcase,
  CalendarCheck,
  Clock,
  GraduationCap,
  Timer,
  Truck,
} from 'lucide-react';
import { useEffect, useState, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClinicStats } from '../utils/clinicData';
import { loadInventory, loadStaff, loadStudents, loadVisits } from '../services/clinicRecords';
import background from '../assets/background.png';
import logoImg from '../assets/logo.png';

function NurseDashboard() {
  const navigate = useNavigate();
  const [clinicStats, setClinicStats] = useState(getClinicStats);

  useEffect(() => {
    const refreshStats = () => setClinicStats(getClinicStats());
    Promise.all([loadStudents(), loadStaff(), loadVisits(), loadInventory()])
      .then(refreshStats)
      .catch(() => undefined);
    window.addEventListener('clinic-data-changed', refreshStats);
    window.addEventListener('storage', refreshStats);
    // Add a global body class and CSS variable so sibling components (sidebar)
    // can adapt their styles when the dashboard is active.
    document.body.classList.add('dashboard-active');
    document.body.style.setProperty('--dashboard-bg', `url(${background})`);

    return () => {
      window.removeEventListener('clinic-data-changed', refreshStats);
      window.removeEventListener('storage', refreshStats);
      document.body.classList.remove('dashboard-active');
      document.body.style.removeProperty('--dashboard-bg');
    };
  }, []);

  const stats = [
    { label: 'Total Students', value: clinicStats.students, tag: 'Students', icon: GraduationCap, tone: 'green' },
    { label: 'Total Staff', value: clinicStats.staff, tag: 'Staff', icon: Briefcase, tone: 'blue' },
    { label: 'Visits Today', value: clinicStats.visitsToday, tag: 'Today', icon: CalendarCheck, tone: 'violet' },
    { label: 'Referred Today', value: clinicStats.referredToday, tag: 'Referred', icon: Truck, tone: 'red' },
    { label: 'Student Pending', value: clinicStats.studentPending, tag: 'Pending', icon: Clock, tone: 'amber' },
    { label: 'Staff Pending', value: clinicStats.staffPending, tag: 'Pending', icon: Timer, tone: 'pink' },
  ];

  return (
    <div className="dashboard-page dashboard-shell nurse-dashboard-shell" style={{ '--dashboard-bg': `url(${background})` } as CSSProperties}>
      <header className="dashboard-header-large">
        <div className="logo-container">
          <img src={logoImg} className="clinic-logo" alt="CCD Logo" />
        </div>

        <div className="header-title">
          <h1>Dashboard</h1>
          <div className="header-subtitle">Welcome back — overview of clinic activity</div>
        </div>

        <div className="header-right">
          <div className="date-card">
            <div style={{fontSize: '0.85rem'}}>Monday, June 22, 2026</div>
            <div style={{fontSize: '1.6rem', color: '#ffc517', fontWeight: 900}}>1:38 PM</div>
          </div>
          <div style={{marginLeft: 18, textAlign: 'right'}}>
            <div style={{fontWeight: 800}}>Master Admin</div>
            <div className="role-badge">admin</div>
          </div>
        </div>
      </header>
      <div className="dashboard-floaters">
        <span className="float-bubble bubble-a"></span>
        <span className="float-bubble bubble-b"></span>
        <span className="float-bubble bubble-c"></span>
      </div>

      <section className="stats-grid">
      {stats.map((stat) => (
        <article className="stat-card" key={stat.label}>
          <div className={`stat-icon ${stat.tone}`}>
            <stat.icon size={22} />
          </div>
          <span className={`stat-tag ${stat.tone}`}>{stat.tag}</span>
          <strong>{stat.value}</strong>
          <p>{stat.label}</p>
        </article>
      ))}
      </section>

      <article className="panel quick-panel">
        <h2>Clipboard Quick Stats Overview</h2>
        <p>
          Welcome to the CCD School Clinic Management System. Use the sidebar to navigate through different sections including student
          management, staff management, clinic visits, medical documents, and reports.
        </p>
      </article>
    </div>
  );
}

export default NurseDashboard;
