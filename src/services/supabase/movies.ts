import { supabase } from '../../lib/supabase'
import type { Movie, MovieInsert } from '../../types/database'

export async function findMovieByUrl(videoUrl: string): Promise<Movie | null> {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('video_url', videoUrl)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as Movie | null
}

export async function createMovie(input: MovieInsert): Promise<Movie> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const { data, error } = await supabase.from('movies').insert(input).select('*').single()

  if (error) {
    throw error
  }

  return data as Movie
}

export async function findOrCreateMovie(input: MovieInsert): Promise<Movie> {
  const existing = await findMovieByUrl(input.video_url)
  if (existing) {
    return existing
  }

  try {
    return await createMovie(input)
  } catch {
    // Someone else (or a retried upload) may have inserted it concurrently;
    // video_url is UNIQUE, so fall back to reading it instead of failing.
    const fallback = await findMovieByUrl(input.video_url)
    if (fallback) {
      return fallback
    }
    throw new Error('Failed to create or find movie')
  }
}
