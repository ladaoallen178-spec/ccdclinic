import { FormEvent, useMemo, useState } from 'react';
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
import {
  getStudents,
  getVisits,
  saveStudents as persistStudents,
  saveVisits as persistVisits,
} from '../utils/clinicData';
import type { StudentRecord, VisitRecord } from '../utils/clinicData';

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

  const updateStudents = (nextStudents: StudentRecord[]) => {
    setStudents(nextStudents);
    persistStudents(nextStudents);
  };

  const updateVisits = (nextVisits: VisitRecord[]) => {
    setVisits(nextVisits);
    persistVisits(nextVisits);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

    updateStudents([student, ...students]);
    event.currentTarget.reset();
    toast.success('Student added');
  };

  const confirmStudent = (student: StudentRecord) => {
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

    updateStudents(students.map((item) => (item.id === student.id ? { ...item, status: 'Cleared' } : item)));
    updateVisits([visit, ...visits]);
    toast.success('Student visit confirmed');
  };

  const rejectStudent = (id: string) => {
    updateStudents(students.filter((student) => student.id !== id));
    toast.success('Pending request removed');
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
            {historyStudent ? (
              <div className="student-history-panel">
                <div>
                  <strong>{historyStudent.name}</strong>
                  <button type="button" aria-label="Close history" onClick={() => setHistoryStudentId(null)}>
                    <X size={17} aria-hidden="true" />
                  </button>
                </div>
                <table className="student-table compact">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reason</th>
                      <th>Medicine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentVisits.filter((visit) => visit.idNumber === historyStudent.id).length ? (
                      studentVisits
                        .filter((visit) => visit.idNumber === historyStudent.id)
                        .map((visit) => (
                          <tr key={`${visit.createdAt}-${visit.idNumber}`}>
                            <td>{visit.createdAt ? formatDateTime(new Date(visit.createdAt)) : '-'}</td>
                            <td>{getVisitReason(visit) || '-'}</td>
                            <td>{visit.medicineGiven || '-'}</td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td className="empty-table-cell" colSpan={3}>
                          No history yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
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
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #05351b; }
      h1 { margin: 0 0 6px; font-size: 24px; }
      p { margin: 0 0 22px; color: #475467; }
      dl { display: grid; grid-template-columns: 160px 1fr; gap: 12px 18px; }
      dt { font-weight: 700; }
      dd { margin: 0; }
    </style>
  </head>
  <body>
    <h1>CCD Clinic Visit Receipt</h1>
    <p>${createdAt}</p>
    <dl>
      <dt>Student ID</dt><dd>${id}</dd>
      <dt>Student Name</dt><dd>${name}</dd>
      <dt>Year/Program</dt><dd>${yearProgram}</dd>
      <dt>Reason</dt><dd>${reason}</dd>
      <dt>Temperature</dt><dd>${temp}</dd>
      <dt>Blood Pressure</dt><dd>${bp}</dd>
      <dt>Medicine</dt><dd>${medicine}</dd>
      <dt>Referred</dt><dd>${visit.referredToHospital ? 'Yes' : 'No'}</dd>
    </dl>
  </body>
</html>`;
}

export default StudentEntry;
