import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Download, FolderOpen, FileText, Save, Search, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMedicalDocuments } from '../utils/clinicData';
import type { MedicalDocumentRecord } from '../utils/clinicData';
import { createMedicalDocument, deleteMedicalDocument, loadMedicalDocuments } from '../services/clinicRecords';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export default function MedicalDocuments() {
  const location = useLocation();
  const [documents, setDocuments] = useState<MedicalDocumentRecord[]>(getMedicalDocuments);
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('studentId')?.trim() ?? params.get('studentName')?.trim() ?? '';
  });
  const [yearFilter, setYearFilter] = useState('First Year');
  const [programFilter, setProgramFilter] = useState('BACHELOR OF SCIENCE IN ENTREPRENEURSHIP');

  useEffect(() => {
    loadMedicalDocuments()
      .then(setDocuments)
      .catch(() => toast.error('Unable to load medical documents from the database.'));
  }, []);

  const filteredDocuments = documents.filter((document) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      [document.studentId, document.studentName, document.documentType, document.fileName].some((value) =>
        value.toLowerCase().includes(term),
      );

    return matchesSearch && document.yearLevel === yearFilter && document.program === programFilter;
  });

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const file = form.get('file') as File | null;

    if (!file || !file.name) {
      toast.error('Choose a file to upload');
      return;
    }

    const document: MedicalDocumentRecord = {
      id: `DOC-${Date.now()}`,
      studentId: String(form.get('studentId')).trim(),
      studentName: String(form.get('studentName')).trim(),
      yearLevel: String(form.get('yearLevel')),
      program: String(form.get('program')),
      documentType: String(form.get('documentType')),
      documentDate: String(form.get('documentDate')),
      fileName: file.name,
      remarks: String(form.get('remarks')).trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await createMedicalDocument(document);
      setDocuments([saved, ...documents]);
      setYearFilter(saved.yearLevel);
      setProgramFilter(saved.program);
      target.reset();
      toast.success('Medical document saved');
    } catch {
      toast.error('Medical document was not saved to the database.');
    }
  };

  const removeDocument = async (id: string) => {
    try {
      await deleteMedicalDocument(id);
      setDocuments(documents.filter((document) => document.id !== id));
      toast.success('Document removed');
    } catch {
      toast.error('Medical document was not removed from the database.');
    }
  };

  const downloadSummary = (medicalDocument: MedicalDocumentRecord) => {
    const content = [
      'CCD School Clinic - Medical Document Record',
      `Student ID: ${medicalDocument.studentId}`,
      `Student Name: ${medicalDocument.studentName}`,
      `Year/Program: ${medicalDocument.yearLevel} - ${medicalDocument.program}`,
      `Document Type: ${medicalDocument.documentType}`,
      `Document Date: ${formatDate(medicalDocument.documentDate)}`,
      `File Name: ${medicalDocument.fileName}`,
      `Remarks: ${medicalDocument.remarks || '-'}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${medicalDocument.studentId}-${medicalDocument.documentType}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="medical-docs-page">
      <header className="panel medical-docs-header">
        <div>
          <h2>
            <FolderOpen size={25} aria-hidden="true" />
            Medical Documents Management
          </h2>
          <span>CCD School Clinic - Health Records Archive</span>
        </div>
        <button type="button" onClick={() => window.history.back()}>
          <ArrowLeft size={17} aria-hidden="true" />
          Back to Dashboard
        </button>
      </header>

      <section className="medical-docs-grid">
        <form className="panel medical-upload-form" onSubmit={handleUpload}>
          <h2>
            <Upload size={24} aria-hidden="true" />
            Upload Medical Document
          </h2>
          <p>Fill in student details and upload document. It will be automatically organized.</p>

          <div className="medical-form-grid">
            <label>
              Student ID / Number *
              <input name="studentId" placeholder="e.g., S001" required />
            </label>
            <label>
              Student Full Name *
              <input name="studentName" placeholder="e.g., Juan Dela Cruz" required />
            </label>
            <label>
              Year Level *
              <select name="yearLevel" required defaultValue="">
                <option value="" disabled>
                  Select
                </option>
                <option>First Year</option>
                <option>Second Year</option>
                <option>Third Year</option>
                <option>Fourth Year</option>
              </select>
            </label>
            <label>
              Program *
              <select name="program" required defaultValue="">
                <option value="" disabled>
                  Select
                </option>
                <option>BACHELOR OF SCIENCE IN ENTREPRENEURSHIP</option>
                <option>BTVTED</option>
                <option>BACHELOR OF EARLY CHILDHOOD EDUCATION</option>
              </select>
            </label>
            <label>
              Document Type *
              <select name="documentType" required defaultValue="">
                <option value="" disabled>
                  Select
                </option>
                <option>Medical Certificate</option>
                <option>Laboratory Result</option>
                <option>Referral Form</option>
                <option>Prescription</option>
                <option>Vaccination Record</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Document Date *
              <input name="documentDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </label>
          </div>

          <label>
            Upload File *
            <input name="file" type="file" required />
            <small>JPG, PNG, GIF, PDF, DOC, TXT, HEIC (Max 10MB)</small>
          </label>
          <label>
            Remarks (Optional)
            <textarea name="remarks" rows={3} placeholder="Additional notes" />
          </label>

          <button type="submit" className="medical-save-button">
            <Save size={17} aria-hidden="true" />
            Save Document
          </button>
        </form>

        <article className="panel medical-library">
          <h2>
            <FolderOpen size={24} aria-hidden="true" />
            Medical Documents Library
          </h2>

          <div className="medical-search-row">
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by student name or ID..." />
            <button type="button" onClick={() => toast.success('Search updated')}>
              <Search size={16} aria-hidden="true" />
              Search
            </button>
          </div>

          <div className="medical-filter-row" aria-label="Year level filters">
            {['First Year', 'Second Year', 'Third Year', 'Fourth Year'].map((year) => (
              <button key={year} type="button" className={yearFilter === year ? 'active' : ''} onClick={() => setYearFilter(year)}>
                {year}
              </button>
            ))}
          </div>
          <div className="medical-filter-row program" aria-label="Program filters">
            {['BACHELOR OF SCIENCE IN ENTREPRENEURSHIP', 'BTVTED', 'BACHELOR OF EARLY CHILDHOOD EDUCATION'].map((program) => (
              <button key={program} type="button" className={programFilter === program ? 'active' : ''} onClick={() => setProgramFilter(program)}>
                {program}
              </button>
            ))}
          </div>

          <div className="medical-document-list">
            {filteredDocuments.length ? (
              filteredDocuments.map((document) => (
                <div className="medical-document-item" key={document.id}>
                  <FileText size={24} aria-hidden="true" />
                  <div>
                    <strong>{document.studentName}</strong>
                    <span>
                      {document.studentId} | {document.documentType} | {formatDate(document.documentDate)}
                    </span>
                    <small>{document.fileName}</small>
                    {document.remarks ? <p>{document.remarks}</p> : null}
                  </div>
                  <div className="medical-document-actions">
                    <button type="button" onClick={() => downloadSummary(document)}>
                      <Download size={16} aria-hidden="true" />
                      Download
                    </button>
                    <button type="button" className="danger" onClick={() => removeDocument(document.id)}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="medical-empty-state">
                <FolderOpen size={22} aria-hidden="true" />
                <p>No students found for {yearFilter} - {programFilter}</p>
                <span>Upload documents using the form on the left.</span>
              </div>
            )}
          </div>
        </article>
      </section>
    </section>
  );
}
