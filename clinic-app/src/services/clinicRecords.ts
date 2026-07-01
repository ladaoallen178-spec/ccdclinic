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
import api from './api';

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

// === STUDENTS ===
export async function loadStudents() {
  try {
    const response = await api.get('/api/students');
    return ((response.data || []) as any[]).map(transformApiStudent);
  } catch (error) {
    console.warn('[loadStudents] API error, falling back to localStorage:', error);
    return getStudents();
  }
}

export async function saveStudentRecord(record: StudentRecord) {
  try {
    const response = await api.post('/api/students', toApiStudentPayload(record));
    return transformApiStudent(response.data);
  } catch (error) {
    console.error('[saveStudentRecord] API error:', error);
    const students = upsertById(getStudents(), record);
    saveStudents(students);
    return record;
  }
}

export async function deleteStudentRecord(id: string) {
  try {
    await api.delete(`/api/students/${id}`);
  } catch (error) {
    console.error('[deleteStudentRecord] API error:', error);
    // Fallback to localStorage
    saveStudents(getStudents().filter((student) => student.id !== id));
  }
}

// === STAFF ===
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

// === VISITS ===
export async function loadVisits() {
  try {
    const response = await api.get('/api/visits');
    const visits = ((response.data || []) as any[]).map(transformApiVisit);
    return sortNewest(visits);
  } catch (error) {
    console.warn('[loadVisits] API error, falling back to localStorage:', error);
    return sortNewest(getVisits());
  }
}

export async function createVisitRecord(record: VisitRecord) {
  // Transform frontend format to backend format
  const apiPayload = {
    patient_type: record.patientType,
    student_id: record.idNumber && record.patientType === 'Student' ? record.idNumber : undefined,
    staff_id: record.idNumber && record.patientType === 'Staff' ? record.idNumber : undefined,
    temperature: record.temperature,
    blood_pressure: record.bloodPressure,
    referred_to_hospital: record.referredToHospital,
    reason_for_visit: record.reasonForVisit,
    medicine_given: record.medicineGiven,
    status: record.status,
  };

  try {
    const response = await api.post('/api/visits', apiPayload);
    const apiVisit = response.data as any;
    const visit = transformApiVisit(apiVisit);
    saveVisits([visit, ...getVisits()]);
    return visit;
  } catch (error) {
    console.error('[createVisitRecord] API error:', error);
    const visit = {
      ...record,
      createdAt: record.createdAt || new Date().toISOString(),
    };
    saveVisits([visit, ...getVisits()]);
    return visit;
  }
}

// === INVENTORY ===
export async function loadInventory() {
  try {
    const response = await api.get('/api/inventory');
    return ((response.data || []) as any[]).map(transformApiInventory);
  } catch (error) {
    console.warn('[loadInventory] API error, falling back to localStorage:', error);
    return getInventory() as InventoryRecord[];
  }
}

export async function saveInventoryRecord(record: InventoryRecordInput) {
  const normalizedRecord: InventoryRecord = {
    ...record,
    status: record.status || (record.stock > 0 ? 'In Stock' : 'Out of Stock'),
  };

  try {
    const response = await api.post('/api/inventory', toApiInventoryPayload(normalizedRecord));
    return transformApiInventory(response.data);
  } catch (error) {
    console.error('[saveInventoryRecord] API error:', error);
    const current = getInventory() as InventoryRecord[];
    const next = current.some((item) => item.id && normalizedRecord.id && item.id === normalizedRecord.id)
      ? current.map((item) => (item.id === normalizedRecord.id ? normalizedRecord : item))
      : [normalizedRecord, ...current];
    saveInventory(next);
    console.warn('[saveInventoryRecord] Saved inventory record to localStorage fallback.');
    return normalizedRecord;
  }
}

export async function deleteInventoryRecord(id: string) {
  try {
    await api.delete(`/api/inventory/${id}`);
  } catch (error) {
    console.error('[deleteInventoryRecord] API error:', error);
    // Fallback to localStorage
    const current = getInventory() as InventoryRecord[];
    saveInventory(current.filter((item) => item.id !== id));
  }
}

