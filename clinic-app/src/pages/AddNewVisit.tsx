import { FormEvent, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { getVisits, getStaff, getStudents } from '../utils/clinicData';
import type { VisitRecord, StaffRecord, StudentRecord } from '../utils/clinicData';
import { createVisitRecord, loadStaff, loadStudents, loadVisits, saveStaffRecord, saveStudentRecord } from '../services/clinicRecords';

export default function AddNewVisit() {
  const [visits, setVisits] = useState<VisitRecord[]>(getVisits);
  const [students, setStudents] = useState<StudentRecord[]>(getStudents);
  const [staffList, setStaffList] = useState<StaffRecord[]>(getStaff);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([loadVisits(), loadStudents(), loadStaff()])
      .then(([nextVisits, nextStudents, nextStaff]) => {
        setVisits(nextVisits);
        setStudents(nextStudents);
        setStaffList(nextStaff);
      })
      .catch(() => toast.error('Unable to load clinic records from the database.'));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const referredToHospital = form.get('referredToHospital') === 'on';
    const patientType = String(form.get('patientType') || 'Student');
    const patientName = String(form.get('patientName') || '').trim();
    const idNumber = String(form.get('idNumber') || '').trim() || createPatientId(patientType);
    const visit: VisitRecord = {
      patientType,
      idNumber,
      patientName,
      temperature: String(form.get('temperature') || '').trim(),
      bloodPressure: String(form.get('bloodPressure') || '').trim(),
      referredToHospital,
      reasonForVisit: String(form.get('reasonForVisit') || '').trim(),
      medicineGiven: String(form.get('medicineGiven') || '').trim(),
      status: referredToHospital ? 'Referred' : 'Pending',
      createdAt: new Date().toISOString(),
    };

    if (!visit.patientName && !String(form.get('idNumber') || '').trim()) {
      toast.error('Please fill in the patient name or ID number.');
      return;
    }

    if (!visit.reasonForVisit) {
      toast.error('Please fill in the reason for visit.');
      return;
    }

    setIsSaving(true);
    try {
      const effectiveName = patientName || idNumber;

      if (patientType === 'Student') {
        const existingStudent = students.find(
          (student) => student.id === idNumber || student.name.toLowerCase() === effectiveName.toLowerCase(),
        );
        const student: StudentRecord = existingStudent
          ? {
              ...existingStudent,
              concern: visit.reasonForVisit || existingStudent.concern,
              status: 'Pending',
            }
          : {
              id: idNumber,
              name: effectiveName,
              age: '',
              gender: '',
              yearLevel: '',
              program: '',
              section: '',
              parentName: '',
              parentPhone: '',
              concern: visit.reasonForVisit,
              status: 'Pending',
            };
        const savedStudent = await saveStudentRecord(student);
        setStudents((current) =>
          current.some((item) => item.id === savedStudent.id)
            ? current.map((item) => (item.id === savedStudent.id ? savedStudent : item))
            : [savedStudent, ...current],
        );
      } else if (patientType === 'Staff') {
        const existingStaff = staffList.find(
          (staff) => staff.id === idNumber || staff.name.toLowerCase() === effectiveName.toLowerCase(),
        );
        const staff: StaffRecord = existingStaff
          ? {
              ...existingStaff,
              concern: visit.reasonForVisit || existingStaff.concern,
              status: 'Pending',
            }
          : {
              id: idNumber,
              name: effectiveName,
              age: '',
              gender: '',
              staffType: '',
              department: '',
              position: '',
              contactNumber: '',
              email: '',
              concern: visit.reasonForVisit,
              status: 'Pending',
            };
        const savedStaff = await saveStaffRecord(staff);
        setStaffList((current) =>
          current.some((item) => item.id === savedStaff.id)
            ? current.map((item) => (item.id === savedStaff.id ? savedStaff : item))
            : [savedStaff, ...current],
        );
      }

      const saved = await createVisitRecord(visit);
      setVisits([saved, ...visits]);

      target.reset();
      toast.success('Visit record saved');
    } catch (error) {
      console.error('[ADD VISIT] Save failed', error);
      toast.error(getSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="page-content">
      <article className="panel visit-form">
        <h2>
          <ClipboardList size={24} aria-hidden="true" />
          Add New Visit
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="visit-form-grid">
            <label>
              Patient Type
              <select name="patientType" defaultValue="Student">
                <option>Student</option>
                <option>Staff</option>
              </select>
            </label>

            <label>
              Temperature (°C)
              <input name="temperature" inputMode="decimal" placeholder="e.g. 36.5" />
            </label>

            <label>
              ID / Number
              <input name="idNumber" placeholder="Enter Student ID (e.g. S001) or Staff ID (e.g. T001)" />
            </label>

            <label>
              Blood Pressure
              <input name="bloodPressure" placeholder="e.g. 120/80" />
            </label>

            <label>
              Patient Name
              <input name="patientName" placeholder="Enter name if this is a new patient" />
            </label>
          </div>

          <label className="checkbox-field">
            <input name="referredToHospital" type="checkbox" />
            <span>Referred to Hospital</span>
          </label>

          <label>
              Reason for Visit
            <textarea name="reasonForVisit" rows={4} placeholder="Describe symptoms, complaint, or reason" />
          </label>

          <label>
            Medicine Given
            <textarea name="medicineGiven" rows={3} placeholder="List medicines given (if any)" />
          </label>

          <button type="submit" className="save-visit-button" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Visit Record'}
          </button>
        </form>
      </article>
    </section>
  );
}

function createPatientId(patientType: string) {
  const prefix = patientType.toLowerCase() === 'staff' ? 'T' : 'S';
  return `${prefix}-${Date.now()}`;
}

function getSaveErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '');
    if (message.includes('Failed to fetch')) {
      return 'Cannot reach the backend. Start the backend server on port 8000, then try again.';
    }

    if (message) {
      return `Visit record was not saved to Supabase: ${message}`;
    }
  }

  return 'Visit record was not saved to the database. Please check the backend logs.';
}
