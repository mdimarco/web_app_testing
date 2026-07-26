import SectionLabel from './SectionLabel';
import EmailCapture from './EmailCapture';
import { FOOTER_LINKS } from '../data/pairs';

const FRICTION = ['One email per drop.', 'No card. No bots.', 'Unsubscribe in one click.'];

export default function Close() {
  return (
    <section id="join" className="bg-box">
      <div className="py-16 md:py-32">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-2 mb-6 md:mb-0">
              <SectionLabel index="06" name="Join" />
            </div>
            <div className="md:col-span-8">
              <h2 className="font-display uppercase leading-[0.95] tracking-[-0.02em] text-[28px] sm:text-[40px] mb-4">
                Be on the shelf Thursday at 11:00
              </h2>
              <p className="text-[17px] leading-[1.6] max-w-[68ch] text-ink-muted mb-8">
                One email a week when the shelf goes live. No spam, no bot queue, no card required
                to join.
              </p>

              <EmailCapture />

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                {FRICTION.map((f) => (
                  <span
                    key={f}
                    className="font-mono text-[13px] uppercase tracking-[0.08em] text-ink-muted"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-hairline">
        <div className="max-w-[1240px] mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10">
          <div>
            <span className="font-display uppercase text-[21px] tracking-[-0.02em]">Sidestep</span>
            <p className="font-mono text-[13px] text-ink-muted mt-3 leading-[1.6]">
              Crosstown Counter, Unit 4
              <br />
              118 Renwick St
              <br />
              Open Thu–Sat, 11:00–18:00
            </p>
          </div>

          <div>
            <p className="font-mono text-[13px] uppercase tracking-[0.08em] text-ink-muted mb-3">
              Shop
            </p>
            <ul className="flex flex-col gap-2">
              {FOOTER_LINKS.shop.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-[15px] hover:text-accent transition-colors duration-[120ms] ease-out"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[13px] uppercase tracking-[0.08em] text-ink-muted mb-3">
              Info
            </p>
            <ul className="flex flex-col gap-2">
              {FOOTER_LINKS.info.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-[15px] hover:text-accent transition-colors duration-[120ms] ease-out"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
