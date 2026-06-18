import api from './api';
import supabase from './supabase';
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

export type InventoryRow = InventoryItem & {
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

export type InventoryLog = {
  id: string;
  dateTime?: string;
  medicine?: string;
  action: string;
  qty?: number;
  studentId?: string;
  studentName?: string;
  staffId?: string;
  staffName?: string;
  performedBy?: string;
  notes?: string;
};

type ApiStudent = Omit<StudentRecord, 'age'> & { age?: number | string | null };
type ApiStaff = Omit<StaffRecord, 'age'> & { age?: number | string | null };
type SupabaseVisitRow = {
  id?: string;
  patient_type: string;
  student_id?: string | null;
  staff_id?: string | null;
  temperature?: string | null;
  blood_pressure?: string | null;
  referred_to_hospital: boolean;
  reason_for_visit: string;
  medicine_given?: string | null;
  status: string;
  created_at?: string | null;
};

const LOG_KEY = 'clinic-inventory-log';

export async function loadStudents() {
  try {
    const { data } = await api.get<ApiStudent[]>('/students');
    const records = data.map(fromApiStudent);
    saveStudents(records);
    return records;
  } catch (err) {
    // Fall back to cached students from localStorage
    console.warn('Could not load students from API, using cached data:', err);
    return getStudents();
  }
}

export async function saveStudentRecord(student: StudentRecord) {
  try {
    const { data } = await api.post<ApiStudent>('/students', toApiStudent(student));
    const saved = fromApiStudent(data);
    mergeLocal(getStudents(), saved, saveStudents);
    return saved;
  } catch (err) {
    // Fall back to saving locally
    console.warn('Could not save student to API, saving locally:', err);
    mergeLocal(getStudents(), student, saveStudents);
    return student;
  }
}

export async function deleteStudentRecord(id: string) {
  try {
    await api.delete(`/students/${encodeURIComponent(id)}`);
    saveStudents(getStudents().filter((student) => student.id !== id));
  } catch (err) {
    // Fall back to local deletion
    console.warn('Could not delete student from API, deleting locally:', err);
    saveStudents(getStudents().filter((student) => student.id !== id));
  }
}

export async function loadStaff() {
  try {
    const { data } = await api.get<ApiStaff[]>('/staff');
    const records = data.map(fromApiStaff);
    saveStaff(records);
    return records;
  } catch (err) {
    // Fall back to cached staff from localStorage
    console.warn('Could not load staff from API, using cached data:', err);
    return getStaff();
  }
}

export async function saveStaffRecord(staff: StaffRecord) {
  try {
    const { data } = await api.post<ApiStaff>('/staff', toApiStaff(staff));
    const saved = fromApiStaff(data);
    mergeLocal(getStaff(), saved, saveStaff);
    return saved;
  } catch (err) {
    // Fall back to saving locally
    console.warn('Could not save staff to API, saving locally:', err);
    mergeLocal(getStaff(), staff, saveStaff);
    return staff;
  }
}

export async function deleteStaffRecord(id: string) {
  try {
    await api.delete(`/staff/${encodeURIComponent(id)}`);
    saveStaff(getStaff().filter((staff) => staff.id !== id));
  } catch (err) {
    // Fall back to local deletion
    console.warn('Could not delete staff from API, deleting locally:', err);
    saveStaff(getStaff().filter((staff) => staff.id !== id));
  }
}

export async function loadVisits() {
  try {
    const { data } = await api.get<VisitRecord[]>('/visits');
    saveVisits(data);
    return data;
  } catch (err) {
    console.warn('Could not load visits from API, trying Supabase directly:', err);
    try {
      const records = await loadVisitsFromSupabase();
      saveVisits(records);
      return records;
    } catch (supabaseErr) {
      console.warn('Could not load visits from Supabase, using cached data:', supabaseErr);
      return getVisits();
    }
  }
}

export async function createVisitRecord(visit: VisitRecord) {
  try {
    const { data } = await api.post<VisitRecord>('/visits', visit);
    saveVisits([data, ...getVisits().filter((item) => item.createdAt !== data.createdAt)]);
    return data;
  } catch (err) {
    console.warn('Could not save visit to API, trying Supabase directly:', err);
    const data = await createVisitInSupabase(visit);
    saveVisits([data, ...getVisits().filter((item) => item.createdAt !== data.createdAt)]);
    return data;
  }
}

export async function loadInventory() {
  try {
    const { data } = await api.get<InventoryRow[]>('/inventory');
    saveInventory(data as InventoryItem[]);
    return data;
  } catch (err) {
    // Fall back to cached inventory from localStorage
    console.warn('Could not load inventory from API, using cached data:', err);
    return getInventory() as InventoryRow[];
  }
}

export async function saveInventoryRecord(item: InventoryRow) {
  try {
    const { data } = await api.post<InventoryRow>('/inventory', item);
    mergeLocal(getInventory() as InventoryRow[], data, (items) => saveInventory(items as InventoryItem[]));
    return data;
  } catch (err) {
    // Fall back to saving locally
    console.warn('Could not save inventory to API, saving locally:', err);
    mergeLocal(getInventory() as InventoryRow[], item, (items) => saveInventory(items as InventoryItem[]));
    return item;
  }
}

export async function deleteInventoryRecord(id: string) {
  try {
    await api.delete(`/inventory/${encodeURIComponent(id)}`);
    saveInventory((getInventory() as InventoryRow[]).filter((item) => item.id !== id) as InventoryItem[]);
  } catch (err) {
    // Fall back to local deletion
    console.warn('Could not delete inventory from API, deleting locally:', err);
    saveInventory((getInventory() as InventoryRow[]).filter((item) => item.id !== id) as InventoryItem[]);
  }
}

export async function loadInventoryLogs() {
  try {
    const { data } = await api.get<InventoryLog[]>('/inventory-logs');
    localStorage.setItem(LOG_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('clinic-data-changed'));
    return data;
  } catch (err) {
    // Fall back to cached logs from localStorage
    console.warn('Could not load inventory logs from API, using cached data:', err);
    return readLocalLogs();
  }
}

export async function createInventoryLog(entry: InventoryLog) {
  try {
    const { data } = await api.post<InventoryLog>('/inventory-logs', entry);
    const logs = [data, ...readLocalLogs().filter((log) => log.id !== data.id)];
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    window.dispatchEvent(new Event('clinic-data-changed'));
    return data;
  } catch (err) {
    // Fall back to saving locally
    console.warn('Could not save inventory log to API, saving locally:', err);
    const localLog: InventoryLog = { ...entry, id: `local-${Date.now()}` };
    const logs = [localLog, ...readLocalLogs().filter((log) => log.id !== localLog.id)];
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    window.dispatchEvent(new Event('clinic-data-changed'));
    return localLog;
  }
}

export async function loadBmiRecords() {
  try {
    const { data } = await api.get<BmiRecord[]>('/bmi-records');
    saveBmiRecords(data);
    return data;
  } catch (err) {
    // Fall back to cached BMI records from localStorage
    console.warn('Could not load BMI records from API, using cached data:', err);
    return getBmiRecords();
  }
}

export async function createBmiRecord(record: BmiRecord) {
  try {
    const { data } = await api.post<BmiRecord>('/bmi-records', record);
    saveBmiRecords([data, ...getBmiRecords().filter((item) => item.id !== data.id)]);
    return data;
  } catch (err) {
    // Fall back to saving locally
    console.warn('Could not save BMI record to API, saving locally:', err);
    saveBmiRecords([record, ...getBmiRecords().filter((item) => item.id !== record.id)]);
    return record;
  }
}

export async function loadMedicalDocuments() {
  try {
    const { data } = await api.get<MedicalDocumentRecord[]>('/medical-documents');
    saveMedicalDocuments(data);
    return data;
  } catch (err) {
    // Fall back to cached medical documents from localStorage
    console.warn('Could not load medical documents from API, using cached data:', err);
    return getMedicalDocuments();
  }
}

export async function createMedicalDocument(record: MedicalDocumentRecord) {
  try {
    const { data } = await api.post<MedicalDocumentRecord>('/medical-documents', record);
    saveMedicalDocuments([data, ...getMedicalDocuments().filter((item) => item.id !== data.id)]);
    return data;
  } catch (err) {
    // Fall back to saving locally
    console.warn('Could not save medical document to API, saving locally:', err);
    saveMedicalDocuments([record, ...getMedicalDocuments().filter((item) => item.id !== record.id)]);
    return record;
  }
}

export async function deleteMedicalDocument(id: string) {
  try {
    await api.delete(`/medical-documents/${encodeURIComponent(id)}`);
    saveMedicalDocuments(getMedicalDocuments().filter((document) => document.id !== id));
  } catch (err) {
    // Fall back to local deletion
    console.warn('Could not delete medical document from API, deleting locally:', err);
    saveMedicalDocuments(getMedicalDocuments().filter((document) => document.id !== id));
  }
}

export async function loadNurses() {
  try {
    const { data } = await api.get<NurseRecord[]>('/nurses');
    saveNurses(data);
    return data;
  } catch (err) {
    // Fall back to cached nurses from localStorage
    console.warn('Could not load nurses from API, using cached data:', err);
    return getNurses();
  }
}

export async function registerNurseAccount(input: {
  name: string;
  email: string;
  password: string;
  role: string;
  contactNumber: string;
}) {
  await api.post('/register', {
    email: input.email,
    password: input.password,
    full_name: input.name,
    role: input.role,
    contact_number: input.contactNumber,
  });

  const nurse: NurseRecord = {
    id: `N-${Date.now()}`,
    name: input.name,
    email: input.email,
    role: input.role as NurseRecord['role'],
    contactNumber: input.contactNumber,
    createdAt: new Date().toISOString(),
  };
  saveNurses([nurse, ...getNurses().filter((item) => item.email.toLowerCase() !== input.email.toLowerCase())]);
  return nurse;
}

function fromApiStudent(student: ApiStudent): StudentRecord {
  return { ...student, age: student.age == null ? '' : String(student.age) };
}

function toApiStudent(student: StudentRecord): ApiStudent {
  return {
    ...student,
    age: student.age ? Number(student.age) : undefined,
  };
}

function fromApiStaff(staff: ApiStaff): StaffRecord {
  return { ...staff, age: staff.age == null ? '' : String(staff.age) };
}

function toApiStaff(staff: StaffRecord): ApiStaff {
  return {
    ...staff,
    age: staff.age ? Number(staff.age) : undefined,
  };
}

function mergeLocal<T extends { id?: string }>(current: T[], saved: T, persist: (items: T[]) => void) {
  persist([saved, ...current.filter((item) => item.id !== saved.id)]);
}

async function loadVisitsFromSupabase() {
  const { data, error } = await supabase
    .from('visits')
    .select(
      'id, patient_type, student_id, staff_id, temperature, blood_pressure, referred_to_hospital, reason_for_visit, medicine_given, status, created_at',
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(fromSupabaseVisit);
}

async function createVisitInSupabase(visit: VisitRecord) {
  const isStudent = visit.patientType.toLowerCase() === 'student';
  const patientTable = isStudent ? 'students' : 'staff';
  const patientName = (visit.patientName || visit.idNumber).trim();

  const { error: patientError } = await supabase.from(patientTable).upsert(
    {
      id: visit.idNumber,
      name: patientName,
      concern: visit.reasonForVisit,
      status: 'Pending',
    },
    { onConflict: 'id' },
  );

  if (patientError) {
    throw new Error(`Supabase patient save failed: ${patientError.message}`);
  }

  const payload = {
    patient_type: isStudent ? 'Student' : 'Staff',
    student_id: isStudent ? visit.idNumber : null,
    staff_id: isStudent ? null : visit.idNumber,
    temperature: visit.temperature || null,
    blood_pressure: visit.bloodPressure || null,
    referred_to_hospital: visit.referredToHospital,
    reason_for_visit: visit.reasonForVisit,
    medicine_given: visit.medicineGiven || null,
    status: visit.status || 'Pending',
    created_at: visit.createdAt || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('visits')
    .insert(payload)
    .select(
      'id, patient_type, student_id, staff_id, temperature, blood_pressure, referred_to_hospital, reason_for_visit, medicine_given, status, created_at',
    )
    .single();

  if (error) {
    throw new Error(`Supabase visit save failed: ${error.message}`);
  }

  return fromSupabaseVisit(data as SupabaseVisitRow);
}

function fromSupabaseVisit(row: SupabaseVisitRow): VisitRecord {
  return {
    patientType: row.patient_type,
    idNumber: row.student_id || row.staff_id || '',
    temperature: row.temperature || '',
    bloodPressure: row.blood_pressure || '',
    referredToHospital: row.referred_to_hospital,
    reasonForVisit: row.reason_for_visit,
    medicineGiven: row.medicine_given || '',
    status: row.status,
    createdAt: row.created_at || undefined,
  };
}

function readLocalLogs(): InventoryLog[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
