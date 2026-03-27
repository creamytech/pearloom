import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain } = await params;
    const supabase = getSupabase();

    // Verify the site belongs to this user before deleting
    const { data: site } = await supabase
      .from('sites')
      .select('site_config')
      .eq('subdomain', domain)
      .single();

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const ownerEmail = (site.site_config as Record<string, unknown>)?.creator_email;
    if (ownerEmail !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('subdomain', domain);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete site error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
