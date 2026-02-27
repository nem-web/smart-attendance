// frontend/src/sw.js
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { openDB } from 'idb'

cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

// Match all GET API requests to the external API
// Try to use the API URL from environment variables if available, otherwise fallback
const apiUrl = import.meta.env.VITE_API_URL || 'https://smart-attendance-api-i87a.onrender.com';

// API Caching Handler for general reads
const apiCacheHandler = new NetworkFirst({
  cacheName: 'api-cache',
  plugins: [
    new ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 60 * 60, // 1 hour
    }),
    new CacheableResponsePlugin({
      statuses: [0, 200]
    })
  ]
})


// Match all GET API requests to the external API
registerRoute(
  ({url}) => url.href.startsWith(apiUrl),
  apiCacheHandler,
  'GET'
)

// Background Sync Logic
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendance());
  }
});

async function syncAttendance() {
  const db = await openDB('attendance-db', 1);
  const tx = db.transaction('offline-confirmations', 'readonly');
  const store = tx.objectStore('offline-confirmations');
  const items = await store.getAll();
  await tx.done;

  for (const item of items) {
    try {
      const response = await fetch(`${apiUrl}/api/attendance/confirm`, {
        method: 'POST', // Ensure POST
        headers: {
          'Content-Type': 'application/json',
          'Authorization': item.token ? `Bearer ${item.token}` : ''
        },
        body: JSON.stringify({
          subject_id: item.subject_id,
          present_students: item.present_students,
          absent_students: item.absent_students
        })
      });

      if (response.ok) {
        // Re-open DB to delete
        const dbWrite = await openDB('attendance-db', 1);
        const deleteTx = dbWrite.transaction('offline-confirmations', 'readwrite');
        await deleteTx.objectStore('offline-confirmations').delete(item.id);
        await deleteTx.done;
        
        // Notify clients about successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SYNC_COMPLETED',
            id: item.id
          });
        });
      }
    } catch (error) {
      console.error('Background sync failed for item', item.id, error);
    }
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data && event.data.type === 'SYNC_NOW') {
    event.waitUntil(syncAttendance());
  }
})
