import SneakerSilhouette from './SneakerSilhouette';

interface Props {
  caption: string;
  aspect?: string;
  grayscale?: boolean;
  className?: string;
  silhouetteClassName?: string;
}

/**
 * A blocked-out product photo composition: a tinted rectangle with a
 * hairline inset, a flat sneaker silhouette, and a mono photo caption.
 * No photography exists in this app — this stands in for it everywhere.
 */
export default function ProductPlate({
  caption,
  aspect = '4 / 5',
  grayscale = false,
  className = '',
  silhouetteClassName = 'w-2/3 h-2/3',
}: Props) {
  return (
    <div
      className={`relative bg-box overflow-hidden ${grayscale ? 'grayscale' : ''} ${className}`}
      style={{ aspectRatio: aspect }}
    >
      <div className="absolute inset-2 border border-hairline" />
      <div className="absolute inset-0 flex items-center justify-center">
        <SneakerSilhouette className={`text-ink opacity-[0.12] ${silhouetteClassName}`} />
      </div>
      <span className="absolute left-2 bottom-2 font-mono text-[13px] uppercase tracking-[0.08em] text-ink-muted">
        {caption}
      </span>
    </div>
  );
}
