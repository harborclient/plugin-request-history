import type { MainPluginContext } from "@harborclient/plugin-api";
import { SESSION_CAP, type RecentEntry } from "./shared";

/** Session buffer of captured requests, newest first. */
let entries: RecentEntry[] = [];

/** Sequence counter disambiguating ids captured within the same millisecond. */
let entrySequence = 0;

/**
 * Returns a capture id that stays unique across main-process reactivations.
 *
 * @returns Numeric id combining epoch milliseconds and a per-ms sequence.
 */
function nextEntryId(): number {
  entrySequence += 1;
  return Date.now() * 1000 + (entrySequence % 1000);
}

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
        bodyType: request.bodyType,
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
  entrySequence = 0;
}
