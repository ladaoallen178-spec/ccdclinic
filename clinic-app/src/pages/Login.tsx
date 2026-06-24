import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, PlusCircle, CalendarCheck, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { login, isAuthenticated } from '../services/auth';
import styles from '../styles/pages/Login.module.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await login(email, password);
      if (response.success) {
        toast.success('Login successful!');
        navigate('/dashboard');
      } else {
        toast.error(response.message || 'Login failed');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.wrapper}>
        <div className={styles.bgAnimate}></div>
        <div className={styles.formBox}>
          <div className={styles.logoArea}>
            <div className={styles.logoIcon}>
              <img
                src="/images/logo.svg"
                alt="College of Davao Logo"
                className={styles.logoImage}
              />
            </div>
            <div className={styles.logoText}>CCD</div>
            <div className={styles.logoSub}>COLLEGE OF DAVAO</div>
            <div className={styles.logoYear}>CLINIC MANAGEMENT SYSTEM</div>
            <div className={styles.logoDivider}></div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.inputBox}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label>Email Address</label>
              <Mail size={18} className={styles.inputIcon} />
            </div>
            
            <div className={styles.inputBox}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label>Password</label>
              <Lock size={18} className={styles.inputIcon} />
            </div>
            
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'Logging in...' : '🔐 Login to Dashboard'}
            </button>
          </form>
        </div>

        <div className={styles.infoText}>
          <h2>Welcome Staff!</h2>
          <p>Manage clinic visits, student records, and health reports efficiently.</p>
          <div className={styles.infoIcons}>
            <div><PlusCircle size={28} color="#2ecc2e" /><p>Add Records</p></div>
            <div><CalendarCheck size={28} color="#2ecc2e" /><p>Appointments</p></div>
            <div><FileText size={28} color="#2ecc2e" /><p>Reports</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;