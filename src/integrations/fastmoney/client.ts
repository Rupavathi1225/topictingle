import { createClient } from '@supabase/supabase-js';

const FASTMONEY_URL = 'https://hlqhwgmkutmjsiuegmei.supabase.co';
const FASTMONEY_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWh3Z21rdXRtanNpdWVnbWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTQ3MTcsImV4cCI6MjA4MDI3MDcxN30.0YRPJx2WPrAboPziF0-UDdCabJmVdkxYHY-8GnJontw';

export const fastMoneyClient = createClient(FASTMONEY_URL, FASTMONEY_ANON_KEY);
