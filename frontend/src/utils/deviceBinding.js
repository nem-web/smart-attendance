const DEVICE_UUID_KEY = "device_uuid";

/**
 * Get or create a unique device UUID for this device.
 * Stored in localStorage to persist across sessions.
 *
 * @returns {string} The device UUID
 */
export const getOrCreateDeviceUUID = () => {
  let deviceUUID = localStorage.getItem(DEVICE_UUID_KEY);

  if (!deviceUUID) {
    deviceUUID = crypto.randomUUID();
    localStorage.setItem(DEVICE_UUID_KEY, deviceUUID);
  }

  return deviceUUID;
};

/**
 * Get the current device UUID.
 * Returns null if no UUID has been created yet.
 *
 * @returns {string|null} The device UUID or null
 */
export const getDeviceUUID = () => {
  return localStorage.getItem(DEVICE_UUID_KEY);
};

/**
 * Clear the device UUID (for logout/reset).
 */
export const clearDeviceUUID = () => {
  localStorage.removeItem(DEVICE_UUID_KEY);
};

/**
 * Generate a new device UUID (useful for device reset/unbinding).
 *
 * @returns {string} The new device UUID
 */
export const generateNewDeviceUUID = () => {
  const newUUID = crypto.randomUUID();
  localStorage.setItem(DEVICE_UUID_KEY, newUUID);
  return newUUID;
};
