export default function KeyIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <circle cx="9" cy="11" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13.5 13 L23 22.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M19 18.5 L21 20.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M21 16.5 L23 18.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
