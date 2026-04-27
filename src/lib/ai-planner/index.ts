// ─────────────────────────────────────────────────────────────
// Pearloom / lib/ai-planner/index.ts
// AI Wedding Planner — proactive checklist, vendor suggestions,
// timeline recommendations, budget tracking.
//
// This isn't a static checklist — it's an AI that learns from
// the couple's date, venue, and guest count to give proactive
// "you should do X by next week" recommendations.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

// ── Types ────────────────────────────────────────────────────

export interface PlannerTask {
  id: string;
  title: string;
  description: string;
  category: 'venue' | 'catering' | 'photo' | 'music' | 'flowers' | 'attire' | 'invites' | 'legal' | 'transport' | 'decor' | 'gifts' | 'other';
  /** When this should be done (months before event) */
  monthsBefore: number;
  /** Priority */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** Estimated budget */
  estimatedCost?: { min: number; max: number };
  /** Is this completed? */
  completed: boolean;
  completedAt?: number;
  /** AI-generated tip */
  tip?: string;
  /** Relevant vendor type */
  vendorType?: string;
}

export interface PlannerBudget {
  total: number;
  categories: Record<string, { allocated: number; spent: number }>;
}

export interface PlannerRecommendation {
  type: 'task' | 'vendor' | 'tip' | 'deadline';
  title: string;
  message: string;
  urgency: 'now' | 'this-week' | 'this-month' | 'upcoming';
  actionUrl?: string;
}

// ── Checklist Generator ──────────────────────────────────────

/**
 * Generate a personalized checklist based on event date and type.
 */
export function generateChecklist(
  manifest: StoryManifest,
  eventDate: string,
): PlannerTask[] {
  const occasion = manifest.occasion || 'wedding';
  const now = new Date();
  const event = new Date(eventDate);
  const monthsAway = Math.max(0, Math.round((event.getTime() - now.getTime()) / (30 * 86400000)));

  if (occasion === 'wedding') {
    return WEDDING_CHECKLIST.map((task, i) => ({
      ...task,
      id: `task-${i}`,
      completed: task.monthsBefore > monthsAway, // auto-complete past tasks
    }));
  }

  if (occasion === 'birthday') {
    return BIRTHDAY_CHECKLIST.map((task, i) => ({
      ...task,
      id: `task-${i}`,
      completed: task.monthsBefore > monthsAway,
    }));
  }

  return GENERAL_CHECKLIST.map((task, i) => ({
    ...task,
    id: `task-${i}`,
    completed: task.monthsBefore > monthsAway,
  }));
}

/**
 * Get AI recommendations based on current progress.
 */
export function getRecommendations(
  tasks: PlannerTask[],
  manifest: StoryManifest,
  eventDate: string,
): PlannerRecommendation[] {
  const recs: PlannerRecommendation[] = [];
  const now = new Date();
  const event = new Date(eventDate);
  const daysAway = Math.max(0, Math.round((event.getTime() - now.getTime()) / 86400000));
  const monthsAway = Math.round(daysAway / 30);

  // Find overdue tasks
  const overdue = tasks.filter(t => !t.completed && t.monthsBefore > monthsAway);
  if (overdue.length > 0) {
    const critical = overdue.find(t => t.priority === 'critical');
    if (critical) {
      recs.push({
        type: 'task',
        title: `Overdue: ${critical.title}`,
        message: `This was due ${critical.monthsBefore - monthsAway} month(s) ago. ${critical.tip || 'Complete this as soon as possible.'}`,
        urgency: 'now',
      });
    }
  }

  // RSVP deadline reminder
  if (daysAway <= 60 && !manifest.logistics?.rsvpDeadline) {
    recs.push({
      type: 'deadline',
      title: 'Set your RSVP deadline',
      message: `Your event is ${daysAway} days away. Set an RSVP deadline so guests know when to respond.`,
      urgency: 'this-week',
    });
  }

  // Guest count check
  const hasGuests = manifest.events && manifest.events.length > 0;
  if (daysAway <= 90 && !hasGuests) {
    recs.push({
      type: 'tip',
      title: 'Start your guest list',
      message: 'With 3 months to go, it\'s time to finalize your guest list and send invitations.',
      urgency: 'this-week',
    });
  }

  // Site not published
  if (!manifest.publishedAt && daysAway <= 120) {
    recs.push({
      type: 'tip',
      title: 'Publish your site',
      message: 'Your site isn\'t published yet. Share it with guests so they can RSVP and see the details.',
      urgency: daysAway <= 60 ? 'now' : 'this-month',
    });
  }

  // Missing venue
  if (!manifest.logistics?.venue && daysAway <= 180) {
    recs.push({
      type: 'vendor',
      title: 'Book your venue',
      message: `Popular venues book up 6-12 months in advance. Start researching now.`,
      urgency: monthsAway <= 6 ? 'now' : 'this-month',
    });
  }

  return recs;
}

