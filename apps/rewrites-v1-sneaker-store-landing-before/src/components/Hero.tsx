import { ArrowDown, Star } from "lucide-react";
import SneakerMark from "./SneakerMark";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden grid-backdrop noise-fade pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center relative z-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-4 py-1.5 text-xs sm:text-sm uppercase tracking-widest text-lime font-semibold">
            Now boarding — Spring drop 03
          </span>

          <h1 className="font-display uppercase text-[15vw] leading-[0.85] sm:text-7xl md:text-8xl mt-6 text-paper">
            Made for
            <br />
            the <span className="text-lime">ground</span>
            <br />
            you cover.
          </h1>

          <p className="mt-6 max-w-md text-lg text-paper/70 font-body">
            GRND builds sneakers around one idea: the street doesn't slow down,
            so neither should your shoes. Featherweight foam, recycled uppers,
            grip that bites back.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#drops"
              className="rounded-full bg-lime text-ink font-body font-semibold px-7 py-4 hover:bg-paper transition-colors"
            >
              Shop the Drop
            </a>
            <a
              href="#join"
              className="rounded-full border border-paper/30 text-paper font-body font-semibold px-7 py-4 hover:border-lime hover:text-lime transition-colors"
            >
              Get Early Access
            </a>
          </div>

          <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4 text-paper/80">
            <div>
              <div className="font-display text-3xl text-paper">12,400+</div>
              <div className="text-xs uppercase tracking-widest text-paper/50">Pairs shipped</div>
            </div>
            <div>
              <div className="font-display text-3xl text-paper flex items-center gap-1.5">
                4.9 <Star size={18} className="fill-lime text-lime" />
              </div>
              <div className="text-xs uppercase tracking-widest text-paper/50">Average rating</div>
            </div>
            <div>
              <div className="font-display text-3xl text-paper">30-day</div>
              <div className="text-xs uppercase tracking-widest text-paper/50">Free returns</div>
            </div>
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="absolute inset-0 rounded-full bg-lime/20 blur-3xl scale-75" aria-hidden />
          <SneakerMark
            className="w-full max-w-md relative float-slow drop-shadow-[0_25px_35px_rgba(0,0,0,0.45)]"
            upper="#f4f1e9"
            sole="#121210"
            accent="#cbff3d"
          />
        </div>
      </div>

      <a
        href="#why"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-paper/40 text-xs uppercase tracking-widest hover:text-lime transition-colors"
      >
        Scroll
        <ArrowDown size={16} />
      </a>
    </section>
  );
}
