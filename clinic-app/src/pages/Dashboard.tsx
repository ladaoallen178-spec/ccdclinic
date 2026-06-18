import React from 'react'

export default function Dashboard() {
  return (
    <div className="page-content">
      {/* Header with Logo */}
      <header className="dashboard-header">
        <div className="logo-container">
          <img 
            src="/images/logo.png" 
            alt="CCD Clinic Logo" 
            className="clinic-logo"
          />
        </div>
        <div className="header-title">
          <h1>CCD Clinic Management System</h1>
        </div>
      </header>

      <section className="dashboard-page">
        <article className="panel">
          <h1>Dashboard</h1>
          <p>Welcome to the CCD clinic dashboard. Here you can review clinic activity at a glance.</p>
        </article>

        <article className="panel">
          <h2>Quick Links</h2>
          <ul>
            <li>View students, staff, inventory, and clinic reports.</li>
            <li>Assign visits and access nurse workflows.</li>
            <li>Monitor daily service metrics.</li>
          </ul>
        </article>
      </section>
    </div>
  )
}