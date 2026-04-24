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
        style={{
          width: 'min(320px, 50vw)',
          height: 'auto',
          maxHeight: 280,
          objectFit: 'contain',
          mixBlendMode: 'multiply',
          opacity: 0.92,
        }}
      />
    </div>
  );
}
