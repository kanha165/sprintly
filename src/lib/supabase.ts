import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Flag to track if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseServiceKey && 
  supabaseUrl !== 'https://your-supabase-project-id.supabase.co' &&
  supabaseServiceKey !== 'your-supabase-service-role-key-goes-here');

if (!isSupabaseConfigured) {
  console.error(
    '❌ SUPABASE NOT CONFIGURED: Missing or invalid SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.\n' +
    'Please update your .env.local file with valid Supabase credentials.\n' +
    'See README.md for setup instructions.'
  );
}

// Service-role client that runs on the server only and bypasses RLS
export const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
