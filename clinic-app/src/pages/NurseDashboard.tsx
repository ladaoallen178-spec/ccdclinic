import {
  Briefcase,
  CalendarCheck,
  Clock,
  GraduationCap,
  Timer,
  Truck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getClinicStats } from '../utils/clinicData';

function NurseDashboard() {
  const [clinicStats, setClinicStats] = useState(getClinicStats);

  useEffect(() => {
    const refreshStats = () => setClinicStats(getClinicStats());
    window.addEventListener('clinic-data-changed', refreshStats);
    window.addEventListener('storage', refreshStats);
    return () => {
      window.removeEventListener('clinic-data-changed', refreshStats);
      window.removeEventListener('storage', refreshStats);
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
    <div className="dashboard-page">
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
