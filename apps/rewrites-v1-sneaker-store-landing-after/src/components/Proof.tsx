import { Check } from 'lucide-react';
import SectionLabel from './SectionLabel';
import ProductPlate from './ProductPlate';
import { CHECKLIST, FOUNDER_NOTE } from '../data/pairs';
import { useReveal } from '../hooks/useReveal';

export default function Proof() {
  const { ref: receiptRef, visible: receiptVisible } = useReveal<HTMLDivElement>(0);
  const { ref: noteRef, visible: noteVisible } = useReveal<HTMLDivElement>(1);

  return (
    <section id="proof" className="py-16 md:py-32">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
          <div className="md:col-span-2 mb-6 md:mb-0">
            <SectionLabel index="05" name="Proof" />
          </div>
          <div className="md:col-span-10">
            <h2 className="font-display uppercase leading-[0.95] tracking-[-0.02em] text-[28px] sm:text-[40px]">
              Checked before it's listed
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="hidden md:block md:col-span-2" />

          <div
            ref={receiptRef}
            className={`md:col-span-5 reveal ${receiptVisible ? 'is-visible' : ''}`}
          >
            <div className="relative bg-label border border-hairline p-6 sm:p-8">
              {receiptVisible && (
                <span
                  className="stamp absolute top-4 right-4 sm:top-8 sm:right-8 border-2 border-accent text-accent font-display uppercase text-[15px] sm:text-[17px] tracking-[-0.01em] px-3 py-2"
                  style={{ transform: 'rotate(-3deg)' }}
                >
                  Authenticated
                </span>
              )}
              <p className="font-mono text-[13px] uppercase tracking-[0.08em] text-ink-muted mb-6">
                7-point check / receipt
              </p>
              <ul className="flex flex-col gap-4">
                {CHECKLIST.map((item, i) => (
                  <li key={item} className="flex items-start gap-3 border-b border-hairline pb-4">
                    <span className="font-mono text-[13px] text-ink-muted tnum shrink-0 w-5">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    <Check size={16} strokeWidth={1.5} className="text-in-stock shrink-0 mt-0.5" />
                    <span className="font-mono text-[15px] leading-[1.5]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            ref={noteRef}
            className={`md:col-span-5 md:col-start-8 mt-10 md:mt-0 reveal ${
              noteVisible ? 'is-visible' : ''
            }`}
          >
            <ProductPlate caption="Photo / Founder · 3:2" aspect="3 / 2" className="mb-6" />
            <p className="text-[17px] leading-[1.6] max-w-[68ch]">{FOUNDER_NOTE}</p>
            <p className="mt-4 font-mono text-[15px] text-ink-muted">
              — Mara Voss, Founder
              <br />
              SIDESTEP, Crosstown Counter, Unit 4, 118 Renwick St
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
