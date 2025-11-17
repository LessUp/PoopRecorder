// Service Worker for Poop Recorder PWA
const CACHE_NAME = 'poop-recorder-v1'
const urlsToCache = [
  '/',
  '/offline',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/styles.css',
  '/manifest.json'
]

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response
        }
        
        return fetch(event.request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          
          // Clone the response
          const responseToCache = response.clone()
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache)
            })
          
          return response
        })
      })
      .catch(() => {
        // Network request failed, try to serve from cache
        if (event.request.destination === 'document') {
          return caches.match('/offline')
        }
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        })
      })
  )
})

// Background sync for offline requests
self.addEventListener('sync', event => {
  if (event.tag === 'sync-entries') {
    event.waitUntil(syncEntries())
  }
})

// Sync entries when back online
async function syncEntries() {
  try {
    // Get all queued entries from IndexedDB
    const db = await openDB('poop-recorder', 1)
    const tx = db.transaction(['queue'], 'readonly')
    const store = tx.objectStore('queue')
    const entries = await store.getAll()
    
    if (entries.length === 0) return
    
    console.log(`Syncing ${entries.length} queued entries...`)
    
    // Try to sync each entry
    const syncPromises = entries.map(async (entry) => {
      try {
        const response = await fetch('/api/entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${entry.token || ''}`
          },
          body: JSON.stringify(entry.payload)
        })
        
        if (response.ok) {
          // Remove from queue if successful
          const deleteTx = db.transaction(['queue'], 'readwrite')
          const deleteStore = deleteTx.objectStore('queue')
          await deleteStore.delete(entry.id)
          console.log('Synced entry:', entry.id)
        }
      } catch (error) {
        console.error('Failed to sync entry:', entry.id, error)
      }
    })
    
    await Promise.allSettled(syncPromises)
    
    // Notify user about sync completion
    if ('Notification' in self && Notification.permission === 'granted') {
      self.registration.showNotification('数据同步完成', {
        body: `已同步 ${entries.length} 条记录`,
        icon: '/icon-192.png',
        badge: '/icon-192.png'
      })
    }
    
  } catch (error) {
    console.error('Sync failed:', error)
  }
}

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : '您有新的健康提醒',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now()
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('健康提醒', options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow('/')
  )
})

// Helper function to open IndexedDB
function openDB(name: string, version: number) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' })
      }
    }
  })
}

