import { createClient } from '@supabase/supabase-js';

const MINGLEMOODY_URL = 'https://wosigteosurvtlufjdnn.supabase.co';
const MINGLEMOODY_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indvc2lndGVvc3VydnRsdWZqZG5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MjA3MzgsImV4cCI6MjA4MDM5NjczOH0.X517q7a5HoRwA8NCKNpYOqxy2RRxxeivbknWTxkM4Ug';

export const mingleMoodyClient = createClient(MINGLEMOODY_URL, MINGLEMOODY_ANON_KEY);
