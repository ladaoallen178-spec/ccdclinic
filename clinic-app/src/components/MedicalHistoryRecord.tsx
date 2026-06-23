import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CreditCard,
  Phone,
  Printer,
  School,
  User,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { StaffRecord, StudentRecord, VisitRecord } from '../utils/clinicData';

type HistoryPatient =
  | {
      type: 'Student';
      record: StudentRecord;
    }
  | {
      type: 'Staff';
      record: StaffRecord;
    };

type MedicalHistoryRecordProps = HistoryPatient & {
  visits: VisitRecord[];
  onBack: () => void;
};

export default function MedicalHistoryRecord({ type, record, visits, onBack }: MedicalHistoryRecordProps) {
  const patientVisits = getPatientVisits(type, record.id, record.name, visits);
  const referredCount = patientVisits.filter((visit) => visit.referredToHospital).length;

  const printHistory = () => {
    const historyWindow = window.open('', '_blank', 'width=980,height=760');

    if (!historyWindow) {
      toast.error('Allow popups to print the medical history');
      return;
    }

    historyWindow.document.write(buildHistoryPrintHtml(type, record, patientVisits));
    historyWindow.document.close();
    historyWindow.focus();
    setTimeout(() => historyWindow.print(), 250);
    toast.success('Medical history ready to print');
  };

  return (
    <section className="history-record-page">
      <header className="history-record-banner">
        <div className="history-record-brand">
          <img src="/images/logo.png" alt="CCD School Clinic logo" />
          <div>
            <strong>CCD School Clinic</strong>
            <span>Medical History Record</span>
          </div>
        </div>
        <button type="button" className="history-back-button" onClick={onBack}>
          <ArrowLeft size={15} aria-hidden="true" />
          Back to Dashboard
        </button>
      </header>

      <article className="history-profile-card">
        <h2>
          <User size={25} aria-hidden="true" />
          {record.name}
        </h2>
        <div className="history-profile-grid">
          <HistoryDetail icon={CreditCard} label={`${type} ID`} value={record.id} />
          {type === 'Student' ? (
            <HistoryDetail icon={CalendarDays} label="Year/Program" value={getYearProgram(record)} />
          ) : (
            <HistoryDetail icon={School} label="Type/Department" value={getStaffDepartment(record)} />
          )}
          <HistoryDetail icon={Users} label="Gender" value={record.gender || '-'} />
          {type === 'Student' ? (
            <HistoryDetail icon={Phone} label="Parent/Guardian" value={getGuardian(record)} />
          ) : (
            <HistoryDetail icon={Briefcase} label="Position/Contact" value={getStaffContact(record)} />
          )}
        </div>
      </article>

      <div className="history-stat-grid" aria-label="Medical history summary">
        <div className="history-stat-card">
          <strong>{patientVisits.length}</strong>
          <span>Total Visits</span>
        </div>
        <div className="history-stat-card">
          <strong>{referredCount}</strong>
          <span>Referred to Hospital</span>
        </div>
      </div>

      <div className="history-action-row">
        <button type="button" className="history-print-button" onClick={printHistory}>
          <Printer size={16} aria-hidden="true" />
          Print All Medical History
        </button>
        <button type="button" className="history-dashboard-button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Dashboard
        </button>
      </div>

      <article className="history-table-card">
        <table className="history-record-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Nurse</th>
              <th>Reason for Visit</th>
              <th>Temperature</th>
              <th>Blood Pressure</th>
              <th>Medicine Given</th>
              <th>Referred</th>
            </tr>
          </thead>
          <tbody>
            {patientVisits.length ? (
              patientVisits.map((visit, index) => (
                <tr key={`${visit.createdAt ?? 'visit'}-${visit.idNumber}-${index}`}>
                  <td>{formatDateTime(visit.createdAt)}</td>
                  <td>{getVisitNurse(visit)}</td>
                  <td>{getVisitReason(visit) || '-'}</td>
                  <td>{formatTemperature(visit.temperature)}</td>
                  <td>{visit.bloodPressure || '-'}</td>
                  <td>{visit.medicineGiven || '-'}</td>
                  <td>{visit.referredToHospital ? 'Yes' : 'No'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-table-cell" colSpan={7}>
                  No medical history yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </section>
  );
}

function HistoryDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <span className="history-detail">
      <Icon size={17} aria-hidden="true" />
      <span>
        <strong>{label}:</strong> {value || '-'}
      </span>
    </span>
  );
}

function getPatientVisits(type: 'Student' | 'Staff', id: string, name: string, visits: VisitRecord[]) {
  return visits
    .filter((visit) => {
      const visitType = visit.patientType || visit.category || '';
      const sameType = visitType.toLowerCase() === type.toLowerCase();
      const sameId = visit.idNumber === id;
      const sameName = Boolean(name && (visit.patientName || visit.name)?.toLowerCase() === name.toLowerCase());
      return sameType && (sameId || sameName);
    })
    .sort((first, second) => getVisitTime(second) - getVisitTime(first));
}

function getVisitTime(visit: VisitRecord) {
  return visit.createdAt ? new Date(visit.createdAt).getTime() : 0;
}

function getYearProgram(student: StudentRecord) {
  return student.section || [student.yearLevel, student.program].filter(Boolean).join(' - ') || '-';
}

function getGuardian(student: StudentRecord) {
  const name = student.parentName || '-';
  return student.parentPhone ? `${name} (${student.parentPhone})` : name;
}

function getStaffDepartment(staff: StaffRecord) {
  return [staff.staffType || 'Staff', staff.department].filter(Boolean).join(' - ') || '-';
}

function getStaffContact(staff: StaffRecord) {
  return [staff.position, staff.contactNumber].filter(Boolean).join(' / ') || '-';
}

function getVisitReason(visit: VisitRecord) {
  return visit.reasonForVisit || visit.concern || '';
}

function getVisitNurse(visit: VisitRecord) {
  const withNurse = visit as VisitRecord & {
    nurse?: string;
    nurseName?: string;
    performedBy?: string;
  };

  return withNurse.nurse || withNurse.nurseName || withNurse.performedBy || 'Master Admin';
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

function formatTemperature(value?: string) {
  return value ? (
    <>
      {value}
      &deg;C
    </>
  ) : (
    '-'
  );
}

function formatTemperatureText(value?: string) {
  return value ? `${value}&deg;C` : '-';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildHistoryPrintHtml(type: 'Student' | 'Staff', record: StudentRecord | StaffRecord, visits: VisitRecord[]) {
  const referredCount = visits.filter((visit) => visit.referredToHospital).length;
  const isStudent = type === 'Student';
  const student = record as StudentRecord;
  const staff = record as StaffRecord;
  const rows = visits.length
    ? visits
        .map(
          (visit) => `
            <tr>
              <td>${escapeHtml(formatDateTime(visit.createdAt))}</td>
              <td>${escapeHtml(getVisitNurse(visit))}</td>
              <td>${escapeHtml(getVisitReason(visit) || '-')}</td>
              <td>${formatTemperatureText(escapeHtml(visit.temperature || ''))}</td>
              <td>${escapeHtml(visit.bloodPressure || '-')}</td>
              <td>${escapeHtml(visit.medicineGiven || '-')}</td>
              <td>${visit.referredToHospital ? 'Yes' : 'No'}</td>
            </tr>`,
        )
        .join('')
    : '<tr><td class="empty" colspan="7">No medical history yet</td></tr>';

  return `<!doctype html>
<html>
  <head>
    <title>Clinic History - ${escapeHtml(record.name)}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #ffffff; color: #050b16; font-family: Arial, sans-serif; }
      .page { width: min(900px, 100%); margin: 0 auto; padding: 40px 38px 52px; }
      .banner { display: flex; align-items: center; justify-content: center; gap: 26px; min-height: 118px; border-radius: 16px; color: #ffffff; background: #285315; box-shadow: 0 14px 24px rgba(15, 23, 42, 0.12); }
      .banner img { width: 68px; height: 68px; object-fit: contain; border-radius: 50%; }
      .banner strong { display: block; font-size: 29px; line-height: 1.1; }
      .banner span { display: block; margin-top: 8px; color: #e4eadf; font-size: 16px; }
      .profile { margin-top: 26px; padding: 34px 34px 30px; border: 1px solid #d8d8d8; border-radius: 18px; }
      h1 { margin: 0 0 24px; color: #285315; font-size: 28px; font-weight: 400; }
      .details { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 24px 54px; font-size: 20px; color: #374151; }
      .details strong { color: #111827; }
      .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-top: 30px; }
      .stat { padding: 26px 20px 20px; border-radius: 12px; box-shadow: 0 9px 22px rgba(15, 23, 42, 0.09); text-align: center; }
      .stat strong { display: block; color: #285315; font-size: 36px; }
      .stat span { display: block; margin-top: 8px; color: #625546; font-size: 14px; }
      table { width: 100%; margin-top: 26px; border-collapse: separate; border-spacing: 0; overflow: hidden; border-radius: 14px; box-shadow: 0 9px 22px rgba(15, 23, 42, 0.09); }
      th { padding: 20px 18px; color: #ffffff; background: #285315; font-size: 20px; text-align: left; }
      td { padding: 18px; border-bottom: 1px solid #eef1f4; font-size: 20px; vertical-align: middle; }
      tr:last-child td { border-bottom: 0; }
      .empty { text-align: center; color: #667085; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { width: 100%; padding: 26px 24px; }
        .banner, table, .stat { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="banner">
        <img src="/images/logo.png" alt="CCD School Clinic logo" />
        <div>
          <strong>CCD School Clinic</strong>
          <span>Medical History Record</span>
        </div>
      </section>

      <section class="profile">
        <h1>${escapeHtml(record.name)}</h1>
        <div class="details">
          <div><strong>${type} ID:</strong> ${escapeHtml(record.id)}</div>
          ${
            isStudent
              ? `<div><strong>Year/Program:</strong> ${escapeHtml(getYearProgram(student))}</div>`
              : `<div><strong>Type/Department:</strong> ${escapeHtml(getStaffDepartment(staff))}</div>`
          }
          <div><strong>Gender:</strong> ${escapeHtml(record.gender || '-')}</div>
          ${
            isStudent
              ? `<div><strong>Parent/Guardian:</strong> ${escapeHtml(getGuardian(student))}</div>`
              : `<div><strong>Position/Contact:</strong> ${escapeHtml(getStaffContact(staff))}</div>`
          }
        </div>
      </section>

      <section class="stats">
        <div class="stat"><strong>${visits.length}</strong><span>Total Visits</span></div>
        <div class="stat"><strong>${referredCount}</strong><span>Referred to Hospital</span></div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Date &amp;<br />Time</th>
            <th>Nurse</th>
            <th>Reason<br />for Visit</th>
            <th>Temperature</th>
            <th>Blood<br />Pressure</th>
            <th>Medicine<br />Given</th>
            <th>Referred</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </main>
  </body>
</html>`;
}
