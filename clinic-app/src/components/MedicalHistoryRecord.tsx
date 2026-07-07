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
    window.print();
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
