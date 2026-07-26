import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useDocStore } from '../store/useDocStore';

export default function StatusBar() {
  const stageZoom = useDocStore((s) => s.stageZoom);
  const cursorMm = useDocStore((s) => s.cursorMm);
  const geometry = useDocStore((s) => s.geometry);
  const status = useDocStore((s) => s.status);
  const viewMode = useDocStore((s) => s.viewMode);

  const zoomPct = Math.round(stageZoom * 100);

  return (
    <footer className="status-bar mono">
      {viewMode === 'source' && (
        <span className="status-item">
          Zoom <b>{zoomPct}%</b>
        </span>
      )}
      {viewMode === 'source' && (
        <span className="status-item">
          Cursor <b>{cursorMm ? `${cursorMm.x.toFixed(1)}, ${cursorMm.y.toFixed(1)} mm` : '—, — mm'}</b>
        </span>
      )}
      <span className="status-item">
        BBox{' '}
        <b>
          {geometry ? `${geometry.bbox.w.toFixed(1)} × ${geometry.bbox.d.toFixed(1)} × ${geometry.bbox.h.toFixed(1)} mm` : '— × — × — mm'}
        </b>
      </span>
      <span className="status-item">
        Triangles <b>{geometry ? geometry.triangleCount.toLocaleString('en-US') : '0'}</b>
      </span>
      <span style={{ flex: 1 }} />
      {geometry && status !== 'generating' && (
        <span className="status-item">
          {geometry.watertight ? (
            <span className="badge badge-ok">
              <CheckCircle2 size={12} strokeWidth={2} /> watertight
            </span>
          ) : (
            <span className="badge badge-warn">
              <AlertTriangle size={12} strokeWidth={2} /> {geometry.openEdges} open edges
            </span>
          )}
        </span>
      )}
      {status === 'error' && (
        <span className="badge badge-danger">
          <XCircle size={12} strokeWidth={2} /> failed
        </span>
      )}
    </footer>
  );
}
