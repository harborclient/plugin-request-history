# Recent Requests

A HarborClient plugin that records every completed HTTP request and displays them in a **Recent Requests** sidebar section below Collections and Environments.

## Features

- Captures method, URL, status code, and timestamp for each send
- Collapsible sidebar section matching the built-in Collections / Environments pattern
- Persists history across app restarts (up to 100 entries)
- Click a row to copy its URL to the clipboard
- Clear button to remove all recent entries

## Permissions

| Permission | Purpose                                        |
| ---------- | ---------------------------------------------- |
| `ui`       | Sidebar section and toasts                     |
| `storage`  | Persist recent request list                    |
| `http`     | Observe completed HTTP requests (main process) |
| `ipc`      | Bridge session captures to the renderer        |

## Limitations

- Only **completed** exchanges are recorded. Network-level failures (DNS, timeout, connection refused) are not captured because the host fires `onAfterSend` only when `result.error` is absent.
- HTTP error responses (4xx, 5xx) **are** recorded.
- Clicking a row copies the URL; there is no plugin API to load a request into the editor.

## Development

```bash
pnpm install
pnpm build
```

Load the plugin folder via **Settings → Plugins → Load unpacked…**, then enable it.

For day-to-day work:

```bash
pnpm dev
HARBOR_PLUGINS_DEV=/path/to/harborclient-plugin-recent-requests pnpm dev
```

(in the HarborClient app checkout)
