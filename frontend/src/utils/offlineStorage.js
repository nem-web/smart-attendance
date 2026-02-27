// frontend/src/utils/offlineStorage.js
import { openDB } from 'idb';

const DB_NAME = 'attendance-db';
const STORE_NAME = 'offline-confirmations';

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export const saveOfflineAttendance = async (data) => {
  const db = await initDB();
  const token = localStorage.getItem("token") || '';
  return db.add(STORE_NAME, {
    ...data,
    token, // Store current token
    timestamp: Date.now(),
  });
};

export const getOfflineAttendanceCount = async () => {
  const db = await initDB();
  return db.count(STORE_NAME);
};

export const getAllOfflineAttendance = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const deleteOfflineAttendance = async (id) => {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
};
