import { createClient } from '@supabase/supabase-js';

const TEJA_STARIN_URL = 'https://yzcjeeywfbzfbkzvxgpc.supabase.co';
const TEJA_STARIN_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Y2plZXl3ZmJ6ZmJrenZ4Z3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMzMzMjgsImV4cCI6MjA3OTcwOTMyOH0.fA8HSie6DmD_YIAzj5D-xV5lSGotOixNF3eoXQziOp0';

export const tejaStarinClient = createClient(TEJA_STARIN_URL, TEJA_STARIN_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
