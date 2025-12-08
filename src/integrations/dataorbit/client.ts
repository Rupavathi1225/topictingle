import { createClient } from '@supabase/supabase-js';

const DATAORBIT_URL = 'https://todseahaucaeksjkrggn.supabase.co';
const DATAORBIT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZHNlYWhhdWNhZWtzamtyZ2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MzU5ODcsImV4cCI6MjA4MDUxMTk4N30.DlMmdKKev3o1kQPk0_ka3l7LPkKQstUeuL2oWC1PJ04';

export const dataOrbitClient = createClient(DATAORBIT_URL, DATAORBIT_ANON_KEY);
