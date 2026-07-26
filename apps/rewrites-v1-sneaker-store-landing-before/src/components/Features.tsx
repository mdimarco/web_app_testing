import { Feather, Recycle, Fingerprint, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Feather,
    title: "Featherweight foam",
    body: "A dual-density midsole that cuts ounces without cutting cushioning, so day twelve feels like day one.",
  },
  {
    icon: Recycle,
    title: "70% recycled uppers",
    body: "Knit panels spun from reclaimed bottles and factory offcuts — the same stretch and structure, a fraction of the footprint.",
  },
  {
    icon: Fingerprint,
    title: "Street-tuned grip",
    body: "A herringbone outsole tested on wet tile, gravel and stairwells, not just treadmills.",
  },
  {
    icon: Zap,
    title: "Drops, not stockpiles",
    body: "Small-batch releases every few weeks. No warehouse full of last season sitting between you and something new.",
  },
];

export default function Features() {
  return (
    <section id="why" className="relative py-24 sm:py-32 bg-ink">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-xl">
          <span className="text-lime uppercase tracking-widest text-sm font-semibold">Why GRND</span>
          <h2 className="font-display uppercase text-4xl sm:text-5xl mt-3 leading-[0.95]">
            Built different,
            <br /> from the sole up.
          </h2>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 gap-6">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <div
              key={title}
              className="pop-in group rounded-2xl border border-paper/10 bg-paper/[0.03] p-7 hover:border-lime/50 hover:bg-paper/[0.06] transition-colors"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-lime/15 flex items-center justify-center text-lime group-hover:bg-lime group-hover:text-ink transition-colors">
                <Icon size={24} strokeWidth={2.25} />
              </div>
              <h3 className="font-display text-2xl uppercase mt-5 tracking-wide">{title}</h3>
              <p className="text-paper/65 mt-2 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
