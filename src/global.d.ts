/**
 * HarborClient preload bridge types used by plugin renderer code.
 */
interface HarborClientApi {
  invokePluginMain: (
    pluginId: string,
    channel: string,
    args: unknown[]
  ) => Promise<unknown>;
  activatePluginMain: (pluginId: string) => Promise<void>;
}

declare global {
  interface Window {
    api: HarborClientApi;
  }
}

export {};
