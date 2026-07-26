import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Download } from 'lucide-react';
import { useDocStore } from '../store/useDocStore';
import { exportGeometry, downloadBlob } from '../lib/exporters';
import type { ExportFormat } from '../lib/types';
import ExportPreview from './ExportPreview';

const FORMATS: { id: ExportFormat; name: string; desc: string; ext: string }[] = [
  { id: 'stl', name: 'STL', desc: 'Binary · widest print support', ext: 'stl' },
  { id: 'obj', name: 'OBJ', desc: 'Text mesh + normals', ext: 'obj' },
  { id: 'glb', name: 'GLB', desc: 'glTF binary, viewer-ready', ext: 'glb' },
];

function fmtMm(v: number): string {
  return v >= 100 ? v.toFixed(0) : v.toFixed(1);
}

export default function ExportDialog() {
  const open = useDocStore((s) => s.exportDialogOpen);
  const setOpen = useDocStore((s) => s.setExportDialogOpen);
  const geometry = useDocStore((s) => s.geometry);
  const filename = useDocStore((s) => s.filename);
  const [format, setFormat] = useState<ExportFormat>('stl');
  const [busy, setBusy] = useState(false);

  if (!geometry) return null;

  const { bbox, triangleCount, watertight, openEdges } = geometry;
  const outFilename = `${filename}-${fmtMm(bbox.w)}x${fmtMm(bbox.d)}x${fmtMm(bbox.h)}mm.${format}`;
  const estBytes = format === 'stl' ? triangleCount * 50 + 84 : format === 'obj' ? triangleCount * 90 : triangleCount * 24;
  const estMb = estBytes / (1024 * 1024);

  async function handleExport() {
    if (!geometry) return;
    setBusy(true);
    try {
      const blob = await exportGeometry(geometry, format);
      downloadBlob(blob, outFilename);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">Export solid</Dialog.Title>
          <Dialog.Close asChild>
            <button className="dialog-close" aria-label="Close">
              <X size={18} strokeWidth={1.5} />
            </button>
          </Dialog.Close>

          <div className="export-preview">
            <ExportPreview geometry={geometry} />
          </div>

          <div className="field-row">
            <span className="tri-count">{triangleCount.toLocaleString('en-US')}</span>
            <span className={`badge ${watertight ? 'badge-ok' : 'badge-warn'}`}>
              {watertight ? '✓ watertight' : `⚠ ${openEdges} open edges`}
            </span>
          </div>

          <div className="format-options" role="radiogroup" aria-label="Export format">
            {FORMATS.map((f) => (
              <button key={f.id} type="button" className={`format-option ${format === f.id ? 'selected' : ''}`} role="radio" aria-checked={format === f.id} onClick={() => setFormat(f.id)}>
                <span className="fmt-name">{f.name}</span>
                <span className="fmt-desc">{f.desc}</span>
              </button>
            ))}
          </div>

          <div className="export-bbox mono">
            Bounding box: {bbox.w.toFixed(1)} × {bbox.d.toFixed(1)} × {bbox.h.toFixed(1)} mm
            {estMb > 40 && <span style={{ color: 'var(--warn)', display: 'block', marginTop: 4 }}>⚠ Estimated export ≈ {estMb.toFixed(0)}MB — may exceed 40MB</span>}
          </div>

          <div className="field-row" style={{ marginBottom: 4 }}>
            <span className="field-label">File name</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }} title={outFilename}>
              {outFilename.length > 34 ? `${outFilename.slice(0, 16)}…${outFilename.slice(-14)}` : outFilename}
            </span>
          </div>

          <p className="export-disclosure">
            <strong>Mesh solid (triangles), not a parametric CAD body</strong> — STEP/BREP unsupported. All computation runs on-device; nothing is uploaded.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleExport} disabled={busy}>
              <Download size={14} strokeWidth={2} style={{ marginRight: 6, verticalAlign: -2 }} />
              {busy ? 'Exporting…' : `Export ${format.toUpperCase()}`}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
