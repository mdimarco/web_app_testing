import { History } from 'lucide-react';
import { useDocStore } from '../store/useDocStore';

export default function RecoveryBanner() {
  const record = useDocStore((s) => s.recoveryRecord);
  const restoreSession = useDocStore((s) => s.restoreSession);
  const discardSession = useDocStore((s) => s.discardSession);

  if (!record) return null;

  return (
    <div className="recovery-banner" role="status">
      <History size={16} strokeWidth={1.5} color="var(--annotation)" />
      <span>Recovered your last session — {record.imageName}</span>
      <button type="button" className="btn btn-primary" onClick={restoreSession}>
        Restore
      </button>
      <button type="button" className="btn btn-ghost" onClick={discardSession}>
        Discard
      </button>
    </div>
  );
}
