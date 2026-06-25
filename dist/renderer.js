// node_modules/.pnpm/@harborclient+plugin-api@file+..+harborclient-plugin-api_react@19.2.7/node_modules/@harborclient/plugin-api/dist/runtime/reactHost.js
var hostReact = null;
function setHostReact(react) {
  hostReact = react;
}
function requireHostReact() {
  if (hostReact == null) {
    throw new Error(
      "Plugin React host is not installed. Call installReact(hc.react) at the start of activate()."
    );
  }
  return hostReact;
}

// node_modules/.pnpm/@harborclient+plugin-api@file+..+harborclient-plugin-api_react@19.2.7/node_modules/@harborclient/plugin-api/dist/runtime/index.js
function installReact(react) {
  setHostReact(react);
}

// node_modules/.pnpm/@harborclient+plugin-api@file+..+harborclient-plugin-api_react@19.2.7/node_modules/@harborclient/plugin-api/dist/runtime/react.js
function hook(name) {
  const react = requireHostReact();
  const fn = react[name];
  if (typeof fn !== "function") {
    throw new Error(`React hook "${String(name)}" is not available on hc.react.`);
  }
  return fn;
}
function useCallback(callback, deps) {
  return hook("useCallback")(callback, deps);
}
function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
  return hook("useSyncExternalStore")(subscribe, getSnapshot, getServerSnapshot);
}

// src/shared.ts
var PERSISTED_CAP = 100;
var POLL_INTERVAL_MS = 2e3;
var STORAGE_KEY = "recent";

// node_modules/.pnpm/@harborclient+plugin-api@file+..+harborclient-plugin-api_react@19.2.7/node_modules/@harborclient/plugin-api/dist/runtime/jsx-runtime.js
var Fragment = Symbol.for("@harborclient/plugin-api.Fragment");
function build(type, props, key) {
  const react = requireHostReact();
  const elementType = type === Fragment ? react.Fragment : type;
  const { children, ...rest } = props ?? {};
  if (key !== void 0) {
    rest.key = key;
  }
  return react.createElement(elementType, rest, children);
}
var jsx = build;
var jsxs = build;

// src/renderer.tsx
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
async function invokeMain(pluginId, channel, args = []) {
  try {
    return await window.api.invokePluginMain(pluginId, channel, args);
  } catch (error) {
    if (!isMainInactiveError(error)) {
      throw error;
    }
    await window.api.activatePluginMain(pluginId);
    return await window.api.invokePluginMain(pluginId, channel, args);
  }
}
async function syncFromMain(hc) {
  try {
    const session = await invokeMain(
      hc.pluginId,
      "getRecent",
      []
    );
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
    await invokeMain(hc.pluginId, "clear", []);
  } catch {
  }
  setStoreEntries([]);
  await hc.storage.set(STORAGE_KEY, []);
}
function RecentRequestsSection({ hc }) {
  const entries = useSyncExternalStore(
    subscribeStore,
    getStoreSnapshot,
    () => []
  );
  const handleOpenEntry = useCallback(
    (entry) => {
      void openRecentEntry(entry, hc);
    },
    [hc]
  );
  const handleClear = useCallback(() => {
    void clearRecent(hc);
  }, [hc]);
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-0.5", children: [
    entries.length > 0 ? /* @__PURE__ */ jsx("div", { className: "mb-1 flex justify-end px-1", children: /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: "cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-[14px] text-muted hover:bg-selection/60 hover:text-text",
        "aria-label": "Clear recent requests",
        onClick: handleClear,
        children: "Clear"
      }
    ) }) : null,
    entries.length === 0 ? /* @__PURE__ */ jsx("div", { className: "px-2 py-1.5 text-[14px] text-muted", children: "No requests yet" }) : null,
    entries.map((entry) => /* @__PURE__ */ jsx(
      "div",
      {
        className: "group flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-selection/60",
        children: /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: "flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 border-none bg-transparent py-0.5 text-left text-[14px] text-text",
            title: entry.url,
            "aria-label": `Open ${entry.name}, ${entry.method} ${entry.url}, status ${entry.status}, ${formatRelativeTime(entry.ts)}`,
            onClick: () => handleOpenEntry(entry),
            children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: `w-12 shrink-0 font-medium uppercase ${methodClass(
                    entry.method
                  )}`,
                  "aria-hidden": true,
                  children: entry.method
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "min-w-0 flex-1 truncate text-[14px] text-text", children: entry.name }),
              /* @__PURE__ */ jsxs("span", { className: "shrink-0 tabular-nums text-muted", children: [
                entry.status,
                " ",
                entry.statusText
              ] }),
              /* @__PURE__ */ jsx("span", { className: "shrink-0 text-muted", children: formatRelativeTime(entry.ts) })
            ]
          }
        )
      },
      entry.id
    ))
  ] });
}
function activate(hc) {
  installReact(hc.react);
  function RecentRequestsSectionHost() {
    return /* @__PURE__ */ jsx(RecentRequestsSection, { hc });
  }
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
      Component: RecentRequestsSectionHost
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
