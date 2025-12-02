import { createClient } from '@supabase/supabase-js';

const TOPICMINGLE_URL = 'https://fazkuotvyjwmxjimxqwm.supabase.co';
const TOPICMINGLE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhemt1b3R2eWp3bXhqaW14cXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxOTMzMzQsImV4cCI6MjA3ODc2OTMzNH0.dEGr5j4j6yegpdmQkLx5LX4o3qS9DvnlT03sP9vP2eA';

export const topicMingleClient = createClient(TOPICMINGLE_URL, TOPICMINGLE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
