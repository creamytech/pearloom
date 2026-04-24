'use client';

/* ========================================================================
   SectionStamp — a tiny wax-seal stamp rendered next to each section's
   eyebrow label. Pulled from manifest.decorLibrary.sectionStamps[key]
   where key is one of story | schedule | travel | registry | gallery
   | rsvp | faq. Falls back to null when the template hasn't generated
   its library yet.
   ======================================================================== */

import type { CSSProperties } from 'react';

interface Props {
  url?: string;
  size?: number;
  style?: CSSProperties;
  alt?: string;
}

export function SectionStamp({ url, size = 44, style, alt = '' }: Props) {
  if (!url) return null;
  return (
    <span
      aria-hidden={!alt}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        marginRight: 10,
        verticalAlign: 'middle',
        backgroundImage: `url(${url})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        mixBlendMode: 'multiply',
        ...style,
      }}
    />
  );
}
