import { StorageSchema } from '../state/schema';
import { RefreshHistoryEntry, MonitorHistoryEntry } from '../state/historyStore';

export interface BackupData {
  version: number;
  timestamp: number;
  storage: Omit<StorageSchema, 'schemaVersion'>;
  history?: {
    refresh: RefreshHistoryEntry[];
    monitor: MonitorHistoryEntry[];
  };
}

export function convertToCSV(headers: string[], rows: any[][]): string {
  const escapeCell = (cell: any) => {
    if (cell === null || cell === undefined) return '';
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ];

  return csvRows.join('\n');
}

export function exportRefreshHistoryCSV(entries: RefreshHistoryEntry[]): string {
  const headers = ['Timestamp', 'Date', 'Job Name', 'URL', 'Tab ID', 'Status', 'Duration (ms)', 'Error'];
  const rows = entries.map(e => [
    e.timestamp,
    new Date(e.timestamp).toISOString(),
    e.jobName,
    e.url,
    e.tabId,
    e.status,
    e.durationMs,
    e.error || ''
  ]);
  return convertToCSV(headers, rows);
}

export function exportMonitorHistoryCSV(entries: MonitorHistoryEntry[]): string {
  const headers = ['Timestamp', 'Date', 'Job Name', 'URL', 'Change Type', 'Diff Summary'];
  const rows = entries.map(e => [
    e.timestamp,
    new Date(e.timestamp).toISOString(),
    e.jobName,
    e.url,
    e.changeType,
    e.diff
  ]);
  return convertToCSV(headers, rows);
}

export function validateBackup(data: any): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.version !== 'number' || typeof data.timestamp !== 'number') return false;
  if (!data.storage || typeof data.storage !== 'object') return false;
  if (!data.storage.jobs || typeof data.storage.jobs !== 'object') return false;
  if (!data.storage.settings || typeof data.storage.settings !== 'object') return false;
  if (!Array.isArray(data.storage.profiles)) return false;
  return true;
}
