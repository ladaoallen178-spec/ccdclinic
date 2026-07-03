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
import MedicalHistoryRecord from '../components/MedicalHistoryRecord';
import { getStaff, getVisits } from '../utils/clinicData';
import type { StaffRecord, VisitRecord } from '../utils/clinicData';
import { confirmVisitRecord, deleteVisitRecord, loadStaff, loadVisits, saveStaffRecord } from '../services/clinicRecords';

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

  const staffVisits = useMemo(() => visits.filter((visit) => getVisitPatientType(visit) === 'staff'), [visits]);
  const pendingStaffVisits = useMemo(() => staffVisits.filter(isPendingVisit), [staffVisits]);
  const todaysVisits = useMemo(() => staffVisits.filter((visit) => isResolvedVisit(visit) && isToday(visit.createdAt)), [staffVisits]);
  const recentVisits = useMemo(() => staffVisits.filter((visit) => isResolvedVisit(visit) && isWithinLastDays(visit.createdAt, 7)), [staffVisits]);
  const visibleStaff = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return staffList;
    }

    return staffList.filter((staff) =>
      [staff.id, staff.name, staff.staffType ?? '', staff.department, staff.contactNumber ?? ''].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
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

  const confirmStaffVisit = async (visit: VisitRecord) => {
    if (!visit.id) {
      toast.error('This pending visit is missing a database ID. Reload records from the database and try again.');
      return;
    }

    try {
      const savedVisit = await confirmVisitRecord(visit.id);
      const matchingStaff = staffList.find((staff) => staff.id === savedVisit.idNumber);
      const hasOtherPendingVisit = visits.some(
        (item) => item.id !== visit.id && item.idNumber === savedVisit.idNumber && isPendingVisit(item),
      );
      setVisits((current) => current.map((item) => (item.id === savedVisit.id ? savedVisit : item)));
      setActiveTab('today');
      toast.success('Staff visit confirmed');
      if (matchingStaff && !hasOtherPendingVisit) {
        try {
          const savedStaff = await saveStaffRecord({ ...matchingStaff, status: 'Cleared' });
          setStaffList((current) => current.map((item) => (item.id === savedStaff.id ? savedStaff : item)));
        } catch (error) {
          console.warn('[STAFF ENTRY] Visit confirmed, but staff status cleanup failed', error);
        }
      }
    } catch (error) {
      toast.error(`Staff visit was not confirmed: ${getErrorMessage(error)}`);
    }
  };

  const rejectStaffVisit = async (visit: VisitRecord) => {
    if (!visit.id) {
      toast.error('This pending visit is missing a database ID. Reload records from the database and try again.');
      return;
    }

    try {
      await deleteVisitRecord(visit.id);
      setVisits((current) => current.filter((item) => item.id !== visit.id));
      toast.success('Pending request removed');
    } catch {
      toast.error('Pending request was not removed from the database.');
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

    receiptWindow.document.open();
    receiptWindow.document.write(receipt);
    receiptWindow.document.close();
    receiptWindow.focus();
    // Do not auto-print — allow nurse to edit comments then use the Print button in the receipt window
    toast.success('Receipt ready — edit nurse comments then click PRINT RECEIPT');
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

  if (historyStaff) {
    return <MedicalHistoryRecord type="Staff" record={historyStaff} visits={staffVisits} onBack={() => setHistoryStaffId(null)} />;
  }

  return (
    <section className="student-management-page">
      <nav className="student-tabs" aria-label="Staff management views">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={activeTab === id ? 'student-tab active' : 'student-tab'} onClick={() => setActiveTab(id)}>
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
            {id === 'pending' ? <em>{pendingStaffVisits.length}</em> : null}
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
            {pendingStaffVisits.length ? (
              pendingStaffVisits.map((visit) => {
                const staff = findStaffByVisit(visit, staffList);
                const staffName = visit.patientName || staff?.name || 'Unknown Staff';
                const staffId = visit.idNumber || staff?.id || '-';
                const department = staff?.department || 'Department not set';
                const createdAt = visit.createdAt ? new Date(visit.createdAt) : null;

                return (
                <div className="pending-request" key={visit.id || `${visit.createdAt}-${visit.idNumber}`}>
                  <span className="student-avatar">{getInitials(staffName)}</span>
                  <div>
                    <strong>
                      {staffName}
                      <small>{staffId}</small>
                      <span className="staff-type-chip">
                        <StaffType type={staff?.staffType} />
                      </span>
                    </strong>
                    <p>
                      {getVisitReason(visit) || 'Clinic request'} <span>{department}</span>
                    </p>
                    <time>{createdAt && isValidDate(createdAt) ? formatDate(createdAt) : '-'}</time>
                  </div>
                  <div className="pending-actions">
                    <button type="button" className="confirm-button" onClick={() => confirmStaffVisit(visit)}>
                      <Check size={17} aria-hidden="true" />
                      Confirm
                    </button>
                    <button type="button" className="reject-button" aria-label={`Remove ${staffName}`} onClick={() => rejectStaffVisit(visit)}>
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                );
              })
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
  return String(visit.patientType || visit.category || '').trim().toLowerCase();
}

function getVisitReason(visit: VisitRecord) {
  return visit.reasonForVisit || visit.concern || '';
}

function getVisitStatus(visit: VisitRecord) {
  return String(visit.status || '').trim().toLowerCase();
}

function isPendingVisit(visit: VisitRecord) {
  return getVisitStatus(visit) === 'pending';
}

function isResolvedVisit(visit: VisitRecord) {
  const status = getVisitStatus(visit);
  return status === 'confirmed' || status === 'completed';
}

function findStaffByVisit(visit: VisitRecord, staffList: StaffRecord[]) {
  return staffList.find((staff) => staff.id === visit.idNumber);
}

function isToday(value?: string) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (!isValidDate(date)) {
    return false;
  }

  const now = new Date();
  return isSameLocalDate(date, now);
}

function isWithinLastDays(value: string | undefined, days: number) {
  if (!value) {
    return false;
  }

  const date = new Date(value).getTime();
  if (!Number.isFinite(date)) {
    return false;
  }

  const now = Date.now();
  const range = days * 24 * 60 * 60 * 1000;
  return date <= now && now - date <= range;
}

function isSameLocalDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isValidDate(date: Date) {
  return Number.isFinite(date.getTime());
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'Unknown error');
  }

  return 'Unknown error';
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
      <div class="title">CCD Clinic Staff Visit Receipt</div>
      <div class="meta">${createdAt}</div>
    </div>

    <dl class="details">
      <dt>Staff ID</dt><dd>${id}</dd>
      <dt>Name</dt><dd>${name}</dd>
      <dt>Type</dt><dd>${type}</dd>
      <dt>Department</dt><dd>${department}</dd>
      <dt>Reason</dt><dd>${reason}</dd>
      <dt>Temperature</dt><dd>${temp}</dd>
      <dt>Blood Pressure</dt><dd>${bp}</dd>
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
    <div style="display:flex;gap:12px;margin-top:18px;justify-content:center">
      <button onclick="prepareAndPrint()" style="background:#1d6332;color:#fff;border:none;padding:10px 18px;border-radius:8px;cursor:pointer">PRINT RECEIPT</button>
      <button onclick="window.close()" style="background:#e6eef0;color:#234f3a;border:none;padding:10px 18px;border-radius:8px;cursor:pointer">BACK TO DASHBOARD</button>
    </div>

    <script>
      document.querySelectorAll('.preset').forEach(btn=>btn.addEventListener('click',()=>{
        const t = document.getElementById('nurseComment');
        if(!t) return; t.value = btn.getAttribute('data-text');
      }));
      function prepareAndPrint(){ window.focus(); window.print(); }
    </script>
  </body>
</html>`;
}

export default StaffEntry;
