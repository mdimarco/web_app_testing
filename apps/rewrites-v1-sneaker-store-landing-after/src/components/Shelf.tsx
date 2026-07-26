import SectionLabel from './SectionLabel';
import PairCard from './PairCard';
import { PAIRS } from '../data/pairs';

export default function Shelf() {
  return (
    <section id="shelf" className="py-16 md:py-32">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10">
          <div className="md:col-span-2 mb-6 md:mb-0">
            <SectionLabel index="03" name="The shelf" />
          </div>
          <div className="md:col-span-10">
            <h2 className="font-display uppercase leading-[0.95] tracking-[-0.02em] text-[28px] sm:text-[40px] mb-3">
              This Thursday's shelf
            </h2>
            <p className="text-[17px] leading-[1.6] max-w-[68ch] text-ink-muted">
              Twelve pairs, checked and boxed at the counter. What's listed is what's left —
              stock counts are live, not decorative.
            </p>
          </div>
        </div>
      </div>

      <div className="shelf-scroll flex gap-4 overflow-x-auto px-6 pb-4">
        {PAIRS.map((pair, i) => (
          <PairCard key={pair.id} pair={pair} index={i} />
        ))}
        <div className="shrink-0 w-2 sm:w-6" aria-hidden="true" />
      </div>
    </section>
  );
}
