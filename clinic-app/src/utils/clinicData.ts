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
    yearLevel: 'Grade 10',
    program: 'A',
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
    yearLevel: 'Grade 11',
    program: 'STEM',
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
    yearLevel: 'Grade 9',
    program: 'B',
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
    yearLevel: 'Grade 12',
    program: 'HUMSS',
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
  return Array.isArray(v) ? (v as VisitRecord[]) : defaultVisits;
}

export function saveVisits(visits: VisitRecord[]) {
  localStorage.setItem('clinic-visits', JSON.stringify(visits));
  notifyClinicDataChanged();
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

  return {
    students: students.length,
    staff: staff.length,
    visitsToday: visits.filter((visit) => visit.status === 'Pending').length,
    referredToday: visits.filter((visit) => visit.status === 'Referred').length,
    studentPending: students.filter((student) => student.status === 'Pending').length,
    staffPending: staff.filter((staffMember) => staffMember.status === 'Pending').length,
    lowStock: inventory.filter((item) => item.stock <= 3).length,
  };
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
