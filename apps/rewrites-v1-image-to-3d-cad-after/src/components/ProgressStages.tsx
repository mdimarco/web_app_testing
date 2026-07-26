import { useDocStore } from '../store/useDocStore';
import type { PipelineStage } from '../lib/types';

const STAGES: { id: PipelineStage; label: string }[] = [
  { id: 'read', label: 'Reading image' },
  { id: 'trace', label: 'Tracing contours' },
  { id: 'simplify', label: 'Simplifying' },
  { id: 'extrude', label: 'Extruding solid' },
  { id: 'watertight', label: 'Checking watertight' },
];

export default function ProgressStages() {
  const status = useDocStore((s) => s.status);
  const progress = useDocStore((s) => s.progress);
  const cancelGenerate = useDocStore((s) => s.cancelGenerate);

  if (status !== 'generating' || !progress) return null;

  const activeIdx = STAGES.findIndex((s) => s.id === progress.stage);
  const currentLabel = STAGES[activeIdx]?.label ?? 'Working';
  const detail = progress.detail && progress.stage === 'trace' ? ` (${progress.detail})` : '';

  return (
    <div className="progress-overlay" role="status" aria-live="polite">
      <div className="progress-title">
        <span className="progress-stage-name">
          {currentLabel}
          {detail}…
        </span>
      </div>
      <div className="progress-stages">
        {STAGES.map((s, i) => {
          const fill = i < activeIdx ? 100 : i === activeIdx ? Math.round(progress.progress * 100) : 0;
          return (
            <div className="progress-stage-seg" key={s.id} title={s.label}>
              <div className="progress-stage-seg-fill" style={{ width: `${fill}%` }} />
            </div>
          );
        })}
      </div>
      <div className="progress-cancel">
        <button type="button" className="btn btn-ghost" onClick={cancelGenerate}>
          Cancel
        </button>
      </div>
    </div>
  );
}
