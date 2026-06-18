import React, { useEffect, useState } from 'react';
import { Users, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import styles from '../styles/components/Tables.module.css';

interface StudentRecord {
  id: string;
  name: string;
  section?: string;
  concern?: string;
  status: string;
  age?: number;
  gender?: string;
  yearLevel?: string;
  program?: string;
  parentName?: string;
  parentPhone?: string;
  createdAt?: string;
}

export default function StudentsList() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<StudentRecord[]>('/students');
      setStudents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load students');
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Loader size={40} style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }} />
        <p>Loading students...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <AlertCircle size={40} color="red" style={{ display: 'inline-block', marginRight: '10px' }} />
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={fetchStudents} style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={28} color="#0a2e0a" />
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#0a2e0a' }}>
            Students Registry
          </h1>
        </div>
        <button
          onClick={fetchStudents}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#2ecc2e',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No students found</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>
                  ID
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>
                  Name
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>
                  Section
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>
                  Age
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>
                  Gender
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>
                  Status
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>
                  Parent Phone
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #ddd' }}>
                  Concern
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr
                  key={student.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9f9f9',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{student.id}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{student.name}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{student.section || '-'}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{student.age || '-'}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{student.gender || '-'}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: student.status === 'Cleared' ? '#d4edda' : '#fff3cd',
                        color: student.status === 'Cleared' ? '#155724' : '#856404',
                      }}
                    >
                      {student.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{student.parentPhone || '-'}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #eee', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {student.concern || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        Total Students: <strong>{students.length}</strong>
      </div>
    </div>
  );
}
