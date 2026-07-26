interface Props {
  index: string;
  name: string;
  dark?: boolean;
}

/** Ledger-style index label hung in the left margin gutter of each section. */
export default function SectionLabel({ index, name, dark = false }: Props) {
  return (
    <div
      className={`font-mono text-[13px] uppercase tracking-[0.08em] ${
        dark ? 'text-kraft/60' : 'text-ink-muted'
      }`}
    >
      {index} / {name}
    </div>
  );
}
