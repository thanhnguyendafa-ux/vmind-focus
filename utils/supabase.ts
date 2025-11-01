
import { createClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// 🛑 IMPORTANT: Replace with your Supabase project URL and anon key
// You can find these in your Supabase project's API settings.
// -----------------------------------------------------------------------------
const supabaseUrl = 'https://mlfvfsebcwotmpgjszhc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZnZmc2ViY3dvdG1wZ2pzemhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNzk0MjMsImV4cCI6MjA3Njc1NTQyM30.NSfPIGlNVjL-tKEzLYBcOWzIOqXrktztUZT1xFUspf8';

// FIX: This comparison causes a TypeScript error because the types have no overlap.
// The check is intended for developers who haven't replaced placeholder values.
// Since the values are filled in, this check is commented out.
/* if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn("Supabase credentials are not set. Please update them in `utils/supabase.ts`");
    alert("Supabase is not configured. Please add your project URL and anon key to `utils/supabase.ts`.");
} */

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
