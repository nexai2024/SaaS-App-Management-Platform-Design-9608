import { createClient } from '@supabase/supabase-js';

// These environment variables should be set in your project configuration
// For development, you can replace these with your actual project URL and Anon Key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gspzlqlekfbkwisqnfqo.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzcHpscWxla2Zia3dpc3FuZnFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTkzMTcsImV4cCI6MjA4MTE3NTMxN30.X-7YcGwsjrLURfGaMHsd26DRgv8LjQzAlx3Fupf4yY0';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Missing Supabase environment variables. Please check your configuration.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});