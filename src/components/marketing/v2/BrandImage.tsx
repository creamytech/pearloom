'use client';

// BrandImage — loads a real PNG from public/assets/v2/ if it exists,
// otherwise falls back to an inline SVG placeholder. Lets the rest
// of the app reference assets by semantic name before the user has
// run `npm run assets:extract`.

import { useState, type CSSProperties, type ReactNode } from 'react';

export function BrandImage({
  src,
  alt,
  fallback,
  width,
  height,
  style,
  className,
}: {
  src: string;
  alt: string;
  fallback?: ReactNode;
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (broken && fallback !== undefined) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      onError={() => setBroken(true)}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', ...style }}
      className={className}
    />
  );
}
