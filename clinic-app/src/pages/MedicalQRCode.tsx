import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ClipboardList, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MedicalQRCode() {
  const [patientId, setPatientId] = useState('S-1001');
  const [host, setHost] = useState(() => {
    if (typeof window === 'undefined') return 'localhost:5175';
    return window.location.host;
  });
  const [generated, setGenerated] = useState(false);

  const origin = typeof window !== 'undefined' ? `${window.location.protocol}//${host}` : 'http://localhost:5175';
  const directLink = `${origin}/ccdclinic/medical-docs?studentId=${encodeURIComponent(patientId.trim())}`;

  const generate = () => {
    if (!patientId.trim()) {
      toast.error('Enter a student or record ID');
      return;
    }

    setGenerated(true);
    toast.success('QR ready for scanning');
  };

  const copyLink = () => {
    navigator.clipboard
      .writeText(directLink)
      .then(() => toast.success('Direct link copied'))
      .catch(() => toast.error('Copy failed'));
  };

  return (
    <section className="medical-qr-page">
      <header className="medical-qr-header panel">
        <div>
          <h2>
            <ClipboardList size={24} aria-hidden="true" />
            Medical Documents QR Code
          </h2>
          <span>Scan to upload medical documents using your phone camera.</span>
        </div>
      </header>

      <section className="medical-qr-grid">
        <article className="panel medical-qr-card">
          <div className="medical-qr-link">
            <span style={{ fontWeight: 800 }}>Direct Upload URL</span>
            <strong>{directLink}</strong>
          </div>

          <div className="medical-qr-notice">
            <strong>Important for mobile access:</strong>
            <ul>
              <li>Phone must be on the same Wi-Fi as this computer.</li>
              <li>If localhost does not work on your phone, replace it with your computer's local IP address.</li>
              <li>The QR will work when the link points to a reachable host like <code>192.168.x.x:5175</code>.</li>
            </ul>
          </div>

          <div className="medical-qr-card-body">
            <label>
              Student / Record ID
              <input
                value={patientId}
                onChange={(event) => {
                  setPatientId(event.target.value);
                  setGenerated(false);
                }}
                placeholder="e.g., S-1001"
              />
            </label>

            <label>
              QR Host / IP address
              <input
                value={host}
                onChange={(event) => setHost(event.target.value)}
                placeholder="localhost:5175 or 192.168.1.10:5175"
              />
            </label>

            <div className="medical-qr-actions">
              <button type="button" onClick={generate}>
                Generate QR
              </button>
              <button type="button" onClick={copyLink}>
                <Search size={14} aria-hidden="true" />
                Copy URL
              </button>
            </div>
          </div>

          <article className="medical-qr-instructions">
            <h3>How to Use</h3>
            <ol>
              <li>Scan the QR code using your phone camera.</li>
              <li>Open the link on the same Wi-Fi network.</li>
              <li>Fill student details and choose document type.</li>
              <li>Upload the medical document.</li>
              <li>Save to store the document in the clinic system.</li>
            </ol>
          </article>
        </article>

        <article className="panel medical-qr-preview">
          <h2>QR Code Preview</h2>
          <div className="qr-panel">
            <QRCodeSVG value={directLink} size={260} bgColor="#ffffff" fgColor="#0e4527" />
            <p>{directLink}</p>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <button type="button" onClick={copyLink}>
              Copy Direct URL
            </button>
            <button type="button" onClick={generate}>
              {generated ? 'QR Ready' : 'Refresh QR'}
            </button>
          </div>
        </article>
      </section>
    </section>
  );
}
