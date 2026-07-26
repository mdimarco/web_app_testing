import type { Pair } from '../data/pairs';
import { stockStatus } from '../data/pairs';
import ProductPlate from './ProductPlate';
import { useReveal } from '../hooks/useReveal';

interface Props {
  pair: Pair;
  index: number;
}

const STOCK_COPY: Record<string, (n: number) => string> = {
  'in-stock': (n) => `In stock ${n}`,
  low: (n) => `Low ${n}`,
  'sold-out': () => 'Sold out',
};

const STOCK_COLOR: Record<string, string> = {
  'in-stock': 'text-in-stock',
  low: 'text-low',
  'sold-out': 'text-sold',
};

export default function PairCard({ pair, index }: Props) {
  const status = stockStatus(pair.stock);
  const isSoldOut = status === 'sold-out';
  const { ref, visible } = useReveal<HTMLDivElement>(index);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} pair-card shelf-card shrink-0 w-[84vw] md:w-[260px] lg:w-[290px] border border-hairline bg-label p-3 flex flex-col ${
        isSoldOut ? '' : 'hoverable'
      }`}
    >
      <ProductPlate
        caption={`Photo / Pair ${pair.id} · 4:5`}
        aspect="4 / 5"
        grayscale={isSoldOut}
      />

      <div className="mt-3 flex items-start justify-between gap-2">
        <h3 className="font-display uppercase text-[15px] leading-[1.15] tracking-[-0.01em] min-h-[2.4em] flex items-start">
          {pair.name}
        </h3>
        <span className="font-mono text-[13px] text-ink-muted shrink-0 mt-0.5">#{pair.id}</span>
      </div>
      <p className="text-[15px] text-ink-muted mt-1">{pair.colorway}</p>

      <p className="font-mono text-[17px] tnum mt-2">${pair.price.toLocaleString('en-US')}</p>

      <div className="mt-3 flex flex-wrap gap-1" aria-label="Available sizes">
        {pair.sizes.map((s) => (
          <span
            key={s.size}
            className={`font-mono text-[13px] tnum w-9 h-8 flex items-center justify-center border ${
              s.available && !isSoldOut
                ? 'border-hairline text-ink'
                : 'border-hairline text-ink-muted line-through opacity-50'
            }`}
          >
            {s.size}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <span className={`font-mono text-[13px] uppercase tracking-[0.08em] tnum ${STOCK_COLOR[status]}`}>
          {STOCK_COPY[status](pair.stock)}
        </span>
      </div>
    </div>
  );
}
