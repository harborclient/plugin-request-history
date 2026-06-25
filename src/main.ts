import type { MainPluginContext } from "@harborclient/plugin-api";
import { SESSION_CAP, type RecentEntry } from "./shared";

/** Session buffer of captured requests, newest first. */
let entries: RecentEntry[] = [];

/** Monotonic counter for entry ids within this activation. */
let nextId = 1;

/**
 * Prepends a captured exchange and trims the buffer to the session cap.
 *
 * @param entry - Newly captured request metadata.
 */
function pushEntry(entry: RecentEntry): void {
  entries.unshift(entry);
  if (entries.length > SESSION_CAP) {
    entries.length = SESSION_CAP;
  }
}

/**
 * Activates the main-process half: HTTP capture and IPC handlers for the renderer.
 *
 * @param hc - Main plugin context from the HarborClient host.
 */
export function activate(hc: MainPluginContext): void {
  hc.subscriptions.push(
    hc.http.onAfterSend((request, response) => {
      pushEntry({
        id: nextId++,
        method: request.method,
        url: request.url,
        status: response.status,
        statusText: response.statusText,
        ts: Date.now(),
      });
    })
  );

  hc.subscriptions.push(hc.ipc.handle("getRecent", () => entries));

  hc.subscriptions.push(
    hc.ipc.handle("clear", () => {
      entries = [];
    })
  );
}

/**
 * Clears session state when the plugin deactivates.
 */
export function deactivate(): void {
  entries = [];
  nextId = 1;
}
