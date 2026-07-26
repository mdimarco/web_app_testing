import SectionLabel from './SectionLabel';
import { STEPS } from '../data/pairs';
import { useReveal } from '../hooks/useReveal';

function Step({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>(index);
  return (
    <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''} border-t border-kraft/20 pt-6`}>
      <span className="font-mono text-[40px] tnum text-accent leading-none">{step.number}</span>
      <h3 className="font-display uppercase text-[21px] tracking-[-0.01em] mt-4 mb-3 leading-[0.95]">
        {step.title}
      </h3>
      <p className="text-[17px] leading-[1.6] text-kraft/75 max-w-[68ch]">{step.detail}</p>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-32 bg-panel text-kraft">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
          <div className="md:col-span-2 mb-6 md:mb-0">
            <SectionLabel index="04" name="How it works" dark />
          </div>
          <div className="md:col-span-10">
            <h2 className="font-display uppercase leading-[0.95] tracking-[-0.02em] text-[28px] sm:text-[40px] text-kraft">
              From counter to your door
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="hidden md:block md:col-span-2" />
          <div className="md:col-span-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <Step key={step.number} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
