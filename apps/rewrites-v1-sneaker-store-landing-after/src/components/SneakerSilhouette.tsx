interface Props {
  className?: string;
}

/** Flat, generic sneaker side-profile — not traceable to any real silhouette. */
export default function SneakerSilhouette({ className }: Props) {
  return (
    <svg viewBox="0 0 220 110" className={className} fill="currentColor" aria-hidden="true">
      <path
        d="M10 90
           L10 78
           C10 70 16 64 26 61
           C40 57 52 50 62 42
           C76 31 90 20 108 15
           C124 10 142 9 156 14
           C168 18 176 26 180 36
           C182 41 186 44 192 45
           L206 47
           C212 48 215 52 213 58
           C211 66 202 71 192 73
           L150 79
           L40 92
           C24 94 11 93 10 90 Z"
      />
      <path d="M30 66c10 3 20 3 30-1l4 6c-11 5-23 5-33 1z" opacity="0.6" />
    </svg>
  );
}
