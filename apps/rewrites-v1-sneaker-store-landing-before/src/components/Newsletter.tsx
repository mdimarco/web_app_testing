import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SneakerMark from "./SneakerMark";

const STORAGE_KEY = "grnd-waitlist-count";
const BASE_COUNT = 4812;

function getStoredCount() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : BASE_COUNT;
}

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [position, setPosition] = useState<number | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!isValid) {
      setError("Enter a real email so we know where to send the invite.");
      return;
    }
    setError("");
    const next = getStoredCount() + 1;
    window.localStorage.setItem(STORAGE_KEY, String(next));
    setPosition(next);
  };

  return (
    <section id="join" className="relative py-24 sm:py-32 bg-paper text-ink overflow-hidden">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 relative">
        <div className="absolute -right-10 -top-16 w-56 opacity-[0.08] rotate-12 hidden md:block" aria-hidden>
          <SneakerMark upper="#121210" sole="#121210" accent="#121210" />
        </div>

        <div className="relative rounded-3xl bg-ink text-paper px-6 py-12 sm:px-14 sm:py-16 text-center overflow-hidden">
          <div className="absolute inset-0 noise-fade" aria-hidden />
          <div className="relative">
            <span className="text-lime uppercase tracking-widest text-sm font-semibold">Join the waitlist</span>
            <h2 className="font-display uppercase text-4xl sm:text-5xl mt-3 leading-[0.95]">
              Get first pick of
              <br /> the next drop.
            </h2>
            <p className="mt-4 text-paper/65 max-w-md mx-auto">
              We email once a drop, never more. Early subscribers get a 24-hour
              head start before sizes go public.
            </p>

            {position === null ? (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 rounded-full bg-paper text-ink placeholder:text-ink/40 px-5 py-3.5 outline-none border border-transparent focus-visible:border-lime"
                />
                <button
                  type="submit"
                  className="rounded-full bg-lime text-ink font-semibold px-6 py-3.5 flex items-center justify-center gap-2 hover:bg-white transition-colors"
                >
                  Join <ArrowRight size={18} />
                </button>
              </form>
            ) : (
              <div className="mt-8 max-w-md mx-auto rounded-2xl border border-lime/40 bg-lime/10 px-6 py-6 pop-in">
                <div className="flex items-center justify-center gap-2 text-lime font-semibold">
                  <CheckCircle2 size={22} />
                  You're in.
                </div>
                <p className="text-paper/75 mt-2">
                  You're number <span className="text-paper font-semibold">#{position.toLocaleString()}</span> on
                  the list. Watch your inbox before the public drop.
                </p>
              </div>
            )}

            {error && <p className="mt-3 text-blaze text-sm">{error}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
