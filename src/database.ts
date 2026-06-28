import type { BodyType, PluginDatabase } from '@harborclient/sdk';
import type { RecentEntry, RecentEntryParam } from './shared';

/**
 * DDL for the recent-requests table and timestamp index.
 */
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS recent_requests (
  id               INTEGER PRIMARY KEY,
  method           TEXT    NOT NULL,
  url              TEXT    NOT NULL,
  status           INTEGER NOT NULL,
  status_text      TEXT    NOT NULL,
  ts               INTEGER NOT NULL,
  saved_request_id INTEGER,
  name             TEXT,
  headers          TEXT    NOT NULL DEFAULT '{}',
  params           TEXT    NOT NULL DEFAULT '[]',
  body             TEXT,
  body_type        TEXT
);
CREATE INDEX IF NOT EXISTS idx_recent_requests_ts ON recent_requests (ts DESC);
`;

/**
 * Row shape returned from recent_requests queries.
 */
interface RecentRequestRow {
  id: number;
  method: string;
  url: string;
  status: number;
  status_text: string;
  ts: number;
  saved_request_id: number | null;
  name: string | null;
  headers: string;
  params: string;
  body: string | null;
  body_type: string | null;
}

/**
 * Parses stored request headers JSON, falling back to an empty object.
 *
 * @param raw - JSON-encoded headers column value.
 * @returns Parsed headers or an empty object on failure.
 */
function parseHeaders(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Parses stored query parameters JSON, falling back to an empty list.
 *
 * @param raw - JSON-encoded params column value.
 * @returns Parsed query parameters or an empty list on failure.
 */
function parseParams(raw: string): RecentEntryParam[] {
  try {
    return JSON.parse(raw) as RecentEntryParam[];
  } catch {
    return [];
  }
}

/**
 * Maps a database row to a {@link RecentEntry}.
 *
 * @param row - SQLite row from recent_requests.
 * @returns Parsed recent entry for the UI and editor.
 */
function rowToEntry(row: RecentRequestRow): RecentEntry {
  const headers = parseHeaders(row.headers);
  const params = parseParams(row.params);

  return {
    id: row.id,
    method: row.method,
    url: row.url,
    status: row.status,
    statusText: row.status_text,
    ts: row.ts,
    savedRequestId: row.saved_request_id ?? undefined,
    name: row.name ?? undefined,
    headers,
    params,
    body: row.body ?? undefined,
    bodyType: (row.body_type as BodyType | null) ?? undefined
  };
}

/**
 * Ensures the recent_requests schema exists in the plugin database.
 *
 * @param db - Plugin-scoped SQLite database from the host.
 */
export async function migrate(db: PluginDatabase): Promise<void> {
  await db.exec(MIGRATION_SQL);
}

/**
 * Loads the newest recent entries up to the configured cap.
 *
 * @param db - Plugin-scoped SQLite database from the host.
 * @param cap - Maximum number of entries to return.
 * @returns Recent entries ordered newest-first.
 */
export async function loadRecent(db: PluginDatabase, cap: number): Promise<RecentEntry[]> {
  const rows = await db.all<RecentRequestRow>(
    `SELECT id, method, url, status, status_text, ts, saved_request_id, name, headers, params, body, body_type
     FROM recent_requests
     ORDER BY ts DESC
     LIMIT ?`,
    [cap]
  );

  return rows.map(rowToEntry);
}

/**
 * Inserts a recent entry and prunes older rows beyond the cap.
 *
 * @param db - Plugin-scoped SQLite database from the host.
 * @param entry - Captured request to persist.
 * @param cap - Maximum number of entries to retain.
 * @returns Updated recent list ordered newest-first.
 */
export async function insertRecent(
  db: PluginDatabase,
  entry: RecentEntry,
  cap: number
): Promise<RecentEntry[]> {
  await db.transaction(async (tx) => {
    await tx.run(
      `INSERT OR REPLACE INTO recent_requests
        (id, method, url, status, status_text, ts, saved_request_id, name, headers, params, body, body_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.method,
        entry.url,
        entry.status,
        entry.statusText,
        entry.ts,
        entry.savedRequestId ?? null,
        entry.name ?? null,
        JSON.stringify(entry.headers ?? {}),
        JSON.stringify(entry.params ?? []),
        entry.body ?? null,
        entry.bodyType ?? null
      ]
    );

    await tx.run(
      `DELETE FROM recent_requests
       WHERE id NOT IN (
         SELECT id FROM recent_requests ORDER BY ts DESC LIMIT ?
       )`,
      [cap]
    );
  });

  return loadRecent(db, cap);
}

/**
 * Removes all persisted recent entries.
 *
 * @param db - Plugin-scoped SQLite database from the host.
 */
export async function clearRecent(db: PluginDatabase): Promise<void> {
  await db.run('DELETE FROM recent_requests');
}
