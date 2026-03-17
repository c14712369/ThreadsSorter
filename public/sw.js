// This service worker handles PWA caching with proper exclusions for:
// 1. HMR WebSocket connections (development)
// 2. External CDN images (Instagram/Threads) which are cross-origin

const CACHE_NAME = 't-memo-v1'
const EXTERNAL_HOSTS = ['instagram.com', 'fbcdn.net', 'threads.net']

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = event.request.url

  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip WebSocket / HMR connections
  if (url.includes('webpack-hmr') || url.startsWith('ws://') || url.startsWith('wss://')) return

  // Skip external CDN images (Instagram, Threads, Facebook CDN)
  const isExternal = EXTERNAL_HOSTS.some(host => url.includes(host))
  if (isExternal) return

  // Skip Next.js API routes and Supabase calls
  if (url.includes('/api/') || url.includes('supabase.co')) return

  // Cache-first strategy for static assets only
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        // Only cache same-origin successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }
        const cloned = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned))
        return response
      }).catch(() => {
        // Return a graceful fallback if offline
        return new Response('Offline', { status: 503 })
      })
    })
  )
})
