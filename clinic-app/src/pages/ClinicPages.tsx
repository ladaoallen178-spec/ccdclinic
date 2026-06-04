import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, BookOpen, Calculator, ClipboardList, Download, FileText, FolderOpen, Ruler, Save, Search, Trash2, Upload, Weight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  getBmiRecords,
  getInventory,
  getMedicalDocuments,
  getStudents,
  getVisits,
  saveBmiRecords,
  saveInventory,
  saveMedicalDocuments,
  saveVisits,
} from '../utils/clinicData';
import type { BmiRecord, MedicalDocumentRecord, StudentRecord, VisitRecord } from '../utils/clinicData';

export function AddNewVisit() {
  const [visits, setVisits] = useState<VisitRecord[]>(getVisits);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const referredToHospital = form.get('referredToHospital') === 'on';
    const visit = {
      patientType: String(form.get('patientType')),
      idNumber: String(form.get('idNumber')),
      temperature: String(form.get('temperature')),
      bloodPressure: String(form.get('bloodPressure')),
      referredToHospital,
      reasonForVisit: String(form.get('reasonForVisit')),
      medicineGiven: String(form.get('medicineGiven')),
      status: referredToHospital ? 'Referred' : 'Pending',
      createdAt: new Date().toISOString(),
    };
    const nextVisits = [visit, ...visits];
    setVisits(nextVisits);
    saveVisits(nextVisits);
    event.currentTarget.reset();
    toast.success('Visit record saved');
  };

  return (
    <form className="panel visit-form" onSubmit={handleSubmit}>
      <h2>
        <ClipboardList size={24} aria-hidden="true" />
        Log New Clinic Visit
      </h2>

      <div className="visit-form-grid">
        <label>
          Patient Type:
          <select name="patientType" required defaultValue="Student">
            <option>Student</option>
            <option>Staff</option>
          </select>
        </label>

        <label>
          Temperature (&deg;C):
          <input name="temperature" inputMode="decimal" placeholder="e.g., 36.5" />
        </label>

        <label>
          ID / Number:
          <input name="idNumber" placeholder="Enter Student ID (e.g., S001) or Staff ID (e.g., T001)" required />
        </label>

        <label>
          Blood Pressure:
          <input name="bloodPressure" placeholder="e.g., 120/80" />
        </label>
      </div>

      <label className="checkbox-field">
        <input name="referredToHospital" type="checkbox" />
        <span>Referred to Hospital</span>
      </label>

      <label>
        Reason for Visit:
        <textarea name="reasonForVisit" rows={4} placeholder="Describe symptoms, complaint, or reason" required />
      </label>

      <label>
        Medicine Given:
        <textarea name="medicineGiven" rows={3} placeholder="List medicines given (if any)" />
      </label>

      <button type="submit" className="save-visit-button">
        <Save size={18} aria-hidden="true" />
        Save Visit Record
      </button>
    </form>
  );
}

