export default function HeartIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <path
        d="M14 23 L4.6 13.6 a5.4 5.4 0 0 1 7.6-7.6 L14 7.8 l1.8-1.8 a5.4 5.4 0 0 1 7.6 7.6 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
