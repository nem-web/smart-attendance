/**
 * Background ping utility to keep Render backend service warm
 * Prevents cold starts by pinging the backend on app startup
 */

/**
 * Sends a non-blocking ping to the Render backend service
 * Silently handles failures without affecting the main application
 */
export const pingBackend = () => {
  const backendUrl = import.meta.env.VITE_API_URL;

  // Skip if no backend URL is configured
  if (!backendUrl) {
    console.warn('[KeepAlive] Backend URL not configured - skipping ping');
    return;
  }

  try {
    // Normalize backend URL to avoid double slashes
    const baseUrl = backendUrl.replace(/\/+$/, '');
    
    // Use a lightweight health check endpoint
    // Fire-and-forget request with minimal timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
      // Don't send credentials for health check
      credentials: 'omit',
      // Set a minimal priority to avoid impacting other requests
      priority: 'low',
    })
      .then((response) => {
        clearTimeout(timeoutId);
        if (response.ok) {
          console.log('[KeepAlive] Backend ping successful');
        } else {
          console.warn(
            `[KeepAlive] Backend ping returned status ${response.status}`
          );
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        // Silent failure - only log for debugging
        if (error.name === 'AbortError') {
          console.warn('[KeepAlive] Backend ping timeout');
        } else {
          console.warn('[KeepAlive] Backend ping failed:', error.message);
        }
      });

    // Return immediately without waiting for the ping to complete
  } catch (error) {
    // Catch any synchronous errors
    console.error('[KeepAlive] Error initiating backend ping:', error.message);
  }
};

/**
 * Initialize keep-alive mechanism
 * Call this once when the application starts
 */
export const initializeKeepAlive = () => {
  // Ping immediately on startup
  pingBackend();

  // Optional: Set up periodic pings (e.g., every 5 minutes)
  // Uncomment if you want periodic pings to keep the service warm
  // const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
  // setInterval(pingBackend, PING_INTERVAL);
};
