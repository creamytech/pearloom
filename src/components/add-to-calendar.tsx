'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/add-to-calendar.tsx
// Add to Calendar — generates Google Calendar & iCal links
// for wedding events with glass-morphism styling.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { Calendar, Download } from 'lucide-react';

interface AddToCalendarProps {
  eventName: string;
  date: string;       // ISO 8601 date e.g. "2025-06-14"
  time: string;       // e.g. "5:00 PM"
  endTime?: string;   // e.g. "11:00 PM"
  venue: string;
  address: string;
  description?: string;
}

/** Parse "5:00 PM" or "17:00" into { hours, minutes } in 24h format */
function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const normalized = timeStr.trim().toUpperCase();

  // Try 12-hour format: "5:00 PM", "11:30 AM"
  const match12 = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    if (match12[3] === 'PM' && hours !== 12) hours += 12;
    if (match12[3] === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  }

  // Try 24-hour format: "17:00"
  const match24 = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return { hours: parseInt(match24[1], 10), minutes: parseInt(match24[2], 10) };
  }

  return null;
}

/** Build a Date from "YYYY-MM-DD" + "5:00 PM" in local time */
function buildDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;

  const time = parseTime(timeStr);
  if (!time) return new Date(y, m - 1, d);
  return new Date(y, m - 1, d, time.hours, time.minutes);
}

/** Format date for Google Calendar: "20250614T170000" (local) */
function toGoogleCalDate(dt: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

/** Format date for iCal: "20250614T170000" */
function toICalDate(dt: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

export function AddToCalendar({
  eventName,
  date,
  time,
  endTime,
  venue,
  address,
  description,
}: AddToCalendarProps) {
  const start = buildDateTime(date, time);
  if (!start) return null;

  // Default end time: 2 hours after start
  const end = endTime
    ? buildDateTime(date, endTime)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  if (!end) return null;

  const location = [venue, address].filter(Boolean).join(', ');
  const desc = description || `Join us for ${eventName}`;

  // ── Google Calendar URL ──
  const googleParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventName,
    dates: `${toGoogleCalDate(start)}/${toGoogleCalDate(end)}`,
    location,
    details: desc,
  });
  const googleUrl = `https://calendar.google.com/calendar/render?${googleParams.toString()}`;

  // ── iCal (.ics) data URI ──
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pearloom//Celebration//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${toICalDate(start)}`,
    `DTEND:${toICalDate(end)}`,
    `SUMMARY:${eventName.replace(/[,;\\]/g, '')}`,
    `LOCATION:${location.replace(/[,;\\]/g, '')}`,
    `DESCRIPTION:${desc.replace(/[,;\\]/g, '')}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const icsDataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  return (
    <>
      <style>{`
        @keyframes pl-cal-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pl-add-to-cal {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          animation: pl-cal-fade-in 0.4s ease-out both;
        }
        .pl-cal-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: clamp(0.75rem, 2vw, 0.85rem);
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 0.35rem 0.75rem;
          border-radius: 100px;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
          border: none;
          line-height: 1;
        }
        .pl-cal-btn:hover {
          transform: translateY(-1px);
        }
        .pl-cal-btn--google {
          background: var(--pl-olive, #A3B18A);
          color: #fff;
          box-shadow: 0 2px 8px rgba(163,177,138,0.25);
        }
        .pl-cal-btn--google:hover {
          background: var(--pl-olive-deep, #8A9E72);
          box-shadow: 0 4px 12px rgba(163,177,138,0.35);
        }
        .pl-cal-btn--ical {
          background: rgba(43,30,20,0.04);
          color: var(--pl-muted, #9A9488);
          border: 1px solid rgba(43,30,20,0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .pl-cal-btn--ical:hover {
          background: rgba(43,30,20,0.08);
          box-shadow: 0 2px 8px rgba(43,30,20,0.06);
        }
      `}</style>
      <div className="pl-add-to-cal">
        <a
          href={googleUrl}
          target="_blank"
          rel="noreferrer"
          className="pl-cal-btn pl-cal-btn--google"
        >
          <Calendar size={11} />
          Google Calendar
        </a>
        <a
          href={icsDataUri}
          download={`${eventName.replace(/\s+/g, '-').toLowerCase()}.ics`}
          className="pl-cal-btn pl-cal-btn--ical"
          aria-label="Download event to Apple Calendar"
        >
          <Download size={11} />
          Apple Calendar
        </a>
      </div>
    </>
  );
}
