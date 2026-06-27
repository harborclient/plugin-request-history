#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Exits the process with an error message when a check fails.
 *
 * @param condition - Whether the check passed.
 * @param message - Failure message.
 */
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
assert(manifest.id === 'com.harborclient.plugins.request-history', 'manifest id');
assert(manifest.renderer === 'dist/renderer.js', 'renderer entry');
assert(manifest.main == null, 'renderer-only plugin has no main entry');
assert(
  manifest.contributes?.sidebarSections?.[0]?.id === 'recent-requests',
  'sidebar section contribution'
);
assert(
  manifest.permissions.includes('ui') &&
    manifest.permissions.includes('storage') &&
    manifest.permissions.includes('http') &&
    !manifest.permissions.includes('ipc'),
  'permissions'
);

const rendererPath = join(root, manifest.renderer);
assert(existsSync(rendererPath), 'dist/renderer.js exists');

const renderer = readFileSync(rendererPath, 'utf8');
assert(renderer.includes('onAfterSend'), 'renderer captures after send');
assert(renderer.includes('registerSidebarSection'), 'renderer registers sidebar');
assert(!renderer.includes('react/jsx-runtime'), 'renderer avoids jsx-runtime import');
assert(renderer.includes('export'), 'renderer exports activate');
assert(!renderer.includes('invokePluginMain'), 'renderer does not use main IPC');

console.log('All plugin verification checks passed.');
