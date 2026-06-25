// src/shared.ts
var SESSION_CAP = 200;

// src/main.ts
var entries = [];
var nextId = 1;
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
        id: nextId++,
        method: request.method,
        url: request.url,
        status: response.status,
        statusText: response.statusText,
        ts: Date.now()
      });
    })
  );
  hc.subscriptions.push(
    hc.ipc.handle("getRecent", () => entries)
  );
  hc.subscriptions.push(
    hc.ipc.handle("clear", () => {
      entries = [];
    })
  );
}
function deactivate() {
  entries = [];
  nextId = 1;
}
export {
  activate,
  deactivate
};
