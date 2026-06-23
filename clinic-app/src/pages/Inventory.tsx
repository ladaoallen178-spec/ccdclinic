import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PlusCircle, Search, Trash, Plus, ArrowLeft, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { getInventory, saveInventory } from '../utils/clinicData';
import {
  createInventoryLog,
  deleteInventoryRecord,
  loadInventory,
  loadInventoryLogs,
  saveInventoryRecord,
} from '../services/clinicRecords';

type InventoryRow = {
  id: string;
  name: string;
  dosage?: string;
  stock: number;
  unit?: string;
  status?: string;
  expiry?: string;
  supplier?: string;
  location?: string;
  remarks?: string;
  keywords?: string[];
  createdAt?: string;
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

const LOG_KEY = 'clinic-inventory-log';
const INVENTORY_IMPORT_FIELDS = {
  name: ['medicine name', 'item name', 'name', 'medicine', 'item', 'product', 'supply name'],
  dosage: ['dosage', 'dose', 'strength'],
  stock: ['quantity', 'qty', 'stock', 'stock count', 'current stock', 'on hand'],
  unit: ['unit', 'uom', 'measure'],
  expiry: ['expiry', 'expiration', 'expiration date', 'expiry date', 'expires'],
  supplier: ['supplier', 'vendor', 'source'],
  location: ['location', 'storage location', 'cabinet', 'shelf'],
  remarks: ['remarks', 'notes', 'note', 'description'],
};

type SpreadsheetRow = Record<string, unknown>;

function readLogs(): InventoryLog[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: InventoryLog[]) {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  window.dispatchEvent(new Event('clinic-data-changed'));
}

function genId(prefix = 'INV') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function readImportCell(row: SpreadsheetRow, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  const entry = Object.entries(row).find(([key]) => normalizedAliases.includes(normalizeHeader(key)));
  return entry?.[1];
}

function toText(value: unknown) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function toStock(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  const text = toText(value).replace(/,/g, '');
  const match = text.match(/-?\d+(\.\d+)?/);
  return match ? Math.max(0, Math.floor(Number(match[0]))) : 0;
}

function toDateInputValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = toText(value);
  if (!text) return '';

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}

