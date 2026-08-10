import { createClient } from '@supabase/supabase-js'
import { demoClient } from './supabaseDemo'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Demo mode (sales walkthrough recording): serve curated mock data instead of
// hitting Supabase. Enabled only when VITE_DEMO is set; no effect in production.
const DEMO = import.meta.env.VITE_DEMO

if (!DEMO && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn('Supabase credentials not set. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env')
}

export const supabase = DEMO
  ? demoClient
  : createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder'
    )
