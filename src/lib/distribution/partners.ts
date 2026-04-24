// ─────────────────────────────────────────────────────────────
// Pearloom / lib/distribution/partners.ts
// Distribution & Partner System — vendor network, photographer
// referrals, planner dashboards, embeddable widgets.
//
// Distribution is the ultimate moat. Product can be copied,
// but a network of wedding planners, photographers, and venues
// actively referring clients to Pearloom cannot.
// ─────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────

export interface Partner {
  id: string;
  type: 'photographer' | 'planner' | 'venue' | 'florist' | 'caterer' | 'dj' | 'videographer';
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  /** Partner tier */
  tier: 'basic' | 'pro' | 'elite';
  /** Referral code for tracking */
  referralCode: string;
  /** Number of clients referred */
  referralCount: number;
  /** Revenue generated from referrals (cents) */
  referralRevenue: number;
  /** Commission rate (percentage) */
  commissionRate: number;
  /** Profile completeness */
  profileComplete: boolean;
  /** Verified partner badge */
  verified: boolean;
  /** Portfolio links */
  portfolioUrls: string[];
  /** Bio/description */
  bio: string;
  /** Specialties */
  specialties: string[];
  /** Average rating from couples */
  rating: number;
  ratingCount: number;
  /** Active/inactive */
  status: 'active' | 'inactive' | 'pending';
  createdAt: number;
}

export interface ReferralTracking {
  id: string;
  partnerId: string;
  siteId: string;
  /** How the referral happened */
  source: 'link' | 'widget' | 'qr' | 'email' | 'manual';
  /** Referral status */
  status: 'clicked' | 'signed-up' | 'generated' | 'published' | 'paid';
  /** Commission earned (cents) */
  commission: number;
  createdAt: number;
  convertedAt?: number;
}