export async function updateInventoryStock(id: string, newStock: number) {
  try {
    const response = await api.put(`/api/inventory/${id}`, { stock: newStock });
    return response.data as InventoryRecord;
  } catch (error) {
    console.error('[updateInventoryStock] API error:', error);
    const current = getInventory() as InventoryRecord[];
    const next = current.map((item) =>
      item.id === id
        ? {
            ...item,
            stock: newStock,
            status: newStock > 0 ? 'In Stock' : 'Out of Stock',
          }
        : item,
    );
    saveInventory(next);
    console.warn('[updateInventoryStock] Updated inventory stock in localStorage fallback.');
    const updated = next.find((item) => item.id === id);
    return updated || { id, name: 'Unknown', stock: newStock, status: newStock > 0 ? 'In Stock' : 'Out of Stock' };
  }
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

// Helper function to transform API visit format to frontend format
function transformApiVisit(apiVisit: any): VisitRecord {
  return {
    patientType: apiVisit.patient_type,
    idNumber: apiVisit.student_id || apiVisit.staff_id || '',
    temperature: apiVisit.temperature || '',
    bloodPressure: apiVisit.blood_pressure || '',
    referredToHospital: apiVisit.referred_to_hospital || false,
    reasonForVisit: apiVisit.reason_for_visit || '',
    medicineGiven: apiVisit.medicine_given || '',
    status: apiVisit.status || 'Pending',
    createdAt: apiVisit.created_at,
  };
}

function transformApiStudent(apiStudent: any): StudentRecord {
  return {
    id: apiStudent.id || '',
    name: apiStudent.name || '',
    section: apiStudent.section || '',
    concern: apiStudent.concern || '',
    status: apiStudent.status || 'Cleared',
    age: apiStudent.age == null ? '' : String(apiStudent.age),
    gender: apiStudent.gender || '',
    yearLevel: apiStudent.year_level || apiStudent.yearLevel || '',
    program: apiStudent.program || '',
    parentName: apiStudent.parent_name || apiStudent.parentName || '',
    parentPhone: apiStudent.parent_phone || apiStudent.parentPhone || '',
    createdAt: apiStudent.created_at || apiStudent.createdAt,
  };
}

function toApiStudentPayload(record: StudentRecord) {
  return {
    id: record.id,
    name: record.name,
    section: emptyToUndefined(record.section),
    concern: emptyToUndefined(record.concern),
    status: record.status,
    age: toOptionalInteger(record.age),
    gender: emptyToUndefined(record.gender),
    year_level: emptyToUndefined(record.yearLevel),
    program: emptyToUndefined(record.program),
    parent_name: emptyToUndefined(record.parentName),
    parent_phone: emptyToUndefined(record.parentPhone),
  };
}

function transformApiInventory(apiItem: any): InventoryRecord {
  return {
    id: apiItem.id,
    name: apiItem.name || '',
    dosage: apiItem.dosage || '',
    stock: Number(apiItem.stock) || 0,
    unit: apiItem.unit || 'tablet',
    status: apiItem.status || (Number(apiItem.stock) > 0 ? 'In Stock' : 'Out of Stock'),
    expiry: apiItem.expiry || '',
    supplier: apiItem.supplier || '',
    location: apiItem.location || '',
    remarks: apiItem.remarks || '',
    keywords: Array.isArray(apiItem.keywords) ? apiItem.keywords : [],
    createdAt: apiItem.created_at || apiItem.createdAt,
  };
}

function toApiInventoryPayload(record: InventoryRecord) {
  return {
    id: emptyToUndefined(record.id),
    name: record.name,
    dosage: emptyToUndefined(record.dosage),
    stock: Number(record.stock) || 0,
    unit: emptyToUndefined(record.unit),
    status: emptyToUndefined(record.status),
    expiry: emptyToUndefined(record.expiry),
    supplier: emptyToUndefined(record.supplier),
    location: emptyToUndefined(record.location),
    remarks: emptyToUndefined(record.remarks),
    keywords: record.keywords?.length ? record.keywords : undefined,
  };
}

function toOptionalInteger(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

function emptyToUndefined(value: unknown) {
  return typeof value === 'string' ? value.trim() || undefined : value;
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
