import * as Tooltip from '@radix-ui/react-tooltip';
import { MousePointer2, Paintbrush, Eraser, Hand, ZoomIn, Ruler, Trash2 } from 'lucide-react';
import type { ToolId } from '../lib/types';
import { useDocStore } from '../store/useDocStore';

const TOOLS: { id: ToolId; label: string; key: string; icon: typeof MousePointer2 }[] = [
  { id: 'select', label: 'Select', key: 'V', icon: MousePointer2 },
  { id: 'brush', label: 'Threshold brush', key: 'B', icon: Paintbrush },
  { id: 'erase', label: 'Erase island', key: 'E', icon: Eraser },
  { id: 'pan', label: 'Pan', key: 'H', icon: Hand },
  { id: 'zoom', label: 'Zoom', key: 'Z', icon: ZoomIn },
  { id: 'measure', label: 'Measure', key: 'M', icon: Ruler },
];

function RailTooltip({ label, shortcut, children }: { label: string; shortcut: string; children: React.ReactNode }) {
  return (
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip-content" side="right" sideOffset={8}>
          {label}
          <span className="kbd">{shortcut}</span>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export default function ToolRail() {
  const activeTool = useDocStore((s) => s.activeTool);
  const setActiveTool = useDocStore((s) => s.setActiveTool);
  const setConfirmClearOpen = useDocStore((s) => s.setConfirmClearOpen);
  const hasImage = useDocStore((s) => !!s.image);

  return (
    <Tooltip.Provider>
      <nav className="tool-rail" aria-label="Tools">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <RailTooltip key={t.id} label={t.label} shortcut={t.key}>
              <button
                type="button"
                className={`tool-btn ${activeTool === t.id ? 'active' : ''}`}
                aria-label={`${t.label} (${t.key})`}
                aria-pressed={activeTool === t.id}
                onClick={() => setActiveTool(t.id)}
              >
                <Icon size={17} strokeWidth={1.5} />
              </button>
            </RailTooltip>
          );
        })}
        <div className="tool-rail-spacer" />
        <div className="tool-rail-gap" />
        <RailTooltip label="Clear / reset document" shortcut="⌫">
          <button type="button" className="tool-btn" aria-label="Clear / reset document" disabled={!hasImage} onClick={() => setConfirmClearOpen(true)}>
            <Trash2 size={17} strokeWidth={1.5} />
          </button>
        </RailTooltip>
      </nav>
    </Tooltip.Provider>
  );
}
