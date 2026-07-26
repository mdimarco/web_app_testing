import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useDocStore } from '../store/useDocStore';
import type { SampleName } from '../lib/sampleImages';

const SAMPLES: { id: SampleName; label: string }[] = [
  { id: 'bracket', label: 'Bracket' },
  { id: 'gear', label: 'Gear' },
  { id: 'leaf', label: 'Leaf logo' },
];

function SampleGlyph({ id }: { id: SampleName }) {
  if (id === 'bracket') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M4 4h16v6h-6v10H4V4z" fill="currentColor" />
      </svg>
    );
  }
  if (id === 'gear') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 2v3M12 19v3M22 12h-3M5 12H2M19 5l-2 2M7 17l-2 2M19 19l-2-2M7 7L5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M12 3c5 1 8 5 8 9-4 0-8-2-8-9zM12 21c-5-1-8-5-8-9 4 0 8 2 8 9z" fill="currentColor" />
    </svg>
  );
}

export default function DropZone() {
  const loadImageFile = useDocStore((s) => s.loadImageFile);
  const loadSample = useDocStore((s) => s.loadSample);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    loadImageFile(files[0]);
  }

  return (
    <div
      className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="drop-zone-inner">
        <div className="drop-zone-icon">
          <UploadCloud size={40} strokeWidth={1.3} />
        </div>
        <p>Drop a PNG, JPG, or WebP under 20MB — high-contrast silhouettes work best</p>
        <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>
          Choose file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="sample-row">
          {SAMPLES.map((s) => (
            <button key={s.id} type="button" className="sample-btn" onClick={() => loadSample(s.id)} title={`Use ${s.label} sample`}>
              <SampleGlyph id={s.id} />
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
