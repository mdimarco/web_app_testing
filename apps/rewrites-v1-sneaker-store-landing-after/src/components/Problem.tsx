import SectionLabel from './SectionLabel';
import { useReveal } from '../hooks/useReveal';

const ROWS = [
  {
    label: 'Fakes',
    text: 'Resale is flooded with pairs that look right in photos and fall apart under a loupe. We check every pair before it is listed, not after you complain.',
  },
  {
    label: 'Bots',
    text: 'Drop sites get cleared by scripts in seconds while real buyers refresh a loading spinner. There is no checkout queue here for a bot to win.',
  },
  {
    label: 'Shipping',
    text: 'Six-week waits get called "processing time." Every SIDESTEP order leaves the counter the same day it is authenticated and boxed.',
  },
];

export default function Problem() {
  const { ref, visible } = useReveal<HTMLDivElement>(0);
  return (
    <section id="problem" className="py-16 md:py-32">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-2 mb-6 md:mb-0">
            <SectionLabel index="02" name="The problem" />
          </div>
          <div className="md:col-span-10">
            <h2 className="font-display uppercase leading-[0.95] tracking-[-0.02em] text-[28px] sm:text-[40px] mb-10">
              What you've been burned by
            </h2>
            <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''}`}>
              {ROWS.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-6 py-6 ${
                    i === 0 ? 'border-t border-hairline' : ''
                  } border-b border-hairline`}
                >
                  <div className="sm:col-span-3">
                    <span className="font-mono text-[13px] uppercase tracking-[0.08em] text-ink-muted">
                      {row.label}
                    </span>
                  </div>
                  <p className="sm:col-span-9 text-[17px] leading-[1.6] max-w-[68ch]">{row.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
