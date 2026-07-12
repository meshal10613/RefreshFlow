import { openDB, IDBPDatabase } from 'idb';

export interface RefreshHistoryEntry {
  id?: number; // Auto-incremented key
  jobId: string;
  jobName: string;
  url: string;
  tabId: number;
  status: 'success' | 'error';
  timestamp: number;
  durationMs: number;
  error?: string;
}

export interface MonitorHistoryEntry {
  id?: number; // Auto-incremented key
  jobId: string;
  jobName: string;
  url: string;
  changeType: 'text' | 'html' | 'element' | 'keyword' | 'regex';
  diff: string; // readable summary of differences
  timestamp: number;
}

const DB_NAME = 'refreshflow-history';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 1. Create Refresh History Store
      if (!db.objectStoreNames.contains('refreshHistory')) {
        const refreshStore = db.createObjectStore('refreshHistory', {
          keyPath: 'id',
          autoIncrement: true,
        });
        refreshStore.createIndex('jobId', 'jobId', { unique: false });
        refreshStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 2. Create Monitor History Store
      if (!db.objectStoreNames.contains('monitorHistory')) {
        const monitorStore = db.createObjectStore('monitorHistory', {
          keyPath: 'id',
          autoIncrement: true,
        });
        monitorStore.createIndex('jobId', 'jobId', { unique: false });
        monitorStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    },
  });

  return dbPromise;
}

export const HistoryStore = {
  /**
   * Log an auto-refresh event
   */
  async addRefreshEntry(entry: Omit<RefreshHistoryEntry, 'id'>): Promise<number> {
    const db = await getDb();
    // autoIncrement keyPaths always yield numeric keys; idb's untyped
    // IDBPDatabase widens the return type to IDBValidKey, so narrow it back.
    return (await db.add('refreshHistory', entry)) as number;
  },

  /**
   * Log a page-monitor event
   */
  async addMonitorEntry(entry: Omit<MonitorHistoryEntry, 'id'>): Promise<number> {
    const db = await getDb();
    return (await db.add('monitorHistory', entry)) as number;
  },

  /**
   * Retrieve refresh entries with option filtering by jobId, sorted newest first
   */
  async getRefreshHistory(
    jobId?: string,
    limit = 100,
    offset = 0
  ): Promise<RefreshHistoryEntry[]> {
    const db = await getDb();
    const tx = db.transaction('refreshHistory', 'readonly');
    const store = tx.objectStore('refreshHistory');
    
    let entries: RefreshHistoryEntry[] = [];
    
    if (jobId) {
      const index = store.index('jobId');
      entries = await index.getAll(jobId);
    } else {
      entries = await store.getAll();
    }
    
    // Sort descending by timestamp (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    return entries.slice(offset, offset + limit);
  },

  /**
   * Retrieve monitor entries with option filtering by jobId, sorted newest first
   */
  async getMonitorHistory(
    jobId?: string,
    limit = 100,
    offset = 0
  ): Promise<MonitorHistoryEntry[]> {
    const db = await getDb();
    const tx = db.transaction('monitorHistory', 'readonly');
    const store = tx.objectStore('monitorHistory');
    
    let entries: MonitorHistoryEntry[] = [];
    
    if (jobId) {
      const index = store.index('jobId');
      entries = await index.getAll(jobId);
    } else {
      entries = await store.getAll();
    }
    
    // Sort descending by timestamp
    entries.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply pagination
    return entries.slice(offset, offset + limit);
  },

  /**
   * Clear all or specific history entries
   */
  async clearHistory(jobId?: string): Promise<void> {
    const db = await getDb();
    
    if (jobId) {
      // Clear for a specific job: need to delete matching keys
      const tx = db.transaction(['refreshHistory', 'monitorHistory'], 'readwrite');
      
      const refreshStore = tx.objectStore('refreshHistory');
      const refreshIndex = refreshStore.index('jobId');
      const refreshKeys = await refreshIndex.getAllKeys(jobId);
      refreshKeys.forEach(key => refreshStore.delete(key));

      const monitorStore = tx.objectStore('monitorHistory');
      const monitorIndex = monitorStore.index('jobId');
      const monitorKeys = await monitorIndex.getAllKeys(jobId);
      monitorKeys.forEach(key => monitorStore.delete(key));

      await tx.done;
    } else {
      // Clear everything
      const tx = db.transaction(['refreshHistory', 'monitorHistory'], 'readwrite');
      await tx.objectStore('refreshHistory').clear();
      await tx.objectStore('monitorHistory').clear();
      await tx.done;
    }
  },

  /**
   * Export all history records as JSON
   */
  async exportHistory(): Promise<{ refresh: RefreshHistoryEntry[]; monitor: MonitorHistoryEntry[] }> {
    const db = await getDb();
    const refresh = await db.getAll('refreshHistory');
    const monitor = await db.getAll('monitorHistory');
    
    // Sort both descending
    refresh.sort((a, b) => b.timestamp - a.timestamp);
    monitor.sort((a, b) => b.timestamp - a.timestamp);

    return { refresh, monitor };
  },
};
