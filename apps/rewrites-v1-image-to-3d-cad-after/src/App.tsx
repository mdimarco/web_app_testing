import { useEffect } from 'react';
import { AlertOctagon } from 'lucide-react';
import TopBar from './components/TopBar';
import ToolRail from './components/ToolRail';
import RightPanel from './components/RightPanel';
import SourceStage from './components/SourceStage';
import SolidViewport from './components/SolidViewport';
import StatusBar from './components/StatusBar';
import ProgressStages from './components/ProgressStages';
import Toasts from './components/Toasts';
import RecoveryBanner from './components/RecoveryBanner';
import ConfirmDialog from './components/ConfirmDialog';
import ExportDialog from './components/ExportDialog';
import { useDocStore } from './store/useDocStore';
import type { ToolId } from './lib/types';

const KEY_TOOL_MAP: Record<string, ToolId> = { v: 'select', b: 'brush', e: 'erase', h: 'pan', z: 'zoom', m: 'measure' };

function FailureBanner() {
  const status = useDocStore((s) => s.status);
  const errorMessage = useDocStore((s) => s.errorMessage);
  const beginEdit = useDocStore((s) => s.beginEdit);
  const commitEdit = useDocStore((s) => s.commitEdit);
  const updateThreshold = useDocStore((s) => s.updateThreshold);
  const threshold = useDocStore((s) => s.thresholdParams);

  if (status !== 'error' || !errorMessage) return null;

  return (
    <div className="progress-overlay" role="alert" style={{ borderColor: 'var(--danger)' }}>
      <div className="progress-title" style={{ marginBottom: 6 }}>
        <span className="progress-stage-name" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertOctagon size={16} strokeWidth={1.75} />
          {errorMessage}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            beginEdit();
            updateThreshold({ threshold: Math.max(0, threshold.threshold - 30) });
            commitEdit();
          }}
        >
          Lower threshold
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            beginEdit();
            updateThreshold({ invert: !threshold.invert });
            commitEdit();
          }}
        >
          Invert
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const viewMode = useDocStore((s) => s.viewMode);
  const checkRecovery = useDocStore((s) => s.checkRecovery);
  const setActiveTool = useDocStore((s) => s.setActiveTool);

  useEffect(() => {
    checkRecovery();
  }, [checkRecovery]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey) return;
      const tool = KEY_TOOL_MAP[e.key.toLowerCase()];
      if (tool) setActiveTool(tool);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActiveTool]);

  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-body">
        <ToolRail />
        <div className="viewport-col">
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: viewMode === 'source' ? 1 : 0,
              pointerEvents: viewMode === 'source' ? 'auto' : 'none',
              transition: 'opacity 300ms cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            <SourceStage />
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: viewMode === 'solid' ? 1 : 0,
              pointerEvents: viewMode === 'solid' ? 'auto' : 'none',
              transition: 'opacity 300ms cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            <SolidViewport />
          </div>
          <RecoveryBanner />
          <ProgressStages />
          <FailureBanner />
          <Toasts />
        </div>
        <RightPanel />
      </div>
      <StatusBar />
      <ConfirmDialog />
      <ExportDialog />
    </div>
  );
}
