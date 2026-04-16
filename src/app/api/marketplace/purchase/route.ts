// ─────────────────────────────────────────────────────────────
// Pearloom / api/marketplace/purchase/route.ts
// Stripe checkout for one-time marketplace item purchases.
// POST /api/marketplace/purchase
// Body: { itemId: string, itemType: MarketplaceItemType }
// Returns: { checkoutUrl: string } or { owned: true }
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { getUserPlan } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  checkOwnership,
  isItemFree,
  recordPurchase,
  type MarketplaceItemType,
  type MarketplaceItem,
} from '@/lib/marketplace';
import { SITE_TEMPLATES } from '@/lib/templates/wedding-templates';
import { MARKETPLACE_PACKS } from '@/lib/marketplace-assets';
import { COLOR_THEMES } from '@/lib/templates/color-themes';

// Map an asset pack category to its MarketplaceItemType.
const PACK_CATEGORY_TO_ITEM_TYPE: Record<string, MarketplaceItemType> = {
  icons: 'icon-pack',
  backgrounds: 'background-pack',
  accents: 'accent-pack',
  stickers: 'sticker-pack',
};

export const dynamic = 'force-dynamic';

// ─── Item catalogue lookup ───────────────────────────────────

/**
 * Resolve a marketplace item by ID. For templates, we derive
 * the MarketplaceItem from the SITE_TEMPLATES catalogue.
 * Other item types will be looked up from the database later.
 */
function resolveItem(
  itemId: string,
  itemType: MarketplaceItemType,
): MarketplaceItem | null {
  if (itemType === 'template') {
    const tmpl = SITE_TEMPLATES.find((t) => t.id === itemId);
    if (!tmpl) return null;
    return {
      id: tmpl.id,
      type: 'template',
      name: tmpl.name,
      description: tmpl.description,
      price: tmpl.price ?? 0,
      currency: 'usd',
      creatorRevenue: 0,
      tags: tmpl.tags,
      popularity: tmpl.popularity,
      purchaseCount: 0,
      createdAt: '',
      featured: tmpl.featured,
    };
  }

  if (itemType === 'theme') {
    const theme = COLOR_THEMES.find((t) => t.id === itemId);
    if (!theme) return null;
    return {
      id: theme.id,
      type: 'theme',
      name: theme.name,
      description: theme.description,
      price: 0,
      currency: 'usd',
      creatorRevenue: 0,
      tags: theme.tags,
      popularity: 0,
      purchaseCount: 0,
      createdAt: '',
    };
  }

  if (
    itemType === 'icon-pack' ||
    itemType === 'background-pack' ||
    itemType === 'accent-pack' ||
    itemType === 'sticker-pack'
  ) {
    const pack = MARKETPLACE_PACKS.find((p) => p.id === itemId);
    if (!pack) return null;
    // Enforce that the requested itemType matches the pack's category,
    // so a caller can't bypass pricing rules by mislabeling an icon pack
    // as a sticker pack (or anything else).
    const expectedType = PACK_CATEGORY_TO_ITEM_TYPE[pack.category];
    if (expectedType !== itemType) return null;
    return {
      id: pack.id,
      type: itemType,
      name: pack.name,
      description: pack.description,
      price: pack.price,
      currency: 'usd',
      creatorRevenue: 0,
      tags: pack.tags,
      popularity: 0,
      purchaseCount: 0,
      createdAt: '',
    };
  }

  // font-pairing catalogue is not yet in-app; fall back to DB in the future.
  return null;
}

// ─── Validation ──────────────────────────────────────────────

const VALID_ITEM_TYPES = new Set<MarketplaceItemType>([
  'template',
  'theme',
  'icon-pack',
  'background-pack',
  'accent-pack',
  'sticker-pack',
  'font-pairing',
]);

// ─── POST handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;

    // 2. Rate limit — 20 purchase attempts per hour per user
    const rateCheck = checkRateLimit(`marketplace-purchase:${userEmail}`, {
      max: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    // 3. Parse and validate body
    const body = await req.json();
    const { itemId, itemType } = body as {
      itemId?: string;
      itemType?: MarketplaceItemType;
    };

    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid itemId' },
        { status: 400 },
      );
    }
    if (!itemType || !VALID_ITEM_TYPES.has(itemType)) {
      return NextResponse.json(
        { error: 'Missing or invalid itemType' },
        { status: 400 },
      );
    }

    // 4. Resolve the item from catalogue
    const item = resolveItem(itemId, itemType);
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 },
      );
    }

    // 5. Check if user already owns it
    const owned = await checkOwnership(userEmail, itemId);
    if (owned) {
      return NextResponse.json({ owned: true });
    }

    // 6. Check if the item is free for the user's plan
    const userPlanRow = await getUserPlan(userEmail);
    const userPlan = userPlanRow?.plan ?? 'free';

    if (isItemFree(item, userPlan)) {
      // Grant the item for free — record a $0 purchase
      await recordPurchase({
        userEmail,
        itemId: item.id,
        itemType: item.type,
        pricePaid: 0,
        stripeSessionId: `free-${Date.now()}`,
      });
      return NextResponse.json({ owned: true });
    }

    // 7. Stripe checkout for paid items
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payments are not configured' },
        { status: 500 },
      );
    }

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://pearloom.com';

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.name,
              description: item.description,
            },
            unit_amount: item.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        itemId: item.id,
        itemType: item.type,
        userEmail,
        pricePaid: String(item.price),
      },
      success_url: `${origin}/dashboard?marketplace_purchase=success&item=${item.id}`,
      cancel_url: `${origin}/dashboard?marketplace_purchase=cancelled`,
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (err: unknown) {
    console.error('[Marketplace] Purchase error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
