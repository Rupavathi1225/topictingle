import { createClient } from '@supabase/supabase-js';

const OFFERGRABZONE_URL = 'https://juxjsxgmghpdhurjkmyd.supabase.co';
const OFFERGRABZONE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1eGpzeGdtZ2hwZGh1cmprbXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDAwNjIsImV4cCI6MjA4MDMxNjA2Mn0.FhQyySpXz2y5AIJv3Evr72lRe4I_rKr9AGSf1phZm3E';

export const offerGrabZoneClient = createClient(OFFERGRABZONE_URL, OFFERGRABZONE_ANON_KEY);
