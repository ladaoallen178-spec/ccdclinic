import React from 'react';

const AboutSystem: React.FC = () => {
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 20px', color: '#0f172a' }}>
      <header style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1 style={{ fontSize: '2.75rem', marginBottom: 12, color: '#0f172a' }}>About the System</h1>
        <p style={{ maxWidth: 760, margin: '0 auto', fontSize: '1.05rem', color: '#475569', lineHeight: 1.9 }}>
          The CCD School Clinic Management System is a centralized web platform designed to help school clinic staff deliver efficient health support for students and employees. It organizes clinic visits, patient information, medical records, reports and inventory so nurses can make timely decisions and keep the school community healthy.
        </p>
      </header>

      <section style={{ marginBottom: 32, backgroundColor: '#f8fafc', borderRadius: 18, padding: '24px 28px', boxShadow: '0 18px 50px rgba(15, 23, 42, 0.05)' }}>
        <h2 style={{ marginBottom: 16, color: '#0f172a' }}>What the system does</h2>
        <p style={{ color: '#334155', lineHeight: 1.9, marginBottom: 20 }}>
          This system is built to support clinic operations across a school campus. It helps register and manage student and staff visits, capture medical concerns, store health records, and generate insights for better care coordination. The system also includes tools for managing clinic inventory, staff assignments, and health documentation.
        </p>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            'Patient intake and visit tracking',
            'Medical record and history management',
            'Health document generation and storage',
            'Staff and student health summaries',
            'Inventory alerts and stock monitoring',
            'Monthly reports for clinic performance',
          ].map((item) => (
            <div key={item} style={{ backgroundColor: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '18px 16px' }}>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 600 }}>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 16, color: '#0f172a' }}>System functions</h2>
        <ul style={{ lineHeight: 1.9, color: '#334155', paddingLeft: 20 }}>
          <li>Record student and staff clinic visits with date, concern, and treatment details.</li>
          <li>Store and search patient histories, year/program data, and visit outcomes.</li>
          <li>Generate medical documents, receipts, and reports for clinic administration.</li>
          <li>Manage nurse and staff roles, patient status updates, and clinic workflows.</li>
          <li>Export student lists, reports, and records for school review and audits.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div style={{ backgroundColor: '#f8fafc', borderRadius: 18, padding: '22px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: 12, color: '#0f172a' }}>Clinic Staff</h3>
          <p style={{ margin: '0 0 16px', color: '#475569', lineHeight: 1.8 }}>The system is supported by qualified healthcare staff from the school clinic.</p>
          <ul style={{ color: '#334155', lineHeight: 1.9, paddingLeft: 20 }}>
            <li>Janice Leonora B. Abellara, LPT, RN — Nurse ||</li>
            <li>Kim C. Paran, AEMT — EMT |</li>
          </ul>
        </div>

        <div style={{ backgroundColor: '#f8fafc', borderRadius: 18, padding: '22px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: 12, color: '#0f172a' }}>Developers</h3>
          <p style={{ margin: '0 0 16px', color: '#475569', lineHeight: 1.8 }}>The system was built by a dedicated development team for both frontend and backend operations.</p>
          <ul style={{ color: '#334155', lineHeight: 1.9, paddingLeft: 20 }}>
            <li>Christian Guiterez — Frontend</li>
            <li>Clarence Ladao — Backend</li>
          </ul>
        </div>
      </section>

      <footer style={{ textAlign: 'center', color: '#64748b', fontSize: '0.95rem', lineHeight: 1.8 }}>
        <p style={{ marginBottom: 8 }}>This system is designed to improve the speed, accuracy, and reliability of school clinic operations.</p>
        <p style={{ margin: 0 }}>It supports healthcare workers with the tools they need to manage student and staff wellness efficiently.</p>
      </footer>
    </div>
  );
};

export default AboutSystem;
