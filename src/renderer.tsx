import { installReact } from '@harborclient/sdk';
import { Button, EmptyState } from '@harborclient/sdk/components';
import { useCallback, useSyncExternalStore } from '@harborclient/sdk/react';
import type { BodyType, PluginContext } from '@harborclient/sdk';
import { createExternalStore } from '@harborclient/sdk/store';
import { formatRelativeTime, methodColorClass } from '@harborclient/sdk/ui';
import { clearRecent, insertRecent, loadRecent, migrate } from './database';
import { PERSISTED_CAP, type RecentEntry } from './shared';

/** Sequence counter disambiguating ids captured within the same millisecond. */
let entrySequence = 0;

/**
 * Returns a capture id that stays unique within the renderer session.
 *
 * @returns Numeric id combining epoch milliseconds and a per-ms sequence.
 */
function nextEntryId(): number {
  entrySequence += 1;
  return Date.now() * 1000 + (entrySequence % 1000);
}

/**
 * Module-level recent list shared by capture handlers and the sidebar UI.
 */
const recentStore = createExternalStore<RecentEntry[]>([]);

/**
 * Plugin database handle bound during activation.
 */
let database: PluginContext['database'];

/**
 * Fills in defaults for entries persisted before capture metadata was expanded.
 *
 * @param entry - Stored or session recent entry.
 * @returns Entry safe to render and reopen in the editor.
 */
function normalizeRecentEntry(entry: RecentEntry): RecentEntry {
  return {
    ...entry,
    name: entry.name?.trim() || entry.url,
    headers: entry.headers ?? {},
    params: entry.params ?? [],
    body: entry.body ?? ''
  };
}

/**
 * Opens a recent entry in the request editor.
 *
 * @param entry - Recent sidebar row to open.
 * @param hc - Renderer plugin context.
 */
async function openRecentEntry(entry: RecentEntry, hc: PluginContext): Promise<void> {
  const normalized = normalizeRecentEntry(entry);

  if (normalized.savedRequestId != null) {
    try {
      await hc.host.loadRequest(normalized.savedRequestId);
      return;
    } catch {
      // Fall back to a draft tab when the saved request is not loaded in memory.
    }
  }

  await hc.host.openRequestDraft({
    name: normalized.name,
    method: normalized.method,
    url: normalized.url,
    headers: normalized.headers,
    params: normalized.params,
    body: normalized.body,
    bodyType: normalized.bodyType
  });
}

/**
 * Clears all recent entries from the database and the UI store.
 */
function clearRecentEntries(): void {
  void (async () => {
    await clearRecent(database);
    recentStore.setState([]);
  })();
}

/**
 * Header actions for the Recent Requests sidebar section.
 */
function RecentRequestsHeaderActions() {
  const entries = useSyncExternalStore(recentStore.subscribe, recentStore.getSnapshot, () => []);

  if (entries.length === 0) {
    return null;
  }

  return (
    <Button
      variant="toolbar"
      className="text-[14px] text-muted hover:text-text"
      aria-label="Clear recent requests"
      onClick={clearRecentEntries}
    >
      Clear
    </Button>
  );
}

interface RecentRequestsSectionProps {
  /**
   * Renderer plugin context from the host.
   */
  hc: PluginContext;
}

/**
 * Sidebar section listing recent HTTP requests.
 */
function RecentRequestsSection({ hc }: RecentRequestsSectionProps) {
  const entries = useSyncExternalStore(recentStore.subscribe, recentStore.getSnapshot, () => []);

  /**
   * Opens the recent entry in the request editor.
   */
  const handleOpenEntry = useCallback(
    (entry: RecentEntry): void => {
      void openRecentEntry(entry, hc);
    },
    [hc]
  );

  return (
    <div className="flex flex-col gap-0.5">
      {entries.length === 0 ? (
        <EmptyState variant="inline" className="px-2 py-1.5">
          No requests yet
        </EmptyState>
      ) : null}
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="group flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-selection/60"
        >
          <Button
            variant="toolbar"
            className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left text-[14px] text-text hover:bg-transparent"
            title={entry.url}
            aria-label={`Open ${entry.name}, ${entry.method} ${entry.url}, status ${
              entry.status
            }, ${formatRelativeTime(entry.ts)}`}
            onClick={() => handleOpenEntry(entry)}
          >
            <span
              className={`w-12 shrink-0 font-medium uppercase ${methodColorClass(entry.method)}`}
              aria-hidden
            >
              {entry.method}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] text-text">{entry.name}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {entry.status} {entry.statusText}
            </span>
            <span className="shrink-0 text-muted">{formatRelativeTime(entry.ts)}</span>
          </Button>
        </div>
      ))}
    </div>
  );
}

/**
 * Activates the renderer half: captures sends, persists recents, and registers the sidebar.
 *
 * @param hc - Renderer plugin context from the HarborClient host.
 */
export function activate(hc: PluginContext): void {
  installReact(hc.react);
  database = hc.database;

  void (async () => {
    await migrate(hc.database);
    const saved = await loadRecent(hc.database, PERSISTED_CAP);
    if (saved.length > 0) {
      recentStore.setState(saved.map(normalizeRecentEntry));
    }
  })();

  hc.subscriptions.push(
    hc.http.onAfterSend(async (request, response) => {
      const entry = normalizeRecentEntry({
        id: nextEntryId(),
        method: request.method,
        url: request.url,
        status: response.status,
        statusText: response.statusText,
        ts: Date.now(),
        savedRequestId: request.sourceRequestId,
        name: request.sourceRequestName?.trim() || request.url,
        headers: { ...request.headers },
        params: request.params ? [...request.params] : [],
        body: request.body,
        bodyType: request.bodyType as BodyType | undefined
      });

      const merged = await insertRecent(hc.database, entry, PERSISTED_CAP);
      recentStore.setState(merged.map(normalizeRecentEntry));
    })
  );

  /**
   * Sidebar section host that closes over the plugin context.
   */
  function RecentRequestsSectionHost() {
    return <RecentRequestsSection hc={hc} />;
  }

  hc.subscriptions.push(
    hc.ui.registerSidebarSection({
      id: 'recent-requests',
      title: 'Recent Requests',
      order: 10,
      Component: RecentRequestsSectionHost,
      headerActions: RecentRequestsHeaderActions
    })
  );
}

/**
 * Resets module state when the plugin deactivates.
 */
export function deactivate(): void {
  recentStore.setState([]);
  entrySequence = 0;
}