/**
 * Get estimated budget breakdown by category.
 */
export function getEstimatedBudget(guestCount: number, tier: 'budget' | 'moderate' | 'luxury'): PlannerBudget {
  const multipliers = { budget: 1, moderate: 2, luxury: 4 };
  const m = multipliers[tier];
  const perGuest = 75 * m;

  return {
    total: guestCount * perGuest,
    categories: {
      venue: { allocated: Math.round(guestCount * perGuest * 0.3), spent: 0 },
      catering: { allocated: Math.round(guestCount * perGuest * 0.25), spent: 0 },
      photography: { allocated: Math.round(guestCount * perGuest * 0.12), spent: 0 },
      flowers: { allocated: Math.round(guestCount * perGuest * 0.08), spent: 0 },
      music: { allocated: Math.round(guestCount * perGuest * 0.07), spent: 0 },
      attire: { allocated: Math.round(guestCount * perGuest * 0.08), spent: 0 },
      invitations: { allocated: Math.round(guestCount * perGuest * 0.03), spent: 0 },
      other: { allocated: Math.round(guestCount * perGuest * 0.07), spent: 0 },
    },
  };
}

// ── Checklists ───────────────────────────────────────────────

const WEDDING_CHECKLIST: Omit<PlannerTask, 'id' | 'completed'>[] = [
  { title: 'Set a budget', description: 'Determine total budget and allocate by category', category: 'other', monthsBefore: 12, priority: 'critical', tip: 'Average US wedding cost is $30,000. Be realistic about what you can afford.' },
  { title: 'Choose your venue', description: 'Visit venues, compare pricing, and book', category: 'venue', monthsBefore: 10, priority: 'critical', estimatedCost: { min: 3000, max: 15000 }, vendorType: 'venue' },
  { title: 'Book photographer', description: 'Research, review portfolios, and book', category: 'photo', monthsBefore: 9, priority: 'high', estimatedCost: { min: 1500, max: 5000 }, vendorType: 'photographer' },
  { title: 'Book caterer', description: 'Tastings, menu selection, dietary accommodations', category: 'catering', monthsBefore: 8, priority: 'high', estimatedCost: { min: 3000, max: 12000 }, vendorType: 'caterer' },
  { title: 'Choose wedding party', description: 'Ask bridesmaids, groomsmen, officiant', category: 'other', monthsBefore: 8, priority: 'medium' },
  { title: 'Book florist', description: 'Bouquets, centerpieces, venue florals', category: 'flowers', monthsBefore: 7, priority: 'medium', estimatedCost: { min: 1000, max: 5000 }, vendorType: 'florist' },
  { title: 'Book DJ or band', description: 'Music for ceremony and reception', category: 'music', monthsBefore: 7, priority: 'medium', estimatedCost: { min: 800, max: 3000 }, vendorType: 'dj' },
  { title: 'Order invitations', description: 'Design, print, and prepare mailing', category: 'invites', monthsBefore: 6, priority: 'high', tip: 'Or skip paper — use Pearloom\'s email invitations!' },
  { title: 'Finalize guest list', description: 'Confirm all names, addresses, plus-ones', category: 'invites', monthsBefore: 5, priority: 'critical' },
  { title: 'Send invitations', description: 'Mail or email invitations to all guests', category: 'invites', monthsBefore: 4, priority: 'critical', tip: 'Send 6-8 weeks before the event.' },
  { title: 'Wedding attire', description: 'Purchase dress, suit, accessories', category: 'attire', monthsBefore: 6, priority: 'high', estimatedCost: { min: 500, max: 5000 } },
  { title: 'Book transport', description: 'Limo, shuttle, getaway car', category: 'transport', monthsBefore: 4, priority: 'medium', estimatedCost: { min: 300, max: 1500 } },
  { title: 'Publish your Pearloom site', description: 'Make your site live for guests', category: 'other', monthsBefore: 4, priority: 'high', tip: 'Include RSVP, directions, and registry info.' },
  { title: 'Order cake', description: 'Tasting, design, and order', category: 'catering', monthsBefore: 3, priority: 'medium', estimatedCost: { min: 300, max: 1500 } },
  { title: 'Plan seating chart', description: 'Assign tables based on RSVPs', category: 'other', monthsBefore: 1, priority: 'high', tip: 'Use Pearloom\'s seating chart tool!' },
  { title: 'Final headcount to caterer', description: 'Confirm meal counts and dietary needs', category: 'catering', monthsBefore: 1, priority: 'critical', tip: 'Export from Pearloom\'s guest manager.' },
  { title: 'Confirm all vendors', description: 'Final check-in with every vendor', category: 'other', monthsBefore: 1, priority: 'critical' },
  { title: 'Write vows', description: 'If writing personal vows', category: 'other', monthsBefore: 1, priority: 'medium' },
  { title: 'Marriage license', description: 'Apply at your local courthouse', category: 'legal', monthsBefore: 1, priority: 'critical', tip: 'Most licenses are valid for 30-90 days.' },
];

