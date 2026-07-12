import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service role key.
// Never import this from a client component.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
