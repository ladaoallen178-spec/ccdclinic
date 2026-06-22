import React, { useEffect, useState } from 'react';
import { Menu, User } from 'lucide-react';
import styles from '../styles/components/Header.module.css';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));
      
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.header}>
      <div className={styles.pageTitle}>
        <button className={styles.menuBtn} onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div className={styles.logoWrap}>
          <img src="/images/logo.png" alt="CCD Logo" className={styles.dashboardLogo} />
          <div className={styles.logoTextGroup}>
            <h2>CCD Clinic</h2>
            <span className={styles.logoSubtitle}>College of Davao</span>
          </div>
        </div>
      </div>
      
      <div className={styles.userInfo}>
        <div className={styles.datetimeContainer}>
          <div className={styles.currentDate}>{currentDate}</div>
          <div className={styles.currentTime}>{currentTime}</div>
        </div>
        <span className={styles.userName}>{user.fullname || 'User'}</span>
        <span className={styles.roleBadge}>{user.role || 'Nurse'}</span>
        <div className={styles.userAvatar}>
          <User size={24} />
        </div>
      </div>
    </div>
  );
};

export default Header;