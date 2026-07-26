import { ArrowRight } from 'lucide-react';
import SectionLabel from './SectionLabel';
import ProductPlate from './ProductPlate';

export default function Hero() {
  return (
    <section id="hero" className="relative pt-10 md:pt-14 pb-16 md:pb-8">
      <div className="max-w-[1240px] mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6 items-center">
        <div className="md:col-span-7 order-2 md:order-1">
          <div className="mb-6">
            <SectionLabel index="01" name="DROP" />
          </div>
          <h1 className="font-display uppercase leading-[0.95] tracking-[-0.02em] lg:tracking-[-0.03em] text-[40px] sm:text-[56px] lg:text-[96px]">
            Twelve pairs.
            <br />
            Thursday.
            <br />
            All real.
          </h1>
          <p className="mt-6 text-[17px] leading-[1.6] max-w-[68ch] text-ink-muted">
            One authenticated sneaker drop a week — twelve pairs, live at 11:00 Thursday —
            for buyers who are done with fakes, bots, and six-week shipping.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <a
              href="#join"
              className="press inline-flex items-center gap-2 bg-accent text-ink font-medium text-[15px] h-12 px-6 hover:brightness-95"
            >
              Get the drop list
              <ArrowRight size={18} strokeWidth={1.5} />
            </a>
            <a
              href="#shelf"
              className="text-[15px] font-medium text-ink underline underline-offset-4 decoration-hairline hover:text-accent transition-colors duration-[120ms] ease-out"
            >
              See Thursday's shelf
            </a>
          </div>
        </div>

        <div className="md:col-span-5 order-1 md:order-2 relative md:h-[420px] lg:h-[520px]">
          <ProductPlate
            caption="Photo / Pair 04 · 4:5"
            aspect="16 / 10"
            className="md:hidden"
          />
          <div className="hidden md:block lg:hidden h-full">
            <ProductPlate caption="Photo / Pair 04 · 4:5" aspect="4 / 5" className="h-full" />
          </div>
          <div className="hidden lg:block absolute top-0 -right-6 h-full w-[46vw]">
            <ProductPlate caption="Photo / Pair 04 · 4:5" aspect="auto" className="h-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
