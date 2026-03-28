import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { SiteNav } from '@/components/site-nav';
import { ThemeProvider } from '@/components/theme-provider';
import { Ticket, Users, CheckCircle2, XCircle, FileText } from 'lucide-react';

// Force dynamic since we pull live RSVP data
export const dynamic = 'force-dynamic';

export default async function RsvpManagementPage({ searchParams }: { searchParams: { domain: string } }) {
  const domain = searchParams.domain;
  
  if (!domain) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <p className="text-[#9A9488]">No domain provided. Go back to your dashboard to view RSVPs.</p>
      </div>
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all RSVPs for this site
  const { data: rsvps, error } = await supabase
    .from('rsvps')
    .select('*')
    .eq('site_id', domain)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch RSVPs:', error);
  }

  const list = rsvps || [];
  const attending = list.filter(r => r.attending);
  const declined = list.filter(r => !r.attending);

  return (
    <ThemeProvider theme={{
      name: 'pearloom-ivory',
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      colors: { background: '#F5F1E8', foreground: '#2B2B2B', accent: '#A3B18A', accentLight: '#EEE8DC', muted: '#9A9488', cardBg: '#ffffff' },
      borderRadius: '1rem',
    }}>
      <SiteNav names={['Pearloom', 'Dashboard']} pages={[]} />

      <main className="max-w-4xl mx-auto py-12 px-6">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-full bg-[#EEE8DC] flex items-center justify-center text-[#A3B18A]">
            <Ticket size={24} />
          </div>
          <div>
            <h1 className="text-4xl font-semibold" style={{ fontFamily: 'var(--eg-font-heading)' }}>Guest RSVPs</h1>
            <p className="text-[#9A9488] text-sm mt-1">Manage attendees for <span className="font-semibold text-[#2B2B2B]">{domain}.pearloom.app</span></p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-[#ffffff] border border-black/5 p-6 rounded-2xl flex items-center gap-4">
            <Users size={32} className="text-[#A3B18A]" />
            <div>
              <p className="text-sm text-[#9A9488] font-medium uppercase tracking-wider">Total Responses</p>
              <p className="text-3xl font-semibold" style={{ fontFamily: 'var(--eg-font-heading)' }}>{list.length}</p>
            </div>
          </div>
          <div className="bg-[#ffffff] border border-black/5 p-6 rounded-2xl flex items-center gap-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
            <div>
              <p className="text-sm text-[#9A9488] font-medium uppercase tracking-wider">Attending</p>
              <p className="text-3xl font-semibold text-emerald-600" style={{ fontFamily: 'var(--eg-font-heading)' }}>{attending.length}</p>
            </div>
          </div>
          <div className="bg-[#ffffff] border border-black/5 p-6 rounded-2xl flex items-center gap-4">
            <XCircle size={32} className="text-rose-400" />
            <div>
              <p className="text-sm text-[#9A9488] font-medium uppercase tracking-wider">Declined</p>
              <p className="text-3xl font-semibold text-rose-500" style={{ fontFamily: 'var(--eg-font-heading)' }}>{declined.length}</p>
            </div>
          </div>
        </div>

        {/* Guest List */}
        <div className="bg-[#ffffff] border border-black/5 rounded-2xl overflow-hidden">
          {list.length === 0 ? (
            <div className="py-20 text-center">
              <FileText size={48} className="mx-auto text-[#9A9488]/30 mb-4" />
              <p className="text-[#9A9488]">No guests have RSVP'd yet.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/5 bg-[#F5F1E8]">
                  <th className="p-4 text-sm font-semibold text-[#2B2B2B]">Guest Name</th>
                  <th className="p-4 text-sm font-semibold text-[#2B2B2B]">Status</th>
                  <th className="p-4 text-sm font-semibold text-[#2B2B2B]">Email</th>
                  <th className="p-4 text-sm font-semibold text-[#2B2B2B]">Dietary & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {list.map((rsvp) => (
                  <tr key={rsvp.id} className="hover:bg-[#F5F1E8]/50 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-[#2B2B2B]">{rsvp.name}</p>
                    </td>
                    <td className="p-4">
                      {rsvp.attending ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 size={12} /> Accepted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-500 text-xs font-medium">
                          <XCircle size={12} /> Declined
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-[#9A9488]">{rsvp.email}</td>
                    <td className="p-4 text-sm text-[#9A9488]">
                      {rsvp.dietary ? rsvp.dietary : <span className="opacity-40">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </ThemeProvider>
  );
}
