export function createSessionId(): string {
  return `session_${Date.now()}`
}

export function getPageTitle(documentRef: Document): string {
  return documentRef.title || 'Untitled page'
}
