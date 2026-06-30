import {
  getBmiRecords,
  getInventory,
  getMedicalDocuments,
  getNurses,
  getStaff,
  getStudents,
  getVisits,
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
    requireApiField(response.data, 'id', 'student insert');
    return transformApiStudent(response.data);
  } catch (error) {
    console.error('[saveStudentRecord] API error:', error);
    throw error;
  }
}

export async function deleteStudentRecord(id: string) {
  try {
    await api.delete(`/api/students/${id}`);
  } catch (error) {
    console.error('[deleteStudentRecord] API error:', error);
    throw error;
  }
}

// === STAFF ===
export async function loadStaff() {
  try {
    const response = await api.get('/api/staff');
    return ((response.data || []) as any[]).map(transformApiStaff);
  } catch (error) {
    console.warn('[loadStaff] API error, falling back to localStorage:', error);
    return getStaff();
  }
}

export async function saveStaffRecord(record: StaffRecord) {
  try {
    const response = await api.post('/api/staff', toApiStaffPayload(record));
    requireApiField(response.data, 'id', 'staff insert');
    return transformApiStaff(response.data);
  } catch (error) {
    console.error('[saveStaffRecord] API error:', error);
    throw error;
  }
}

export async function deleteStaffRecord(id: string) {
  try {
    await api.delete(`/api/staff/${id}`);
  } catch (error) {
    console.error('[deleteStaffRecord] API error:', error);
    throw error;
  }
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
    requireApiField(response.data, 'id', 'visit insert');
    const apiVisit = response.data as any;
    return transformApiVisit(apiVisit);
  } catch (error) {
    console.error('[createVisitRecord] API error:', error);
    throw error;
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
    requireApiField(response.data, 'id', 'inventory insert');
    return transformApiInventory(response.data);
  } catch (error) {
    console.error('[saveInventoryRecord] API error:', error);
    throw error;
  }
}

export async function deleteInventoryRecord(id: string) {
  try {
    await api.delete(`/api/inventory/${id}`);
  } catch (error) {
    console.error('[deleteInventoryRecord] API error:', error);
    throw error;
  }
}

export async function updateInventoryStock(id: string, newStock: number) {
  try {
    const response = await api.put(`/api/inventory/${id}`, { stock: newStock });
    return response.data as InventoryRecord;
  } catch (error) {
    console.error('[updateInventoryStock] API error:', error);
    throw error;
  }
}

export async function loadInventoryLogs() {
  try {
    const response = await api.get('/api/inventory-logs');
    return ((response.data || []) as any[]).map(transformApiInventoryLog);
  } catch (error) {
    console.warn('[loadInventoryLogs] API error:', error);
    return [];
  }
}

export async function createInventoryLog(record: InventoryLog) {
  try {
    const response = await api.post('/api/inventory-logs', toApiInventoryLogPayload(record));
    requireApiField(response.data, 'id', 'inventory log insert');
    return transformApiInventoryLog(response.data);
  } catch (error) {
    console.error('[createInventoryLog] API error:', error);
    throw error;
  }
}

export async function loadBmiRecords() {
  try {
    const response = await api.get('/api/bmi-records');
    return sortNewest(((response.data || []) as any[]).map(transformApiBmiRecord));
  } catch (error) {
    console.warn('[loadBmiRecords] API error, falling back to localStorage:', error);
    return sortNewest(getBmiRecords());
  }
}

export async function createBmiRecord(record: BmiRecord) {
  try {
    const response = await api.post('/api/bmi-records', toApiBmiRecordPayload(record));
    requireApiField(response.data, 'id', 'BMI insert');
    return transformApiBmiRecord(response.data);
  } catch (error) {
    console.error('[createBmiRecord] API error:', error);
    throw error;
  }
}

export async function loadMedicalDocuments() {
  try {
    const response = await api.get('/api/medical-documents');
    return sortNewest(((response.data || []) as any[]).map(transformApiMedicalDocument));
  } catch (error) {
    console.warn('[loadMedicalDocuments] API error, falling back to localStorage:', error);
    return sortNewest(getMedicalDocuments());
  }
}

export async function createMedicalDocument(record: MedicalDocumentRecord) {
  try {
    const response = await api.post('/api/medical-documents', toApiMedicalDocumentPayload(record));
    requireApiField(response.data, 'id', 'medical document insert');
    return transformApiMedicalDocument(response.data);
  } catch (error) {
    console.error('[createMedicalDocument] API error:', error);
    throw error;
  }
}

export async function deleteMedicalDocument(id: string) {
  try {
    await api.delete(`/api/medical-documents/${id}`);
  } catch (error) {
    console.error('[deleteMedicalDocument] API error:', error);
    throw error;
  }
}

export async function loadNurses() {
  try {
    const response = await api.get('/api/users');
    return sortNewest(((response.data || []) as any[]).map(transformApiNurse));
  } catch (error) {
    console.warn('[loadNurses] API error, falling back to localStorage:', error);
    return sortNewest(getNurses());
  }
}

export async function registerNurseAccount(registration: NurseRegistration) {
  try {
    const response = await api.post('/register', {
      email: registration.email,
      password: registration.password,
      full_name: registration.name,
      role: isNurseRole(registration.role) ? registration.role : 'Nurse',
      contact_number: registration.contactNumber,
    });
    const user = (response.data as any).user;
    requireApiField(user, 'id', 'nurse registration');
    return transformApiNurse(user);
  } catch (error) {
    console.error('[registerNurseAccount] API error:', error);
    throw error;
  }
}

