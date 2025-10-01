import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aoqqepttakvdwjatrtsq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvcXFlcHR0YWt2ZHdqYXRydHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMzczOTMsImV4cCI6MjA3NDgxMzM5M30.nZGUyZo_2X-fzDzt8qDTWwk487xUTbXP_ni2ouD-cns'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
