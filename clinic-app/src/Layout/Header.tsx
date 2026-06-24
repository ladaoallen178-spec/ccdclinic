import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import styles from '../styles/components/Header.module.css';

const Header: React.FC = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
      setDayOfWeek(dayName);
      setCurrentDate(now.toLocaleDateString('en-US', { 
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
        <div className={styles.logoWrap}>
          <img src="/images/logo.svg" alt="CCD Logo" className={styles.dashboardLogo} />
          <div className={styles.logoTextGroup}>
            <h2>CCD Clinic</h2>
            <span className={styles.logoSubtitle}>College of Davao</span>
          </div>
        </div>
      </div>
      
      <div className={styles.userInfo}>
        <div className={styles.datetimeContainer}>
          <div className={styles.currentDate}>{dayOfWeek}, {currentDate}</div>
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