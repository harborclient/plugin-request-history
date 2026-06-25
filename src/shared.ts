/**
 * Maximum entries persisted and shown in the sidebar.
 */
export const PERSISTED_CAP = 100;

/**
 * SQLite storage key for the persisted recent-request list.
 */
export const STORAGE_KEY = "recent";

/**
 * Serializable query parameter captured from a sent request.
 */
export interface RecentEntryParam {
  key: string;
  value: string;
}

/**
 * One recorded HTTP exchange shown in the Recent Requests sidebar.
 */
export interface RecentEntry {
  /**
   * Numeric id unique within the renderer session (timestamp + sequence).
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

  /**
   * Saved collection request id when the send came from a collection request tab.
   */
  savedRequestId?: number;

  /**
   * Display label shown in the sidebar row.
   */
  name?: string;

  /**
   * Outgoing request headers captured at send time.
   */
  headers?: Record<string, string>;

  /**
   * Outgoing query parameters captured at send time.
   */
  params?: RecentEntryParam[];

  /**
   * Outgoing request body captured at send time.
   */
  body?: string;

  /**
   * Request body content type captured at send time.
   */
  bodyType?: string;
}
