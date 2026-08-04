import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'FilmMetrics',
  version: '1.0.0',
  description: 'A lightweight Chrome extension for YouTube viewing insights.',
  permissions: ['storage', 'tabs', 'activeTab'],
  host_permissions: ['https://*.youtube.com/*', 'https://youtube.com/*'],
  action: {
    default_popup: 'index.html',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://*.youtube.com/*', 'https://youtube.com/*'],
      js: ['src/content.ts'],
    },
  ],
})
