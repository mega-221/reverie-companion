import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  'https://wtrrhqxlrwlefyhfxhge.supabase.co';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0cnJocXhscndsZWZ5aGZ4aGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5MTYyOTAsImV4cCI6MjEwOTQ5MjI5MH0.jke0N5V2T5Xcw8yxCPThDN8LammhCsOJIvGuilHufIQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);