const BIRTHDAY_CHECKLIST: Omit<PlannerTask, 'id' | 'completed'>[] = [
  { title: 'Set a budget', description: 'Determine how much to spend', category: 'other', monthsBefore: 3, priority: 'high' },
  { title: 'Choose venue', description: 'Home, restaurant, or event space', category: 'venue', monthsBefore: 2, priority: 'high' },
  { title: 'Create guest list', description: 'Decide who to invite', category: 'invites', monthsBefore: 2, priority: 'high' },
  { title: 'Send invitations', description: 'Email or text invitations', category: 'invites', monthsBefore: 1, priority: 'critical', tip: 'Use Pearloom to send beautiful email invites!' },
  { title: 'Order cake', description: 'Flavor, design, candles', category: 'catering', monthsBefore: 1, priority: 'medium' },
  { title: 'Plan decorations', description: 'Balloons, banners, table settings', category: 'decor', monthsBefore: 1, priority: 'medium' },
  { title: 'Arrange food & drinks', description: 'Menu, beverages, dietary needs', category: 'catering', monthsBefore: 1, priority: 'high' },
  { title: 'Plan activities', description: 'Games, music, entertainment', category: 'other', monthsBefore: 1, priority: 'medium' },
  { title: 'Publish your site', description: 'Share your Pearloom site with guests', category: 'other', monthsBefore: 1, priority: 'medium' },
];

const GENERAL_CHECKLIST: Omit<PlannerTask, 'id' | 'completed'>[] = [
  { title: 'Set a date', description: 'Choose your event date', category: 'other', monthsBefore: 3, priority: 'critical' },
  { title: 'Choose a venue', description: 'Book your location', category: 'venue', monthsBefore: 2, priority: 'high' },
  { title: 'Create guest list', description: 'Decide who to invite', category: 'invites', monthsBefore: 2, priority: 'high' },
  { title: 'Send invitations', description: 'Invite your guests', category: 'invites', monthsBefore: 1, priority: 'critical' },
  { title: 'Plan catering', description: 'Food and beverages', category: 'catering', monthsBefore: 1, priority: 'high' },
  { title: 'Publish your site', description: 'Make your site live', category: 'other', monthsBefore: 1, priority: 'medium' },
];
