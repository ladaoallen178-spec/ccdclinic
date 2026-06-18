import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getNurses } from '../utils/clinicData';
import type { NurseRecord } from '../utils/clinicData';
import { loadNurses, registerNurseAccount } from '../services/clinicRecords';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'Nurse',
  contactNumber: '',
};

export default function RegisterNurse() {
  const [form, setForm] = useState(initialForm);
  const [nurses, setNurses] = useState<NurseRecord[]>([]);

  useEffect(() => {
    setNurses(getNurses());
    loadNurses()
      .then(setNurses)
      .catch(() => toast.error('Unable to load nurses from the database.'));
  }, []);

  const existingEmails = useMemo(() => nurses.map((n) => n.email.toLowerCase()), [nurses]);

  const handleChange = (key: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { name, email, password, role, contactNumber } = form;

    if (!name.trim() || !email.trim() || !password.trim() || !contactNumber.trim()) {
      toast.error('Please fill out all fields.');
      return;
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (existingEmails.includes(email.toLowerCase())) {
      toast.error('A nurse with that email already exists.');
      return;
    }

    try {
      const newNurse = await registerNurseAccount({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
        contactNumber: contactNumber.trim(),
      });
      setNurses([newNurse, ...nurses]);
      setForm(initialForm);
      toast.success('Nurse registered successfully.');
    } catch {
      toast.error('Nurse account was not registered in the database.');
    }
  };

  return (
    <div className="page-content">
      <article className="panel">
        <h1>Register Nurse</h1>
        <p>Create a new nurse account and save clinic access credentials.</p>
      </article>

      <article className="panel">
        <form className="entry-form" onSubmit={handleSubmit}>
          <label>
            Full Name
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter full name"
              required
            />
          </label>

          <label>
            Email Address
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="nurse@example.com"
              required
            />
          </label>

          <label>
            Contact Number
            <input
              type="tel"
              value={form.contactNumber}
              onChange={(e) => handleChange('contactNumber', e.target.value)}
              placeholder="09XXXXXXXXX"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Create login password"
              required
            />
          </label>

          <label>
            Role
            <select value={form.role} onChange={(e) => handleChange('role', e.target.value)}>
              <option value="Nurse">Nurse</option>
              <option value="Head Nurse">Head Nurse</option>
              <option value="Administrator">Administrator</option>
            </select>
          </label>

          <button type="submit">Register Nurse</button>
        </form>
      </article>

      <article className="panel">
        <h2>Registered Nurses</h2>
        {nurses.length ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Registered On</th>
              </tr>
            </thead>
            <tbody>
              {nurses.map((nurse) => (
                <tr key={nurse.id}>
                  <td>{nurse.name}</td>
                  <td>{nurse.email}</td>
                  <td>{nurse.contactNumber}</td>
                  <td>{nurse.role}</td>
                  <td>{new Date(nurse.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No registered nurses yet. Fill the form above to add the first nurse.</p>
        )}
      </article>
    </div>
  );
}
