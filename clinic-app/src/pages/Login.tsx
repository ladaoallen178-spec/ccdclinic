import { FormEvent, useState } from 'react';
import { CalendarCheck, FileText, Lock, Mail, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login as loginUser } from '../services/auth';

function Login() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    setIsSubmitting(true);
    const result = await loginUser(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.message || 'Invalid email or password.');
      return;
    }

    toast.success('Logged in');
    navigate('/dashboard', { replace: true });
  };

  return (
    <main className="auth-page">
      <section className="login-card" aria-label="Clinic management staff login">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="school-mark">
            <img src="/favicon.svg" alt="College of Davao logo" />
            <h1>CCD</h1>
            <p>College of Davao</p>
            <span>Clinic Management System</span>
          </div>

          <label className="login-field">
            <span>
              <Mail size={16} />
              Email Address
            </span>
            <input type="email" name="email" required />
          </label>

          <label className="login-field">
            <span>
              <Lock size={16} />
              Password
            </span>
            <input type="password" name="password" required />
          </label>

          <button className="login-button" type="submit" disabled={isSubmitting}>
            <Lock size={16} />
            {isSubmitting ? 'Checking account...' : 'Login to Dashboard'}
          </button>
        </form>

        <aside className="login-welcome">
          <div>
            <h2>Welcome Staff!</h2>
            <p>Manage clinic visits, student records, and health reports efficiently.</p>
          </div>

          <div className="feature-row" aria-label="Clinic management features">
            <span>
              <PlusCircle size={24} />
              Add Records
            </span>
            <span>
              <CalendarCheck size={24} />
              Appointments
            </span>
            <span>
              <FileText size={24} />
              Reports
            </span>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default Login;
