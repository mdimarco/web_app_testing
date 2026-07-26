import { Instagram, Twitter, Youtube } from "lucide-react";

const COLUMNS = [
  {
    title: "Shop",
    links: ["Voltrunner", "Ember Low", "Concrete Mid", "Citrus Pack", "Gift Cards"],
  },
  {
    title: "Company",
    links: ["Our Story", "Materials", "Sustainability", "Careers"],
  },
  {
    title: "Support",
    links: ["Size Guide", "Shipping & Returns", "Track Order", "Contact Us"],
  },
];

export default function Footer() {
  return (
    <footer className="bg-ink border-t border-paper/10 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-10">
          <div>
            <a href="#top" className="font-display text-3xl text-paper">
              GRND<span className="text-lime">.</span>
            </a>
            <p className="text-paper/55 mt-4 max-w-xs leading-relaxed">
              Small-batch sneakers designed for the pavement, not the podium.
              Based in Portland, shipped everywhere.
            </p>
            <div className="flex gap-3 mt-6">
              {[Instagram, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#top"
                  aria-label="Social link"
                  className="w-10 h-10 rounded-full border border-paper/15 flex items-center justify-center text-paper/70 hover:text-ink hover:bg-lime hover:border-lime transition-colors"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-display uppercase tracking-wide text-paper mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#top" className="text-paper/55 hover:text-lime transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-paper/10 flex flex-col sm:flex-row gap-3 justify-between text-paper/40 text-sm">
          <p>© {new Date().getFullYear()} GRND Footwear Co. All rights reserved.</p>
          <p>Concept storefront — for demonstration purposes.</p>
        </div>
      </div>
    </footer>
  );
}
