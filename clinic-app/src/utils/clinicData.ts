export type ClinicStatus = 'Pending' | 'Cleared';

export type StudentRecord = {
  id: string;
  name: string;
  section: string;
  concern: string;
  status: ClinicStatus;
  age?: string;
  gender?: string;
  yearLevel?: string;
  program?: string;
  parentName?: string;
  parentPhone?: string;
  createdAt?: string;
};

export type StaffRecord = {
  id: string;
  name: string;
  department: string;
  concern: string;
  status: ClinicStatus;
  age?: string;
  gender?: string;
  staffType?: string;
  position?: string;
  contactNumber?: string;
  email?: string;
  createdAt?: string;
};

export type NurseRecord = {
  id: string;
  name: string;
  email: string;
  role: 'Nurse' | 'Head Nurse' | 'Administrator';
  contactNumber: string;
  createdAt: string;
};

export type VisitRecord = {
  id?: string;
  patientType: string;
  idNumber: string;
  temperature: string;
  bloodPressure: string;
  referredToHospital: boolean;
  reasonForVisit: string;
  medicineGiven: string;
  status: string;
  visitDate?: string;
  confirmedAt?: string;
  createdAt?: string;
  patientName?: string;
  yearProgram?: string;
  name?: string;
  category?: string;
  concern?: string;
};

export type InventoryItem = {
  name: string;
  stock: number;
  status: string;
};

export type BmiRecord = {
  id: string;
  studentId: string;
  studentName: string;
  height: number;
  weight: number;
  bmi: number;
  status: string;
  createdAt: string;
};

export type MedicalDocumentRecord = {
  id: string;
  studentId: string;
  studentName: string;
  yearLevel: string;
  program: string;
  documentType: string;
  documentDate: string;
  fileName: string;
  remarks: string;
  createdAt: string;
};

const defaultStudents: StudentRecord[] = [
  {
    id: 'S-1001',
    name: 'Juan Dela Cruz',
    section: 'Grade 10 - A',
    concern: 'Headache',
    status: 'Pending',
    age: '16',
    gender: 'Male',
    yearLevel: 'First Year',
    program: 'BACHELOR OF SCIENCE IN ENTREPRENEURSHIP',
    parentName: 'Jose Dela Cruz',
    parentPhone: '06123456748',
  },
  {
    id: 'S-1002',
    name: 'Ana Reyes',
    section: 'Grade 11 - STEM',
    concern: 'Medical certificate',
    status: 'Pending',
    age: '17',
    gender: 'Female',
    yearLevel: 'Second Year',
    program: 'BTVTED',
    parentName: 'Liza Reyes',
    parentPhone: '06123456748',
  },
  {
    id: 'S-1003',
    name: 'Mark Villanueva',
    section: 'Grade 9 - B',
    concern: 'Stomach pain',
    status: 'Cleared',
    age: '15',
    gender: 'Male',
    yearLevel: 'Third Year',
    program: 'BACHELOR OF EARLY CHILDHOOD EDUCATION',
    parentName: 'Marites Villanueva',
    parentPhone: '06123456748',
  },
  {
    id: 'S-1004',
    name: 'Ella Cruz',
    section: 'Grade 12 - HUMSS',
    concern: 'First aid follow-up',
    status: 'Pending',
    age: '18',
    gender: 'Female',
    yearLevel: 'Fourth Year',
    program: 'BACHELOR OF SCIENCE IN ENTREPRENEURSHIP',
    parentName: 'Ramon Cruz',
    parentPhone: '06123456748',
  },
];

const defaultStaff: StaffRecord[] = [
  {
    id: 'T-2001',
    name: 'Maria Santos',
    department: 'Registrar',
    concern: 'Blood pressure check',
    status: 'Cleared',
    age: '34',
    gender: 'Female',
    staffType: 'Non-Teaching',
    position: 'Registrar Staff',
    contactNumber: '09345678901',
    email: 'maria.santos@ccd.edu',
  },
  {
    id: 'T-2002',
    name: 'Pedro Lim',
    department: 'Faculty',
    concern: 'Medication request',
    status: 'Pending',
    age: '41',
    gender: 'Male',
    staffType: 'Teacher',
    position: 'Teacher III',
    contactNumber: '09234567890',
    email: 'pedro.lim@ccd.edu',
  },
  {
    id: '502',
    name: 'June Ann',
    department: 'OHS',
    concern: 'Fever',
    status: 'Pending',
    age: '29',
    gender: 'Female',
    staffType: 'Non-Teaching',
    position: 'Clinic Staff',
    contactNumber: '09195',
    email: 'june.ann@ccd.edu',
  },
];

const defaultNurses: NurseRecord[] = [];

const defaultVisits: VisitRecord[] = [
  {
    id: 'VISIT-S-1001-1',
    patientType: 'Student',
    idNumber: 'S-1001',
    temperature: '36.8',
    bloodPressure: '110/70',
    referredToHospital: false,
    reasonForVisit: 'Headache',
    medicineGiven: 'Paracetamol',
    status: 'Pending',
    createdAt: new Date().toISOString(),
    patientName: 'Juan Dela Cruz',
    yearProgram: 'Grade 10 - A',
  },
  {
    id: 'VISIT-T-2001-1',
    patientType: 'Staff',
    idNumber: 'T-2001',
    temperature: '36.5',
    bloodPressure: '130/80',
    referredToHospital: false,
    reasonForVisit: 'Blood pressure check',
    medicineGiven: '',
    status: 'Completed',
    createdAt: new Date().toISOString(),
    patientName: 'Maria Santos',
  },
];

