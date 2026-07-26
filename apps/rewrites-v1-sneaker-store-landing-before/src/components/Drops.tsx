import { useState } from "react";
import SneakerMark from "./SneakerMark";

interface Product {
  name: string;
  price: string;
  tag: string;
  tagColor: string;
  upper: string;
  sole: string;
  accent: string;
  blurb: string;
}

const PRODUCTS: Product[] = [
  {
    name: "Voltrunner",
    price: "$128",
    tag: "New",
    tagColor: "bg-lime text-ink",
    upper: "#f4f1e9",
    sole: "#121210",
    accent: "#cbff3d",
    blurb: "The everyday trainer. Light, breathable, endlessly stackable with anything.",
  },
  {
    name: "Ember Low",
    price: "$142",
    tag: "Limited",
    tagColor: "bg-blaze text-paper",
    upper: "#1c1c19",
    sole: "#f4f1e9",
    accent: "#ff5a2d",
    blurb: "A blacked-out silhouette with a blaze accent for after-dark miles.",
  },
  {
    name: "Concrete Mid",
    price: "$156",
    tag: "Restocked",
    tagColor: "bg-paper text-ink",
    upper: "#cfcabb",
    sole: "#121210",
    accent: "#121210",
    blurb: "Ankle support meets city-slab grey. Built for pavement, not podiums.",
  },
  {
    name: "Citrus Pack",
    price: "$134",
    tag: "Drops Fri",
    tagColor: "bg-ink text-lime border border-lime/50",
    upper: "#f4f1e9",
    sole: "#e8622c",
    accent: "#e8622c",
    blurb: "Our brightest colourway yet — a citrus sole under a clean canvas upper.",
  },
];

export default function Drops() {
  const [notified, setNotified] = useState<Record<string, boolean>>({});

  return (
    <section id="drops" className="relative py-24 sm:py-32 bg-paper text-ink">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="text-blaze uppercase tracking-widest text-sm font-semibold">Featured drops</span>
            <h2 className="font-display uppercase text-4xl sm:text-5xl mt-3 leading-[0.95]">
              Four pairs.
              <br /> Zero filler.
            </h2>
          </div>
          <p className="max-w-sm text-ink/60">
            Every silhouette is produced in small runs. Once a size sells out in
            a colourway, it doesn't come back the same way twice.
          </p>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRODUCTS.map((p, i) => (
            <div
              key={p.name}
              className="pop-in group relative flex flex-col rounded-2xl bg-ink text-paper overflow-hidden border border-ink/10 hover:-translate-y-1.5 transition-transform duration-300"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span
                className={`absolute top-4 left-4 z-10 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${p.tagColor}`}
              >
                {p.tag}
              </span>

              <div className="relative grid-backdrop p-8 pb-4">
                <SneakerMark
                  upper={p.upper}
                  sole={p.sole}
                  accent={p.accent}
                  className="w-full group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="p-6 pt-3 flex flex-col flex-1">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-xl uppercase tracking-wide">{p.name}</h3>
                  <span className="font-body font-semibold text-lime">{p.price}</span>
                </div>
                <p className="text-paper/60 text-sm mt-2 flex-1">{p.blurb}</p>

                <button
                  onClick={() => setNotified((n) => ({ ...n, [p.name]: true }))}
                  disabled={!!notified[p.name]}
                  className="mt-5 w-full rounded-full border border-paper/25 py-2.5 text-sm font-semibold uppercase tracking-wide hover:bg-lime hover:text-ink hover:border-lime transition-colors disabled:bg-lime disabled:text-ink disabled:border-lime"
                >
                  {notified[p.name] ? "You're on the list ✓" : "Notify Me"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
