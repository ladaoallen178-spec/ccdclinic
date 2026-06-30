import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  Hourglass,
  Layers,
  Plus,
  Printer,
  Search,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import MedicalHistoryRecord from '../components/MedicalHistoryRecord';
import {
  getStudents,
  getVisits,
} from '../utils/clinicData';
import type { StudentRecord, VisitRecord } from '../utils/clinicData';
import { createVisitRecord, deleteStudentRecord, loadStudents, loadVisits, saveStudentRecord } from '../services/clinicRecords';

type StudentTab = 'pending' | 'today' | 'recent' | 'manage';

const tabs: { id: StudentTab; label: string; icon: typeof Hourglass }[] = [
  { id: 'pending', label: 'Pending', icon: Hourglass },
  { id: 'today', label: "Today's Visits", icon: ClipboardList },
  { id: 'recent', label: 'Recent Visits', icon: BarChart3 },
  { id: 'manage', label: 'Manage Students', icon: Layers },
];

function StudentEntry() {
  const [activeTab, setActiveTab] = useState<StudentTab>('pending');
  const [students, setStudents] = useState<StudentRecord[]>(getStudents);
  const [visits, setVisits] = useState<VisitRecord[]>(getVisits);
  const [searchTerm, setSearchTerm] = useState('');
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([loadStudents(), loadVisits()])
      .then(([nextStudents, nextVisits]) => {
        if (!isMounted) return;
        setStudents(nextStudents);
        setVisits(nextVisits);
      })
      .catch(() => toast.error('Unable to load student records from the database.'));

    return () => {
      isMounted = false;
    };
  }, []);

  const pendingStudents = useMemo(() => students.filter((student) => student.status === 'Pending'), [students]);
  const studentVisits = useMemo(() => visits.filter((visit) => getVisitPatientType(visit) === 'Student'), [visits]);
  const todaysVisits = useMemo(() => studentVisits.filter((visit) => isToday(visit.createdAt)), [studentVisits]);
  const recentVisits = useMemo(() => studentVisits.filter((visit) => isWithinLastDays(visit.createdAt, 7)), [studentVisits]);
  const visibleStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return students;
    }

    return students.filter((student) =>
      [student.id, student.name, getYearProgram(student), student.parentPhone ?? ''].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }, [searchTerm, students]);
  const historyStudent = students.find((student) => student.id === historyStudentId) ?? null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const id = String(form.get('id')).trim();
    const yearLevel = String(form.get('yearLevel')).trim();
    const program = String(form.get('program')).trim();

    if (students.some((student) => student.id.toLowerCase() === id.toLowerCase())) {
      toast.error('Student ID already exists');
      return;
    }

    const student: StudentRecord = {
      id,
      name: String(form.get('name')).trim(),
      age: String(form.get('age')).trim(),
      gender: String(form.get('gender')).trim(),
      yearLevel,
      program,
      section: [yearLevel, program].filter(Boolean).join('/'),
      parentName: String(form.get('parentName')).trim(),
      parentPhone: String(form.get('parentPhone')).trim(),
      concern: '',
      status: 'Cleared',
    };

    try {
      const saved = await saveStudentRecord(student);
      setStudents([saved, ...students]);
      target.reset();
      toast.success('Student added');
    } catch {
      toast.error('Student was not saved to the database.');
    }
  };

  const confirmStudent = async (student: StudentRecord) => {
    const visit: VisitRecord = {
      patientType: 'Student',
      idNumber: student.id,
      patientName: student.name,
      yearProgram: getYearProgram(student),
      temperature: '',
      bloodPressure: '',
      referredToHospital: false,
      reasonForVisit: student.concern || 'Clinic visit',
      medicineGiven: '',
      status: 'Completed',
      createdAt: new Date().toISOString(),
    };

    try {
        const savedStudent = await saveStudentRecord({ ...student, status: 'Cleared' });
      const savedVisit = await createVisitRecord(visit);
      setStudents((current) => current.map((item) => (item.id === student.id ? savedStudent : item)));
      setVisits((current) => [savedVisit, ...current]);
      setActiveTab('today');
      toast.success('Student visit confirmed');
    } catch {
      toast.error('Student visit was not saved to the database.');
    }
  };

  const rejectStudent = async (id: string) => {
    try {
      await deleteStudentRecord(id);
      setStudents(students.filter((student) => student.id !== id));
      toast.success('Pending request removed');
    } catch {
      toast.error('Student record was not removed from the database.');
    }
  };

  const printReceipt = (visit: VisitRecord) => {
    const student = findStudentByVisit(visit, students);
    const receipt = buildReceiptHtml(visit, student);
    const receiptWindow = window.open('', '_blank', 'width=720,height=720');

    if (!receiptWindow) {
      toast.error('Allow popups to print the receipt');
      return;
    }

    receiptWindow.document.write(receipt);
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
    toast.success('Receipt ready');
  };

  const renderVisitRow = (visit: VisitRecord, includeDate: boolean) => {
    const student = findStudentByVisit(visit, students);
    const createdAt = visit.createdAt ? new Date(visit.createdAt) : null;

    return (
      <tr key={`${visit.createdAt ?? 'visit'}-${visit.idNumber}-${getVisitReason(visit)}`}>
        {includeDate ? <td>{createdAt ? formatDateTime(createdAt) : '-'}</td> : <td>{createdAt ? formatTime(createdAt) : '-'}</td>}
        <td>{visit.idNumber || student?.id || '-'}</td>
        <td>{visit.patientName || student?.name || visit.name || 'Unknown Student'}</td>
        {!includeDate ? <td>{visit.yearProgram || (student ? getYearProgram(student) : '-')}</td> : null}
        <td>{getVisitReason(visit) || '-'}</td>
        <td>{visit.temperature ? `${visit.temperature}C` : '-'}</td>
        <td>{visit.bloodPressure || '-'}</td>
        {!includeDate ? <td>{visit.medicineGiven || '-'}</td> : null}
        {!includeDate ? <td>{visit.referredToHospital ? 'Yes' : 'No'}</td> : null}
        {includeDate ? <td>{visit.medicineGiven || '-'}</td> : null}
        <td>
          <button type="button" className="receipt-button" onClick={() => printReceipt(visit)}>
            <Printer size={15} aria-hidden="true" />
            Print
          </button>
        </td>
      </tr>
    );
  };

  if (historyStudent) {
    return <MedicalHistoryRecord type="Student" record={historyStudent} visits={studentVisits} onBack={() => setHistoryStudentId(null)} />;
  }

  return (
    <section className="student-management-page">
      <nav className="student-tabs" aria-label="Student management views">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={activeTab === id ? 'student-tab active' : 'student-tab'} onClick={() => setActiveTab(id)}>
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
            {id === 'pending' ? <em>{pendingStudents.length}</em> : null}
          </button>
        ))}
      </nav>

      {activeTab === 'pending' ? (
        <article className="panel student-tab-panel">
          <h2>
            <Hourglass size={22} aria-hidden="true" />
            Pending Student Requests
          </h2>
          <div className="pending-list">
            {pendingStudents.length ? (
              pendingStudents.map((student) => (
                <div className="pending-request" key={student.id}>
                  <span className="student-avatar">{getInitials(student.name)}</span>
                  <div>
                    <strong>
                      {student.name}
                      <small>{student.id}</small>
                    </strong>
                    <p>
                      {student.concern || 'Clinic request'} <span>{getYearProgram(student)}</span>
                    </p>
                    <time>{formatDate(new Date())}</time>
                  </div>
                  <div className="pending-actions">
                    <button type="button" className="confirm-button" onClick={() => confirmStudent(student)}>
                      <Check size={17} aria-hidden="true" />
                      Confirm
                    </button>
                    <button type="button" className="reject-button" aria-label={`Remove ${student.name}`} onClick={() => rejectStudent(student.id)}>
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No pending student requests</p>
            )}
          </div>
        </article>
      ) : null}

      {activeTab === 'today' ? (
        <article className="panel student-tab-panel">
          <h2>
            <CalendarDays size={22} aria-hidden="true" />
            Today's Student Clinic Visits
          </h2>
          <table className="student-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Year/Program</th>
                <th>Reason</th>
                <th>Temp</th>
                <th>BP</th>
                <th>Medicine</th>
                <th>Referred</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {todaysVisits.length ? (
                todaysVisits.map((visit) => renderVisitRow(visit, false))
              ) : (
                <tr>
                  <td className="empty-table-cell" colSpan={10}>
                    No student visits today
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </article>
      ) : null}

      {activeTab === 'recent' ? (
        <article className="panel student-tab-panel">
          <h2>
            <BarChart3 size={22} aria-hidden="true" />
            Recent Student Visits (Last 7 Days)
          </h2>
          <table className="student-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Reason</th>
                <th>Temp</th>
                <th>BP</th>
                <th>Medicine</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {recentVisits.length ? (
                recentVisits.map((visit) => renderVisitRow(visit, true))
              ) : (
                <tr>
                  <td className="empty-table-cell" colSpan={8}>
                    No student visits in the last 7 days
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </article>
      ) : null}

      {activeTab === 'manage' ? (
        <section className="student-manage-grid">
          <form className="panel student-form" onSubmit={handleSubmit}>
            <h2>
              <Plus size={24} aria-hidden="true" />
              Add New Student
            </h2>
            <label>
              Student ID:
              <input name="id" required />
            </label>
            <label>
              Full Name:
              <input name="name" required />
            </label>
            <div className="student-form-grid">
              <label>
                Age:
                <input name="age" inputMode="numeric" />
              </label>
              <label>
                Gender:
                <select name="gender" defaultValue="">
                  <option value="" disabled>
                    Select Gender
                  </option>
                  <option>Female</option>
                  <option>Male</option>
                </select>
              </label>
              <label>
                Year Level:
                <select name="yearLevel" required defaultValue="">
                  <option value="" disabled>
                    Select Year Level
                  </option>
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                  <option>Grade 7</option>
                  <option>Grade 8</option>
                  <option>Grade 9</option>
                  <option>Grade 10</option>
                  <option>Grade 11</option>
                  <option>Grade 12</option>
                </select>
              </label>
              <label>
                Program:
                <select name="program" required defaultValue="">
                  <option value="" disabled>
                    Select Program
                  </option>
                  <option>CP</option>
                  <option>STEM</option>
                  <option>HUMSS</option>
                  <option>ENTREP</option>
                  <option>Computer Programming</option>
                  <option>A</option>
                  <option>B</option>
                </select>
              </label>
            </div>
            <label>
              Parent Name:
              <input name="parentName" />
            </label>
            <label>
              Parent Phone:
              <input name="parentPhone" inputMode="tel" />
            </label>
            <button type="submit" className="save-student-button">
              <Check size={17} aria-hidden="true" />
              Save Student
            </button>
          </form>

          <article className="panel student-directory">
            <h2>
              <Users size={24} aria-hidden="true" />
              Student Directory
            </h2>
            <label className="search-field">
              <Search size={17} aria-hidden="true" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by ID or Name..." />
            </label>
            <table className="student-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Year/Program</th>
                  <th>Parent Phone</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => (
                  <tr key={student.id}>
                    <td>{student.id}</td>
                    <td>{student.name}</td>
                    <td>{getYearProgram(student)}</td>
                    <td>{student.parentPhone || '-'}</td>
                    <td>
                      <button type="button" className="history-button" onClick={() => setHistoryStudentId(student.id)}>
                        <FileText size={15} aria-hidden="true" />
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>
      ) : null}
    </section>
  );
}

function getVisitPatientType(visit: VisitRecord) {
  return visit.patientType || visit.category || '';
}

function getVisitReason(visit: VisitRecord) {
  return visit.reasonForVisit || visit.concern || '';
}

function getYearProgram(student: StudentRecord) {
  return student.section || [student.yearLevel, student.program].filter(Boolean).join('/');
}

function findStudentByVisit(visit: VisitRecord, students: StudentRecord[]) {
  return students.find((student) => student.id === visit.idNumber);
}

function isToday(value?: string) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isWithinLastDays(value: string | undefined, days: number) {
  if (!value) {
    return false;
  }

  const date = new Date(value).getTime();
  const now = Date.now();
  const range = days * 24 * 60 * 60 * 1000;
  return date <= now && now - date <= range;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildReceiptHtml(visit: VisitRecord, student?: StudentRecord) {
  const createdAt = visit.createdAt ? formatDateTime(new Date(visit.createdAt)) : '-';
  const name = escapeHtml(visit.patientName || student?.name || visit.name || 'Unknown Student');
  const id = escapeHtml(visit.idNumber || student?.id || '-');
  const yearProgram = escapeHtml(visit.yearProgram || (student ? getYearProgram(student) : '-'));
  const reason = escapeHtml(getVisitReason(visit) || '-');
  const medicine = escapeHtml(visit.medicineGiven || '-');
  const temp = escapeHtml(visit.temperature ? `${visit.temperature}C` : '-');
  const bp = escapeHtml(visit.bloodPressure || '-');

  return `<!doctype html>
<html>
  <head>
    <title>Clinic Visit Receipt</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      body { font-family: 'Inter', system-ui, sans-serif; margin: 0; color: #0f2d17; background: #f4faf5; }
      .page { max-width: 840px; margin: 0 auto; padding: 24px; }
      .header { display: flex; align-items: center; gap: 18px; background: #114c24; color: #ffffff; padding: 20px 22px; border-radius: 18px; }
      .logo { width: 56px; height: 56px; object-fit: contain; border-radius: 14px; background: rgba(255,255,255,0.12); padding: 6px; }
      .heading { display: flex; flex-direction: column; gap: 4px; }
      .title { margin: 0; font-size: 1.25rem; font-weight: 800; }
      .subtitle { margin: 0; font-size: 0.95rem; color: rgba(255,255,255,0.82); }
      .date { margin-left: auto; font-size: 0.95rem; color: rgba(255,255,255,0.78); }
      .details-card { margin-top: 20px; background: #ffffff; border-radius: 18px; padding: 24px; box-shadow: 0 14px 32px rgba(8, 38, 17, 0.08); }
      .details-grid { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 16px 24px; }
      .detail-item { display: grid; gap: 4px; }
      .detail-label { font-size: 0.82rem; color: #4f6d5b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
      .detail-value { margin: 0; font-size: 1rem; color: #0f2d17; font-weight: 700; }
      .section-footer { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .footer-card { background: #f5f9f4; border: 1px solid #dce9dc; border-radius: 16px; padding: 18px; }
      .footer-label { margin: 0 0 8px; font-size: 0.88rem; color: #234f3a; font-weight: 700; }
      .footer-value { margin: 0; font-size: 0.95rem; color: #4b6152; line-height: 1.6; min-height: 70px; }
      .signature-row { display: flex; justify-content: space-between; gap: 20px; margin-top: 26px; }
      .signature-block { flex: 1; min-width: 180px; }
      .sig-line { height: 1px; background: #cbd5e1; margin: 26px 0 8px; }
      .sig-label { margin: 0; font-size: 0.82rem; color: #61766a; text-align: center; }
      @media print { body { padding: 0; margin: 0; } .page { padding: 12mm; } }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <img src="/images/logo.png" alt="CCD Logo" class="logo" />
        <div class="heading">
          <p class="title">CCD Clinic</p>
          <p class="subtitle">Student Visit Receipt</p>
        </div>
        <div class="date">${createdAt}</div>
      </div>

      <div class="details-card">
        <div class="details-grid">
          <div class="detail-item"><span class="detail-label">Student ID</span><span class="detail-value">${id}</span></div>
          <div class="detail-item"><span class="detail-label">Name</span><span class="detail-value">${name}</span></div>
          <div class="detail-item"><span class="detail-label">Year / Program</span><span class="detail-value">${yearProgram}</span></div>
          <div class="detail-item"><span class="detail-label">Reason</span><span class="detail-value">${reason}</span></div>
          <div class="detail-item"><span class="detail-label">Temperature</span><span class="detail-value">${temp}</span></div>
          <div class="detail-item"><span class="detail-label">Blood Pressure</span><span class="detail-value">${bp}</span></div>
          <div class="detail-item"><span class="detail-label">Medicine</span><span class="detail-value">${medicine}</span></div>
          <div class="detail-item"><span class="detail-label">Referred</span><span class="detail-value">${visit.referredToHospital ? 'Yes' : 'No'}</span></div>
        </div>

        <div class="section-footer">
          <div class="footer-card">
            <p class="footer-label">Nurse Notes</p>
            <p class="footer-value">Advice: ________________________________</p>
          </div>
          <div class="footer-card">
            <p class="footer-label">Actions Taken</p>
            <p class="footer-value">${medicine === '-' ? '-' : medicine}</p>
          </div>
        </div>

        <div class="signature-row">
          <div class="signature-block">
            <div class="sig-line"></div>
            <p class="sig-label">Nurse signature</p>
          </div>
          <div class="signature-block">
            <div class="sig-line"></div>
            <p class="sig-label">Date: ${createdAt}</p>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export default StudentEntry;
