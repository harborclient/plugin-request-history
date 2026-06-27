// node_modules/.pnpm/@harborclient+sdk@0.5.0_@babel+runtime@8.0.0_@codemirror+lint@6.9.7_@codemirror+search@_1ce3235504e871aa5dbe742de87ddfcd/node_modules/@harborclient/sdk/dist/runtime/reactHost.js
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

// node_modules/.pnpm/@harborclient+sdk@0.5.0_@babel+runtime@8.0.0_@codemirror+lint@6.9.7_@codemirror+search@_1ce3235504e871aa5dbe742de87ddfcd/node_modules/@harborclient/sdk/dist/runtime/index.js
function installReact(react) {
  setHostReact(react);
}

// node_modules/.pnpm/@harborclient+sdk@0.5.0_@babel+runtime@8.0.0_@codemirror+lint@6.9.7_@codemirror+search@_1ce3235504e871aa5dbe742de87ddfcd/node_modules/@harborclient/sdk/dist/runtime/jsx-runtime.js
var Fragment = Symbol.for("@harborclient/sdk.Fragment");
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

// node_modules/.pnpm/@harborclient+sdk@0.5.0_@babel+runtime@8.0.0_@codemirror+lint@6.9.7_@codemirror+search@_1ce3235504e871aa5dbe742de87ddfcd/node_modules/@harborclient/sdk/dist/components/Button/index.js
var VARIANT_CLASSES = {
  primary: "cursor-pointer rounded-md border border-transparent bg-accent px-3 py-1 text-[15px] font-medium text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 app-no-drag",
  secondary: "cursor-pointer rounded-md border border-separator bg-control px-3 py-1 text-[15px] text-text shadow-sm hover:bg-selection disabled:cursor-not-allowed disabled:opacity-50 app-no-drag",
  primaryDanger: "cursor-pointer rounded-md border border-transparent bg-danger px-3 py-1 text-[15px] font-medium text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 app-no-drag",
  secondaryDanger: "cursor-pointer rounded-md border border-separator bg-control px-3 py-1 text-[15px] text-danger shadow-sm hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50 app-no-drag",
  toolbar: "cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-[15px] hover:bg-selection app-no-drag",
  icon: "inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100 hover:bg-selection hover:text-text app-no-drag",
  iconDanger: "inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100 hover:bg-danger/15 hover:text-danger app-no-drag"
};
function Button({ variant = "primary", className, type = "button", ...props }) {
  const classes = className ? `${VARIANT_CLASSES[variant]} ${className}` : VARIANT_CLASSES[variant];
  return jsx("button", { type, className: classes, ...props });
}

// node_modules/.pnpm/@harborclient+sdk@0.5.0_@babel+runtime@8.0.0_@codemirror+lint@6.9.7_@codemirror+search@_1ce3235504e871aa5dbe742de87ddfcd/node_modules/@harborclient/sdk/dist/runtime/react.js
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

// node_modules/.pnpm/@harborclient+sdk@0.5.0_@babel+runtime@8.0.0_@codemirror+lint@6.9.7_@codemirror+search@_1ce3235504e871aa5dbe742de87ddfcd/node_modules/@harborclient/sdk/dist/runtime/store.js
function createExternalStore(initial) {
  let state = initial;
  const listeners = /* @__PURE__ */ new Set();
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    setState: (next) => {
      state = next;
      for (const listener of listeners) {
        listener();
      }
    }
  };
}

// node_modules/.pnpm/@harborclient+sdk@0.5.0_@babel+runtime@8.0.0_@codemirror+lint@6.9.7_@codemirror+search@_1ce3235504e871aa5dbe742de87ddfcd/node_modules/@harborclient/sdk/dist/components/EmptyState/index.js
function variantClasses(variant) {
  if (variant === "centered") {
    return "flex flex-1 items-center justify-center p-4 text-center text-[14px] text-muted";
  }
  return "text-[14px] text-muted";
}
function EmptyState({ children, variant = "inline", className }) {
  const base = variantClasses(variant);
  const classes = className ? `${base} ${className}` : base;
  return jsx("div", { className: classes, children });
}

