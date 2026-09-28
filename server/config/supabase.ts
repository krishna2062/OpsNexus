import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './index';

let supabaseClient: SupabaseClient | null = null;

if (config.supabaseUrl && (config.supabaseServiceRoleKey || config.supabaseAnonKey)) {
  try {
    const key = config.supabaseServiceRoleKey || config.supabaseAnonKey;
    supabaseClient = createClient(config.supabaseUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Supabase] Initialized client successfully for:', config.supabaseUrl);
  } catch (err) {
    console.error('[Supabase] Initialization failed:', err);
  }
} else {
  console.log('[Supabase] No credentials configured in env; running with high-performance persistent embedded database.');
}

export const getSupabaseClient = (): SupabaseClient | null => supabaseClient;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(config.supabaseUrl && (config.supabaseServiceRoleKey || config.supabaseAnonKey));
};
