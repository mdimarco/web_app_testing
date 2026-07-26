export function WebGLFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #242a31 0%, #242a31 38%, #5e6b60 62%, #c39c67 78%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: '30%', background: 'linear-gradient(to bottom, #7f7250, #4e472f)' }}
      />
      <div
        className="absolute"
        style={{
          left: '58%',
          bottom: '28%',
          width: '90px',
          height: '46vh',
          background: 'linear-gradient(to bottom, #7a7365 0%, #dbd5c8 55%, #8c7a56 100%)',
          clipPath: 'polygon(46% 0%, 54% 0%, 82% 100%, 18% 100%)',
          filter: 'blur(1.5px)',
          opacity: 0.92,
          transform: 'rotate(4deg)',
        }}
      />
      <div
        className="absolute rounded-[50%]"
        style={{
          left: '54%',
          bottom: '26%',
          width: '190px',
          height: '48px',
          background: 'radial-gradient(ellipse at center, rgba(140,122,86,0.85), rgba(140,122,86,0))',
          filter: 'blur(4px)',
        }}
      />
      <div className="absolute inset-0 flex items-end justify-center pb-16 sm:items-center sm:pb-0">
        <div
          className="mx-6 max-w-[420px] rounded p-6 text-center"
          style={{
            background: 'rgba(16,19,23,0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid var(--color-hairline)',
          }}
        >
          <h2 className="m-0 mb-2 text-[20px] font-bold text-text">WebGL unavailable</h2>
          <p className="m-0 text-[15px] leading-[1.55] text-text-muted">
            This scene needs WebGL to render the live vortex simulation. Enable hardware acceleration in your
            browser's settings, or check <code>chrome://flags/#ignore-gpu-blocklist</code> if graphics are
            disabled. The still above shows the composed shot you'd otherwise see live.
          </p>
        </div>
      </div>
    </div>
  );
}