// node_modules/.pnpm/@harborclient+sdk@0.5.0_@babel+runtime@8.0.0_@codemirror+lint@6.9.7_@codemirror+search@_1ce3235504e871aa5dbe742de87ddfcd/node_modules/@harborclient/sdk/dist/storage/cappedList.js
function mergeById(pending, existing, options) {
  if (pending.length === 0) {
    return existing.slice(0, options.cap);
  }
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const entry of [...pending, ...existing]) {
    const id = options.idOf(entry);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    merged.push(entry);
    if (merged.length >= options.cap) {
      break;
    }
  }
  return merged;
}
var writeQueues = /* @__PURE__ */ new Map();
async function enqueueStorageWrite(key, operation) {
  const previous = writeQueues.get(key) ?? Promise.resolve();
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });
  writeQueues.set(key, previous.then(() => done));
  await previous;
  try {
    return await operation();
  } finally {
    resolveDone();
    if (writeQueues.get(key) === done) {
      writeQueues.delete(key);
    }
  }
}
function createCappedList(options) {
  const queueKey = options.key;
  return {
    load: async () => {
      const saved = await options.storage.get(options.key);
      return Array.isArray(saved) ? saved.slice(0, options.cap) : [];
    },
    merge: async (pending) => {
      if (pending.length === 0) {
        return null;
      }
      return enqueueStorageWrite(queueKey, async () => {
        const existing = await options.storage.get(options.key);
        const current = Array.isArray(existing) ? existing : [];
        const merged = mergeById(pending, current, options);
        if (merged.length === current.length) {
          let unchanged = true;
          for (let index = 0; index < merged.length; index += 1) {
            if (options.idOf(merged[index]) !== options.idOf(current[index])) {
              unchanged = false;
              break;
            }
          }
          if (unchanged) {
            return null;
          }
        }
        await options.storage.set(options.key, merged);
        return merged;
      });
    },
    save: async (entries) => {
      await enqueueStorageWrite(queueKey, async () => {
        await options.storage.set(options.key, entries.slice(0, options.cap));
      });
    },
    clear: async () => {
      await enqueueStorageWrite(queueKey, async () => {
        await options.storage.set(options.key, []);
      });
    }
  };
}

// node_modules/.pnpm/@harborclient+sdk@0.5.0_@babel+runtime@8.0.0_@codemirror+lint@6.9.7_@codemirror+search@_1ce3235504e871aa5dbe742de87ddfcd/node_modules/@harborclient/sdk/dist/ui/format.js
function formatRelativeTime(ts, now = Date.now()) {
  const seconds = Math.floor((now - ts) / 1e3);
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

// node_modules/.pnpm/@harborclient+sdk@0.5.0_@babel+runtime@8.0.0_@codemirror+lint@6.9.7_@codemirror+search@_1ce3235504e871aa5dbe742de87ddfcd/node_modules/@harborclient/sdk/dist/ui/tokens.js
var METHOD_CLASSES = {
  get: "text-method-get",
  post: "text-method-post",
  put: "text-method-put",
  patch: "text-method-patch",
  delete: "text-method-delete",
  head: "text-method-head",
  options: "text-method-options"
};
function methodColorClass(method) {
  return METHOD_CLASSES[method.toLowerCase()] ?? "text-text";
}

// src/shared.ts
var PERSISTED_CAP = 100;
var STORAGE_KEY = "recent";

// src/renderer.tsx
var entrySequence = 0;
function nextEntryId() {
  entrySequence += 1;
  return Date.now() * 1e3 + entrySequence % 1e3;
}
var recentStore = createExternalStore([]);
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
      await hc.host.loadRequest(normalized.savedRequestId);
      return;
    } catch {
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
function RecentRequestsSection({ hc }) {
  const entries = useSyncExternalStore(recentStore.subscribe, recentStore.getSnapshot, () => []);
  const handleOpenEntry = useCallback(
    (entry) => {
      void openRecentEntry(entry, hc);
    },
    [hc]
  );
  const handleClear = useCallback(() => {
    void (async () => {
      await list.clear();
      recentStore.setState([]);
    })();
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-0.5", children: [
    entries.length > 0 ? /* @__PURE__ */ jsx("div", { className: "mb-1 flex justify-end px-1", children: /* @__PURE__ */ jsx(
      Button,
      {
        variant: "toolbar",
        className: "text-[14px] text-muted hover:text-text",
        "aria-label": "Clear recent requests",
        onClick: handleClear,
        children: "Clear"
      }
    ) }) : null,
    entries.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { variant: "inline", className: "px-2 py-1.5", children: "No requests yet" }) : null,
    entries.map((entry) => /* @__PURE__ */ jsx(
      "div",
      {
        className: "group flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-selection/60",
        children: /* @__PURE__ */ jsxs(
          Button,
          {
            variant: "toolbar",
            className: "flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left text-[14px] text-text hover:bg-transparent",
            title: entry.url,
            "aria-label": `Open ${entry.name}, ${entry.method} ${entry.url}, status ${entry.status}, ${formatRelativeTime(entry.ts)}`,
            onClick: () => handleOpenEntry(entry),
            children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: `w-12 shrink-0 font-medium uppercase ${methodColorClass(entry.method)}`,
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
var list;
function activate(hc) {
  installReact(hc.react);
  list = createCappedList({
    storage: hc.storage,
    key: STORAGE_KEY,
    cap: PERSISTED_CAP,
    idOf: (entry) => String(entry.id)
  });
  void list.load().then((saved) => {
    if (saved.length > 0) {
      recentStore.setState(saved.map(normalizeRecentEntry));
    }
  });
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
        bodyType: request.bodyType
      });
      const merged = await list.merge([entry]);
      if (merged) {
        recentStore.setState(merged.map(normalizeRecentEntry));
      }
    })
  );
  function RecentRequestsSectionHost() {
    return /* @__PURE__ */ jsx(RecentRequestsSection, { hc });
  }
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
  recentStore.setState([]);
  entrySequence = 0;
}
export {
  activate,
  deactivate
};
