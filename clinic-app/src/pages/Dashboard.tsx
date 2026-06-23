import React from 'react'
import { GraduationCap, Briefcase, Calendar, Truck, Clock, Clock3 } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { icon: GraduationCap, label: 'Students', value: '15', sublabel: 'Total Students', color: 'bg-green-50' },
    { icon: Briefcase, label: 'Staff', value: '6', sublabel: 'Total Staff', color: 'bg-blue-50' },
    { icon: Calendar, label: 'Today', value: '0', sublabel: 'Visits Today', color: 'bg-purple-50' },
    { icon: Truck, label: 'Referred', value: '0', sublabel: 'Referred Today', color: 'bg-red-50' },
    { icon: Clock, label: 'Pending', value: '4', sublabel: 'Student Pending', color: 'bg-orange-50' },
  ];

  const staffPending = { icon: Clock3, label: 'Pending', value: '1', sublabel: 'Staff Pending', color: 'bg-pink-50' };

  return (
    <div className="page-content dashboard-content">
      <section className="dashboard-page">
        {/* Stats Grid */}
        <div className="stats-grid">
          {stats.map((stat, idx) => (
            <article key={idx} className={`stat-card panel ${stat.color}`}>
              <div className="stat-icon">
                <stat.icon size={32} />
              </div>
              <div className="stat-content">
                <h3 className="stat-label">{stat.label}</h3>
                <p className="stat-value">{stat.value}</p>
                <p className="stat-sublabel">{stat.sublabel}</p>
              </div>
            </article>
          ))}
          
          {/* Staff Pending Card */}
          <article className={`stat-card panel ${staffPending.color}`}>
            <div className="stat-icon">
              <staffPending.icon size={32} />
            </div>
            <div className="stat-content">
              <h3 className="stat-label">{staffPending.label}</h3>
              <p className="stat-value">{staffPending.value}</p>
              <p className="stat-sublabel">{staffPending.sublabel}</p>
            </div>
          </article>
        </div>

        {/* Quick Stats Overview */}
        <article className="panel quick-stats">
          <h2>Quick Stats Overview</h2>
          <p>Welcome to the CCD School Clinic Management System. Use the sidebar to navigate through different sections including student management, staff management, clinic visits, medical documents, and reports.</p>
        </article>
      </section>
    </div>
  )
}