export interface EmbedWidget {
  id: string;
  partnerId: string;
  /** Widget type */
  type: 'banner' | 'button' | 'card' | 'floating';
  /** Custom branding */
  customText?: string;
  customColor?: string;
  /** Embed code */
  embedCode: string;
  /** Click tracking URL */
  trackingUrl: string;
  /** Stats */
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface PlannerDashboard {
  partnerId: string;
  /** Active client sites */
  activeSites: Array<{
    siteId: string;
    coupleName: string;
    eventDate?: string;
    status: 'generating' | 'editing' | 'published';
    lastActivity: number;
  }>;
  /** Upcoming events */
  upcomingEvents: Array<{
    siteId: string;
    coupleName: string;
    eventDate: string;
    daysUntil: number;
  }>;
  /** Analytics */
  analytics: {
    totalSites: number;
    totalGuests: number;
    totalRsvps: number;
    averageRating: number;
  };
}

// ── API Functions ────────────────────────────────────────────

/**
 * Register as a partner.
 */
export async function registerPartner(data: {
  type: Partner['type'];
  businessName: string;
  contactName: string;
  email: string;
  location: Partner['location'];
  bio: string;
  specialties: string[];
  website?: string;
}): Promise<Partner | null> {
  try {
    const res = await fetch('/api/partners/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Generate an embed widget for a partner.
 */
export function generateEmbedCode(partner: Partner, widgetType: EmbedWidget['type']): string {
  const baseUrl = 'https://pearloom.com';
  const referralUrl = `${baseUrl}?ref=${partner.referralCode}`;

  switch (widgetType) {
    case 'button':
      return `<a href="${referralUrl}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:100px;background:#6E8C5C;color:#fff;font-family:Georgia,serif;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.05em;text-transform:uppercase">Create Your Site on Pearloom</a>`;

    case 'banner':
      return `<div style="padding:20px;border-radius:16px;background:linear-gradient(135deg,#FDFAF0,#F0EBE0);border:1px solid rgba(0,0,0,0.06);text-align:center;font-family:Georgia,serif">
  <p style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#7A756E;margin:0 0 8px">Recommended by ${partner.businessName}</p>
  <p style="font-size:20px;font-style:italic;color:#3D3530;margin:0 0 16px">Create your celebration site with Pearloom</p>
  <a href="${referralUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 20px;border-radius:100px;background:#6E8C5C;color:#fff;font-size:12px;font-weight:700;text-decoration:none;letter-spacing:0.08em;text-transform:uppercase">Get Started Free</a>
</div>`;

    case 'card':
      return `<div style="width:300px;padding:24px;border-radius:20px;background:rgba(255,255,255,0.92);backdrop-filter:blur(16px);border:1px solid rgba(0,0,0,0.06);box-shadow:0 4px 24px rgba(43,30,20,0.08);font-family:Georgia,serif">
  <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7A756E;margin:0 0 8px">Partner Recommended</p>
  <p style="font-size:18px;font-style:italic;color:#3D3530;margin:0 0 4px">Pearloom</p>
  <p style="font-size:13px;color:#7A756E;margin:0 0 16px;line-height:1.5">AI-powered celebration sites from your photos</p>
  <a href="${referralUrl}" target="_blank" rel="noopener" style="display:block;text-align:center;padding:10px;border-radius:100px;background:#6E8C5C;color:#fff;font-size:11px;font-weight:700;text-decoration:none;letter-spacing:0.08em;text-transform:uppercase">Create Your Site</a>
</div>`;

    case 'floating':
      return `<div style="position:fixed;bottom:24px;right:24px;z-index:9999">
  <a href="${referralUrl}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:12px 20px;border-radius:100px;background:rgba(255,255,255,0.95);backdrop-filter:blur(16px);border:1px solid rgba(0,0,0,0.06);box-shadow:0 4px 24px rgba(43,30,20,0.1);text-decoration:none;font-family:Georgia,serif">
    <span style="font-size:13px;font-style:italic;color:#3D3530">Create with</span>
    <span style="font-size:13px;font-weight:700;color:#6E8C5C">Pearloom</span>
  </a>
</div>`;

    default:
      return '';
  }
}

/**
 * Track a referral click.
 */
export async function trackReferral(
  referralCode: string,
  source: ReferralTracking['source'],
): Promise<void> {
  try {
    await fetch('/api/partners/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode, source }),
    });
  } catch {}
}

/**
 * Get the planner dashboard data.
 */
export async function getPlannerDashboard(partnerId: string): Promise<PlannerDashboard | null> {
  try {
    const res = await fetch(`/api/partners/dashboard?id=${partnerId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Search for partners near a location (for couples to find vendors).
 */
export async function findPartners(query: {
  type?: Partner['type'];
  city?: string;
  state?: string;
  specialty?: string;
  limit?: number;
}): Promise<Partner[]> {
  try {
    const params = new URLSearchParams();
    if (query.type) params.set('type', query.type);
    if (query.city) params.set('city', query.city);
    if (query.state) params.set('state', query.state);
    if (query.specialty) params.set('specialty', query.specialty);
    if (query.limit) params.set('limit', String(query.limit));

    const res = await fetch(`/api/partners/search?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.partners || [];
  } catch {
    return [];
  }
}

// ── Commission Tiers ─────────────────────────────────────────

export const PARTNER_TIERS = {
  basic: {
    label: 'Basic',
    commissionRate: 10,
    requirements: 'Register and verify your business',
    benefits: ['Referral tracking', 'Basic analytics', 'Embed widget'],
  },
  pro: {
    label: 'Pro',
    commissionRate: 20,
    requirements: '10+ referrals, 4.0+ rating',
    benefits: ['Higher commission', 'Priority listing', 'Custom branding', 'Planner dashboard'],
  },
  elite: {
    label: 'Elite',
    commissionRate: 30,
    requirements: '50+ referrals, 4.5+ rating, verified',
    benefits: ['Highest commission', 'Featured partner badge', 'Direct support line', 'Custom integration'],
  },
} as const;
