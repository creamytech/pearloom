'use client';

// ─────────────────────────────────────────────────────────────
// everglow / app/dashboard/rsvps/page.tsx — RSVP dashboard
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserCheck, UserX, Clock, Music, Utensils, MessageCircle } from 'lucide-react';
import type { RsvpResponse, RsvpStatus } from '@/types';

interface RsvpStats {
  total: number;
  attending: number;
  declined: number;
  pending: number;
  totalGuests: number;
}

export default function RsvpDashboard() {
  const [rsvps, setRsvps] = useState<RsvpResponse[]>([]);
  const [stats, setStats] = useState<RsvpStats>({ total: 0, attending: 0, declined: 0, pending: 0, totalGuests: 0 });
  const [filter, setFilter] = useState<RsvpStatus | 'all'>('all');

  useEffect(() => {
    fetch('/api/rsvp')
      .then((r) => r.json())
      .then((data) => {
        setRsvps(data.rsvps || []);
        setStats(data.stats || { total: 0, attending: 0, declined: 0, pending: 0, totalGuests: 0 });
      });
  }, []);

  const filtered = filter === 'all' ? rsvps : rsvps.filter((r) => r.status === filter);

  return (
    <div>
      <h2
        className="text-3xl font-semibold mb-2 tracking-tight"
        style={{ fontFamily: 'var(--eg-font-heading)' }}
      >
        RSVP Responses
      </h2>
      <p className="text-[var(--eg-muted)] mb-8">Manage your guest responses.</p>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Responses', value: stats.total, icon: Users, color: 'text-[var(--eg-fg)]' },
          { label: 'Attending', value: stats.attending, icon: UserCheck, color: 'text-green-600' },
          { label: 'Declined', value: stats.declined, icon: UserX, color: 'text-red-500' },
          { label: 'Total Guests', value: stats.totalGuests, icon: Users, color: 'text-[var(--eg-accent)]' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-black/5 shadow-sm p-5"
          >
            <stat.icon size={20} className={`${stat.color} mb-2`} />
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-[var(--eg-muted)]">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'attending', 'declined'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer
              ${filter === f
                ? 'bg-[var(--eg-fg)] text-white'
                : 'bg-black/5 text-[var(--eg-muted)] hover:bg-black/10'
              }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Responses list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--eg-muted)]">
          <Clock size={32} className="mx-auto mb-3 opacity-50" />
          <p>No responses yet. Share your RSVP link!</p>
          <p className="text-sm mt-2 font-mono bg-black/5 inline-block px-4 py-2 rounded-lg mt-4">
            {typeof window !== 'undefined' ? `${window.location.origin}/rsvp` : '/rsvp'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rsvp) => (
            <motion.div
              key={rsvp.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl border border-black/5 shadow-sm p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-[var(--eg-fg)]">{rsvp.guestName}</h4>
                  <p className="text-xs text-[var(--eg-muted)]">{rsvp.email}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium
                    ${rsvp.status === 'attending' ? 'bg-green-50 text-green-700' : ''}
                    ${rsvp.status === 'declined' ? 'bg-red-50 text-red-600' : ''}
                    ${rsvp.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : ''}
                  `}
                >
                  {rsvp.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--eg-muted)]">
                {rsvp.plusOne && (
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    +1: {rsvp.plusOneName || 'unnamed'}
                  </span>
                )}
                {rsvp.mealPreference && (
                  <span className="flex items-center gap-1">
                    <Utensils size={12} />
                    {rsvp.mealPreference}
                  </span>
                )}
                {rsvp.songRequest && (
                  <span className="flex items-center gap-1">
                    <Music size={12} />
                    {rsvp.songRequest}
                  </span>
                )}
              </div>

              {rsvp.message && (
                <div className="mt-3 pt-3 border-t border-black/5 flex items-start gap-2">
                  <MessageCircle size={12} className="text-[var(--eg-accent)] mt-0.5 shrink-0" />
                  <p className="text-sm text-[var(--eg-muted)] italic">&ldquo;{rsvp.message}&rdquo;</p>
                </div>
              )}

              <p className="text-[10px] text-[var(--eg-muted)]/50 mt-3">
                responded {new Date(rsvp.respondedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
