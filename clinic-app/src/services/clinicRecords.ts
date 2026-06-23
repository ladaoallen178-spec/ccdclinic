import {
  getBmiRecords,
  getInventory,
  getMedicalDocuments,
  getNurses,
  getStaff,
  getStudents,
  getVisits,
  saveBmiRecords,
  saveInventory,
  saveMedicalDocuments,
  saveNurses,
  saveStaff,
  saveStudents,
  saveVisits,
} from '../utils/clinicData';
import type {
  BmiRecord,
  InventoryItem,
  MedicalDocumentRecord,
  NurseRecord,
  StaffRecord,
  StudentRecord,
  VisitRecord,
} from '../utils/clinicData';

type InventoryRecord = InventoryItem & {
  id?: string;
  dosage?: string;
  unit?: string;
  expiry?: string;
  supplier?: string;
  location?: string;
  remarks?: string;
  keywords?: string[];
  createdAt?: string;
};

type InventoryRecordInput = Omit<InventoryRecord, 'status'> & {
  status?: string;
};

type InventoryLog = {
  id: string;
  dateTime?: string;
  medicine: string;
  action: string;
  qty?: number;
  studentId?: string;
  studentName?: string;
  staffId?: string;
  staffName?: string;
  performedBy?: string;
  notes?: string;
};

type NurseRegistration = {
  name: string;
  email: string;
  password: string;
  role: string;
  contactNumber: string;
};

const INVENTORY_LOG_KEY = 'clinic-inventory-log';

export async function loadStudents() {
  return getStudents();
}

export async function saveStudentRecord(record: StudentRecord) {
  const students = upsertById(getStudents(), record);
  saveStudents(students);
  return record;
}

export async function deleteStudentRecord(id: string) {
  saveStudents(getStudents().filter((student) => student.id !== id));
}

export async function loadStaff() {
  return getStaff();
}

export async function saveStaffRecord(record: StaffRecord) {
  const staff = upsertById(getStaff(), record);
  saveStaff(staff);
  return record;
}

export async function deleteStaffRecord(id: string) {
  saveStaff(getStaff().filter((staff) => staff.id !== id));
}

export async function loadVisits() {
  return sortNewest(getVisits());
}

export async function createVisitRecord(record: VisitRecord) {
  const visit = {
    ...record,
    createdAt: record.createdAt || new Date().toISOString(),
  };
  saveVisits([visit, ...getVisits()]);
  return visit;
}

export async function loadInventory() {
  return getInventory() as InventoryRecord[];
}

export async function saveInventoryRecord(record: InventoryRecordInput) {
  const normalizedRecord: InventoryRecord = {
    ...record,
    status: record.status || (record.stock > 0 ? 'In Stock' : 'Out of Stock'),
  };
  const current = getInventory() as InventoryRecord[];
  const next = current.some((item) => item.id && normalizedRecord.id && item.id === normalizedRecord.id)
    ? current.map((item) => (item.id === normalizedRecord.id ? normalizedRecord : item))
    : [normalizedRecord, ...current];
  saveInventory(next);
  return normalizedRecord;
}

export async function deleteInventoryRecord(id: string) {
  const current = getInventory() as InventoryRecord[];
  saveInventory(current.filter((item) => item.id !== id));
}

export async function loadInventoryLogs() {
  return readStorage<InventoryLog[]>(INVENTORY_LOG_KEY, []);
}

export async function createInventoryLog(record: InventoryLog) {
  const log = {
    ...record,
    dateTime: record.dateTime || new Date().toISOString(),
  };
  localStorage.setItem(INVENTORY_LOG_KEY, JSON.stringify([log, ...readStorage<InventoryLog[]>(INVENTORY_LOG_KEY, [])]));
  notifyClinicDataChanged();
  return log;
}

export async function loadBmiRecords() {
  return sortNewest(getBmiRecords());
}

export async function createBmiRecord(record: BmiRecord) {
  const bmiRecord = {
    ...record,
    createdAt: record.createdAt || new Date().toISOString(),
  };
  saveBmiRecords([bmiRecord, ...getBmiRecords()]);
  return bmiRecord;
}

export async function loadMedicalDocuments() {
  return sortNewest(getMedicalDocuments());
}

export async function createMedicalDocument(record: MedicalDocumentRecord) {
  const documentRecord = {
    ...record,
    createdAt: record.createdAt || new Date().toISOString(),
  };
  saveMedicalDocuments([documentRecord, ...getMedicalDocuments()]);
  return documentRecord;
}

export async function deleteMedicalDocument(id: string) {
  saveMedicalDocuments(getMedicalDocuments().filter((documentRecord) => documentRecord.id !== id));
}

export async function loadNurses() {
  return sortNewest(getNurses());
}

export async function registerNurseAccount(registration: NurseRegistration) {
  const nurse: NurseRecord = {
    id: `NURSE-${Date.now()}`,
    name: registration.name,
    email: registration.email,
    role: isNurseRole(registration.role) ? registration.role : 'Nurse',
    contactNumber: registration.contactNumber,
    createdAt: new Date().toISOString(),
  };
  saveNurses([nurse, ...getNurses()]);
  return nurse;
}

function upsertById<T extends { id: string }>(records: T[], record: T) {
  return records.some((item) => item.id === record.id)
    ? records.map((item) => (item.id === record.id ? record : item))
    : [record, ...records];
}

function sortNewest<T extends { createdAt?: string }>(records: T[]) {
  return [...records].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function notifyClinicDataChanged() {
  window.dispatchEvent(new Event('clinic-data-changed'));
}

function isNurseRole(value: string): value is NurseRecord['role'] {
  return value === 'Nurse' || value === 'Head Nurse' || value === 'Administrator';
}
