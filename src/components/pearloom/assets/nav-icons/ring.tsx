export default function RingIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <circle cx="11" cy="16" r="6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="17" cy="16" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 7 l1.6 -2 a1 1 0 0 1 1.6 0 l-1 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
