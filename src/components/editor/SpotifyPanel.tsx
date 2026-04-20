'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/SpotifyPanel.tsx
// Vibe-matched Spotify song suggestions via Gemini, plus a
// manual URL field and playlist name input.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Music2, ExternalLink, Loader2 } from 'lucide-react';
import {
  PanelRoot,
  PanelSection,
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
} from './panel';
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
    <PanelRoot>

      {/* ── Playlist URL + name ── */}
      <PanelSection title="Music" icon={Music2} defaultOpen>
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
      </PanelSection>

      {/* ── Gemini suggestions ── */}
      <PanelSection title="AI Song Suggestions" defaultOpen>
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
              padding: '8px 12px',
              borderRadius: 'var(--pl-radius-md)',
              border: '1px solid #E4E4E7',
              background: loading ? '#F4F4F5' : '#FFFFFF',
              color: loading ? '#A1A1AA' : '#18181B',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: panelText.hint,
              fontWeight: panelWeight.semibold,
              transition: 'background var(--pl-dur-instant)',
            }}
            onMouseOver={e => {
              if (!loading) (e.currentTarget as HTMLElement).style.background = '#F4F4F5';
            }}
            onMouseOut={e => {
              if (!loading) (e.currentTarget as HTMLElement).style.background = '#FFFFFF';
            }}
          >
            {loading ? (
              <>
                <Loader2 size={13} style={{ animation: 'pl-spin 1s linear infinite' }} />
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
            <p style={{
              fontSize: panelText.body,
              color: '#b34747',
              margin: 0,
              textAlign: 'center',
            }}>
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
                    borderRadius: 'var(--pl-radius-md)',
                    background: '#FAFAFA',
                    border: '1px solid #E4E4E7',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: panelText.itemTitle,
                        fontWeight: panelWeight.semibold,
                        color: '#18181B',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {song.title} · <span style={{ fontWeight: panelWeight.regular, color: '#3F3F46' }}>{song.artist}</span>
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '3px',
                        fontSize: panelText.chip,
                        fontWeight: panelWeight.bold,
                        letterSpacing: panelTracking.wide,
                        textTransform: 'uppercase',
                        color: '#71717A',
                        background: '#F4F4F5',
                        border: '1px solid #E4E4E7',
                        borderRadius: 'var(--pl-radius-xs)',
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
                      borderRadius: 'var(--pl-radius-sm)',
                      background: '#FAFAFA',
                      border: '1px solid #E4E4E7',
                      color: '#3F3F46',
                      flexShrink: 0,
                      textDecoration: 'none',
                      transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                    }}
                    onMouseOver={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(30,215,96,0.12)';
                      (e.currentTarget as HTMLElement).style.color = '#1ED760';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(30,215,96,0.3)';
                    }}
                    onMouseOut={e => {
                      (e.currentTarget as HTMLElement).style.background = '#FAFAFA';
                      (e.currentTarget as HTMLElement).style.color = '#3F3F46';
                      (e.currentTarget as HTMLElement).style.borderColor = '#E4E4E7';
                    }}
                  >
                    <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </div>
          )}

          {songs.length === 0 && !loading && !error && (
            <p style={{
              fontSize: panelText.body,
              color: '#71717A',
              textAlign: 'center',
              margin: 0,
              padding: '0.5rem 0',
              lineHeight: panelLineHeight.snug,
            }}>
              Click the button to get 10 songs matched to your vibe
            </p>
          )}
        </div>
      </PanelSection>

      {/* ── Embed preview ── */}
      {embedUrl && (
        <PanelSection title="Preview" defaultOpen={false}>
          <div style={{ borderRadius: 'var(--pl-radius-lg)', overflow: 'hidden', border: '1px solid #E4E4E7' }}>
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
        </PanelSection>
      )}

      <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
    </PanelRoot>
  );
}
