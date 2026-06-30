import { useEffect, useMemo, useState, useRef } from 'react';
import { Download, FileText, RefreshCcw, Search, Printer, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import MedicalHistoryRecord from '../components/MedicalHistoryRecord';
import { getStudents, getVisits } from '../utils/clinicData';
import type { StudentRecord, VisitRecord } from '../utils/clinicData';
import { loadStudents, loadVisits, saveStudentRecord } from '../services/clinicRecords';

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const createCsv = (rows: string[][]) => rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

export default function MasterList() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>(getStudents);
  const [visits, setVisits] = useState<VisitRecord[]>(getVisits);
  const [yearFilter, setYearFilter] = useState('All Years');
  const [programFilter, setProgramFilter] = useState('All Programs');
  const [searchTerm, setSearchTerm] = useState('');
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadStudents(), loadVisits()])
      .then(([nextStudents, nextVisits]) => {
        setStudents(nextStudents);
        setVisits(nextVisits);
      })
      .catch(() => undefined);
  }, []);

  const availableYearLevels = useMemo(
    () => Array.from(new Set(students.map((student) => student.yearLevel || 'Unknown'))).sort(),
    [students],
  );

  const availablePrograms = useMemo(
    () => Array.from(new Set(students.map((student) => student.program || 'Unknown'))).sort(),
    [students],
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesYear = yearFilter === 'All Years' || student.yearLevel === yearFilter;
      const matchesProgram = programFilter === 'All Programs' || student.program === programFilter;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term || [student.id, student.name, student.yearLevel, student.program, student.parentName, student.parentPhone]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(term));

      return matchesYear && matchesProgram && matchesSearch;
    });
  }, [students, yearFilter, programFilter, searchTerm]);

  const totals = useMemo(() => {
    const summary = {
      total: students.length,
      yearCounts: {} as Record<string, number>,
      programCounts: {} as Record<string, number>,
    };

    students.forEach((student) => {
      const year = student.yearLevel || 'Unknown';
      const program = student.program || 'Unknown';
      summary.yearCounts[year] = (summary.yearCounts[year] || 0) + 1;
      summary.programCounts[program] = (summary.programCounts[program] || 0) + 1;
    });

    return summary;
  }, [students]);
  const historyStudent = students.find((student) => student.id === historyStudentId) ?? null;
  const studentVisits = useMemo(
    () => visits.filter((visit) => (visit.patientType || visit.category || '').toLowerCase() === 'student'),
    [visits],
  );

  const handleReset = () => {
    setYearFilter('All Years');
    setProgramFilter('All Programs');
    setSearchTerm('');
  };

  const exportCsv = () => {
    const headers = ['Student ID', 'Full Name', 'Year Level', 'Program', 'Age', 'Gender', 'Parent Name', 'Parent Phone', 'Date Registered'];
    const rows = filteredStudents.map((student) => [
      student.id,
      student.name,
      student.yearLevel || '-',
      student.program || '-',
      student.age || '-',
      student.gender || '-',
      student.parentName || '-',
      student.parentPhone || '-',
      formatDate(student.createdAt),
    ]);
    const csvContent = createCsv([headers, ...rows]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'master-list.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  function normalizeHeader(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function readImportCell(row: Record<string, unknown>, aliases: string[]) {
    const normalizedAliases = aliases.map(normalizeHeader);
    const entry = Object.entries(row).find(([key]) => normalizedAliases.includes(normalizeHeader(key)));
    return entry?.[1];
  }

  function toText(value: unknown) {
    return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  }

  function toDateInputValue(value: unknown) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }
    const text = toText(value);
    if (!text) return '';
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
  }

  function genId(prefix = 'S') {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  const STUDENT_IMPORT_FIELDS: Record<string, string[]> = {
    id: ['student id', 'id', 'student number', 'student no', 'sid'],
    name: ['name', 'full name', 'student name'],
    yearLevel: ['year level', 'grade level', 'grade', 'year'],
    program: ['program', 'course', 'strand'],
    age: ['age'],
    gender: ['gender', 'sex'],
    parentName: ['parent name', 'guardian name', 'mother name', 'father name'],
    parentPhone: ['parent phone', 'guardian phone', 'parent contact', 'contact number', 'phone'],
    createdAt: ['date registered', 'created at', 'createdat', 'date', 'registered'],
    section: ['section'],
  };

  function mapSpreadsheetRowToStudent(row: Record<string, unknown>): StudentRecord | null {
    const name = toText(readImportCell(row, STUDENT_IMPORT_FIELDS.name) || '');
    if (!name) return null;
    const idVal = toText(readImportCell(row, STUDENT_IMPORT_FIELDS.id) || '');
    const id = idVal || genId('S');
    return {
      id,
      name,
      section: toText(readImportCell(row, STUDENT_IMPORT_FIELDS.section) || ''),
      concern: '',
      status: 'Pending',
      age: toText(readImportCell(row, STUDENT_IMPORT_FIELDS.age) || ''),
      gender: toText(readImportCell(row, STUDENT_IMPORT_FIELDS.gender) || ''),
      yearLevel: toText(readImportCell(row, STUDENT_IMPORT_FIELDS.yearLevel) || ''),
      program: toText(readImportCell(row, STUDENT_IMPORT_FIELDS.program) || ''),
      parentName: toText(readImportCell(row, STUDENT_IMPORT_FIELDS.parentName) || ''),
      parentPhone: toText(readImportCell(row, STUDENT_IMPORT_FIELDS.parentPhone) || ''),
      createdAt: toDateInputValue(readImportCell(row, STUDENT_IMPORT_FIELDS.createdAt) || new Date().toISOString()),
    };
  }

  async function handleStudentFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;

      if (!firstSheet) {
        toast.error('The selected file does not contain a worksheet.');
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '', raw: false });
      const imported = rows.map(mapSpreadsheetRowToStudent).filter((r): r is StudentRecord => Boolean(r));
      if (imported.length === 0) {
        toast.error('No student rows found. Include a Name or Full Name column.');
        return;
      }

      const savedStudents: StudentRecord[] = [];
      const failedStudents: string[] = [];
      for (const s of imported) {
        try {
          const saved = await saveStudentRecord(s);
          savedStudents.push(saved as StudentRecord);
        } catch (err) {
          failedStudents.push(s.name || s.id || 'Unknown');
          console.error('Failed to save student', err);
        }
      }

      if (savedStudents.length > 0) {
        setStudents((current) => [...savedStudents, ...current]);
        toast.success(`${savedStudents.length} student${savedStudents.length === 1 ? '' : 's'} uploaded to the system.`);
      }
      if (failedStudents.length > 0) {
        toast.error(`${failedStudents.length} student${failedStudents.length === 1 ? '' : 's'} could not be saved to the database.`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Unable to read the Excel file.');
    } finally {
      if (event.target) event.target.value = '';
    }
  }

  const printTable = () => {
    const header = `<h1 style="font-family: Arial, sans-serif;">CCD Students Master List</h1><p style="font-family: Arial, sans-serif;">${formatDate(new Date().toISOString())}</p>`;
    const tableRows = filteredStudents
      .map(
        (student) => `
          <tr>
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.yearLevel || '-'}</td>
            <td>${student.program || '-'}</td>
            <td>${student.age || '-'}</td>
            <td>${student.gender || '-'}</td>
            <td>${student.parentName || '-'}</td>
            <td>${student.parentPhone || '-'}</td>
            <td>${formatDate(student.createdAt)}</td>
          </tr>`,
      )
      .join('');
    const content = `
      <html>
        <head>
          <title>Master List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 8px; text-align: left; }
            th { background: #1d6332; color: #fff; }
          </style>
        </head>
        <body>${header}<table><thead><tr><th>Student ID</th><th>Full Name</th><th>Year Level</th><th>Program</th><th>Age</th><th>Gender</th><th>Parent Name</th><th>Parent Phone</th><th>Date Registered</th></tr></thead><tbody>${tableRows}</tbody></table></body>
      </html>
    `;
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) return;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (historyStudent) {
    return <MedicalHistoryRecord type="Student" record={historyStudent} visits={studentVisits} onBack={() => setHistoryStudentId(null)} />;
  }

  return (
    <div className="page-content">
      <article className="panel">
        <h1>Students Master List</h1>
        <p>View student counts, filter by year and program, and export the roster.</p>
      </article>

      <article className="panel master-list-banner">
        <div>
          <strong>CCD Students Master List</strong>
          <span>College of Davao - Student Directory</span>
        </div>
      </article>

      <article className="panel master-list-summary">
        <div className="summary-card">
          <strong>{totals.total}</strong>
          <span>Total Students</span>
        </div>
        {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((year) => (
          <div key={year} className="summary-card">
            <strong>{totals.yearCounts[year] || 0}</strong>
            <span>{year}</span>
          </div>
        ))}
      </article>

      <article className="panel master-list-summary">
        {['ECE', 'ENTREP', 'HVACRT', 'CP'].map((program) => (
          <div key={program} className="summary-card">
            <strong>{totals.programCounts[program] || 0}</strong>
            <span>{program}</span>
          </div>
        ))}
      </article>

      <article className="panel master-list-controls">
        <div className="control-group">
          <label>
            Year Level
            <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
              <option>All Years</option>
              {availableYearLevels.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          <label>
            Program
            <select value={programFilter} onChange={(event) => setProgramFilter(event.target.value)}>
              <option>All Programs</option>
              {availablePrograms.map((program) => (
                <option key={program} value={program}>{program}</option>
              ))}
            </select>
          </label>

          <label className="search-field">
            <Search size={16} />
            <input
              type="search"
              value={searchTerm}
              placeholder="Search by ID, Name, or Program..."
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>

        <div className="action-buttons">
          <button type="button" onClick={handleReset}>
            <RefreshCcw size={16} /> Reset
          </button>
          <button type="button" onClick={printTable}>
            <Printer size={16} /> Print
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Upload Excel
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleStudentFileUpload} style={{ display: 'none' }} />
          <button type="button" onClick={exportCsv}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </article>

      <article className="panel">
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>Year Level</th>
              <th>Program</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Parent Name</th>
              <th>Parent Phone</th>
              <th>Date Registered</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length ? (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>{student.id}</td>
                  <td>{student.name}</td>
                  <td>{student.yearLevel || '-'}</td>
                  <td>{student.program || '-'}</td>
                  <td>{student.age || '-'}</td>
                  <td>{student.gender || '-'}</td>
                  <td>{student.parentName || '-'}</td>
                  <td>{student.parentPhone || '-'}</td>
                  <td>{formatDate(student.createdAt)}</td>
                  <td>
                    <button type="button" className="history-button" onClick={() => setHistoryStudentId(student.id)}>
                      <FileText size={15} aria-hidden="true" />
                      View History
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '24px 0' }}>
                  No students found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </div>
  );
}