export default function Inventory() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<InventoryRow[]>(() => {
    const loaded = getInventory();
    return Array.isArray(loaded)
      ? (loaded as any[]).map((it, idx) => ({
          id: it.id || `legacy-${idx}`,
          name: it.name || it.item || it.label || '',
          stock: typeof it.stock === 'number' ? it.stock : Number(it.stock) || 0,
          status: it.status || (it.stock > 0 ? 'In Stock' : 'Out of Stock'),
          dosage: it.dosage || '',
          unit: it.unit || 'tablet',
          expiry: it.expiry || '',
          supplier: it.supplier || '',
          location: it.location || '',
          remarks: it.remarks || '',
          keywords: it.keywords || [],
          createdAt: it.createdAt || new Date().toISOString(),
        }))
      : [];
  });

  const [logs, setLogs] = useState<InventoryLog[]>(() => readLogs());
  const [search, setSearch] = useState('');

  // form state
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('tablet');
  const [expiry, setExpiry] = useState('');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showNewItemForm, setShowNewItemForm] = useState(true);
  const [isUploadingInventory, setIsUploadingInventory] = useState(false);

  useEffect(() => {
    saveInventory(items as any);
  }, [items]);

  useEffect(() => {
    loadInventory()
      .then((records) => setItems(records as InventoryRow[]))
      .catch(() => toast.error('Unable to load inventory from the database.'));

    loadInventoryLogs()
      .then(setLogs)
      .catch(() => toast.error('Unable to load inventory logs from the database.'));
  }, []);

  async function addLog(entry: Omit<InventoryLog, 'id' | 'dateTime'>) {
    const now = new Date();
    const next: InventoryLog = { id: genId('LOG'), dateTime: now.toISOString(), ...entry };
    try {
      const saved = await createInventoryLog(next);
      const nextLogs = [saved, ...logs];
      setLogs(nextLogs);
      saveLogs(nextLogs);
    } catch {
      toast.error('Inventory log was not saved to the database.');
    }
  }

  function detectKeywords(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6);
  }

  function clearForm() {
    setName('');
    setDosage('');
    setQuantity('');
    setUnit('tablet');
    setExpiry('');
    setSupplier('');
    setLocation('');
    setRemarks('');
  }

  function mapSpreadsheetRowToInventory(row: SpreadsheetRow): InventoryRow | null {
    const itemName = toText(readImportCell(row, INVENTORY_IMPORT_FIELDS.name));
    if (!itemName) return null;

    const stock = toStock(readImportCell(row, INVENTORY_IMPORT_FIELDS.stock));

    return {
      id: genId(),
      name: itemName,
      dosage: toText(readImportCell(row, INVENTORY_IMPORT_FIELDS.dosage)),
      stock,
      unit: toText(readImportCell(row, INVENTORY_IMPORT_FIELDS.unit)) || 'tablet',
      status: stock > 0 ? 'In Stock' : 'Out of Stock',
      expiry: toDateInputValue(readImportCell(row, INVENTORY_IMPORT_FIELDS.expiry)),
      supplier: toText(readImportCell(row, INVENTORY_IMPORT_FIELDS.supplier)),
      location: toText(readImportCell(row, INVENTORY_IMPORT_FIELDS.location)),
      remarks: toText(readImportCell(row, INVENTORY_IMPORT_FIELDS.remarks)),
      keywords: detectKeywords(itemName),
      createdAt: new Date().toISOString(),
    };
  }

  async function handleInventoryFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingInventory(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;

      if (!firstSheet) {
        toast.error('The selected file does not contain a worksheet.');
        return;
      }

      const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(firstSheet, { defval: '', raw: false });
      const importedRows = rows.map(mapSpreadsheetRowToInventory).filter((row): row is InventoryRow => Boolean(row));

      if (importedRows.length === 0) {
        toast.error('No inventory rows found. Include a Medicine Name or Item Name column.');
        return;
      }

      const savedRows: InventoryRow[] = [];
      for (const row of importedRows) {
        const saved = await saveInventoryRecord(row);
        savedRows.push(saved as InventoryRow);
      }

      setItems((current) => [...savedRows, ...current]);
      await addLog({
        medicine: `${savedRows.length} imported item${savedRows.length === 1 ? '' : 's'}`,
        action: 'Excel Upload',
        qty: savedRows.reduce((sum, row) => sum + row.stock, 0),
        notes: file.name,
      });
      toast.success(`${savedRows.length} inventory item${savedRows.length === 1 ? '' : 's'} uploaded`);
    } catch {
      toast.error('Unable to read the Excel file.');
    } finally {
      setIsUploadingInventory(false);
      event.target.value = '';
    }
  }

  async function handleAddMedicine(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) {
      toast.error('Medicine name is required');
      return;
    }
    const qty = Number(quantity) || 0;
    const newItem: InventoryRow = {
      id: genId(),
      name: name.trim(),
      dosage: dosage.trim(),
      stock: qty,
      unit: unit || 'tablet',
      status: qty > 0 ? 'In Stock' : 'Out of Stock',
      expiry: expiry || '',
      supplier: supplier || '',
      location: location || '',
      remarks: remarks || '',
      keywords: detectKeywords(name),
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await saveInventoryRecord(newItem);
      const next = [saved as InventoryRow, ...items];
      setItems(next);
      await addLog({ medicine: saved.name, action: 'Medicine added to inventory', qty: saved.stock, notes: '' });
      clearForm();
      toast.success('Medicine added to inventory');
    } catch {
      toast.error('Medicine was not saved to the database.');
    }
  }

  async function handleAddStock(itemId: string) {
    const entry = prompt('Enter quantity to add (positive integer):', '1');
    if (!entry) return;
    const qty = Number(entry);
    if (!qty || qty <= 0) {
      toast.error('Invalid quantity');
      return;
    }
    const next = items.map((it) => (it.id === itemId ? { ...it, stock: it.stock + qty, status: it.stock + qty > 0 ? 'In Stock' : 'Out of Stock' } : it));
    const item = next.find((i) => i.id === itemId)!;

    try {
      const saved = await saveInventoryRecord(item);
      setItems(next.map((it) => (it.id === itemId ? (saved as InventoryRow) : it)));
      await addLog({ medicine: saved.name, action: 'Stock Added', qty, notes: '' });
      toast.success('Stock updated');
    } catch {
      toast.error('Stock update was not saved to the database.');
    }
  }

  async function handleDelete(itemId: string) {
    if (!confirm('Delete this inventory item? This cannot be undone.')) return;
    const removed = items.find((it) => it.id === itemId);
    try {
      await deleteInventoryRecord(itemId);
      const next = items.filter((it) => it.id !== itemId);
      setItems(next);
      await addLog({ medicine: removed?.name || 'Unknown', action: 'Deleted Item', qty: removed?.stock, notes: '' });
      toast.success('Item deleted');
    } catch {
      toast.error('Inventory item was not deleted from the database.');
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => `${it.name} ${it.dosage || ''} ${it.keywords?.join(' ') || ''}`.toLowerCase().includes(term));
  }, [items, search]);

  const stats = useMemo(() => {
    return {
      totalTypes: items.length,
      totalStock: items.reduce((sum, it) => sum + it.stock, 0),
      lowStock: items.filter((it) => it.stock <= 10).length,
      autoKeywords: items.reduce((sum, it) => sum + (it.keywords?.length || 0), 0),
    };
  }, [items]);

  return (
    <section className="inventory-page">
      <header className="panel inventory-header">
        <h2>
          Clinic Inventory Management System
        </h2>
        <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
          <button type="button" onClick={() => navigate('/dashboard')} style={{ background: '#6b7280' }}>
            <ArrowLeft size={17} aria-hidden="true" />
            Back to Dashboard
          </button>
          <button type="button" onClick={() => navigate('/login')} style={{ background: '#dc2630' }}>
            Logout
          </button>
        </div>
      </header>

      <section className="inventory-actions">
        <button type="button" className="primary-button" onClick={() => setShowNewItemForm(true)}>
          <PlusCircle size={18} /> Add New Item
        </button>
        <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingInventory}>
          <Upload size={18} /> {isUploadingInventory ? 'Uploading...' : 'Upload Excel'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleInventoryFileUpload}
          style={{ display: 'none' }}
        />
        <button type="button" className="secondary-button" onClick={() => setShowNewItemForm((prev) => !prev)}>
          {showNewItemForm ? 'Hide' : 'Manage'} Items
        </button>
      </section>

      <section className="inventory-stats">
        <article className="panel" style={{ textAlign: 'center', padding: 20 }}>
          <strong style={{ fontSize: '2rem', color: '#05351b' }}>{stats.totalTypes}</strong>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Total Medicine Types</p>
        </article>
        <article className="panel" style={{ textAlign: 'center', padding: 20 }}>
          <strong style={{ fontSize: '2rem', color: '#05351b' }}>{stats.totalStock}</strong>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Total Stock Count</p>
        </article>
        <article className="panel" style={{ textAlign: 'center', padding: 20 }}>
          <strong style={{ fontSize: '2rem', color: '#05351b' }}>{stats.lowStock}</strong>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Low Stock Items (≤10)</p>
        </article>
        <article className="panel" style={{ textAlign: 'center', padding: 20 }}>
          <strong style={{ fontSize: '2rem', color: '#05351b' }}>{stats.autoKeywords}</strong>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>Auto-Detect Keywords</p>
        </article>
      </section>

      {showNewItemForm && (
        <article className="panel" style={{ display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 18 }}>
            <form className="entry-form" onSubmit={handleAddMedicine}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '2px solid #e5e7eb', fontSize: '1.35rem', marginTop: 0 }}>
              <PlusCircle size={20} /> Add New Medicine to Inventory
            </h2>

            <label>
              <span>Item Type:</span>
              <select>
                <option>Medication</option>
                <option>Supply</option>
              </select>
            </label>

            <label>
              <span>Medicine Name:</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Paracetamol" />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
              <label>
                <span>Dosage:</span>
                <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g., 500 mg" />
              </label>

              <label>
                <span>Quantity:</span>
                <input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" placeholder="e.g., 100" />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label>
                <span>Unit:</span>
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option>tablet</option>
                  <option>bottle</option>
                  <option>box</option>
                </select>
              </label>
              <label>
                <span>Expiration Date:</span>
                <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </label>
            </div>

            <label>
              <span>Supplier:</span>
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g., Mercury Drug, Watsons" />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label>
                <span>Location:</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Cabinet A, Shelf 1" />
              </label>
            </div>

            <label>
              <span>Remarks:</span>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Additional notes" style={{ resize: 'vertical', minHeight: 80 }} />
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" style={{ flex: 1 }}>
                <Plus size={16} /> Add Medicine
              </button>
            </div>
          </form>

          <div>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 12 }}>⚡ How Auto-Deduction Works</h2>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: '8px 0' }}>
              <strong>1. Add Medicine:</strong> When you add "Biogesic 500mg", the system automatically detects keywords "biogesic" and "500mg".
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: '8px 0' }}>
              <strong>2. During Patient Visit:</strong> Nurse types "Give paracetamol for fever" in Medicine Given field.
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: '8px 0' }}>
              <strong>3. Automatic Deduction:</strong> System finds "paracetamol" and deducts 1 from stock.
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: '12px 0 0' }}>
              ✓ <strong>Student Tracking:</strong> When medicine is given to a student, their Student ID and Name are automatically recorded in the inventory logs.
            </p>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: '8px 0' }}>
              ✓ <strong>Supported Keywords:</strong> Paracetamol, Ibuprofen, Amoxicillin, Cetirizine, Loratadine, Mefenamic, Hyoscine, Loperamide, Omeprazole, Metformin, Losartan, Amlodipine, Ascorbic Acid, Ferrous Sulfate, Azithromycin, Cephalexin, and many more.
            </p>
          </div>
        </div>

        <section>
          <h2 style={{ fontSize: '1.3rem', paddingBottom: 12, borderBottom: '2px solid #e5e7eb', marginTop: 0 }}>Current Inventory Stock</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
            <Search size={16} />
            <input placeholder="Search medicine..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, maxWidth: 300 }} />
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Medicine Name</th>
                <th>Dosage</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Keywords</th>
                <th>Status</th>
                <th>Expiry Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it, idx) => (
                <tr key={it.id}>
                  <td>{idx + 1}</td>
                  <td><strong>{it.name}</strong></td>
                  <td>{it.dosage || '—'}</td>
                  <td>{it.stock}</td>
                  <td>{it.unit}</td>
                  <td>
                    {(it.keywords || []).map((k) => (
                      <em key={k} style={{ marginRight: 6, background: '#eef2ff', padding: '4px 8px', borderRadius: 999, fontSize: '0.75rem' }}>{k}</em>
                    ))}
                  </td>
                  <td>
                    <span className={`status ${it.stock > 0 ? 'cleared' : 'pending'}`}>{it.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                  </td>
                  <td>{it.expiry ? new Date(it.expiry).toLocaleDateString() : '—'}</td>
                  <td>
                    <div className="button-row">
                      <button type="button" onClick={() => handleAddStock(it.id)} style={{ background: '#10b981' }}>
                        <Plus size={14} /> Add Stock
                      </button>
                      <button type="button" onClick={() => handleDelete(it.id)} style={{ background: '#ef4444' }}>
                        <Trash size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: '1.3rem', paddingBottom: 12, borderBottom: '2px solid #e5e7eb', marginTop: 0 }}>📋 Inventory Activity Log - Student Medicine Records</h2>
          <table>
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Medicine</th>
                <th>Action</th>
                <th>Qty</th>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Staff ID</th>
                <th>Staff Name</th>
                <th>Performed By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.dateTime}</td>
                  <td>{l.medicine || '—'}</td>
                  <td>{l.action}</td>
                  <td>{l.qty ?? '—'}</td>
                  <td>{l.studentId || '—'}</td>
                  <td>{l.studentName || '—'}</td>
                  <td>{l.staffId || '—'}</td>
                  <td>{l.staffName || '—'}</td>
                  <td>{l.performedBy || '>Master Admin'}</td>
                  <td>{l.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        </article>
      )}
    </section>
  );
}

