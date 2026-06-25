import type { PluginContext } from "@harborclient/plugin-api";
import {
  PERSISTED_CAP,
  PLUGIN_ID,
  POLL_INTERVAL_MS,
  STORAGE_KEY,
  type RecentEntry,
} from "./shared";

/** Tailwind classes for HTTP method labels in sidebar rows. */
const METHOD_CLASSES: Record<string, string> = {
  get: "text-method-get",
  post: "text-method-post",
  put: "text-method-put",
  patch: "text-method-patch",
  delete: "text-method-delete",
  head: "text-method-head",
  options: "text-method-options",
};

/** In-memory recent list shared by the poll loop and sidebar UI. */
let storeEntries: RecentEntry[] = [];

/** Listeners notified when the store changes. */
const storeListeners = new Set<() => void>();

/**
 * Returns Tailwind classes for an HTTP method badge.
 *
 * @param method - HTTP method string.
 * @returns Method color class or default text color.
 */
function methodClass(method: string): string {
  return METHOD_CLASSES[method.toLowerCase()] ?? "text-text";
}

/**
 * Formats a timestamp as a short relative time string.
 *
 * @param ts - Unix epoch milliseconds.
 * @returns Human-readable relative time (e.g. "2m ago").
 */
function formatRelativeTime(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) {
    return "just now";
  }
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Merges session captures from main into the persisted list, newest first.
 *
 * @param persisted - Current persisted entries.
 * @param session - Session entries from the main process.
 * @returns Merged list capped to {@link PERSISTED_CAP}, or null if unchanged.
 */
function mergeEntries(
  persisted: RecentEntry[],
  session: RecentEntry[]
): RecentEntry[] | null {
  if (session.length === 0) {
    return null;
  }

  const seen = new Set(persisted.map((entry) => entry.id));
  const added = session.filter((entry) => !seen.has(entry.id));
  if (added.length === 0) {
    return null;
  }

  return [...added, ...persisted].slice(0, PERSISTED_CAP);
}

/**
 * Updates the module store and notifies subscribers.
 *
 * @param next - Replacement entry list.
 */
function setStoreEntries(next: RecentEntry[]): void {
  storeEntries = next;
  for (const listener of storeListeners) {
    listener();
  }
}

/**
 * Subscribes to store changes for useSyncExternalStore.
 *
 * @param listener - Callback invoked when the store updates.
 * @returns Unsubscribe function.
 */
function subscribeStore(listener: () => void): () => void {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

/**
 * Returns the current store snapshot for useSyncExternalStore.
 */
function getStoreSnapshot(): RecentEntry[] {
  return storeEntries;
}

/**
 * Polls the main process for new session captures and persists when changed.
 *
 * @param hc - Renderer plugin context.
 */
async function syncFromMain(hc: PluginContext): Promise<void> {
  try {
    const session = (await window.api.invokePluginMain(
      PLUGIN_ID,
      "getRecent",
      []
    )) as RecentEntry[];

    if (!Array.isArray(session) || session.length === 0) {
      return;
    }

    const merged = mergeEntries(storeEntries, session);
    if (!merged) {
      return;
    }

    setStoreEntries(merged);
    await hc.storage.set(STORAGE_KEY, merged);
  } catch {
    // Ignore transient IPC failures during polling.
  }
}

/**
 * Clears recent requests in main, the local store, and persistent storage.
 *
 * @param hc - Renderer plugin context.
 */
async function clearRecent(hc: PluginContext): Promise<void> {
  try {
    await window.api.invokePluginMain(PLUGIN_ID, "clear", []);
  } catch {
    // Continue clearing local state even if main IPC fails.
  }
  setStoreEntries([]);
  await hc.storage.set(STORAGE_KEY, []);
}

/**
 * Builds the Recent Requests sidebar section component.
 *
 * @param React - Host React instance from `hc.react`.
 * @param hc - Renderer plugin context.
 * @returns Sidebar section component.
 */
function createRecentRequestsSection(
  React: PluginContext["react"],
  hc: PluginContext
): React.ComponentType {
  const { createElement: h, useSyncExternalStore, useCallback } = React;

  /**
   * Sidebar section listing recent HTTP requests.
   */
  function RecentRequestsSection(): React.ReactElement {
    const entries = useSyncExternalStore(
      subscribeStore,
      getStoreSnapshot,
      () => []
    );

    /**
     * Copies a request URL to the clipboard and shows confirmation.
     *
     * @param url - URL to copy.
     */
    const handleCopyUrl = useCallback((url: string): void => {
      void navigator.clipboard.writeText(url).then(() => {
        hc.ui.showToast("URL copied");
      });
    }, []);

    /**
     * Clears all recent entries from main, storage, and the UI store.
     */
    const handleClear = useCallback((): void => {
      void clearRecent(hc);
    }, []);

    return h(
      "div",
      { className: "flex flex-col gap-0.5" },
      entries.length > 0
        ? h(
            "div",
            { className: "mb-1 flex justify-end px-1" },
            h(
              "button",
              {
                type: "button",
                className:
                  "cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-[14px] text-muted hover:bg-selection/60 hover:text-text",
                "aria-label": "Clear recent requests",
                onClick: handleClear,
              },
              "Clear"
            )
          )
        : null,
      entries.length === 0
        ? h(
            "div",
            { className: "px-2 py-1.5 text-[14px] text-muted" },
            "No requests yet"
          )
        : null,
      ...entries.map((entry) =>
        h(
          "div",
          {
            key: entry.id,
            className:
              "group flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-selection/60",
          },
          h(
            "button",
            {
              type: "button",
              className:
                "flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left text-[14px] text-text",
              title: entry.url,
              "aria-label": `${entry.method} ${entry.url}, status ${
                entry.status
              }, ${formatRelativeTime(entry.ts)}`,
              onClick: () => handleCopyUrl(entry.url),
            },
            h(
              "span",
              {
                className: `w-12 shrink-0 font-medium uppercase ${methodClass(
                  entry.method
                )}`,
                "aria-hidden": true,
              },
              entry.method
            ),
            h(
              "span",
              { className: "min-w-0 flex-1 truncate text-text" },
              entry.url
            ),
            h(
              "span",
              { className: "shrink-0 tabular-nums text-muted" },
              `${entry.status} ${entry.statusText}`
            ),
            h(
              "span",
              { className: "shrink-0 text-muted" },
              formatRelativeTime(entry.ts)
            )
          )
        )
      )
    );
  }

  return RecentRequestsSection;
}

/**
 * Activates the renderer half: loads persisted history, polls main for new captures,
 * and registers the Recent Requests sidebar section.
 *
 * @param hc - Renderer plugin context from the HarborClient host.
 */
export function activate(hc: PluginContext): void {
  const RecentRequestsSection = createRecentRequestsSection(hc.react, hc);

  void hc.storage.get<RecentEntry[]>(STORAGE_KEY).then((saved) => {
    if (Array.isArray(saved) && saved.length > 0) {
      setStoreEntries(saved.slice(0, PERSISTED_CAP));
    }
  });

  void syncFromMain(hc);

  const timer = setInterval(() => {
    void syncFromMain(hc);
  }, POLL_INTERVAL_MS);

  hc.subscriptions.push({ dispose: () => clearInterval(timer) });

  hc.subscriptions.push(
    hc.ui.registerSidebarSection({
      id: "recent-requests",
      title: "Recent Requests",
      order: 10,
      Component: RecentRequestsSection,
    })
  );
}

/**
 * Resets module state when the plugin deactivates.
 */
export function deactivate(): void {
  setStoreEntries([]);
}
