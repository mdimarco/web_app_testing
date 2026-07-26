import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Experience from './scene/Experience';
import ControlPanel from './scene/ControlPanel';
import HudReadout from './scene/HudReadout';
import { useWindAudio } from './useWindAudio';

export default function App() {
  const flashDivRef = useRef<HTMLDivElement>(null);
  useWindAudio();

  return (
    <div className="relative w-screen h-screen bg-storm-950 scanlines vignette overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [16, 9, 20], fov: 45, near: 0.1, far: 500 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
      >
        <Experience flashDivRef={flashDivRef} />
      </Canvas>

      {/* lightning flash overlay */}
      <div
        ref={flashDivRef}
        className="pointer-events-none fixed inset-0 z-40 bg-white opacity-0 mix-blend-screen"
      />

      {/* title */}
      <div className="pointer-events-none fixed top-4 left-4 sm:top-6 sm:left-6 z-20 select-none">
        <div className="flex items-center gap-2 mb-1">
          <span className="live-dot inline-block w-2 h-2 rounded-full bg-[#e6533f]" />
          <span className="font-mono text-[10px] tracking-[0.3em] text-white/50">
            LIVE DOPPLER SIM
          </span>
        </div>
        <h1
          className="text-white leading-none tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 6vw, 3.6rem)' }}
        >
          TORNADO WATCH
        </h1>
        <p className="font-mono text-[11px] text-white/45 mt-0.5 max-w-[260px]">
          Real-time supercell vortex simulation — drag to orbit, scroll to zoom
        </p>
      </div>

      {/* HUD readout, top right */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-20">
        <HudReadout />
      </div>

      {/* controls, bottom left */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-20">
        <ControlPanel />
      </div>
    </div>
  );
}
