import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useDocStore } from '../store/useDocStore';

export default function ConfirmDialog() {
  const open = useDocStore((s) => s.confirmClearOpen);
  const setOpen = useDocStore((s) => s.setConfirmClearOpen);
  const clearAll = useDocStore((s) => s.clearAll);
  const filename = useDocStore((s) => s.filename);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" style={{ width: 'min(400px, calc(100vw - 32px))' }}>
          <Dialog.Title className="dialog-title">Clear document?</Dialog.Title>
          <Dialog.Close asChild>
            <button className="dialog-close" aria-label="Close">
              <X size={18} strokeWidth={1.5} />
            </button>
          </Dialog.Close>
          <p className="helper-text" style={{ marginBottom: 20 }}>
            This removes “{filename}”, its threshold and solid settings, and the undo history. Sample silhouettes and this action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={clearAll}>
              Clear document
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
