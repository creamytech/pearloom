'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/LeafletMap.tsx
// Leaflet map — must be imported dynamically (no SSR).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import type { Chapter } from '@/types';

interface LeafletMapProps {
  chapters: Chapter[];
  accentColor: string;
}

export default function LeafletMap({ chapters, accentColor }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Collect chapters that have locations
    const located = chapters.filter(ch => ch.location !== null);
    if (located.length === 0) return;

    import('leaflet').then(L => {
      if (!containerRef.current || mapRef.current) return;

      // Fix default icon path issue in bundled environments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Compute centroid
      const lats = located.map(ch => ch.location!.lat);
      const lngs = located.map(ch => ch.location!.lng);
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

      const map = L.map(containerRef.current!).setView([centerLat, centerLng], 5);
      mapRef.current = map;

      // OpenStreetMap tiles — no API key required
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      // Draw polyline journey
      const latlngs: [number, number][] = located.map(ch => [ch.location!.lat, ch.location!.lng]);
      L.polyline(latlngs, {
        color: accentColor,
        weight: 2.5,
        opacity: 0.55,
        dashArray: '6, 8',
      }).addTo(map);

      // Add numbered circular markers
      located.forEach((ch, i) => {
        const svgIcon = L.divIcon({
          className: '',
          html: `<div style="
            width:32px;height:32px;border-radius:50%;
            background:${accentColor};
            color:#fff;
            display:flex;align-items:center;justify-content:center;
            font-size:13px;font-weight:700;
            box-shadow:0 2px 12px rgba(0,0,0,0.25);
            border:2.5px solid #fff;
            font-family:sans-serif;
            cursor:pointer;
          ">${i + 1}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        });

        const dateLabel = ch.date
          ? new Date(ch.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : '';

        L.marker([ch.location!.lat, ch.location!.lng], { icon: svgIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:160px">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin-bottom:4px">${ch.mood || ''} · ${dateLabel}</div>
              <div style="font-size:15px;font-weight:600;margin-bottom:2px">${ch.title}</div>
              <div style="font-size:12px;color:#666">${ch.location!.label}</div>
            </div>
          `);
      });

      // Fit bounds if multiple locations
      if (located.length > 1) {
        map.fitBounds(latlngs, { padding: [40, 40] });
      }
    });

    return () => {
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapRef.current as any).remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 'clamp(320px, 45vw, 500px)',
        background: '#e8e4e0',
      }}
    />
  );
}
