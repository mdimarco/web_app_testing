const ITEMS = [
  "COMFORT ENGINEERED",
  "LIMITED DROPS",
  "FREE SHIPPING OVER $75",
  "RECYCLED MATERIALS",
  "CRAFTED FOR MOVEMENT",
  "30-DAY RETURNS",
];

export default function Marquee() {
  const line = ITEMS.join("  ·  ");
  return (
    <div className="marquee-wrap bg-lime text-ink overflow-hidden border-y-4 border-ink">
      <div className="marquee-track flex whitespace-nowrap py-3 w-max font-display text-xl sm:text-2xl uppercase tracking-wide">
        <span className="pr-6">{line}&nbsp;·&nbsp;</span>
        <span className="pr-6">{line}&nbsp;·&nbsp;</span>
      </div>
    </div>
  );
}
