'use client';

/* ========================================================================
   PhotoDropTarget — in-canvas drag-drop for photo tiles.
   Wraps any visual photo slot (hero cover, chapter card image, etc.)
   and accepts one or more image files dropped from the OS or dragged
   from the photo library. Uploads base64 to /api/photos/upload and
   calls onDrop(url) with the first returned CDN URL.

   Only interactive in editor canvas (editMode=true). In published mode
   it's a pass-through wrapper so it never interferes with real guests.
   ======================================================================== */

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useIsEditMode } from './EditorCanvasContext';

interface PhotoDropTargetProps {
  /** Called with the uploaded photo URL once the drop + upload succeed. */
  onDrop: (url: string) => void;
  /** Label shown during hover. Defaults to "Drop a photo". */
  label?: string;
  /** Wraps around the actual photo tile UI. */
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

type Status = 'idle' | 'hover' | 'uploading' | 'error';

export function PhotoDropTarget({ onDrop, label, children, className, style }: PhotoDropTargetProps) {
  const edit = useIsEditMode();
  const [status, setStatus] = useState<Status>('idle');
  const [err, setErr] = useState<string | null>(null);
  const dragDepth = useRef(0);

  if (!edit) {
    return <div className={className} style={style}>{children}</div>;
  }

  const reset = () => {
    dragDepth.current = 0;
    setStatus('idle');
  };

  const readAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    const file = Array.from(e.dataTransfer.files ?? []).find((f) => f.type.startsWith('image/'));
    if (!file) {
      // Check URL drag from another canvas photo.
      const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
      if (url && /^https?:\/\//i.test(url)) {
        onDrop(url);
        setStatus('idle');
        return;
      }
      setErr('Drop an image file');
      setStatus('error');
      setTimeout(reset, 1400);
      return;
    }
    setStatus('uploading');
    setErr(null);
    try {
      const base64 = await readAsBase64(file);
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [
            {
              id: `drop-${Date.now()}`,
              filename: file.name || 'photo.jpg',
              mimeType: file.type || 'image/jpeg',
              base64,
              capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { photos?: Array<{ baseUrl?: string }> };
      const url = data.photos?.[0]?.baseUrl;
      if (!url) throw new Error('No URL returned');
      onDrop(url);
      setStatus('idle');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Upload failed');
      setStatus('error');
      setTimeout(reset, 1800);
    }
  }

  return (
    <div
      className={className}
      style={{ position: 'relative', ...style }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth.current += 1;
        if (status !== 'uploading') setStatus('hover');
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth.current -= 1;
        if (dragDepth.current <= 0 && status === 'hover') reset();
      }}
      onDrop={handleDrop}
    >
      {children}
      {status === 'hover' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(92, 107, 63, 0.14)',
            border: '2px dashed var(--sage-deep, #5C6B3F)',
            borderRadius: 'inherit',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--sage-deep, #5C6B3F)',
            fontWeight: 600,
            fontSize: 14,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {label ?? 'Drop to replace'}
        </div>
      )}
      {status === 'uploading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(245, 239, 226, 0.7)',
            borderRadius: 'inherit',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-soft)',
            fontSize: 13,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          Uploading…
        </div>
      )}
      {status === 'error' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(122, 45, 45, 0.12)',
            border: '2px solid var(--plum-ink, #7A2D2D)',
            borderRadius: 'inherit',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--plum-ink, #7A2D2D)',
            fontSize: 13,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {err ?? 'Upload failed'}
        </div>
      )}
    </div>
  );
}
