export default function CompassIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.4" />
      <path d="M14 6.5 L16 13 L14 14 L12 13 Z" fill="currentColor" />
      <path d="M14 21.5 L16 15 L14 14 L12 15 Z" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
