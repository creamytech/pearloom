import { NextRequest, NextResponse } from 'next/server';
import { publishSite } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subdomain, manifest, names } = body;

    console.log('[Publish API] Request:', { 
      subdomain, 
      hasManifest: !!manifest,
      hasNames: !!names,
      email: session.user.email 
    });

    if (!subdomain || !manifest) {
      return NextResponse.json({ 
        error: `Missing required fields: subdomain=${!!subdomain}, manifest=${!!manifest}` 
      }, { status: 400 });
    }

    // Format subdomain purely to be safe (no spaces, lowercase, etc)
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (cleanSubdomain.length < 3) {
      return NextResponse.json({ error: 'Subdomain must be at least 3 characters' }, { status: 400 });
    }

    // Pass the tuple of names to the DB upsert
    const { success, error } = await publishSite(
      session.user.email, 
      cleanSubdomain, 
      manifest, 
      names || ['', '']
    );

    if (!success) {
      return NextResponse.json({ error: error || 'Failed to publish' }, { status: 400 });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    
    // Auto-detect the URL format to return
    let finalUrl = '';
    if (host.includes('localhost')) {
      finalUrl = `http://${cleanSubdomain}.localhost:3000`; // Localhost handles subdomains natively
    } else if (host.includes('vercel.app')) {
      finalUrl = `https://${host}/sites/${cleanSubdomain}`; // Vercel preview domain needs the explicit path route
    } else {
      finalUrl = `https://${cleanSubdomain}.${host}`; // Custom domain
    }

    return NextResponse.json({ success: true, url: finalUrl });

  } catch (err: unknown) {
    console.error('Publishing API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
