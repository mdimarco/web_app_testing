import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import CountdownDisplay from './CountdownDisplay';

const LINKS = [
  { label: "This week's shelf", href: '#shelf' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Authentication', href: '#proof' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const requestClose = () => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 170);
  };

  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 h-14 bg-kraft border-b border-hairline">
      <div className="max-w-[1240px] mx-auto h-full px-6 flex items-center justify-between gap-4">
        <a
          href="#top"
          className="font-display uppercase text-[21px] tracking-[-0.02em] leading-none shrink-0"
        >
          Sidestep
        </a>

        <nav className="hidden sm:flex items-center gap-6" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[15px] font-medium text-ink-muted hover:text-ink transition-colors duration-[120ms] ease-out"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden sm:block">
          <CountdownDisplay />
        </div>

        <div className="sm:hidden">
          <CountdownDisplay />
        </div>

        <a
          href="#join"
          className="hidden sm:inline-flex items-center justify-center bg-accent text-ink font-medium text-[15px] h-11 px-5 press transition-transform duration-[90ms] hover:brightness-95"
        >
          Get the drop list
        </a>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="sm:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 press"
        >
          <Menu strokeWidth={1.5} size={24} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={requestClose}
            className="absolute inset-0 bg-ink/40"
          />
          <div
            className={`nav-sheet ${closing ? 'closing' : ''} absolute top-0 right-0 h-full w-[82vw] max-w-[360px] bg-label border-l border-hairline flex flex-col p-6`}
            style={{ transform: closing ? 'translateX(100%)' : 'translateX(0)' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="font-display uppercase text-[21px] tracking-[-0.02em]">Sidestep</span>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={requestClose}
                aria-label="Close menu"
                className="inline-flex items-center justify-center w-11 h-11 -mr-2 press"
              >
                <X strokeWidth={1.5} size={24} />
              </button>
            </div>

            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={requestClose}
                  className="text-[21px] font-medium py-3 border-b border-hairline hover:text-accent transition-colors duration-[120ms] ease-out"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-4">
              <CountdownDisplay />
              <a
                href="#join"
                onClick={requestClose}
                className="inline-flex items-center justify-center bg-accent text-ink font-medium text-[15px] h-12 px-5 press"
              >
                Get the drop list
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
