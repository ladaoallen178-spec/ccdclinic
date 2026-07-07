import { ArrowLeft, ClipboardList, Printer } from 'lucide-react';
import type { StaffRecord, StudentRecord, VisitRecord } from '../utils/clinicData';

type MedicalHistoryRecordProps = {
  type: 'Student' | 'Staff';
  record: StudentRecord | StaffRecord;
  visits: VisitRecord[];
  onBack: () => void;
};

export default function MedicalHistoryRecord({ type, record, visits, onBack }: MedicalHistoryRecordProps) {
  const matchingVisits = visits
    .filter((visit) => visit.idNumber === record.id)
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

  const handlePrint = () => {
    const receiptWindow = window.open('', 'receipt1', 'width=900,height=900');

    if (!receiptWindow) {
      return;
    }

    receiptWindow.document.open();
    receiptWindow.document.write(buildHistoryReceiptHtml(type, record, matchingVisits));
    receiptWindow.document.close();
    receiptWindow.focus();
  };

  return (
    <section className="history-record-page">
      <header className="history-record-banner">
        <div className="history-record-brand">
          <img src="/images/logo.png" alt="School Logo" />
          <div>
            <strong>SCHOOL CLINIC</strong>
            <span>Health Service Department</span>
            <span className="history-record-tagline">"Your Health, Our Priority"</span>
          </div>
        </div>
        <button type="button" className="history-back-button" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" />
          Back
        </button>
      </header>

      <article className="history-document-heading">
        <strong>{type.toUpperCase()} MEDICAL HISTORY RECORD</strong>
        <span>Official Clinic Medical Record</span>
      </article>

      <article className="history-profile-card">
        <div className="history-card-header">
          <strong>PERSONAL INFORMATION</strong>
        </div>
        <div className="history-profile-grid">
          <Detail label={`${type} ID`} value={record.id} />
          <Detail label="Name" value={record.name} />
          <Detail label="Age" value={record.age} />
          <Detail label="Gender" value={record.gender} />
          {type === 'Student' ? (
            <>
              <Detail label="Year/Program" value={getStudentYearProgram(record as StudentRecord)} />
              <Detail label="Parent/Guardian" value={(record as StudentRecord).parentName} />
              <Detail label="Parent Phone" value={(record as StudentRecord).parentPhone} />
            </>
          ) : (
            <>
              <Detail label="Staff Type" value={(record as StaffRecord).staffType} />
              <Detail label="Department" value={(record as StaffRecord).department} />
              <Detail label="Position" value={(record as StaffRecord).position} />
              <Detail label="Contact" value={(record as StaffRecord).contactNumber} />
            </>
          )}
          <Detail label="Current Concern" value={record.concern} />
          <Detail label="Status" value={record.status} />
        </div>
      </article>

      <div className="history-action-row">
        <button type="button" className="history-dashboard-button" onClick={onBack}>
            <ArrowLeft size={17} aria-hidden="true" />
            Back
        </button>
        <button type="button" className="history-print-button" onClick={handlePrint}>
          <Printer size={17} aria-hidden="true" />
          Print Record
        </button>
      </div>

      <article className="history-table-card">
        <div className="history-card-header history-card-header--small">
          <strong>MEDICAL HISTORY</strong>
        </div>
        <table className="history-record-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Reason</th>
              <th>Temperature</th>
              <th>Blood Pressure</th>
              <th>Medicine</th>
              <th>Referred</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {matchingVisits.length ? (
              matchingVisits.map((visit) => (
                <tr key={`${visit.createdAt ?? 'visit'}-${visit.idNumber}-${visit.reasonForVisit ?? visit.concern ?? ''}`}>
                  <td>{formatDateTime(visit.createdAt)}</td>
                  <td>{visit.reasonForVisit || visit.concern || '-'}</td>
                  <td>{visit.temperature ? `${visit.temperature}C` : '-'}</td>
                  <td>{visit.bloodPressure || '-'}</td>
                  <td>{visit.medicineGiven || '-'}</td>
                  <td>{visit.referredToHospital ? 'Yes' : 'No'}</td>
                  <td>{visit.status || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-table-cell" colSpan={7}>
                  No visit history recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>

      <footer className="history-print-footer">
        <div className="print-meta">
          <span>Date Printed:</span>
          <strong>{formatDateTime(new Date().toISOString())}</strong>
        </div>
        <div className="print-signature">
          <div className="signature-line" />
          <span>Authorized Clinic Personnel</span>
        </div>
      </footer>
    </section>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="history-detail">
      <span>
        <strong>{label}:</strong> {value || '-'}
      </span>
    </div>
  );
}

function getStudentYearProgram(record: StudentRecord) {
  return record.section || [record.yearLevel, record.program].filter(Boolean).join('/');
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function buildHistoryReceiptHtml(type: 'Student' | 'Staff', record: StudentRecord | StaffRecord, visits: VisitRecord[]) {
  const headerTitle = type === 'Student' ? 'STUDENT MEDICAL HISTORY RECORD' : 'STAFF MEDICAL HISTORY RECORD';
  const subtitle = 'Official Clinic Medical Record';
  const idLabel = type === 'Student' ? 'Student ID' : 'Staff ID';
  const idValue = escapeHtml(record.id);
  const nameValue = escapeHtml(record.name);
  const ageValue = escapeHtml(record.age.toString());
  const genderValue = escapeHtml(record.gender);
  const extraFields =
    type === 'Student'
      ? [
          ['Year/Program', escapeHtml(getStudentYearProgram(record as StudentRecord))],
          ['Parent/Guardian', escapeHtml((record as StudentRecord).parentName || '-')],
          ['Parent Phone', escapeHtml((record as StudentRecord).parentPhone || '-')],
        ]
      : [
          ['Staff Type', escapeHtml((record as StaffRecord).staffType || '-')],
          ['Department', escapeHtml((record as StaffRecord).department || '-')],
          ['Position', escapeHtml((record as StaffRecord).position || '-')],
          ['Contact', escapeHtml((record as StaffRecord).contactNumber || '-')],
        ];
  const currentConcern = escapeHtml(record.concern || '-');
  const status = escapeHtml(record.status || '-');
  const rows = visits
    .slice(0, 20)
    .map((visit) => {
      const dateTime = escapeHtml(formatDateTime(visit.createdAt));
      const reason = escapeHtml(visit.reasonForVisit || visit.concern || '-');
      const temperature = escapeHtml(visit.temperature ? `${visit.temperature}°C` : '-');
      const bloodPressure = escapeHtml(visit.bloodPressure || '-');
      const medicine = escapeHtml(visit.medicineGiven || '-');
      const referred = escapeHtml(visit.referredToHospital ? 'Yes' : 'No');
      const visitStatus = escapeHtml(visit.status || '-');
      return `
        <tr>
          <td>${dateTime}</td>
          <td>${reason}</td>
          <td>${temperature}</td>
          <td>${bloodPressure}</td>
          <td>${medicine}</td>
          <td>${referred}</td>
          <td>${visitStatus}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${headerTitle}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial, Helvetica, sans-serif}
body{background:#f4f6f8;padding:30px}
.container{width:850px;margin:auto;background:#fff;border:1px solid #ccc;border-radius:8px;padding:35px}
.header{display:flex;justify-content:center;align-items:center;gap:18px}
.header img{width:80px;height:80px;object-fit:contain}
.header-text h1{color:#14532d;font-size:30px}
.header-text h3{color:#555;font-size:17px;font-weight:normal}
.header-text p{color:#777;font-style:italic;font-size:14px}
hr{border:none;border-top:2px dashed #666;margin:25px 0}
.title{text-align:center;font-size:28px;color:#14532d;font-weight:bold}
.subtitle{text-align:center;color:#666;margin-top:5px;margin-bottom:30px;font-style:italic}
.section-title{background:#14532d;color:white;padding:10px 15px;border-radius:4px;margin-bottom:15px;font-weight:bold}
.info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px 40px;margin-bottom:30px}
.info-grid div{padding:5px 0}
table{width:100%;border-collapse:collapse;margin-bottom:40px}
th{background:#14532d;color:white;padding:12px;font-size:15px}
td{border:1px solid #ddd;padding:10px;text-align:center;font-size:14px}
.bottom-section{display:flex;justify-content:space-between;align-items:flex-end;margin-top:50px}
.date-printed{font-size:14px;color:#444}
.signature{width:300px;text-align:center}
.signature-line{border-top:1.5px solid #000;margin-bottom:8px}
.signature p{font-weight:bold}
.signature small{color:#666;font-size:12px}
.footer{text-align:center;color:#777;font-size:13px;margin-top:25px}
@media print{body{background:white;padding:0}.container{width:100%;border:none;box-shadow:none}}
.button-row{display:flex;gap:12px;margin-top:18px;justify-content:center}
.button{background:#14532d;color:#fff;border:none;padding:10px 18px;border-radius:8px;cursor:pointer}
</style>
</head>
<body>
<div class="container">
<div class="header">
<img src="/images/logo.png" alt="School Logo" />
<div class="header-text">
<h1>SCHOOL CLINIC</h1>
<h3>Health Service Department</h3>
<p>"Your Health, Our Priority"</p>
</div>
</div>
<hr />
<div class="title">${headerTitle}</div>
<div class="subtitle">${subtitle}</div>
<div class="section-title">PERSONAL INFORMATION</div>
<div class="info-grid">
<div><strong>${idLabel}:</strong> ${idValue}</div>
<div><strong>Name:</strong> ${nameValue}</div>
<div><strong>Age:</strong> ${ageValue}</div>
<div><strong>Gender:</strong> ${genderValue}</div>
${extraFields.map(([label, value]) => `<div><strong>${label}:</strong> ${value}</div>`).join('')}
<div><strong>Current Concern:</strong> ${currentConcern}</div>
<div><strong>Current Status:</strong> ${status}</div>
</div>
<div class="section-title">MEDICAL HISTORY</div>
<table>
<tr><th>Date & Time</th><th>Reason</th><th>Temperature</th><th>Blood Pressure</th><th>Medicine</th><th>Referred</th><th>Status</th></tr>
${rows || '<tr><td colspan="7" style="padding:16px;text-align:center;color:#666">No history available</td></tr>'}
</table>
<div class="bottom-section">
<div class="date-printed"><strong>Date Printed:</strong><br />${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
<div class="signature"><div class="signature-line"></div><p><strong>Authorized Clinic Personnel</strong></p><small>Signature over Printed Name</small></div>
</div>
<hr />
<div class="footer"><strong>This is a computer-generated ${type} Medical History Record.</strong><br /><br />School Clinic Management System</div>
</div>
<div class="button-row">
<button class="button" onclick="prepareAndPrint()">PRINT RECEIPT</button>
<button class="button" onclick="window.close()">BACK TO DASHBOARD</button>
</div>
<script>
function prepareAndPrint(){window.focus();window.print();}
</script>
</body>
</html>`;
}
