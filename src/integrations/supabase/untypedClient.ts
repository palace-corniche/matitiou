// Untyped Supabase client to avoid "Type instantiation is excessively deep" errors
// Use this ONLY when the typed client causes TS2589 errors
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jnhyixrkevphmbkrkdjx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaHlpeHJrZXZwaG1ia3JrZGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODAyNTYsImV4cCI6MjA3ODg1NjI1Nn0.3MM_IvEOvJt9dE6MPFCndFmsxtqd2bnD3RH0pGVEsCg";

// Create client WITHOUT the Database type parameter to avoid deep type instantiation
export const untypedSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
