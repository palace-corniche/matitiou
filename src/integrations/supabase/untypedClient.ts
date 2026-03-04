// Untyped Supabase client to avoid "Type instantiation is excessively deep" errors
// Use this ONLY when the typed client causes TS2589 errors
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Create client WITHOUT the Database type parameter to avoid deep type instantiation
export const untypedSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
