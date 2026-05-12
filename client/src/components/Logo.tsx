export function Logo({ size = 20, glow = true }: { size?: number; glow?: boolean }) {
  // Minimal "mesh" mark: three nodes connected into a triangle with a dot in
  // the middle. Stroke-only so it inherits the accent color of the theme.
  const gradientId = "mesh-grad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={glow ? { filter: "drop-shadow(0 0 4px currentColor)" } : undefined}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {/* Outer connection lines */}
      <path
        d="M16 5 L27 23 L5 23 Z"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Inner lines to center */}
      <path
        d="M16 5 L16 16 M5 23 L16 16 M27 23 L16 16"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* Nodes */}
      <circle cx="16" cy="5" r="2.1" fill="currentColor" />
      <circle cx="5" cy="23" r="2.1" fill="currentColor" />
      <circle cx="27" cy="23" r="2.1" fill="currentColor" />
      <circle cx="16" cy="16" r="1.7" fill="currentColor" fillOpacity="0.95" />
    </svg>
  );
}

export function Spark({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z" />
    </svg>
  );
}

export function TerminalBubble({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10l3 2.5L8 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 15h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
