/**
 * Manifest id for this plugin; used for IPC and storage namespacing.
 */
export const PLUGIN_ID = "com.harborclient.plugins.recent-requests";

/**
 * Maximum entries kept in the main-process session buffer.
 */
export const SESSION_CAP = 200;

/**
 * Maximum entries persisted and shown in the sidebar.
 */
export const PERSISTED_CAP = 100;

/**
 * Poll interval (ms) for syncing session captures into the renderer store.
 */
export const POLL_INTERVAL_MS = 2000;

/**
 * SQLite storage key for the persisted recent-request list.
 */
export const STORAGE_KEY = "recent";

/**
 * One recorded HTTP exchange shown in the Recent Requests sidebar.
 */
export interface RecentEntry {
  /**
   * Monotonic id assigned when the entry is captured in the main process.
   */
  id: number;

  /**
   * HTTP method (GET, POST, etc.).
   */
  method: string;

  /**
   * Request URL without query parameters at capture time.
   */
  url: string;

  /**
   * HTTP response status code.
   */
  status: number;

  /**
   * HTTP response status text.
   */
  statusText: string;

  /**
   * Unix epoch milliseconds when the response was received.
   */
  ts: number;
}