// Helper function to transform API visit format to frontend format
function transformApiVisit(apiVisit: any): VisitRecord {
  return {
    id: apiVisit.id,
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

function transformApiStaff(apiStaff: any): StaffRecord {
  return {
    id: apiStaff.id || '',
    name: apiStaff.name || '',
    department: apiStaff.department || '',
    concern: apiStaff.concern || '',
    status: apiStaff.status || 'Cleared',
    age: apiStaff.age == null ? '' : String(apiStaff.age),
    gender: apiStaff.gender || '',
    staffType: apiStaff.staff_type || apiStaff.staffType || '',
    position: apiStaff.position || '',
    contactNumber: apiStaff.contact_number || apiStaff.contactNumber || '',
    email: apiStaff.email || '',
    createdAt: apiStaff.created_at || apiStaff.createdAt,
  };
}

function transformApiNurse(apiUser: any): NurseRecord {
  return {
    id: apiUser.id || '',
    name: apiUser.fullname || apiUser.full_name || apiUser.name || '',
    email: apiUser.email || '',
    role: isNurseRole(apiUser.role) ? apiUser.role : 'Nurse',
    contactNumber: apiUser.contact_number || apiUser.contactNumber || '',
    createdAt: apiUser.created_at || apiUser.createdAt || new Date().toISOString(),
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

function toApiStaffPayload(record: StaffRecord) {
  return {
    id: record.id,
    name: record.name,
    department: emptyToUndefined(record.department),
    concern: emptyToUndefined(record.concern),
    status: record.status,
    age: toOptionalInteger(record.age),
    gender: emptyToUndefined(record.gender),
    staff_type: emptyToUndefined(record.staffType),
    position: emptyToUndefined(record.position),
    contact_number: emptyToUndefined(record.contactNumber),
    email: emptyToUndefined(record.email),
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

function transformApiInventoryLog(apiLog: any): InventoryLog {
  return {
    id: apiLog.id,
    dateTime: apiLog.date_time || apiLog.dateTime,
    medicine: apiLog.medicine || '',
    action: apiLog.action || '',
    qty: apiLog.qty == null ? undefined : Number(apiLog.qty),
    studentId: apiLog.student_id || apiLog.studentId || '',
    studentName: apiLog.student_name || apiLog.studentName || '',
    staffId: apiLog.staff_id || apiLog.staffId || '',
    staffName: apiLog.staff_name || apiLog.staffName || '',
    performedBy: apiLog.performed_by || apiLog.performedBy || '',
    notes: apiLog.notes || '',
  };
}

function transformApiBmiRecord(apiRecord: any): BmiRecord {
  return {
    id: apiRecord.id,
    studentId: apiRecord.student_id || apiRecord.studentId || '',
    studentName: apiRecord.student_name || apiRecord.studentName || '',
    height: Number(apiRecord.height) || 0,
    weight: Number(apiRecord.weight) || 0,
    bmi: Number(apiRecord.bmi) || 0,
    status: apiRecord.status || '',
    createdAt: apiRecord.created_at || apiRecord.createdAt || '',
  };
}

function transformApiMedicalDocument(apiDocument: any): MedicalDocumentRecord {
  return {
    id: apiDocument.id,
    studentId: apiDocument.student_id || apiDocument.studentId || '',
    studentName: apiDocument.student_name || apiDocument.studentName || '',
    yearLevel: apiDocument.year_level || apiDocument.yearLevel || '',
    program: apiDocument.program || '',
    documentType: apiDocument.document_type || apiDocument.documentType || '',
    documentDate: apiDocument.document_date || apiDocument.documentDate || '',
    fileName: apiDocument.file_name || apiDocument.fileName || '',
    remarks: apiDocument.remarks || '',
    createdAt: apiDocument.created_at || apiDocument.createdAt || '',
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

function toApiInventoryLogPayload(record: InventoryLog) {
  return {
    id: record.id,
    date_time: record.dateTime,
    medicine: emptyToUndefined(record.medicine),
    action: record.action,
    qty: record.qty,
    student_id: emptyToUndefined(record.studentId),
    student_name: emptyToUndefined(record.studentName),
    staff_id: emptyToUndefined(record.staffId),
    staff_name: emptyToUndefined(record.staffName),
    performed_by: emptyToUndefined(record.performedBy),
    notes: emptyToUndefined(record.notes),
  };
}

function toApiBmiRecordPayload(record: BmiRecord) {
  return {
    id: record.id,
    student_id: record.studentId,
    student_name: record.studentName,
    height: record.height,
    weight: record.weight,
    bmi: record.bmi,
    status: record.status,
  };
}

function toApiMedicalDocumentPayload(record: MedicalDocumentRecord) {
  return {
    id: record.id,
    student_id: record.studentId,
    student_name: record.studentName,
    year_level: record.yearLevel,
    program: record.program,
    document_type: record.documentType,
    document_date: record.documentDate,
    file_name: record.fileName,
    remarks: emptyToUndefined(record.remarks),
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

function sortNewest<T extends { createdAt?: string }>(records: T[]) {
  return [...records].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

function requireApiField(data: unknown, field: string, operation: string) {
  if (!data || typeof data !== 'object' || !(field in data) || !(data as Record<string, unknown>)[field]) {
    throw new Error(`Backend did not return an inserted row for ${operation}.`);
  }
}

function isNurseRole(value: string): value is NurseRecord['role'] {
  return value === 'Nurse' || value === 'Head Nurse' || value === 'Administrator';
}
