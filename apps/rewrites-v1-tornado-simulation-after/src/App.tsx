import { useMemo, useState } from 'react';
import { SceneCanvas } from './components/SceneCanvas';
import { TitleBlock } from './components/TitleBlock';
import { ParameterPanel } from './components/ParameterPanel';
import { MobileSheet } from './components/MobileSheet';
import { TelemetryGrid } from './components/TelemetryGrid';
import { PlaybackBar } from './components/PlaybackBar';
import { LoadingCurtain } from './components/LoadingCurtain';
import { WebGLFallback } from './components/WebGLFallback';
import { useIsMobile } from './hooks/useMedia';
import { useTelemetryDriver } from './hooks/useTelemetryDriver';
import { detectWebGL } from './lib/webgl';
import { useSimStore } from './store';

function PausedOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-2 z-20"
      style={{ border: '1px solid var(--color-accent)', borderRadius: 4 }}
    >
      <div
        className="absolute left-1/2 top-3 -translate-x-1/2 text-[11px] font-medium uppercase text-accent"
        style={{ letterSpacing: '0.08em' }}
      >
        Paused
      </div>
    </div>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [webglOk, setWebglOk] = useState(() => detectWebGL());
  const isMobile = useIsMobile();
  const playing = useSimStore((s) => s.playing);

  useTelemetryDriver();

  const onContextLost = useMemo(() => () => setWebglOk(false), []);

  return (
    <div
      className="relative h-[100dvh] w-[100dvw] overflow-hidden bg-[#0b0d0f]"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {webglOk ? <SceneCanvas onContextLost={onContextLost} /> : <WebGLFallback />}

      {webglOk && (
        <>
          <TitleBlock />
          {!playing && <PausedOverlay />}

          {isMobile ? (
            <>
              <div className="fixed left-4 z-20 max-w-[calc(100vw-160px)] overflow-x-auto" style={{ bottom: '68px' }}>
                <TelemetryGrid layout="strip" />
              </div>
              <div className="fixed right-4 z-20" style={{ bottom: '68px' }}>
                <PlaybackBar />
              </div>
              <MobileSheet />
            </>
          ) : (
            <>
              <ParameterPanel />
              <TelemetryGrid layout="grid" />
              <PlaybackBar />
            </>
          )}
        </>
      )}

      {webglOk && !loaded && <LoadingCurtain onDone={() => setLoaded(true)} />}
    </div>
  );
}
