import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { build as buildClient } from 'vite';
import { build as buildWorker } from 'esbuild';

await buildClient();
const assets = await readdir('dist');
await mkdir('dist/client');
for (const asset of assets) await rename(`dist/${asset}`, `dist/client/${asset}`);
await rm('dist/client/_routes.json', { force: true });
await buildWorker({
  bundle: true,
  entryPoints: ['scripts/sites-worker.ts'],
  format: 'esm',
  outfile: 'dist/server/index.js',
  platform: 'neutral',
  target: 'es2022',
});