export function BmiCalculator() {
  const navigate = useNavigate();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [bmiRecords, setBmiRecords] = useState<BmiRecord[]>(getBmiRecords);
  const students = useMemo(() => getStudents(), []);
  const bmi = useMemo(() => {
    const h = normalizeHeight(height);
    const w = Number(weight);
    return h > 0 && w > 0 ? w / (h * h) : 0;
  }, [height, weight]);

  const category = bmi ? getBmiCategory(bmi) : 'Enter height and weight';

  const applyPreset = (nextHeight: string, nextWeight: string) => {
    setHeight(nextHeight);
    setWeight(nextWeight);
  };

  const searchStudent = () => {
    const term = studentId.trim().toLowerCase();
    const student = students.find((item) => item.id.toLowerCase() === term || item.name.toLowerCase().includes(term));

    if (!student) {
      setSelectedStudent(null);
      toast.error('Student not found');
      return;
    }

    setSelectedStudent(student);
    toast.success('Student found');
  };

  const saveBmiRecord = () => {
    if (!selectedStudent) {
      toast.error('Search and select a student first');
      return;
    }

    if (!bmi) {
      toast.error('Enter height and weight first');
      return;
    }

    const record: BmiRecord = {
      id: `BMI-${Date.now()}`,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      height: normalizeHeight(height) * 100,
      weight: Number(weight),
      bmi: Number(bmi.toFixed(2)),
      status: category,
      createdAt: new Date().toISOString(),
    };
    const nextRecords = [record, ...bmiRecords];
    setBmiRecords(nextRecords);
    saveBmiRecords(nextRecords);
    toast.success('BMI recorded');
  };

  const recentRecords = [...bmiRecords]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 6);

  return (
    <section className="bmi-page">
      <header className="panel bmi-page-header">
        <h2>
          <Calculator size={24} aria-hidden="true" />
          BMI Calculator | CCD School Clinic
        </h2>
        <button type="button" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={17} aria-hidden="true" />
          Back to Dashboard
        </button>
      </header>

      <section className="bmi-main-grid">
        <article className="panel bmi-calculator-card">
          <h2>
            <BarChart3 size={24} aria-hidden="true" />
            Quick BMI Calculator
          </h2>
          <p>Enter height and weight to calculate BMI instantly.</p>
          <small>You can enter height in centimeters or meters. Examples: 165 or 1.65.</small>

          <label>
            <span>
              <Ruler size={17} aria-hidden="true" />
              Height
            </span>
            <input value={height} onChange={(event) => setHeight(event.target.value)} inputMode="decimal" placeholder="e.g., 165 (cm) or 1.65 (m)" />
          </label>
          <label>
            <span>
              <Weight size={17} aria-hidden="true" />
              Weight (kg)
            </span>
            <input value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" placeholder="e.g., 58.5" />
          </label>

          <div className="bmi-presets" aria-label="BMI presets">
            <button type="button" onClick={() => applyPreset('150', '45')}>
              150cm / 45kg
            </button>
            <button type="button" onClick={() => applyPreset('160', '55')}>
              160cm / 55kg
            </button>
            <button type="button" onClick={() => applyPreset('165', '60')}>
              165cm / 60kg
            </button>
            <button type="button" onClick={() => applyPreset('1.70', '68')}>
              1.70m / 68kg
            </button>
            <button type="button" onClick={() => applyPreset('1.75', '75')}>
              1.75m / 75kg
            </button>
            <button type="button" onClick={() => applyPreset('1.80', '85')}>
              1.80m / 85kg
            </button>
          </div>

          <button type="button" className="calculate-bmi-button" onClick={() => toast.success(bmi ? `BMI: ${bmi.toFixed(2)} (${category})` : 'Enter height and weight first')}>
            <Calculator size={19} aria-hidden="true" />
            Calculate BMI
          </button>

          {bmi ? (
            <div className="bmi-result-box">
              <span>BMI Result</span>
              <strong>{bmi.toFixed(2)}</strong>
              <em className={`bmi-status ${category.toLowerCase()}`}>{category}</em>
            </div>
          ) : null}
        </article>

        <article className="panel bmi-student-card">
          <h2>
            <ClipboardList size={24} aria-hidden="true" />
            Find & Record Student
          </h2>
          <div className="bmi-search-row">
            <input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="Enter Student ID (e.g., S001)" />
            <button type="button" onClick={searchStudent}>
              <Search size={17} aria-hidden="true" />
              Search
            </button>
          </div>

          {selectedStudent ? (
            <div className="bmi-student-result">
              <strong>{selectedStudent.name}</strong>
              <span>{selectedStudent.id}</span>
              <p>{selectedStudent.section || [selectedStudent.yearLevel, selectedStudent.program].filter(Boolean).join('/')}</p>
              <button type="button" onClick={saveBmiRecord}>
                <Save size={17} aria-hidden="true" />
                Record BMI in Student File
              </button>
            </div>
          ) : (
            <p className="bmi-empty-search">
              <Search size={17} aria-hidden="true" />
              Enter Student ID above to record BMI in their file
            </p>
          )}
        </article>
      </section>

      <article className="panel bmi-info-card">
        <h2>
          <BookOpen size={24} aria-hidden="true" />
          How BMI is Calculated
        </h2>
        <div className="bmi-formula-box">
          <p>
            <strong>BMI Formula:</strong> Weight (kg) divided by height in meters squared
          </p>
          <p>
            <strong>Example 1:</strong> 68 kg / (1.75 m x 1.75 m) = 22.2 (Normal weight)
          </p>
          <p>
            <strong>Example 2:</strong> 55 kg / (1.65 m x 1.65 m) = 20.2 (Normal weight)
          </p>
          <p>
            <strong>Tip:</strong> You can enter height in centimeters or meters. The system converts automatically.
          </p>
        </div>
      </article>

      <article className="panel bmi-records-card">
        <h2>
          <ClipboardList size={24} aria-hidden="true" />
          Recent BMI Records
        </h2>
        <p>Showing the most recent BMI measurements</p>
        <table className="bmi-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Student ID</th>
              <th>Height</th>
              <th>Weight</th>
              <th>BMI</th>
              <th>Status</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {recentRecords.map((record) => (
              <tr key={record.id}>
                <td>
                  <strong>{record.studentName}</strong>
                </td>
                <td>{record.studentId}</td>
                <td>{record.height.toFixed(2)} cm</td>
                <td>{record.weight.toFixed(2)} kg</td>
                <td>
                  <strong>{record.bmi.toFixed(2)}</strong>
                </td>
                <td>
                  <span className={`bmi-status ${record.status.toLowerCase()}`}>{record.status}</span>
                </td>
                <td>{formatBmiDate(record.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="panel bmi-records-card">
        <h2>
          <BookOpen size={24} aria-hidden="true" />
          BMI Reference Guide
        </h2>
        <table className="bmi-table reference">
          <thead>
            <tr>
              <th>Classification</th>
              <th>BMI Range (kg/m2)</th>
              <th>Health Risk</th>
            </tr>
          </thead>
          <tbody>
            <tr className="underweight-row">
              <td>Underweight</td>
              <td>Below 18.5</td>
              <td>Increased risk of nutritional deficiencies</td>
            </tr>
            <tr className="normal-row">
              <td>Normal</td>
              <td>18.5 - 24.9</td>
              <td>Low risk - Healthy weight</td>
            </tr>
            <tr className="overweight-row">
              <td>Overweight</td>
              <td>25.0 - 29.9</td>
              <td>Increased risk of health issues</td>
            </tr>
            <tr className="obese-row">
              <td>Obese</td>
              <td>30.0 and above</td>
              <td>High risk - Medical evaluation recommended</td>
            </tr>
          </tbody>
        </table>
        <small>Note: BMI is a screening tool. For accurate health assessment, consult with healthcare provider.</small>
      </article>
    </section>
  );
}

function normalizeHeight(value: string) {
  const heightValue = Number(value);

  if (!heightValue) {
    return 0;
  }

  return heightValue > 3 ? heightValue / 100 : heightValue;
}

function getBmiCategory(value: number) {
  if (value < 18.5) {
    return 'Underweight';
  }

  if (value < 25) {
    return 'Normal';
  }

  if (value < 30) {
    return 'Overweight';
  }

  return 'Obese';
}

function formatBmiDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function MedicalDocs() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<MedicalDocumentRecord[]>(getMedicalDocuments);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('1st Year');
  const [programFilter, setProgramFilter] = useState('ENTREP');
  const filteredDocuments = documents.filter((document) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      [document.studentId, document.studentName, document.documentType, document.fileName].some((value) =>
        value.toLowerCase().includes(term),
      );

    return matchesSearch && document.yearLevel === yearFilter && document.program === programFilter;
  });

  const saveDocuments = (nextDocuments: MedicalDocumentRecord[]) => {
    setDocuments(nextDocuments);
    saveMedicalDocuments(nextDocuments);
  };

  const handleUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('file') as File | null;

    if (!file || !file.name) {
      toast.error('Choose a file to upload');
      return;
    }

    const document: MedicalDocumentRecord = {
      id: `DOC-${Date.now()}`,
      studentId: String(form.get('studentId')).trim(),
      studentName: String(form.get('studentName')).trim(),
      yearLevel: String(form.get('yearLevel')),
      program: String(form.get('program')),
      documentType: String(form.get('documentType')),
      documentDate: String(form.get('documentDate')),
      fileName: file.name,
      remarks: String(form.get('remarks')).trim(),
      createdAt: new Date().toISOString(),
    };

    saveDocuments([document, ...documents]);
    setYearFilter(document.yearLevel);
    setProgramFilter(document.program);
    event.currentTarget.reset();
    toast.success('Medical document saved');
  };

  const removeDocument = (id: string) => {
    saveDocuments(documents.filter((document) => document.id !== id));
    toast.success('Document removed');
  };

  const downloadSummary = (document: MedicalDocumentRecord) => {
    const content = [
      'CCD School Clinic - Medical Document Record',
      `Student ID: ${document.studentId}`,
      `Student Name: ${document.studentName}`,
      `Year/Program: ${document.yearLevel} - ${document.program}`,
      `Document Type: ${document.documentType}`,
      `Document Date: ${formatBmiDate(document.documentDate)}`,
      `File Name: ${document.fileName}`,
      `Remarks: ${document.remarks || '-'}`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.studentId}-${document.documentType}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="medical-docs-page">
      <header className="panel medical-docs-header">
        <div>
          <h2>
            <FolderOpen size={25} aria-hidden="true" />
            Medical Documents Management
          </h2>
          <span>CCD School Clinic - Health Records Archive</span>
        </div>
        <button type="button" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={17} aria-hidden="true" />
          Back to Dashboard
        </button>
      </header>

      <section className="medical-docs-grid">
        <form className="panel medical-upload-form" onSubmit={handleUpload}>
          <h2>
            <Upload size={24} aria-hidden="true" />
            Upload Medical Document
          </h2>
          <p>Fill in student details and upload document. It will be automatically organized.</p>

          <div className="medical-form-grid">
            <label>
              Student ID / Number *
              <input name="studentId" placeholder="e.g., S001" required />
            </label>
            <label>
              Student Full Name *
              <input name="studentName" placeholder="e.g., Juan Dela Cruz" required />
            </label>
            <label>
              Year Level *
              <select name="yearLevel" required defaultValue="">
                <option value="" disabled>
                  Select
                </option>
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
              </select>
            </label>
            <label>
              Program *
              <select name="program" required defaultValue="">
                <option value="" disabled>
                  Select
                </option>
                <option>ENTREP</option>
                <option>ECE</option>
                <option>CP</option>
              </select>
            </label>
            <label>
              Document Type *
              <select name="documentType" required defaultValue="">
                <option value="" disabled>
                  Select
                </option>
                <option>Medical Certificate</option>
                <option>Laboratory Result</option>
                <option>Referral Form</option>
                <option>Prescription</option>
                <option>Vaccination Record</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Document Date *
              <input name="documentDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </label>
          </div>

          <label>
            Upload File *
            <input name="file" type="file" required />
            <small>JPG, PNG, GIF, PDF, DOC, TXT, HEIC (Max 10MB)</small>
          </label>
          <label>
            Remarks (Optional)
            <textarea name="remarks" rows={3} placeholder="Additional notes" />
          </label>

          <button type="submit" className="medical-save-button">
            <Save size={17} aria-hidden="true" />
            Save Document
          </button>
        </form>

        <article className="panel medical-library">
          <h2>
            <FolderOpen size={24} aria-hidden="true" />
            Medical Documents Library
          </h2>
          <div className="medical-search-row">
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by student name or ID..." />
            <button type="button" onClick={() => toast.success('Search updated')}>
              <Search size={16} aria-hidden="true" />
              Search
            </button>
          </div>

          <div className="medical-filter-row" aria-label="Year level filters">
            {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((year) => (
              <button key={year} type="button" className={yearFilter === year ? 'active' : ''} onClick={() => setYearFilter(year)}>
                {year}
              </button>
            ))}
          </div>
          <div className="medical-filter-row program" aria-label="Program filters">
            {['ENTREP', 'ECE', 'CP'].map((program) => (
              <button key={program} type="button" className={programFilter === program ? 'active' : ''} onClick={() => setProgramFilter(program)}>
                {program}
              </button>
            ))}
          </div>

          <div className="medical-document-list">
            {filteredDocuments.length ? (
              filteredDocuments.map((document) => (
                <div className="medical-document-item" key={document.id}>
                  <FileText size={24} aria-hidden="true" />
                  <div>
                    <strong>{document.studentName}</strong>
                    <span>
                      {document.studentId} | {document.documentType} | {formatBmiDate(document.documentDate)}
                    </span>
                    <small>{document.fileName}</small>
                    {document.remarks ? <p>{document.remarks}</p> : null}
                  </div>
                  <div className="medical-document-actions">
                    <button type="button" onClick={() => downloadSummary(document)}>
                      <Download size={16} aria-hidden="true" />
                      Download
                    </button>
                    <button type="button" className="danger" onClick={() => removeDocument(document.id)}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="medical-empty-state">
                <FolderOpen size={22} aria-hidden="true" />
                <p>No students found for {yearFilter} - {programFilter}</p>
                <span>Upload documents using the form on the left.</span>
              </div>
            )}
          </div>
        </article>
      </section>
    </section>
  );
}

export function MedicalQR() {
  const [patientId, setPatientId] = useState('CCD-CLINIC-0001');
  const qrValue = `https://ccd-clinic.local/medical/${patientId}`;

  return (
    <section className="two-column-page">
      <form className="panel tool-form">
        <h2>Medical QR</h2>
        <label>
          Patient or Record ID
          <input value={patientId} onChange={(event) => setPatientId(event.target.value)} />
        </label>
        <button type="button" onClick={() => toast.success('QR ready for printing')}>
          Generate QR
        </button>
      </form>
      <article className="panel qr-panel">
        <QRCodeSVG value={qrValue} size={180} bgColor="#ffffff" fgColor="#0e4527" />
        <p>{qrValue}</p>
      </article>
    </section>
  );
}

export function MasterList() {
  return (
    <article className="panel">
      <h2>Master List</h2>
      <DataTable
        headers={['Name', 'Role', 'Section/Department']}
        rows={[
          ['Juan Dela Cruz', 'Student', 'Grade 10 - A'],
          ['Maria Santos', 'Staff', 'Registrar'],
          ['Ana Reyes', 'Student', 'Grade 11 - STEM'],
        ]}
      />
    </article>
  );
}

export function Inventory() {
  const [items, setItems] = useState(getInventory);

  const updateStock = (name: string, amount: number) => {
    setItems((currentItems) => {
      const nextItems = currentItems.map((item) => {
        if (item.name !== name) {
          return item;
        }

        const stock = Math.max(0, item.stock + amount);
        return { ...item, stock, status: stock <= 3 ? 'Low Stock' : 'Available' };
      });

      saveInventory(nextItems);
      return nextItems;
    });
  };

  return (
    <article className="panel">
      <h2>Inventory</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Stock</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.name}>
              <td>{item.name}</td>
              <td>{item.stock}</td>
              <td>
                <span className={item.status === 'Low Stock' ? 'status pending' : 'status cleared'}>{item.status}</span>
              </td>
              <td>
                <div className="button-row">
                  <button type="button" className="table-action" onClick={() => updateStock(item.name, 1)}>
                    Add
                  </button>
                  <button type="button" className="table-action" onClick={() => updateStock(item.name, -1)}>
                    Use
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export function RegisterNurse() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.success('Nurse registered');
    event.currentTarget.reset();
  };

  return (
    <form className="panel tool-form" onSubmit={handleSubmit}>
      <h2>Register Nurse</h2>
      <label>
        Full Name
        <input name="name" required />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" required />
      </label>
      <button type="submit">Register</button>
    </form>
  );
}

export function MonthlyReport() {
  return (
    <article className="panel">
      <h2>Monthly Report</h2>
      <DataTable
        headers={['Metric', 'Count']}
        rows={[
          ['Total Visits', '24'],
          ['Student Pending', '4'],
          ['Staff Pending', '1'],
          ['Referred Cases', '0'],
        ]}
      />
      <button type="button" onClick={() => toast.success('Report downloaded')}>
        Download Report
      </button>
    </article>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.join('-')}>
            {row.map((cell) => (
              <td key={cell}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
