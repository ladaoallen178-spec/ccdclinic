import { useEffect, useMemo, useState, useRef } from 'react';
import { getVisits, getStudents, getStaff } from '../utils/clinicData';
import type { StaffRecord, StudentRecord, VisitRecord } from '../utils/clinicData';
import { loadStaff, loadStudents, loadVisits } from '../services/clinicRecords';

const CONDITION_LIST = [
  'Eye Problem',
  'Sore Throat',
  'Toothache',
  'Abdominal Pain',
  'Headache',
  'Fever',
  'Colds',
  'Hyperacidity',
  'Dysmenorrhea',
  'Diarrhea',
  'Nausea & Vomiting',
  'Fainting',
  'Dizziness',
  'Open Wound',
  'Skin Rashes',
  'Hyperventilation',
  'Others',
  'Consultation',
];

function monthName(m: number) {
  return new Date(0, m - 1).toLocaleString(undefined, { month: 'long' });
}

export default function MonthlyReport() {
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const reportRef = useRef<HTMLDivElement | null>(null);

  const [visits, setVisits] = useState<VisitRecord[]>(getVisits);
  const [students, setStudents] = useState<StudentRecord[]>(getStudents);
  const [staff, setStaff] = useState<StaffRecord[]>(getStaff);

  useEffect(() => {
    Promise.all([loadVisits(), loadStudents(), loadStaff()])
      .then(([nextVisits, nextStudents, nextStaff]) => {
        setVisits(nextVisits);
        setStudents(nextStudents);
        setStaff(nextStaff);
      })
      .catch(() => undefined);
  }, []);

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (!v.createdAt) return false;
      const d = new Date(v.createdAt);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
  }, [visits, month, year]);

  const metrics = useMemo(() => {
    const conditionCounts: Record<string, number> = {};
    CONDITION_LIST.forEach((c) => (conditionCounts[c] = 0));
    let male = 0;
    let female = 0;

    filteredVisits.forEach((v: VisitRecord) => {
      const reason = (v.reasonForVisit || '').toLowerCase();
      let matched = false;
      for (const cond of CONDITION_LIST) {
        if (cond === 'Others' || cond === 'Consultation') continue;
        if (reason.indexOf(cond.toLowerCase()) !== -1) {
          conditionCounts[cond] = (conditionCounts[cond] || 0) + 1;
          matched = true;
          break;
        }
      }
      if (!matched) {
        // group as Others unless it explicitly matches Consultation
        if (reason.indexOf('consult') !== -1) {
          conditionCounts['Consultation'] = (conditionCounts['Consultation'] || 0) + 1;
        } else {
          conditionCounts['Others'] = (conditionCounts['Others'] || 0) + 1;
        }
      }

      // determine gender by matching with students or staff
      const id = v.idNumber;
      const st = students.find((s) => s.id === id);
      if (st && st.gender) {
        if (st.gender.toLowerCase().startsWith('m')) male++;
        else if (st.gender.toLowerCase().startsWith('f')) female++;
      } else {
        const sf = staff.find((s) => s.id === id);
        if (sf && sf.gender) {
          if (sf.gender.toLowerCase().startsWith('m')) male++;
          else if (sf.gender.toLowerCase().startsWith('f')) female++;
        }
      }
    });

    return {
      totalAdmissions: filteredVisits.length,
      patientsTreated: filteredVisits.length,
      male,
      female,
      conditionCounts,
    };
  }, [filteredVisits, students, staff]);

  const years = useMemo(() => {
    const set = new Set<number>();
    visits.forEach((v) => {
      if (!v.createdAt) return;
      set.add(new Date(v.createdAt).getFullYear());
    });
    const current = now.getFullYear();
    // ensure years include a range around the current year (previous 5 and next 5 years)
    for (let y = current + 5; y >= current - 5; y--) set.add(y);
    return Array.from(set).sort((a, b) => b - a);
  }, [visits, now]);

  function handlePrint() {
    if (!reportRef.current) return;
    const html = `
      <html>
        <head>
          <title>Monthly Report - ${monthName(month)} ${year}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 20px; }
            .report { width: 800px; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; font-size: 14px }
            table, th, td { border: 1px solid #333 }
            th, td { padding: 8px; text-align: left }
            .summary { display:flex; gap:12px; margin:12px 0 }
            .box { flex:1; background:#f5f7fb; padding:12px; text-align:center }
            .center { text-align:center }
          </style>
        </head>
        <body>
          <div class="report">${reportRef.current.innerHTML}</div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank', 'width=900,height=900');
    if (!win) {
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      try {
        win.focus();
        win.print();
      } catch {
        // ignore print errors when blocked
      }
    };
    setTimeout(() => {
      if (!win.closed) {
        try {
          win.focus();
          win.print();
        } catch {
          // ignore fallback print errors
        }
      }
    }, 800);
  }

  async function exportPdf() {
    if (!reportRef.current) return;
    const element = reportRef.current as HTMLElement;
    // load libraries dynamically to avoid import-time issues
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgProps = (pdf as any).getImageProperties(imgData);
    const imgWidthMm = pdfWidth;
    const imgHeightMm = (imgProps.height * imgWidthMm) / imgProps.width;

    let position = 10;
    pdf.addImage(imgData, 'PNG', 10, position, imgWidthMm - 20, imgHeightMm);

    let heightLeft = imgHeightMm - (pdfHeight - 20);
    while (heightLeft > 0) {
      pdf.addPage();
      position = - (imgHeightMm - heightLeft) + 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidthMm - 20, imgHeightMm);
      heightLeft -= (pdfHeight - 20);
    }

    pdf.save(`monthly-report-${month}-${year}.pdf`);
  }

  return (
    <div className="page-content">
      <article className="panel">
        <h1>Monthly Report</h1>
        <p>Generate clinic performance reports for the selected month.</p>
      </article>

      <article className="panel" style={{ display: 'grid', gap: 12 }}>
        <div className="report-controls">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option value={m} key={m}>{monthName(m)}</option>
            ))}
          </select>

          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button type="button" onClick={() => { /* generate simply recalculates via state */ }}>
            Generate Report
          </button>
          <button type="button" onClick={handlePrint}>Print Report</button>
          <button type="button" onClick={exportPdf}>Download PDF</button>
        </div>

        <div ref={reportRef} className="report-container">
          <div className="report-paper">
            <div className="report-header" style={{ borderBottom: '3px solid #9fb6ad', paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src="/images/logo.png" alt="CCD Seal" style={{ width: 92, height: 92, objectFit: 'contain' }} />
                </div>

                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 34, fontWeight: 800, color: '#6faea3', letterSpacing: 1 }}>
                    CITY COLLEGE OF DAVAO
                  </div>
                  <div style={{ fontSize: 18, color: '#6faea3', marginTop: 6 }}>
                    Health & Sanitation Office
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#6faea3' }}>
                    Km. 10, Catalunan Pequeño, Davao City • +63 (082) 241 7380 • admin@ccd.edu.ph • facebook.com/CityCollegeofDavaoOfficial
                  </div>
                </div>

                <div style={{ width: 88 }} />
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{monthName(month).toUpperCase()} {year}</div>
            </div>

            <div className="report-summary">
              <div className="summary-box">
                <div style={{ fontSize: 20, fontWeight: 700 }}>{metrics.totalAdmissions}</div>
                <div>Total Admissions</div>
              </div>
              <div className="summary-box">
                <div style={{ fontSize: 20, fontWeight: 700 }}>{metrics.patientsTreated}</div>
                <div>Patients Treated</div>
              </div>
              <div className="summary-box">
                <div style={{ fontSize: 20, fontWeight: 700 }}>{metrics.male} / {metrics.female}</div>
                <div>Male / Female</div>
              </div>
            </div>

            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', padding: 8 }}>CHIEF COMPLAINT / CONDITION REQUIRING TREATMENT</th>
                  <th style={{ border: '1px solid #000', padding: 8, width: 120 }}>NUMBER OF PATIENTS</th>
                </tr>
              </thead>
              <tbody>
                {CONDITION_LIST.filter((cond) => (metrics.conditionCounts[cond] ?? 0) > 0).map((cond) => (
                  <tr key={cond}>
                    <td style={{ border: '1px solid #000', padding: 8 }}>{cond}</td>
                    <td style={{ border: '1px solid #000', padding: 8, textAlign: 'center' }}>{metrics.conditionCounts[cond] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 12, border: '1px solid #000', padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div>Number of Admissions:</div>
                  <div>Number of Patients Treated:</div>
                  <div>Male:</div>
                  <div>Female:</div>
                  <div style={{ fontWeight: 700 }}>TOTAL:</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>{metrics.totalAdmissions}</div>
                  <div>{metrics.patientsTreated}</div>
                  <div>{metrics.male}</div>
                  <div>{metrics.female}</div>
                  <div style={{ fontWeight: 700 }}>{metrics.patientsTreated}</div>
                </div>
              </div>
            </div>

            {/* Footer removed per request */}
          </div>
        </div>
      </article>
    </div>
  );
}
