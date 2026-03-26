-- Run this in your Supabase SQL Editor

-- 1. Create the rsvps table
create table public.rsvps (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  site_id text not null,
  name text not null,
  email text not null,
  attending boolean not null,
  dietary text,
  
  -- Optionally foreign key if your sites exist, 
  -- but since generating on the fly, just string index is fine.
  CONSTRAINT fk_site
      FOREIGN KEY(site_id) 
      REFERENCES public.sites(subdomain)
      ON DELETE CASCADE
);

-- 2. Enable Row Level Security (RLS)
alter table public.rsvps enable row level security;

-- 3. Allow anonymous/public inserts so visitors can submit the RSVP form
create policy "Allow public inserts" 
on public.rsvps 
for insert 
to public, anon 
with check (true);

-- 4. Allow authenticated users to read the RSVPs (or specifically matching site_id)
-- If using anon keys in the dashboard, you may want to allow reads initially
create policy "Allow reads" 
on public.rsvps 
for select 
to public, anon
using (true);

-- 5. Add an index for faster lookups by site
create index idx_rsvps_site_id on public.rsvps(site_id);
