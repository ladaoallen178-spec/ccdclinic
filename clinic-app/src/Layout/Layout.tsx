import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hasToken = !!localStorage.getItem('token');
    if (!hasToken) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div className="app-main">
        <Header />
        <main style={{ padding: '20px', paddingBottom: '80px' }}>
          <Outlet />
        </main>
        <footer
          style={{
            marginTop: 'auto',
            padding: '16px 20px 24px',
            textAlign: 'center',
            color: '#5f6f64',
            fontSize: '0.9rem',
            borderTop: '1px solid #e5ece6',
            backgroundColor: '#f8fbf8',
          }}
        >
          Developed by Christian Guiterez and Clarence Ladao
        </footer>
      </div>
    </div>
  );
};

export default Layout;
