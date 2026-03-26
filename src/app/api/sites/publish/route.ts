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
    const { subdomain, manifest } = body;

    console.log('[Publish API] Request:', { 
      subdomain, 
      hasManifest: !!manifest,
      manifestKeys: manifest ? Object.keys(manifest) : 'null',
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

    // Insert to DB using simple identifier trick since email is unique per user usually.
    // Ideally we would grab a UUID, but for this prototype we're using email or name 
    // to map owner_id loosely since we skipped the users table setup for speed.
    // The DB allows UUID, so we simply insert it cleanly.
    
    // Wait, owner_id is a UUID referencing a Users table we might not have populated yet.
    // If the user's DB doesn't have the user row, it will throw a constraint error.
    // For now, we will pass null or skip owner_id constraint if they didn't run the exact UUID setup, 
    // or we'll just insert without it because NextAuth hasn't pushed to the User table.
    
    const { success, error } = await publishSite(session.user.email, cleanSubdomain, manifest);

    if (!success) {
      return NextResponse.json({ error: error || 'Failed to publish' }, { status: 400 });
    }

    return NextResponse.json({ success: true, url: `http://${cleanSubdomain}.localhost:3000` });

  } catch (err: any) {
    console.error('Publishing API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
