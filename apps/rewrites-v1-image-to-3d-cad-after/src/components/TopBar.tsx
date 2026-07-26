import { useEffect, useRef, useState } from 'react';
import { Undo2, Redo2, PanelRight, Box } from 'lucide-react';
import { useDocStore } from '../store/useDocStore';

function middleEllipsis(name: string, max = 28): string {
  if (name.length <= max) return name;
  const keep = Math.floor((max - 1) / 2);
  return `${name.slice(0, keep)}…${name.slice(name.length - keep)}`;
}

export default function TopBar() {
  const filename = useDocStore((s) => s.filename);
  const setFilename = useDocStore((s) => s.setFilename);
  const viewMode = useDocStore((s) => s.viewMode);
  const setViewMode = useDocStore((s) => s.setViewMode);
  const undoStack = useDocStore((s) => s.undoStack);
  const redoStack = useDocStore((s) => s.redoStack);
  const undo = useDocStore((s) => s.undo);
  const redo = useDocStore((s) => s.redo);
  const lastSavedAt = useDocStore((s) => s.lastSavedAt);
  const hasImage = useDocStore((s) => !!s.image);
  const setExportDialogOpen = useDocStore((s) => s.setExportDialogOpen);
  const geometry = useDocStore((s) => s.geometry);
  const setRightPanelOpen = useDocStore((s) => s.setRightPanelOpen);
  const rightPanelOpen = useDocStore((s) => s.rightPanelOpen);

  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState(filename);

  useEffect(() => {
    if (!editingName) setDraft(filename);
  }, [filename, editingName]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (key === 'z') {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <header className="top-bar">
      <div className="wordmark" title="Silhouette — image to mesh solid">
        <span className="chip" />
        <span>SILHOUETTE</span>
        <span className="full" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
          / CAD
        </span>
      </div>

      {editingName ? (
        <input
          className="filename-input mono"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setFilename(draft.trim() || 'untitled');
            setEditingName(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setDraft(filename);
              setEditingName(false);
            }
          }}
        />
      ) : (
        <button type="button" className="filename-input mono" title={filename} onClick={() => setEditingName(true)}>
          {middleEllipsis(filename)}
        </button>
      )}

      <div className="top-bar-center">
        <div className="segmented" role="tablist" aria-label="Viewport">
          <button type="button" role="tab" aria-selected={viewMode === 'source'} className={viewMode === 'source' ? 'active' : ''} onClick={() => setViewMode('source')}>
            Source
          </button>
          <button type="button" role="tab" aria-selected={viewMode === 'solid'} className={viewMode === 'solid' ? 'active' : ''} onClick={() => setViewMode('solid')}>
            Solid
          </button>
        </div>
      </div>

      <div className="top-bar-right">
        <button type="button" className="icon-btn" title="Undo — cannot undo camera moves (⌘Z)" aria-label="Undo" disabled={undoStack.length === 0} onClick={undo}>
          <Undo2 size={16} strokeWidth={1.5} />
        </button>
        <button type="button" className="icon-btn" title="Redo (⇧⌘Z)" aria-label="Redo" disabled={redoStack.length === 0} onClick={redo}>
          <Redo2 size={16} strokeWidth={1.5} />
        </button>
        <div className="autosave-indicator" title={lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Not saved yet'}>
          <span className="autosave-dot" style={{ background: lastSavedAt ? 'var(--ok)' : 'var(--text-disabled)' }} />
          <span>{lastSavedAt ? 'Saved' : 'Autosave'}</span>
        </div>
        <button type="button" className="icon-btn panel-toggle-btn" aria-label="Toggle properties panel" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
          <PanelRight size={16} strokeWidth={1.5} />
        </button>
        <button type="button" className="btn btn-primary" disabled={!hasImage || !geometry} onClick={() => setExportDialogOpen(true)}>
          <Box size={14} strokeWidth={2} style={{ marginRight: 6, verticalAlign: -2 }} />
          Export
        </button>
      </div>
    </header>
  );
}
