import { GraduationCap, Briefcase, Calendar, AlertCircle, Clock, Users } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { icon: GraduationCap, label: 'Students', value: '15', sublabel: 'Total Students' },
    { icon: Briefcase, label: 'Staff', value: '6', sublabel: 'Total Staff' },
    { icon: Calendar, label: 'Today', value: '0', sublabel: 'Visits Today' },
    { icon: AlertCircle, label: 'Referred', value: '0', sublabel: 'Referred Today' },
    { icon: Clock, label: 'Pending', value: '4', sublabel: 'Student Pending' },
    { icon: Users, label: 'Staff Status', value: '1', sublabel: 'Staff Pending' },
  ];

  return (
    <div className="page-content dashboard-content">
      <section className="dashboard-page">
        {/* Logo Section */}
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center' }}>
          <img src="/images/logo.png" alt="CCD Clinic Logo" style={{ width: '60px', height: '60px', borderRadius: '8px' }} />
          <h1 style={{ marginLeft: '16px', fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>CCD Clinic</h1>
        </div>
        
        {/* Stats Grid */}
        <div className="stats-grid">
          {stats.map((stat, idx) => (
            <article key={idx} className="stat-card panel">
              <div className="stat-icon">
                <stat.icon size={36} />
              </div>
              <div className="stat-content">
                <h3 className="stat-label">{stat.label}</h3>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-sublabel">{stat.sublabel}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Quick Stats Overview */}
        <article className="quick-stats">
          <h2>Welcome to CCD School Clinic</h2>
          <p>Welcome to the CCD School Clinic Management System. Use the sidebar to navigate through different sections including student management, staff management, clinic visits, medical documents, and reports.</p>
        </article>
      </section>
    </div>
  )
}
