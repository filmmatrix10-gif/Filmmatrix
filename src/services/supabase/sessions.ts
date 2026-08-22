import { supabase } from '../../lib/supabase'
import type { Session, SessionInsert } from '../../types/database'

export async function findSessionBySessionId(sessionId: string): Promise<Session | null> {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as Session | null
}

export async function createSession(input: SessionInsert): Promise<Session> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { data, error } = await supabase.from('sessions').insert(input).select('*').single()

  if (error) {
    throw error
  }

  return data as Session
}

export async function updateSession(id: string, updates: Partial<SessionInsert>): Promise<Session> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data as Session
}

/**
 * Returns the existing cloud session for this local session_id, or creates
 * one. This is the duplicate-protection mechanism: session_id is UNIQUE in
 * the database, so re-running an upload for the same local session always
 * resolves to the same cloud row instead of inserting a second one.
 */
export async function findOrCreateSession(input: SessionInsert): Promise<Session> {
  const existing = await findSessionBySessionId(input.session_id)
  if (existing) {
    return existing
  }

  try {
    return await createSession(input)
  } catch {
    const fallback = await findSessionBySessionId(input.session_id)
    if (fallback) {
      return fallback
    }
    throw new Error('Failed to create or find session')
  }
}

export async function getSession(id: string): Promise<Session | null> {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.from('sessions').select('*').eq('id', id).maybeSingle()

  if (error) {
    throw error
  }

  return data as Session | null
}
