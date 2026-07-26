export function TitleBlock() {
  return (
    <div className="pointer-events-none absolute left-6 top-6 max-w-[min(78vw,420px)]">
      <h1
        className="m-0 text-[44px] font-bold leading-none text-text"
        style={{ letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}
      >
        SUPERCELL VORTEX
      </h1>
      <p
        className="mt-2 hidden max-w-[34ch] text-[15px] leading-[1.55] text-text-muted sm:block"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Harper County section road · late May, golden hour · mobile mesonet feed
      </p>
    </div>
  );
}
