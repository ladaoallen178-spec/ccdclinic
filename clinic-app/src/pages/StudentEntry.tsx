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
      setStudents(students.map((item) => (item.id === student.id ? savedStudent : item)));
      setVisits([savedVisit, ...visits]);
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
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #05351b; }
      .header { display:flex;align-items:center;gap:12px;border-bottom:1px solid #e6eef0;padding-bottom:12px;margin-bottom:18px }
      .logo { width:64px;height:64px;object-fit:contain }
      .title { flex:1;text-align:center;font-size:20px;font-weight:800 }
      .meta { font-size:13px;color:#475467 }
      .details { display:grid;grid-template-columns:150px 1fr;gap:10px 18px;margin-bottom:14px }
      dt{font-weight:700}
      dd{margin:0}
      .section { background:#fbfcfd;border:1px solid #eef2f5;padding:12px;border-radius:8px;margin-bottom:14px }
      .label{font-weight:700;color:#234f3a;margin-bottom:6px}
      textarea{width:100%;min-height:84px;padding:8px;border:1px solid #cbd5d9;border-radius:6px;font-size:14px}
      .presets{display:flex;gap:8px;margin-top:8px}
      .preset{background:#e6f4ef;border:1px solid #c6e7db;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:13px}
      .signature{display:flex;justify-content:space-between;align-items:center;margin-top:28px}
      .sig-line{flex:1;border-top:1px solid #999;margin-right:12px;height:36px}
      .sig-label{width:160px;text-align:center;color:#475467;font-size:13px}
      @media print{ body{margin:8mm} .presets{display:none} textarea{border:none} }
    </style>
  </head>
  <body>
    <div class="header">
      <img src="/images/logo.png" alt="CCD Logo" class="logo" />
      <div class="title">CCD Clinic Visit Receipt</div>
      <div class="meta">${createdAt}</div>
    </div>

    <dl class="details">
      <dt>Student ID</dt><dd>${id}</dd>
      <dt>Student Name</dt><dd>${name}</dd>
      <dt>Year/Program</dt><dd>${yearProgram}</dd>
      <dt>Reason</dt><dd>${reason}</dd>
      <dt>Temperature</dt><dd>${temp}</dd>
      <dt>Blood Pressure</dt><dd>${bp}</dd>
      <dt>Medicine</dt><dd>${medicine}</dd>
      <dt>Referred</dt><dd>${visit.referredToHospital ? 'Yes' : 'No'}</dd>
    </dl>

    <div class="section">
      <div class="label">Nurse comments / Advice (editable)</div>
      <textarea id="nurseComment" placeholder="Advice to go home, request to have a sleep, drink more water">Advice: </textarea>
      <div class="presets">
        <div class="preset" data-text="Advise to go home and rest">Advise: Go home & rest</div>
        <div class="preset" data-text="Request to have a sleep">Request: Have a sleep</div>
        <div class="preset" data-text="Drink more water and monitor">Drink more water</div>
      </div>
    </div>

    <div class="section">
      <div class="label">Actions taken</div>
      <div>${escapeHtml(visit.medicineGiven || '-')}</div>
    </div>

    <div class="signature">
      <div style="flex:1">
        <div class="sig-line"></div>
        <div class="sig-label">Nurse signature</div>
      </div>
      <div style="width:180px;text-align:center;color:#475467">Date: ${createdAt}</div>
    </div>

    <script>
      document.querySelectorAll('.preset').forEach(btn=>btn.addEventListener('click',()=>{
        const t = document.getElementById('nurseComment');
        if(!t) return; t.value = btn.getAttribute('data-text');
      }));
      // allow Enter to add a line then print
      function prepareAndPrint(){ window.focus(); window.print(); }
    </script>
  </body>
</html>`;
}

export default StudentEntry;
