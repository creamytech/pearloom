'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/SpotifyPanel.tsx
// Vibe-matched Spotify song suggestions via Gemini, plus a
// manual URL field and playlist name input.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Music2, ExternalLink, Loader2 } from 'lucide-react';
import { SidebarSection } from './EditorSidebar';
import { Field } from './editor-utils';
import { useEditor } from '@/lib/editor-state';

interface SongSuggestion {
  title: string;
  artist: string;
  mood: string;
  searchUrl: string;
}

function getEmbedUrl(url: string): string {
  return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
}

export function SpotifyPanel() {
  const { manifest, actions, coupleNames } = useEditor();
  const { handleDesignChange } = actions;

  const [songs, setSongs] = useState<SongSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/spotify/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vibeString: manifest.vibeString || '',
          occasion: manifest.occasion || 'wedding',
          names: coupleNames,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong');
        return;
      }
      const data = await res.json();
      setSongs(data.songs || []);
    } catch {
      setError('Failed to reach the server');
    } finally {
      setLoading(false);
    }
  };

  const embedUrl = manifest.spotifyUrl ? getEmbedUrl(manifest.spotifyUrl) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 2px' }}>

      {/* Playlist URL + name */}
      <SidebarSection title="Spotify Link" defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Field
            label="Spotify Embed / Playlist URL"
            value={manifest.spotifyUrl || ''}
            onChange={v => handleDesignChange({ ...manifest, spotifyUrl: v })}
            placeholder="https://open.spotify.com/playlist/..."
          />
          <Field
            label="Playlist Name (optional)"
            value={manifest.spotifyPlaylistName || ''}
            onChange={v => handleDesignChange({ ...manifest, spotifyPlaylistName: v })}
            placeholder="Our Wedding Playlist"
          />
        </div>
      </SidebarSection>

      {/* Gemini suggestions */}
      <SidebarSection title="AI Song Suggestions" defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleSuggest}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '9px 14px',
              borderRadius: '12px',
              border: '1px solid rgba(163,177,138,0.35)',
              background: loading ? 'rgba(163,177,138,0.06)' : 'rgba(163,177,138,0.12)',
              color: loading ? 'rgba(163,177,138,0.5)' : 'var(--pl-olive, #A3B18A)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              transition: 'background 0.18s',
            }}
            onMouseOver={e => {
              if (!loading) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.2)';
            }}
            onMouseOut={e => {
              if (!loading) (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.12)';
            }}
          >
            {loading ? (
              <>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                Asking Gemini...
              </>
            ) : (
              <>
                <Music2 size={13} />
                ✦ Suggest songs for our vibe
              </>
            )}
          </button>

          {error && (
            <p style={{ fontSize: '0.78rem', color: '#f87171', margin: 0, textAlign: 'center' }}>
              {error}
            </p>
          )}

          {songs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {songs.map((song, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '14px',
                    background: 'rgba(163,177,138,0.04)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.88)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {song.title} · <span style={{ fontWeight: 400, color: 'var(--pl-ink-soft)' }}>{song.artist}</span>
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '3px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'rgba(163,177,138,0.8)',
                        background: 'rgba(163,177,138,0.12)',
                        border: '1px solid rgba(163,177,138,0.2)',
                        borderRadius: '4px',
                        padding: '1px 5px',
                      }}
                    >
                      {song.mood}
                    </span>
                  </div>
                  <a
                    href={song.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Spotify"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.15)',
                      color: 'var(--pl-ink-soft)',
                      flexShrink: 0,
                      textDecoration: 'none',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseOver={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(30,215,96,0.15)';
                      (e.currentTarget as HTMLElement).style.color = '#1ED760';
                    }}
                    onMouseOut={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--pl-ink-soft)';
                    }}
                  >
                    <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </div>
          )}

          {songs.length === 0 && !loading && !error && (
            <p style={{ fontSize: '0.78rem', color: 'var(--pl-muted)', textAlign: 'center', margin: 0, padding: '0.5rem 0' }}>
              Click the button to get 10 songs matched to your vibe
            </p>
          )}
        </div>
      </SidebarSection>

      {/* Embed preview */}
      {embedUrl && (
        <SidebarSection title="Preview" defaultOpen={false}>
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
            <iframe
              src={embedUrl}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ display: 'block' }}
            />
          </div>
        </SidebarSection>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
