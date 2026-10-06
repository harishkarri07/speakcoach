import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function formatSupabaseUrl(input: string): string {
  if (!input) return '';
  input = input.trim();
  if (input.startsWith('https://') || input.startsWith('http://')) {
    return input;
  }
  // If user passed only project ref e.g. abcdefghijklmnop
  return `https://${input}.supabase.co`;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseUrl = formatSupabaseUrl(rawUrl);
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project-id')
);

let clientInstance: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    clientInstance = null;
  }
}

export const supabase: SupabaseClient | null = clientInstance;
