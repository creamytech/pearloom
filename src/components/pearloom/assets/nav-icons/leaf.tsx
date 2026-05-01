export default function LeafIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <path
        d="M5 23 C 5 11, 13 4, 23 4 C 23 14, 17 22, 7 23 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M9 19 L21 7" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
