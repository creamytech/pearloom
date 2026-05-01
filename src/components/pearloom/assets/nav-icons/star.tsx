export default function StarIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <path
        d="M14 3 L15.6 11.4 L24 14 L15.6 16.6 L14 25 L12.4 16.6 L4 14 L12.4 11.4 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
