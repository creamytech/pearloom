// -----------------------------------------------------------------
// Pearloom / lib/referrals.ts
// Core referral program logic: code generation, stats, signup
// processing, and reward fulfillment.
// -----------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// --- Lazy Supabase client (server-side only) ---------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// --- Types -------------------------------------------------------

export interface Referral {
  id: string;
  referrerEmail: string;
  referralCode: string; // unique 8-char code
  referredEmail?: string;
  status: 'pending' | 'signed_up' | 'converted' | 'rewarded';
  rewardType: 'free_template';
  rewardItemId?: string;
  createdAt: string;
  convertedAt?: string;
}

// --- Helpers -----------------------------------------------------

/**
 * Generate a unique 8-character referral code for a user.
 * Deterministic per email so each user always gets the same code.
 */
export function generateReferralCode(email: string): string {
  const hash = createHash('sha256')
    .update(`pearloom-referral:${email.toLowerCase().trim()}`)
    .digest('hex');
  // Take the first 8 hex characters and upper-case for readability
  return hash.slice(0, 8).toUpperCase();
}

/**
 * Map a Supabase row to our Referral interface.
 */
function toReferral(row: Record<string, unknown>): Referral {
  return {
    id: row.id as string,
    referrerEmail: row.referrer_email as string,
    referralCode: row.referral_code as string,
    referredEmail: (row.referred_email as string) || undefined,
    status: row.status as Referral['status'],
    rewardType: (row.reward_type as Referral['rewardType']) || 'free_template',
    rewardItemId: (row.reward_item_id as string) || undefined,
    createdAt: row.created_at as string,
    convertedAt: (row.converted_at as string) || undefined,
  };
}

// --- Public API --------------------------------------------------

/**
 * Get referral stats for a user, including their code and counts.
 */
export async function getReferralStats(email: string): Promise<{
  code: string;
  totalReferred: number;
  totalConverted: number;
  rewardsEarned: number;
  pendingRewards: number;
}> {
  const supabase = getSupabase();
  const code = generateReferralCode(email);

  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_email', email.toLowerCase().trim());

  if (error) {
    console.error('[Referrals] getReferralStats error:', error.message);
    return { code, totalReferred: 0, totalConverted: 0, rewardsEarned: 0, pendingRewards: 0 };
  }

  const referrals = (data ?? []).map(toReferral);

  const totalReferred = referrals.length;
  const totalConverted = referrals.filter(
    (r) => r.status === 'converted' || r.status === 'rewarded',
  ).length;
  const rewardsEarned = referrals.filter((r) => r.status === 'rewarded').length;
  const pendingRewards = referrals.filter((r) => r.status === 'converted').length;

  return { code, totalReferred, totalConverted, rewardsEarned, pendingRewards };
}

/**
 * Process a referral signup. Called when a new user signs up using a
 * referral code. Creates a referral record in the "signed_up" state.
 */
export async function processReferralSignup(
  referralCode: string,
  newUserEmail: string,
): Promise<void> {
  const supabase = getSupabase();
  const normalizedEmail = newUserEmail.toLowerCase().trim();
  const normalizedCode = referralCode.toUpperCase().trim();

  // Look up an existing referral row for this code + referred email
  // to avoid duplicates
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referral_code', normalizedCode)
    .eq('referred_email', normalizedEmail)
    .maybeSingle();

  if (existing) {
    // Already tracked — nothing to do
    return;
  }

  // Resolve the referrer email from an existing referral row with
  // this code, or from a deterministic reverse-lookup. We query
  // existing rows first because the code is deterministic per email.
  const { data: anyRow } = await supabase
    .from('referrals')
    .select('referrer_email')
    .eq('referral_code', normalizedCode)
    .limit(1)
    .maybeSingle();

  const referrerEmail = (anyRow?.referrer_email as string) || null;

  // Prevent self-referral
  if (referrerEmail && referrerEmail.toLowerCase() === normalizedEmail) {
    return;
  }

  const { error } = await supabase.from('referrals').insert({
    referrer_email: referrerEmail,
    referral_code: normalizedCode,
    referred_email: normalizedEmail,
    status: 'signed_up',
    reward_type: 'free_template',
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[Referrals] processReferralSignup error:', error.message);
    throw new Error(`processReferralSignup failed: ${error.message}`);
  }
}

/**
 * Mark a referral as "converted" when the referred user creates a
 * site. Called from site-creation flows.
 */
export async function markReferralConverted(referredEmail: string): Promise<void> {
  const supabase = getSupabase();
  const normalizedEmail = referredEmail.toLowerCase().trim();

  const { error } = await supabase
    .from('referrals')
    .update({
      status: 'converted',
      converted_at: new Date().toISOString(),
    })
    .eq('referred_email', normalizedEmail)
    .eq('status', 'signed_up');

  if (error) {
    console.error('[Referrals] markReferralConverted error:', error.message);
  }
}

/**
 * Award a referral reward by granting the referrer a free premium
 * template. Inserts a $0 purchase into marketplace_purchases and
 * marks the referral as "rewarded".
 */
export async function awardReferralReward(
  referrerEmail: string,
  templateId: string,
): Promise<void> {
  const supabase = getSupabase();
  const normalizedEmail = referrerEmail.toLowerCase().trim();

  // Find the oldest "converted" referral for this user to mark as rewarded
  const { data: convertedRow, error: fetchError } = await supabase
    .from('referrals')
    .select('id')
    .eq('referrer_email', normalizedEmail)
    .eq('status', 'converted')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError || !convertedRow) {
    throw new Error('No converted referral found to reward');
  }

  // Grant the template via marketplace_purchases (same table used by
  // the marketplace purchase flow)
  const { error: purchaseError } = await supabase
    .from('marketplace_purchases')
    .insert({
      user_email: normalizedEmail,
      item_id: templateId,
      item_type: 'template',
      price_paid: 0,
      stripe_session_id: `referral-reward-${convertedRow.id}`,
      purchased_at: new Date().toISOString(),
    });

  if (purchaseError) {
    throw new Error(`Failed to grant template: ${purchaseError.message}`);
  }

  // Mark the referral as rewarded
  const { error: updateError } = await supabase
    .from('referrals')
    .update({
      status: 'rewarded',
      reward_item_id: templateId,
    })
    .eq('id', convertedRow.id);

  if (updateError) {
    console.error('[Referrals] Failed to mark referral as rewarded:', updateError.message);
  }
}

/**
 * Seed the referral code for a user. Call this when a user first
 * views the referral panel so their code is discoverable by future
 * signups even if they have not yet referred anyone.
 */
export async function ensureReferralCode(email: string): Promise<string> {
  const supabase = getSupabase();
  const normalizedEmail = email.toLowerCase().trim();
  const code = generateReferralCode(normalizedEmail);

  // Check if there is already any row with this code
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referral_code', code)
    .limit(1)
    .maybeSingle();

  if (!existing) {
    // Insert a "seed" row so the code is discoverable
    await supabase.from('referrals').insert({
      referrer_email: normalizedEmail,
      referral_code: code,
      status: 'pending',
      reward_type: 'free_template',
      created_at: new Date().toISOString(),
    });
  }

  return code;
}
