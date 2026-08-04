import { describe, expect, it } from 'vitest'
import { createSessionId, getPageTitle } from '../../utils/session'

describe('session helpers', () => {
  it('creates a session id with the expected prefix', () => {
    const id = createSessionId()
    expect(id.startsWith('session_')).toBe(true)
  })

  it('returns the document title when available', () => {
    const documentRef = { title: 'Example Title' } as Document
    expect(getPageTitle(documentRef)).toBe('Example Title')
  })
})
