import { FormEvent, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { getVisits, getStaff, getStudents } from '../utils/clinicData';
import type { VisitRecord, StaffRecord, StudentRecord } from '../utils/clinicData';
import { createVisitRecord, createInventoryLog, loadStaff, loadStudents, loadVisits, saveStaffRecord, saveStudentRecord, loadInventory, updateInventoryStock } from '../services/clinicRecords';

export default function AddNewVisit() {
  const [visits, setVisits] = useState<VisitRecord[]>(getVisits);
  const [students, setStudents] = useState<StudentRecord[]>(getStudents);
  const [staffList, setStaffList] = useState<StaffRecord[]>(getStaff);
  const [inventory, setInventory] = useState<{ id?: string; name: string; stock: number }[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [medicineQuantity, setMedicineQuantity] = useState('1');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([loadVisits(), loadStudents(), loadStaff(), loadInventory()])
      .then(([nextVisits, nextStudents, nextStaff, nextInventory]) => {
        setVisits(nextVisits);
        setStudents(nextStudents);
        setStaffList(nextStaff);
        setInventory(nextInventory);
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
    const idNumber = String(form.get('idNumber') || '').trim();
    const selectedMedicineId = String(form.get('medicineId') || '').trim();
    const medicineQuantity = Math.max(1, Number(form.get('medicineQuantity') || 1));
    const selectedInventoryItem = inventory.find((item) => item.id === selectedMedicineId);
    const medicineName = selectedInventoryItem?.name || '';
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

    if (!visit.patientName && !idNumber) {
      toast.error('Please fill in the patient name or ID number.');
      return;
    }

    if (!visit.reasonForVisit) {
      toast.error('Please fill in the reason for visit.');
      return;
    }

    if (selectedMedicineId && !selectedInventoryItem) {
      toast.error('Selected medication is not available in inventory.');
      return;
    }

    setIsSaving(true);
    try {
      const effectiveName = patientName || idNumber;
      let visitPatientName = patientName || undefined;
      let visitIdNumber: string | undefined = undefined;

      if (patientType === 'Student') {
        const existingStudent = students.find(
          (student) => student.id === idNumber || student.name.toLowerCase() === effectiveName.toLowerCase(),
        );

        if (existingStudent) {
          visitIdNumber = existingStudent.id;
          visitPatientName = existingStudent.name;
        } else if (!patientName && idNumber) {
          visitPatientName = idNumber;
        }
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
        visitIdNumber = savedStaff.id;
        visitPatientName = savedStaff.name;
      }

      const saved = await createVisitRecord({
        ...visit,
        idNumber: visitIdNumber || '',
        patientName: visitPatientName,
      });
      setVisits([saved, ...visits]);

      await deductMedicineStock(visit.medicineGiven, saved, medicineName, medicineQuantity);

      target.reset();
      setSelectedMedicineId('');
      setMedicineQuantity('1');
      toast.success('Visit record saved');
    } catch (error) {
      console.error('[ADD VISIT] Save failed', error);
      toast.error(getSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  async function deductMedicineStock(medicineText: string, savedVisit: VisitRecord, medicineName?: string, medicineQty?: number) {
    const explicitEntry = medicineName
      ? [{ name: medicineName, qty: medicineQty && medicineQty > 0 ? medicineQty : 1 }]
      : [];
    const entries = [...parseMedicineGiven(medicineText), ...explicitEntry];
    if (!entries.length) return;

    for (const { name, qty } of entries) {
      const normalizedName = name.toLowerCase();
      const item = inventory.find((record) => {
        const recordName = record.name.toLowerCase();
        return (
          recordName === normalizedName ||
          recordName.includes(normalizedName) ||
          normalizedName.includes(recordName)
        );
      });

      if (!item || !item.id) continue;

      const nextStock = Math.max(0, item.stock - qty);
      try {
        await updateInventoryStock(item.id, nextStock);
        setInventory((current) =>
          current.map((record) =>
            record.id === item.id ? { ...record, stock: nextStock } : record,
          ),
        );

        await createInventoryLog({
          id: `LOG-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
          medicine: item.name,
          action: 'Dispensed',
          qty,
          studentId: savedVisit.patientType === 'Student' ? savedVisit.idNumber : undefined,
          studentName: savedVisit.patientType === 'Student' ? savedVisit.patientName || undefined : undefined,
          staffId: savedVisit.patientType === 'Staff' ? savedVisit.idNumber : undefined,
          staffName: savedVisit.patientType === 'Staff' ? savedVisit.patientName || undefined : undefined,
          performedBy: 'Clinic Nurse',
          notes: `Visit saved with medicine given: ${item.name} x${qty}`,
        });
      } catch (error) {
        console.warn('[ADD VISIT] Inventory deduction failed for', item.name, error);
      }
    }
  }

  function parseMedicineGiven(value: string) {
    return value
      .split(/[,\n\r]+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const quantityMatch = line.match(/(?:[x×]\s*)?(\d+)\b(?!.*\d)/i);
        const qty = quantityMatch ? Math.max(1, Number(quantityMatch[1])) : 1;
        const cleanedName = line
          .replace(/(?:[x×]\s*)?\d+\b/gi, '')
          .replace(/\b(tablets?|capsules?|tabs?|pcs?|pieces?)\b/gi, '')
          .replace(/[()]/g, '')
          .trim();
        return { name: cleanedName, qty };
      })
      .filter((entry) => entry.name);
  }

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

          <div className="visit-form-grid">
            <label>
              Medication
              <select
                name="medicineId"
                value={selectedMedicineId}
                onChange={(event) => setSelectedMedicineId(event.target.value)}
              >
                <option value="">Select medication</option>
                {inventory
                  .filter((item) => item.stock > 0)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {item.stock} available
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Quantity to Deduct
              <input
                name="medicineQuantity"
                type="number"
                min="1"
                value={medicineQuantity}
                onChange={(event) => setMedicineQuantity(event.target.value)}
                placeholder="e.g. 10"
              />
            </label>
          </div>

          <label>
            Medicine Given / Notes
            <textarea name="medicineGiven" rows={3} placeholder="Optional notes or additional medicines given" />
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
