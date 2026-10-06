// Compatibility barrel: the implementation now lives in focused modules.
// Existing imports (`from './supabase'` / `'../lib/supabase'`) keep working.
export {
  supabase,
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured,
} from './supabase-client';
export { localDb, createDemoSessions, safeParse, DEFAULT_DEMO_PROFILE, DEFAULT_DEMO_STREAK } from './local-db';
export { DataService } from './data-service';
