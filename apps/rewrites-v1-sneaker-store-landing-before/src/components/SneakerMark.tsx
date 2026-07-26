interface SneakerMarkProps {
  upper?: string;
  sole?: string;
  accent?: string;
  className?: string;
}

/** A hand-drawn, stylised sneaker silhouette built from flat SVG shapes. */
export default function SneakerMark({
  upper = "#f4f1e9",
  sole = "#121210",
  accent = "#cbff3d",
  className = "",
}: SneakerMarkProps) {
  return (
    <svg
      viewBox="0 0 400 220"
      className={className}
      role="img"
      aria-label="Stylised sneaker illustration"
    >
      {/* sole */}
      <path
        d="M20,158 Q13,183 42,188 L358,186 Q386,182 389,160 Q392,144 374,136 L48,134 Q22,136 20,158 Z"
        fill={sole}
      />
      {/* heel counter */}
      <path
        d="M28,150 C22,118 34,88 62,68 L70,120 C68,132 60,142 42,148 Z"
        fill={upper}
        opacity="0.9"
      />
      {/* main upper body */}
      <path
        d="M44,140 C24,108 34,64 78,46 C120,28 168,20 218,18 C270,16 312,26 344,52 C366,70 380,96 383,122 C384,130 377,137 366,138 L44,140 Z"
        fill={upper}
      />
      {/* toe cap shading */}
      <path
        d="M300,30 C324,36 348,52 366,78 C374,90 380,104 383,118 L340,120 C330,90 316,58 300,30 Z"
        fill={sole}
        opacity="0.12"
      />
      {/* tongue */}
      <path
        d="M158,26 C156,10 172,-2 190,2 C204,5 210,18 206,30 L162,34 Z"
        fill={sole}
        opacity="0.9"
      />
      {/* laces */}
      <g stroke={sole} strokeWidth="6" strokeLinecap="round" opacity="0.85">
        <line x1="150" y1="34" x2="182" y2="20" />
        <line x1="158" y1="46" x2="192" y2="32" />
        <line x1="166" y1="58" x2="202" y2="44" />
        <line x1="174" y1="70" x2="212" y2="56" />
      </g>
      {/* brand stripe */}
      <path
        d="M96,96 C150,128 230,132 320,92"
        fill="none"
        stroke={accent}
        strokeWidth="14"
        strokeLinecap="round"
      />
      {/* sole midline accent */}
      <rect x="60" y="160" width="300" height="8" rx="4" fill={accent} opacity="0.9" />
    </svg>
  );
}
