// src/shared.ts
var PLUGIN_ID = "com.harborclient.plugins.recent-requests";
var PERSISTED_CAP = 100;
var POLL_INTERVAL_MS = 2e3;
var STORAGE_KEY = "recent";

// src/renderer.ts
var METHOD_CLASSES = {
  get: "text-method-get",
  post: "text-method-post",
  put: "text-method-put",
  patch: "text-method-patch",
  delete: "text-method-delete",
  head: "text-method-head",
  options: "text-method-options"
};
var storeEntries = [];
var storeListeners = /* @__PURE__ */ new Set();
function methodClass(method) {
  return METHOD_CLASSES[method.toLowerCase()] ?? "text-text";
}
function formatRelativeTime(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1e3);
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
function mergeEntries(persisted, session) {
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
function setStoreEntries(next) {
  storeEntries = next;
  for (const listener of storeListeners) {
    listener();
  }
}
function subscribeStore(listener) {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}
function getStoreSnapshot() {
  return storeEntries;
}
function normalizeRecentEntry(entry) {
  return {
    ...entry,
    name: entry.name?.trim() || entry.url,
    headers: entry.headers ?? {},
    params: entry.params ?? [],
    body: entry.body ?? ""
  };
}
async function openRecentEntry(entry, hc) {
  const normalized = normalizeRecentEntry(entry);
  if (normalized.savedRequestId != null) {
    try {
      await hc.commands.execute(
        "harborclient:loadRequest",
        normalized.savedRequestId
      );
      return;
    } catch {
    }
  }
  await hc.commands.execute("harborclient:openRequestDraft", {
    name: normalized.name,
    method: normalized.method,
    url: normalized.url,
    headers: normalized.headers,
    params: normalized.params,
    body: normalized.body,
    bodyType: normalized.bodyType
  });
}
function isMainInactiveError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Plugin main runtime is not active");
}
async function invokeMain(channel, args = []) {
  try {
    return await window.api.invokePluginMain(PLUGIN_ID, channel, args);
  } catch (error) {
    if (!isMainInactiveError(error)) {
      throw error;
    }
    await window.api.activatePluginMain(PLUGIN_ID);
    return await window.api.invokePluginMain(PLUGIN_ID, channel, args);
  }
}
async function syncFromMain(hc) {
  try {
    const session = await invokeMain("getRecent", []);
    if (!Array.isArray(session) || session.length === 0) {
      return;
    }
    const merged = mergeEntries(storeEntries, session);
    if (!merged) {
      return;
    }
    const normalized = merged.map(normalizeRecentEntry);
    setStoreEntries(normalized);
    await hc.storage.set(STORAGE_KEY, normalized);
  } catch {
  }
}
async function clearRecent(hc) {
  try {
    await invokeMain("clear", []);
  } catch {
  }
  setStoreEntries([]);
  await hc.storage.set(STORAGE_KEY, []);
}
function createRecentRequestsSection(React, hc) {
  const { createElement: h, useSyncExternalStore, useCallback } = React;
  function RecentRequestsSection() {
    const entries = useSyncExternalStore(
      subscribeStore,
      getStoreSnapshot,
      () => []
    );
    const handleOpenEntry = useCallback((entry) => {
      void openRecentEntry(entry, hc);
    }, []);
    const handleClear = useCallback(() => {
      void clearRecent(hc);
    }, []);
    return h(
      "div",
      { className: "flex flex-col gap-0.5" },
      entries.length > 0 ? h(
        "div",
        { className: "mb-1 flex justify-end px-1" },
        h(
          "button",
          {
            type: "button",
            className: "cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-[14px] text-muted hover:bg-selection/60 hover:text-text",
            "aria-label": "Clear recent requests",
            onClick: handleClear
          },
          "Clear"
        )
      ) : null,
      entries.length === 0 ? h(
        "div",
        { className: "px-2 py-1.5 text-[14px] text-muted" },
        "No requests yet"
      ) : null,
      ...entries.map(
        (entry) => h(
          "div",
          {
            key: entry.id,
            className: "group flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-selection/60"
          },
          h(
            "button",
            {
              type: "button",
              className: "flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 border-none bg-transparent py-0.5 text-left text-[14px] text-text",
              title: entry.url,
              "aria-label": `Open ${entry.name}, ${entry.method} ${entry.url}, status ${entry.status}, ${formatRelativeTime(entry.ts)}`,
              onClick: () => handleOpenEntry(entry)
            },
            h(
              "span",
              {
                className: `w-12 shrink-0 font-medium uppercase ${methodClass(
                  entry.method
                )}`,
                "aria-hidden": true
              },
              entry.method
            ),
            h(
              "span",
              { className: "min-w-0 flex-1 truncate text-[14px] text-text" },
              entry.name
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
function activate(hc) {
  const RecentRequestsSection = createRecentRequestsSection(hc.react, hc);
  void hc.storage.get(STORAGE_KEY).then((saved) => {
    if (Array.isArray(saved) && saved.length > 0) {
      setStoreEntries(saved.slice(0, PERSISTED_CAP).map(normalizeRecentEntry));
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
      Component: RecentRequestsSection
    })
  );
}
function deactivate() {
  setStoreEntries([]);
}
export {
  activate,
  deactivate
};
