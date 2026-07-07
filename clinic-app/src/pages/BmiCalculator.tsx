import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, BookOpen, Calculator, ClipboardList, Search, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { getBmiRecords, getStudents } from '../utils/clinicData';
import type { BmiRecord, StudentRecord } from '../utils/clinicData';
import { createBmiRecord, loadBmiRecords, loadStudents } from '../services/clinicRecords';

function normalizeHeight(value: string) {
  const heightValue = Number(value);

  if (!heightValue) {
    return 0;
  }

  return heightValue > 3 ? heightValue / 100 : heightValue;
}

function getBmiCategory(value: number) {
  if (value < 18.5) {
    return 'Underweight';
  }

  if (value < 25) {
    return 'Normal';
  }

  if (value < 30) {
    return 'Overweight';
  }

  return 'Obese';
}

function normalizeStudentId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function formatBmiDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
}

export default function BmiCalculator() {
  const navigate = useNavigate();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [suggestions, setSuggestions] = useState<StudentRecord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [bmiRecords, setBmiRecords] = useState<BmiRecord[]>(getBmiRecords);
  const [students, setStudents] = useState<StudentRecord[]>(getStudents);

  useEffect(() => {
    loadStudents()
      .then(setStudents)
      .catch(() => toast.error('Unable to load students from the database.'));

    loadBmiRecords()
      .then(setBmiRecords)
      .catch(() => toast.error('Unable to load BMI records from the database.'));
  }, []);
  const bmi = useMemo(() => {
    const h = normalizeHeight(height);
    const w = Number(weight);
    return h > 0 && w > 0 ? w / (h * h) : 0;
  }, [height, weight]);

  const category = bmi ? getBmiCategory(bmi) : 'Enter height and weight';

  const applyPreset = (nextHeight: string, nextWeight: string) => {
    setHeight(nextHeight);
    setWeight(nextWeight);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTerm = normalizeStudentId(studentId.trim());
    const student = students.find((item) => {
      const normalizedId = normalizeStudentId(item.id);
      return (
        normalizedId === normalizedTerm ||
        item.id.toLowerCase() === studentId.trim().toLowerCase() ||
        item.name.toLowerCase().includes(studentId.trim().toLowerCase())
      );
    });

    if (!student) {
      // If there are suggestions, choose the first match
      if (suggestions.length > 0) {
        const first = suggestions[0];
        setSelectedStudent(first);
        setStudentId(first.id);
        setShowSuggestions(false);
        toast.success('Student selected');
        return;
      }

      setSelectedStudent(null);
      toast.error('Student not found');
      return;
    }

    setSelectedStudent(student);
    toast.success('Student found');
    setStudentId(student.id);
  };

  function updateSuggestions(term: string) {
    const t = term.trim().toLowerCase();
    if (!t) {
      setSuggestions([]);
      return;
    }

    const matches = students
      .filter((item) => {
        const id = normalizeStudentId(item.id);
        const name = (item.name || '').toLowerCase();
        return id.includes(t) || name.includes(t);
      })
      .slice(0, 10);

    setSuggestions(matches);
  }

  const calculateBmi = () => {
    if (!height || !weight) {
      toast.error('Enter height and weight first');
      return;
    }

    if (!bmi || Number.isNaN(bmi) || !Number.isFinite(bmi)) {
      toast.error('Invalid height or weight values');
      return;
    }

    toast.success(`BMI: ${bmi.toFixed(2)} (${category})`);
  };

  const saveBmiRecord = async () => {
    if (!selectedStudent) {
      toast.error('Search and select a student first');
      return;
    }

    if (!bmi) {
      toast.error('Enter height and weight first');
      return;
    }

    const record: BmiRecord = {
      id: `BMI-${Date.now()}`,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      height: normalizeHeight(height) * 100,
      weight: Number(weight),
      bmi: Number(bmi.toFixed(2)),
      status: category,
      createdAt: new Date().toISOString(),
    };
    try {
      const saved = await createBmiRecord(record);
      const nextRecords = [saved, ...bmiRecords];
      setBmiRecords(nextRecords);
      setHeight('');
      setWeight('');
      toast.success('BMI recorded');
    } catch (error: any) {
      console.error('[BmiCalculator] Failed to save BMI record:', error);
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'BMI record was not saved to the database.';
      toast.error(message);
    }
  };

  const recentRecords = useMemo(
    () => [...bmiRecords].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, 6),
    [bmiRecords],
  );

  return (
    <section className="bmi-page">
      <header className="panel bmi-page-header">
        <h2>
          <Calculator size={24} aria-hidden="true" />
          BMI Calculator | CCD School Clinic
        </h2>
        <button type="button" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={17} aria-hidden="true" />
          Back to Dashboard
        </button>
      </header>

      <section className="bmi-main-grid">
        <article className="panel bmi-calculator-card">
          <h2>
            <BarChart3 size={24} aria-hidden="true" />
            Quick BMI Calculator
          </h2>
          <p>Enter height and weight to calculate BMI instantly.</p>
          <small>You can enter height in centimeters or meters. Examples: 165 or 1.65.</small>

          <label>
            <span>
              <Calculator size={17} aria-hidden="true" />
              Height
            </span>
            <input
              value={height}
              onChange={(event) => setHeight(event.target.value)}
              inputMode="decimal"
              placeholder="e.g., 165 (cm) or 1.65 (m)"
            />
          </label>
          <label>
            <span>
              <BarChart3 size={17} aria-hidden="true" />
              Weight (kg)
            </span>
            <input
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              inputMode="decimal"
              placeholder="e.g., 58.5"
            />
          </label>

          <div className="bmi-presets" aria-label="BMI presets">
            <button type="button" onClick={() => applyPreset('150', '45')}>
              150cm / 45kg
            </button>
            <button type="button" onClick={() => applyPreset('160', '55')}>
              160cm / 55kg
            </button>
            <button type="button" onClick={() => applyPreset('165', '60')}>
              165cm / 60kg
            </button>
            <button type="button" onClick={() => applyPreset('1.70', '68')}>
              1.70m / 68kg
            </button>
            <button type="button" onClick={() => applyPreset('1.75', '75')}>
              1.75m / 75kg
            </button>
            <button type="button" onClick={() => applyPreset('1.80', '85')}>
              1.80m / 85kg
            </button>
          </div>

          <button type="button" className="calculate-bmi-button" onClick={calculateBmi}>
            <Save size={19} aria-hidden="true" />
            CALCULATE BMI
          </button>

          {bmi ? (
            <div className="bmi-result-box">
              <span>BMI Result</span>
              <strong>{bmi.toFixed(2)}</strong>
              <em className={`bmi-status ${category.toLowerCase()}`}>{category}</em>
            </div>
          ) : null}
        </article>

        <article className="panel bmi-student-card">
          <h2>
            <ClipboardList size={24} aria-hidden="true" />
            Find & Record Student
          </h2>
          <form className="bmi-search-row" onSubmit={handleSearchSubmit}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value);
                  updateSuggestions(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Enter Student ID (e.g., S001)"
                aria-autocomplete="list"
                aria-haspopup="true"
              />
              {showSuggestions && suggestions.length > 0 ? (
                <ul className="autocomplete-list" style={{ position: 'absolute', zIndex: 40, background: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,0.08)', width: '100%', margin: 0, padding: 0, listStyle: 'none', maxHeight: 240, overflowY: 'auto' }}>
                  {suggestions.map((s) => (
                    <li
                      key={s.id}
                      role="option"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedStudent(s);
                        setStudentId(s.id);
                        setShowSuggestions(false);
                        toast.success('Student selected');
                      }}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                    >
                      <strong>{s.name}</strong>
                      <div style={{ fontSize: 12, color: '#666' }}>{s.id} — {(s.section || [s.yearLevel, s.program].filter(Boolean).join('/'))}</div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button type="submit">
              <Search size={17} aria-hidden="true" />
              Search
            </button>
          </form>

          {selectedStudent ? (
            <div className="bmi-student-result">
              <strong>{selectedStudent.name}</strong>
              <span>{selectedStudent.id}</span>
              <p>{selectedStudent.section || [selectedStudent.yearLevel, selectedStudent.program].filter(Boolean).join('/')}</p>
              <button type="button" onClick={saveBmiRecord}>
                <Save size={17} aria-hidden="true" />
                Record BMI in Student File
              </button>
            </div>
          ) : (
            <p className="bmi-empty-search">
              <Search size={17} aria-hidden="true" />
              Enter Student ID above to record BMI in their file
            </p>
          )}
        </article>
      </section>

      <article className="panel bmi-info-card">
        <h2>
          <BookOpen size={24} aria-hidden="true" />
          How BMI is Calculated
        </h2>
        <div className="bmi-formula-box">
          <p>
            <strong>BMI Formula:</strong> Weight (kg) divided by height in meters squared
          </p>
          <p>
            <strong>Example 1:</strong> 68 kg / (1.75 m x 1.75 m) = 22.2 (Normal weight)
          </p>
          <p>
            <strong>Example 2:</strong> 55 kg / (1.65 m x 1.65 m) = 20.2 (Normal weight)
          </p>
          <p>
            <strong>Tip:</strong> You can enter height in centimeters or meters. The system converts automatically.
          </p>
        </div>
      </article>

      <article className="panel bmi-records-card">
        <h2>
          <ClipboardList size={24} aria-hidden="true" />
          Recent BMI Records
        </h2>
        <p>Showing the most recent BMI measurements</p>
        <table className="bmi-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Student ID</th>
              <th>Height</th>
              <th>Weight</th>
              <th>BMI</th>
              <th>Status</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {recentRecords.map((record) => (
              <tr key={record.id}>
                <td>
                  <strong>{record.studentName}</strong>
                </td>
                <td>{record.studentId}</td>
                <td>{record.height.toFixed(0)} cm</td>
                <td>{record.weight.toFixed(1)} kg</td>
                <td>
                  <strong>{record.bmi.toFixed(2)}</strong>
                </td>
                <td>
                  <span className={`bmi-status ${record.status.toLowerCase()}`}>{record.status}</span>
                </td>
                <td>{formatBmiDate(record.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <article className="panel bmi-records-card">
        <h2>
          <BookOpen size={24} aria-hidden="true" />
          BMI Reference Guide
        </h2>
        <table className="bmi-table reference">
          <thead>
            <tr>
              <th>Classification</th>
              <th>BMI Range (kg/m2)</th>
              <th>Health Risk</th>
            </tr>
          </thead>
          <tbody>
            <tr className="underweight-row">
              <td>Underweight</td>
              <td>Below 18.5</td>
              <td>Increased risk of nutritional deficiencies</td>
            </tr>
            <tr className="normal-row">
              <td>Normal</td>
              <td>18.5 - 24.9</td>
              <td>Low risk - Healthy weight</td>
            </tr>
            <tr className="overweight-row">
              <td>Overweight</td>
              <td>25.0 - 29.9</td>
              <td>Increased risk of health issues</td>
            </tr>
            <tr className="obese-row">
              <td>Obese</td>
              <td>30.0 and above</td>
              <td>High risk - Medical evaluation recommended</td>
            </tr>
          </tbody>
        </table>
        <small>Note: BMI is a screening tool. For accurate health assessment, consult with healthcare provider.</small>
      </article>
    </section>
  );
}
