import { createClient } from '@supabase/supabase-js';

// Supabase client initialized with user-provided credentials.
const supabaseUrl = 'https://rbanlcqzdsqwxfcmcahg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiYW5sY3F6ZHNxd3hmY21jYWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NzU0NTAsImV4cCI6MjA3ODI1MTQ1MH0.ANlR9rwd5lIk4NlIT8McfHOkjKCdjTZAA6NzEP_yF58';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);