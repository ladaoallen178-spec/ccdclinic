import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  Hourglass,
  Layers,
  Plus,
  Printer,
  School,
  Search,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getStaff, getVisits } from '../utils/clinicData';
import type { StaffRecord, VisitRecord } from '../utils/clinicData';
import { createVisitRecord, deleteStaffRecord, loadStaff, loadVisits, saveStaffRecord } from '../services/clinicRecords';

type StaffTab = 'pending' | 'today' | 'recent' | 'manage';

const tabs: { id: StaffTab; label: string; icon: typeof Hourglass }[] = [
  { id: 'pending', label: 'Pending', icon: Hourglass },
  { id: 'today', label: "Today's Visits", icon: ClipboardList },
  { id: 'recent', label: 'Recent Visits', icon: BarChart3 },
  { id: 'manage', label: 'Manage Staff', icon: Layers },
];

function StaffEntry() {
  const [activeTab, setActiveTab] = useState<StaffTab>('pending');
  const [staffList, setStaffList] = useState<StaffRecord[]>(getStaff);
  const [visits, setVisits] = useState<VisitRecord[]>(getVisits);
  const [searchTerm, setSearchTerm] = useState('');
  const [historyStaffId, setHistoryStaffId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([loadStaff(), loadVisits()])
      .then(([nextStaff, nextVisits]) => {
        if (!isMounted) return;
        setStaffList(nextStaff);
        setVisits(nextVisits);
      })
      .catch(() => {
        if (!isMounted) return;
        // This should rarely happen now due to fallback logic
        toast.error('Unable to load staff records. Using cached data if available.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const pendingStaff = useMemo(() => staffList.filter((staff) => staff.status === 'Pending'), [staffList]);
  const staffVisits = useMemo(() => visits.filter((visit) => getVisitPatientType(visit) === 'Staff'), [visits]);
  const todaysVisits = useMemo(() => staffVisits.filter((visit) => isToday(visit.createdAt)), [staffVisits]);
  const recentVisits = useMemo(() => staffVisits.filter((visit) => isWithinLastDays(visit.createdAt, 7)), [staffVisits]);
  const visibleStaff = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return staffList;
    }

    return staffList.filter((staff) =>
      [staff.id, staff.name, staff.staffType ?? '', staff.department, staff.contactNumber ?? ''].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }, [searchTerm, staffList]);
  const historyStaff = staffList.find((staff) => staff.id === historyStaffId) ?? null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const id = String(form.get('id')).trim();

    if (staffList.some((staff) => staff.id.toLowerCase() === id.toLowerCase())) {
      toast.error('Staff ID already exists');
      return;
    }

    const staff: StaffRecord = {
      id,
      name: String(form.get('name')).trim(),
      age: String(form.get('age')).trim(),
      gender: String(form.get('gender')).trim(),
      staffType: String(form.get('staffType')).trim(),
      department: String(form.get('department')).trim(),
      position: String(form.get('position')).trim(),
      contactNumber: String(form.get('contactNumber')).trim(),
      email: String(form.get('email')).trim(),
      concern: '',
      status: 'Cleared',
    };

    try {
      const saved = await saveStaffRecord(staff);
      setStaffList([saved, ...staffList]);
      target.reset();
      toast.success('Staff member added');
    } catch {
      toast.error('Staff member was not saved to the database.');
    }
  };

  const confirmStaff = async (staff: StaffRecord) => {
    const visit: VisitRecord = {
      patientType: 'Staff',
      idNumber: staff.id,
      patientName: staff.name,
      temperature: '',
      bloodPressure: '',
      referredToHospital: false,
      reasonForVisit: staff.concern || 'Clinic visit',
      medicineGiven: '',
      status: 'Completed',
      createdAt: new Date().toISOString(),
    };

    try {
      const savedStaff = await saveStaffRecord({ ...staff, status: 'Cleared' });
      const savedVisit = await createVisitRecord(visit);
      setStaffList(staffList.map((item) => (item.id === staff.id ? savedStaff : item)));
      setVisits([savedVisit, ...visits]);
      toast.success('Staff visit confirmed');
    } catch {
      toast.error('Staff visit was not saved to the database.');
    }
  };

  const rejectStaff = async (id: string) => {
    try {
      await deleteStaffRecord(id);
      setStaffList(staffList.filter((staff) => staff.id !== id));
      toast.success('Pending request removed');
    } catch {
      toast.error('Staff record was not removed from the database.');
    }
  };

  const printReceipt = (visit: VisitRecord) => {
    const staff = findStaffByVisit(visit, staffList);
    const receipt = buildReceiptHtml(visit, staff);
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
    const staff = findStaffByVisit(visit, staffList);
    const createdAt = visit.createdAt ? new Date(visit.createdAt) : null;

    return (
      <tr key={`${visit.createdAt ?? 'visit'}-${visit.idNumber}-${getVisitReason(visit)}`}>
        {includeDate ? <td>{createdAt ? formatDateTime(createdAt) : '-'}</td> : <td>{createdAt ? formatTime(createdAt) : '-'}</td>}
        <td>{visit.idNumber || staff?.id || '-'}</td>
        <td>{visit.patientName || staff?.name || visit.name || 'Unknown Staff'}</td>
        <td>
          <StaffType type={staff?.staffType} />
        </td>
        <td>{staff?.department || '-'}</td>
        <td>{getVisitReason(visit) || '-'}</td>
        <td>{visit.temperature ? `${visit.temperature}C` : '-'}</td>
        {!includeDate ? <td>{visit.bloodPressure || '-'}</td> : null}
        {!includeDate ? <td>{visit.referredToHospital ? 'Yes' : 'No'}</td> : null}
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
      <nav className="student-tabs" aria-label="Staff management views">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={activeTab === id ? 'student-tab active' : 'student-tab'} onClick={() => setActiveTab(id)}>
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
            {id === 'pending' ? <em>{pendingStaff.length}</em> : null}
          </button>
        ))}
      </nav>

      {activeTab === 'pending' ? (
        <article className="panel student-tab-panel">
          <h2>
            <Hourglass size={22} aria-hidden="true" />
            Pending Staff Requests
          </h2>
          <div className="pending-list">
            {pendingStaff.length ? (
              pendingStaff.map((staff) => (
                <div className="pending-request" key={staff.id}>
                  <span className="student-avatar">{getInitials(staff.name)}</span>
                  <div>
                    <strong>
                      {staff.name}
                      <small>{staff.id}</small>
                      <span className="staff-type-chip">
                        <StaffType type={staff.staffType} />
                      </span>
                    </strong>
                    <p>
                      {staff.concern || 'Clinic request'} <span>{staff.department || 'Department not set'}</span>
                    </p>
                    <time>{formatDate(new Date())}</time>
                  </div>
                  <div className="pending-actions">
                    <button type="button" className="confirm-button" onClick={() => confirmStaff(staff)}>
                      <Check size={17} aria-hidden="true" />
                      Confirm
                    </button>
                    <button type="button" className="reject-button" aria-label={`Remove ${staff.name}`} onClick={() => rejectStaff(staff.id)}>
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No pending staff requests</p>
            )}
          </div>
        </article>
      ) : null}

      {activeTab === 'today' ? (
        <article className="panel student-tab-panel">
          <h2>
            <CalendarDays size={22} aria-hidden="true" />
            Today's Staff Visits
          </h2>
          <table className="student-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Department</th>
                <th>Reason</th>
                <th>Temp</th>
                <th>BP</th>
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
                    No staff visits today
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
            All Staff Visits (Last 7 Days)
          </h2>
          <table className="student-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Department</th>
                <th>Reason</th>
                <th>Temp</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {recentVisits.length ? (
                recentVisits.map((visit) => renderVisitRow(visit, true))
              ) : (
                <tr>
                  <td className="empty-table-cell" colSpan={8}>
                    No staff visits in the last 7 days
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
              Add New Staff Member
            </h2>
            <label>
              Staff ID:
              <input name="id" placeholder="e.g., T001, S001" required />
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
                <select name="gender" defaultValue="Male">
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </label>
              <label>
                Staff Type:
                <select name="staffType" defaultValue="Teacher">
                  <option>Teacher</option>
                  <option>Non-Teaching</option>
                </select>
              </label>
              <label>
                Department:
                <input name="department" placeholder="e.g., English, Admin" required />
              </label>
            </div>
            <label>
              Position:
              <input name="position" placeholder="e.g., Teacher III, Staff" />
            </label>
            <div className="student-form-grid">
              <label>
                Contact Number:
                <input name="contactNumber" inputMode="tel" />
              </label>
              <label>
                Email:
                <input name="email" type="email" />
              </label>
            </div>
            <button type="submit" className="save-student-button">
              <Check size={17} aria-hidden="true" />
              Save Staff
            </button>
          </form>

          <article className="panel student-directory">
            <h2>
              <Users size={24} aria-hidden="true" />
              Staff Directory
            </h2>
            <label className="search-field">
              <Search size={17} aria-hidden="true" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by name or ID..." />
            </label>
            <table className="student-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleStaff.map((staff) => (
                  <tr key={staff.id}>
                    <td>{staff.id}</td>
                    <td>{staff.name}</td>
                    <td>
                      <StaffType type={staff.staffType} />
                    </td>
                    <td>{staff.department || '-'}</td>
                    <td>{staff.contactNumber || '-'}</td>
                    <td>
                      <button type="button" className="history-button" onClick={() => setHistoryStaffId(staff.id)}>
                        <FileText size={15} aria-hidden="true" />
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {historyStaff ? (
              <div className="student-history-panel">
                <div>
                  <strong>{historyStaff.name}</strong>
                  <button type="button" aria-label="Close history" onClick={() => setHistoryStaffId(null)}>
                    <X size={17} aria-hidden="true" />
                  </button>
                </div>
                <table className="student-table compact">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reason</th>
                      <th>Temp</th>
                      <th>BP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffVisits.filter((visit) => visit.idNumber === historyStaff.id).length ? (
                      staffVisits
                        .filter((visit) => visit.idNumber === historyStaff.id)
                        .map((visit) => (
                          <tr key={`${visit.createdAt}-${visit.idNumber}`}>
                            <td>{visit.createdAt ? formatDateTime(new Date(visit.createdAt)) : '-'}</td>
                            <td>{getVisitReason(visit) || '-'}</td>
                            <td>{visit.temperature ? `${visit.temperature}C` : '-'}</td>
                            <td>{visit.bloodPressure || '-'}</td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td className="empty-table-cell" colSpan={4}>
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

function StaffType({ type }: { type?: string }) {
  const normalizedType = type || 'Staff';
  const Icon = normalizedType === 'Teacher' ? School : Briefcase;

  return (
    <span className="staff-type-label">
      <Icon size={16} aria-hidden="true" />
      {normalizedType}
    </span>
  );
}

function getVisitPatientType(visit: VisitRecord) {
  return visit.patientType || visit.category || '';
}

function getVisitReason(visit: VisitRecord) {
  return visit.reasonForVisit || visit.concern || '';
}

function findStaffByVisit(visit: VisitRecord, staffList: StaffRecord[]) {
  return staffList.find((staff) => staff.id === visit.idNumber);
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

function buildReceiptHtml(visit: VisitRecord, staff?: StaffRecord) {
  const createdAt = visit.createdAt ? formatDateTime(new Date(visit.createdAt)) : '-';
  const name = escapeHtml(visit.patientName || staff?.name || visit.name || 'Unknown Staff');
  const id = escapeHtml(visit.idNumber || staff?.id || '-');
  const type = escapeHtml(staff?.staffType || 'Staff');
  const department = escapeHtml(staff?.department || '-');
  const reason = escapeHtml(getVisitReason(visit) || '-');
  const temp = escapeHtml(visit.temperature ? `${visit.temperature}C` : '-');
  const bp = escapeHtml(visit.bloodPressure || '-');

  return `<!doctype html>
<html>
  <head>
    <title>Staff Clinic Visit Receipt</title>
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
    <h1>CCD Clinic Staff Visit Receipt</h1>
    <p>${createdAt}</p>
    <dl>
      <dt>Staff ID</dt><dd>${id}</dd>
      <dt>Name</dt><dd>${name}</dd>
      <dt>Type</dt><dd>${type}</dd>
      <dt>Department</dt><dd>${department}</dd>
      <dt>Reason</dt><dd>${reason}</dd>
      <dt>Temperature</dt><dd>${temp}</dd>
      <dt>Blood Pressure</dt><dd>${bp}</dd>
      <dt>Referred</dt><dd>${visit.referredToHospital ? 'Yes' : 'No'}</dd>
    </dl>
  </body>
</html>`;
}

export default StaffEntry;
