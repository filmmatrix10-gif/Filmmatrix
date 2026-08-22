import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Only the publishable/anon key is ever read here. The secret/service-role
 * key must never be set as VITE_* (Vite inlines all VITE_* vars into the
 * bundled extension code, so anything under that prefix is effectively public).
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        // No auth system yet, and this client also runs in the background
        // service worker (no window/localStorage) and inside content
        // script pages where we must not touch the host page's storage.
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null

export function isCloudSyncConfigured(): boolean {
  return supabase !== null
}
