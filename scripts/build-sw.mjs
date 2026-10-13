// Stamp the service worker with a build version derived from dist assets,
// then copy it into dist so `wrangler dev`/deploy serve it.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const srcSw = join(root, 'public', 'sw.js');

if (!existsSync(dist)) {
  console.error('dist/ missing: run vite build first');
  process.exit(1);
}

const assets = readdirSync(join(dist, 'assets')).sort();
const hash = createHash('sha1');
for (const a of assets) hash.update(readFileSync(join(dist, 'assets', a)));
const version = `bm-sw-${hash.digest('hex').slice(0, 10)}`;

const sw = readFileSync(srcSw, 'utf8').replace(/const VERSION = 'bm-sw-v1';/, `const VERSION = '${version}';`);
writeFileSync(join(dist, 'sw.js'), sw);
console.log(`build-sw: wrote dist/sw.js (${version}, ${assets.length} assets)`);