const defaultInventory: InventoryItem[] = [
  { name: 'Paracetamol', stock: 12, status: 'Available' },
  { name: 'Bandage Roll', stock: 6, status: 'Available' },
  { name: 'Alcohol', stock: 3, status: 'Low Stock' },
];

const defaultBmiRecords: BmiRecord[] = [
  {
    id: 'BMI-1001',
    studentId: 'S-1001',
    studentName: 'Juan Dela Cruz',
    height: 165,
    weight: 58.5,
    bmi: 21.5,
    status: 'Normal',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'BMI-1002',
    studentId: 'S-1002',
    studentName: 'Ana Reyes',
    height: 155,
    weight: 49.5,
    bmi: 20.6,
    status: 'Normal',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'BMI-1003',
    studentId: 'S-1003',
    studentName: 'Mark Villanueva',
    height: 164,
    weight: 77,
    bmi: 28.6,
    status: 'Overweight',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const defaultMedicalDocuments: MedicalDocumentRecord[] = [];

export function getStudents() {
  return readStorage('clinic-students', defaultStudents);
}

export function saveStudents(students: StudentRecord[]) {
  localStorage.setItem('clinic-students', JSON.stringify(students));
  notifyClinicDataChanged();
}

export function getStaff() {
  return readStorage('clinic-staff', defaultStaff);
}

export function saveStaff(staff: StaffRecord[]) {
  localStorage.setItem('clinic-staff', JSON.stringify(staff));
  notifyClinicDataChanged();
}

export function getNurses() {
  return readStorage('clinic-nurses', defaultNurses);
}

export function saveNurses(nurses: NurseRecord[]) {
  localStorage.setItem('clinic-nurses', JSON.stringify(nurses));
  notifyClinicDataChanged();
}

export function getVisits() {
  const v = readStorage('clinic-visits', defaultVisits);
  const visits = Array.isArray(v) ? (v as VisitRecord[]) : defaultVisits;
  const normalized = normalizeVisits(visits);

  if (!visits.every((visit, index) => visit.id && visit.id === normalized[index]?.id)) {
    saveVisits(normalized);
  }

  return normalized;
}

export function saveVisits(visits: VisitRecord[]) {
  localStorage.setItem('clinic-visits', JSON.stringify(visits));
  notifyClinicDataChanged();
}

function normalizeVisits(visits: VisitRecord[]) {
  return visits.map(normalizeVisitRecord);
}

function normalizeVisitRecord(visit: VisitRecord) {
  return {
    ...visit,
    id: visit.id || generateFallbackVisitId(visit),
  };
}

function generateFallbackVisitId(visit: VisitRecord) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const base = `${visit.patientType || 'visit'}-${visit.idNumber || visit.patientName || 'unknown'}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 48);
  const seed = visit.createdAt || `${visit.patientType}-${visit.idNumber}-${visit.patientName || ''}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return `LOCAL-${base || 'VISIT'}-${Math.abs(hash).toString(36)}`;
}

export function isValidVisitId(id?: string) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function getInventory() {
  const inventory = readStorage('clinic-inventory', defaultInventory);
  return Array.isArray(inventory) ? (inventory as InventoryItem[]) : defaultInventory;
}

export function saveInventory(items: InventoryItem[]) {
  localStorage.setItem('clinic-inventory', JSON.stringify(items));
  notifyClinicDataChanged();
}

export function getBmiRecords() {
  const records = readStorage('clinic-bmi-records', defaultBmiRecords);
  return Array.isArray(records) ? (records as BmiRecord[]) : defaultBmiRecords;
}

export function saveBmiRecords(records: BmiRecord[]) {
  localStorage.setItem('clinic-bmi-records', JSON.stringify(records));
  notifyClinicDataChanged();
}

export function getMedicalDocuments() {
  return readStorage('clinic-medical-documents', defaultMedicalDocuments);
}

export function saveMedicalDocuments(documents: MedicalDocumentRecord[]) {
  localStorage.setItem('clinic-medical-documents', JSON.stringify(documents));
  notifyClinicDataChanged();
}

export function getClinicStats() {
  const students = getStudents();
  const staff = getStaff();
  const visits = getVisits();
  const inventory = getInventory();
  const pendingStudentVisits = visits.filter((visit) => isPatientType(visit, 'student') && isVisitStatus(visit, 'pending'));
  const pendingStaffVisits = visits.filter((visit) => isPatientType(visit, 'staff') && isVisitStatus(visit, 'pending'));
  const resolvedVisitsToday = visits.filter((visit) => isResolvedVisit(visit) && isToday(getVisitDateValue(visit)));
  const referredVisitsToday = visits.filter((visit) => visit.referredToHospital && isToday(getVisitDateValue(visit)));

  return {
    students: students.length,
    staff: staff.length,
    visitsToday: resolvedVisitsToday.length,
    referredToday: referredVisitsToday.length,
    studentPending: pendingStudentVisits.length,
    staffPending: pendingStaffVisits.length,
    lowStock: inventory.filter((item) => item.stock <= 3).length,
  };
}

function isPatientType(visit: VisitRecord, type: string) {
  return String(visit.patientType || visit.category || '').trim().toLowerCase() === type;
}

function isVisitStatus(visit: VisitRecord, status: string) {
  return String(visit.status || '').trim().toLowerCase() === status;
}

function isResolvedVisit(visit: VisitRecord) {
  return isVisitStatus(visit, 'confirmed') || isVisitStatus(visit, 'completed');
}

function getVisitDateValue(visit: VisitRecord) {
  return visit.visitDate || visit.createdAt;
}

function isToday(value?: string) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return false;
  }

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function notifyClinicDataChanged() {
  window.dispatchEvent(new Event('clinic-data-changed'));
}
