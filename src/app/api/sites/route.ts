import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Supabase Service Role configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('sites')
      .select('id, subdomain, ai_manifest, site_config, created_at')
      .contains('site_config', { creator_email: session.user.email })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching sites:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    // Map `sites` to the shape `UserSites` expects
    const mappedSites = data?.map(site => ({
      id: site.id,
      domain: site.subdomain,
      manifest: site.ai_manifest,
      created_at: site.created_at,
      names: site.site_config?.names || ['', ''] // default fallback if older site
    })) || [];

    return NextResponse.json({ sites: mappedSites }, { status: 200 });
  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
