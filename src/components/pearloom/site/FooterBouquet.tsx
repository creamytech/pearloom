'use client';

/* ========================================================================
   FooterBouquet — the editorial closing flourish that sits above the
   site footer. Pulled from manifest.decorLibrary.footerBouquet. Renders
   nothing until the user's library is generated.
   ======================================================================== */

interface Props {
  url?: string;
}

export function FooterBouquet({ url }: Props) {
  if (!url) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'grid',
        placeItems: 'center',
        padding: '48px 24px 0',
      }}
    >
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        style={{
          width: 'clamp(180px, 42vw, 320px)',
          height: 'auto',
          maxHeight: 'min(280px, 40vh)',
          aspectRatio: '2 / 3',
          objectFit: 'contain',
          mixBlendMode: 'multiply',
          opacity: 0.92,
        }}
      />
    </div>
  );
}
