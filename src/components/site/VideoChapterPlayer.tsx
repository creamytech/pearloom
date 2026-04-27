'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/VideoChapterPlayer.tsx
// Embeds YouTube, Vimeo, or direct video files.
// ─────────────────────────────────────────────────────────────

interface VideoChapterPlayerProps {
  videoUrl: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/embed\/([^?&#]+)/,
    /youtube\.com\/shorts\/([^?&#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

export function VideoChapterPlayer({ videoUrl, title, className, style }: VideoChapterPlayerProps) {
  const youtubeId = extractYouTubeId(videoUrl);
  const vimeoId = !youtubeId ? extractVimeoId(videoUrl) : null;
  const directVideo = !youtubeId && !vimeoId && isDirectVideo(videoUrl);

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: 'var(--pl-radius-lg)',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    background: '#000',
    ...style,
  };

  if (youtubeId) {
    return (
      <div className={className} style={wrapperStyle}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=0&rel=0&modestbranding=1`}
          title={title || 'Video'}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </div>
    );
  }

  if (vimeoId) {
    return (
      <div className={className} style={wrapperStyle}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}?dnt=1`}
          title={title || 'Video'}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </div>
    );
  }

  if (directVideo) {
    return (
      <div className={className} style={wrapperStyle}>
        <video
          controls
          playsInline
          title={title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: '#000',
          }}
        >
          <source src={videoUrl} />
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // Unknown URL — show a link button
  return (
    <div
      className={className}
      style={{
        ...wrapperStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.06)',
      }}
    >
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          borderRadius: 'var(--pl-radius-md)',
          background: 'var(--pl-olive, #6B8F5A)',
          color: '#fff',
          fontSize: '0.875rem',
          fontWeight: 600,
          textDecoration: 'none',
          letterSpacing: '0.03em',
        }}
      >
        <span>▶</span>
        {title ? `Watch: ${title}` : 'Watch Video'}
      </a>
    </div>
  );
}
