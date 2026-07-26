import { Star, Quote } from "lucide-react";

const REVIEWS = [
  {
    quote:
      "I run a coffee cart six days a week. The Voltrunners are the first shoes that don't feel dead by hour eight.",
    name: "Priya N.",
    role: "Voltrunner owner",
  },
  {
    quote:
      "Copped the Ember Low on a whim and now it's the only pair I reach for after dark. Grip is unreal on wet stairs.",
    name: "Marcus D.",
    role: "Ember Low owner",
  },
  {
    quote:
      "Small-batch actually means something here. Mine still looks like it did on day one, ninety days in.",
    name: "Sana K.",
    role: "Concrete Mid owner",
  },
];

export default function Testimonials() {
  return (
    <section id="reviews" className="relative py-24 sm:py-32 bg-ink">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex text-lime">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={20} className="fill-lime" />
            ))}
          </div>
          <span className="text-paper/60 text-sm">4.9 from 2,300+ riders of the pavement</span>
        </div>

        <h2 className="font-display uppercase text-4xl sm:text-5xl mt-5 leading-[0.95] max-w-lg">
          Straight from the sidewalk.
        </h2>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {REVIEWS.map((r, i) => (
            <figure
              key={r.name}
              className="pop-in rounded-2xl border border-paper/10 bg-paper/[0.03] p-7 flex flex-col"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <Quote size={28} className="text-lime/60 mb-3" />
              <blockquote className="text-paper/85 leading-relaxed flex-1">
                "{r.quote}"
              </blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-semibold text-paper">{r.name}</span>
                <span className="text-paper/50"> — {r.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
