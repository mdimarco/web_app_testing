import { AlertTriangle, AlertOctagon, CheckCircle2, Info, X } from 'lucide-react';
import { useDocStore } from '../store/useDocStore';

const ICONS = {
  danger: AlertOctagon,
  warn: AlertTriangle,
  ok: CheckCircle2,
  info: Info,
};

export default function Toasts() {
  const toasts = useDocStore((s) => s.toasts);
  const dismissToast = useDocStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="assertive">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div className={`toast toast-${t.kind}`} key={t.id} role="alert">
            <Icon size={16} strokeWidth={1.75} />
            <span className="toast-msg">{t.message}</span>
            <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
