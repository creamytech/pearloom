// ─────────────────────────────────────────────────────────────
// Pearloom / lib/database.types.ts
//
// Typed schema for the Supabase client. Generate-and-forget:
// regenerate with the Supabase CLI whenever migrations change.
//
//   npx supabase gen types typescript \
//     --project-id <project-id> \
//     --schema public \
//     > src/lib/database.types.ts
//
// Until the CLI is wired up, this file is hand-maintained from
// supabase/migrations/*.sql so the editor autocompletes column
// names. Keep it in sync with the migrations folder.
//
// To activate typed clients, change lib/db.ts:
//   import type { Database } from './database.types';
//   createClient<Database>(url, key);
// ─────────────────────────────────────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // ── legacy-bootstrap tables ─────────────────────────────
      sites: {
        Row: {
          id: string;
          subdomain: string;
          ai_manifest: Json;
          site_config: Json;
          vibe_tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subdomain: string;
          ai_manifest?: Json;
          site_config?: Json;
          vibe_tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sites']['Insert']>;
      };

      rsvps: {
        Row: {
          id: string;
          created_at: string;
          site_id: string;
          name: string;
          email: string;
          attending: boolean;
          dietary: string | null;
          guest_count: number | null;
          song_request: string | null;
          message: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          site_id: string;
          name: string;
          email: string;
          attending: boolean;
          dietary?: string | null;
          guest_count?: number | null;
          song_request?: string | null;
          message?: string | null;
          metadata?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['rsvps']['Insert']>;
      };

      preview_tokens: {
        Row: {
          token: string;
          site_id: string;
          manifest: Json | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          token: string;
          site_id: string;
          manifest?: Json | null;
          created_at?: string;
          expires_at: string;
        };
        Update: Partial<Database['public']['Tables']['preview_tokens']['Insert']>;
      };

      // ── wedding_os tables ───────────────────────────────────
      venues: {
        Row: {
          id: string;
          user_id: string;
          site_id: string | null;
          name: string;
          formatted_address: string | null;
          place_id: string | null;
          lat: number | null;
          lng: number | null;
          website: string | null;
          phone: string | null;
          capacity_ceremony: number | null;
          capacity_reception: number | null;
          indoor_outdoor: 'indoor' | 'outdoor' | 'both' | null;
          notes: string | null;
          floorplan_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['venues']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['venues']['Insert']>;
      };

      // ── event_os tables ─────────────────────────────────────
      events: {
        Row: {
          id: string;
          site_id: string;
          owner_email: string;
          occasion: string;
          name: string;
          kind: string;
          start_at: string | null;
          end_at: string | null;
          timezone: string | null;
          venue_id: string | null;
          is_public: boolean | null;
          capacity: number | null;
          dress_code: string | null;
          description: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['events']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };

      pearloom_guests: {
        Row: {
          id: string;
          site_id: string;
          event_id: string | null;
          guest_token: string;
          name: string;
          email: string | null;
          phone: string | null;
          role: string | null;
          is_plus_one_of: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['pearloom_guests']['Row'],
          'id' | 'created_at'
        > & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pearloom_guests']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
