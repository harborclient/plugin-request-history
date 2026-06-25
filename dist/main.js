// src/shared.ts
var SESSION_CAP = 200;

// src/main.ts
var entries = [];
var entrySequence = 0;
function nextEntryId() {
  entrySequence += 1;
  return Date.now() * 1e3 + entrySequence % 1e3;
}
function pushEntry(entry) {
  entries.unshift(entry);
  if (entries.length > SESSION_CAP) {
    entries.length = SESSION_CAP;
  }
}
function activate(hc) {
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
        bodyType: request.bodyType
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
function deactivate() {
  entries = [];
  entrySequence = 0;
}
export {
  activate,
  deactivate
};
