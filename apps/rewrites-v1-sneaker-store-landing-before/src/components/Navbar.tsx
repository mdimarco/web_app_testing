import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#drops", label: "Drops" },
  { href: "#why", label: "Why GRND" },
  { href: "#reviews", label: "Reviews" },
  { href: "#join", label: "Join" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-ink/90 backdrop-blur border-b border-paper/10" : "bg-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 py-3.5">
        <a href="#top" className="font-display text-2xl sm:text-3xl tracking-wide text-paper">
          GRND<span className="text-lime">.</span>
        </a>

        <ul className="hidden md:flex items-center gap-9 font-body text-sm tracking-wide uppercase text-paper/80">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="hover:text-lime transition-colors">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#join"
          className="hidden md:inline-flex items-center rounded-full bg-lime px-5 py-2.5 font-body font-semibold text-sm text-ink hover:bg-paper transition-colors"
        >
          Shop the Drop
        </a>

        <button
          className="md:hidden text-paper p-2 -mr-2"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-ink border-t border-paper/10 px-5 pb-6 pt-2">
          <ul className="flex flex-col gap-1 font-body uppercase tracking-wide text-paper/85">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 border-b border-paper/10 hover:text-lime"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#join"
            onClick={() => setOpen(false)}
            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-lime px-5 py-3 font-semibold text-ink"
          >
            Shop the Drop
          </a>
        </div>
      )}
    </header>
  );
}
