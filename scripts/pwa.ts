import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

const TEMPLATE = resolve(import.meta.dirname, '../src/client/pwa/sw.js');

function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
	);
}

/**
 * Writes sw.js next to the built page: the service worker from src/client/pwa/sw.js with the
 * list of every built file and a version that changes whenever any of them does.
 */
export function pwa(): Plugin {
	let config: ResolvedConfig;
	return {
		name: 'reign-pwa',
		apply: 'build',
		configResolved(c) {
			config = c;
		},
		closeBundle() {
			const outDir = resolve(config.root, config.build.outDir);
			const hash = createHash('sha256');
			const files: string[] = [];
			for (const file of walk(outDir).sort()) {
				const path = '/' + relative(outDir, file).split('\\').join('/');
				if (path === '/sw.js') continue;
				files.push(path);
				hash.update(path).update(readFileSync(file));
			}
			const sw = readFileSync(TEMPLATE, 'utf8')
				.replace('__REIGN_VERSION__', JSON.stringify(hash.digest('hex').slice(0, 12)))
				.replace('__REIGN_FILES__', JSON.stringify(files));
			writeFileSync(join(outDir, 'sw.js'), sw);
		}
	};
}
