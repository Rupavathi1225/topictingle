import { createClient } from '@supabase/supabase-js';

const TEJA_STARIN_URL = 'https://sbfdyvzkmdbezivmppbm.supabase.co';
const TEJA_STARIN_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZmR5dnprbWRiZXppdm1wcGJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzYxNjAsImV4cCI6MjA3OTk1MjE2MH0.uIL91FreeMngXc4A1oDcS7ggRozIj1ysMRe55XzyJR0';

export const tejaStarinClient = createClient(TEJA_STARIN_URL, TEJA_STARIN_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
