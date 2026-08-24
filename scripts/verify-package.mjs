import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const file = `dist/nodera-${pkg.version}.zip`;
const checksumFile = `${file}.sha256`;
if (!fs.existsSync(file)) throw new Error(`Package not found: ${file}`);
if (!fs.existsSync(checksumFile)) throw new Error(`Package checksum not found: ${checksumFile}`);
const stat = fs.statSync(file);
if (stat.size < 10_000) throw new Error(`Package is unexpectedly small: ${stat.size} bytes`);
const plugin = fs.readFileSync('nodera.php', 'utf8');
if (!plugin.includes(`Version: ${pkg.version}`) || !plugin.includes(`NODERA_VERSION', '${pkg.version}'`)) {
	throw new Error('Plugin header/version constant does not match package.json.');
}
for (const runtime of [
	'build/editor.js',
	'build/editor.asset.php',
	'build/editor.css',
	'build/accordion-view.js',
	'build/accordion-view.asset.php',
	'build/tabs-view.js',
	'build/tabs-view.asset.php',
	'blocks/accordion/block.json',
	'blocks/tabs/block.json',
	'uninstall.php',
	'LICENSE',
]) {
	if (!fs.existsSync(runtime)) throw new Error(`Runtime/package file missing before packaging: ${runtime}`);
}
for (const asset of ['build/editor.asset.php', 'build/accordion-view.asset.php', 'build/tabs-view.asset.php']) {
	if (!fs.readFileSync(asset, 'utf8').includes(`'version' => '${pkg.version}'`)) {
		throw new Error(`${asset} version does not match package.json.`);
	}
}
for (const blockJson of ['blocks/accordion/block.json', 'blocks/tabs/block.json']) {
	const metadata = JSON.parse(fs.readFileSync(blockJson, 'utf8'));
	if (metadata.version !== pkg.version) throw new Error(`${blockJson} version does not match package.json.`);
}
const runtimeSource = fs.readFileSync('build/editor.js', 'utf8');
for (const marker of ['/nodera/v1/ai/export', 'nodera-ai-export/v1', 'nodera-patch/v1', 'Copy for AI', 'Import AI Result']) {
	if (!runtimeSource.includes(marker)) throw new Error(`Packaged editor runtime missing portable AI marker: ${marker}`);
}
if (fs.existsSync('build/gutenberg-native.js')) throw new Error('Temporary gutenberg-native bridge must not ship.');
const expectedLine = fs.readFileSync(checksumFile, 'utf8').trim();
const [expectedHash, expectedName] = expectedLine.split(/\s+/);
if (expectedName !== path.basename(file)) throw new Error('Checksum file references the wrong package name.');
const actualHash = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if (expectedHash !== actualHash) throw new Error('Package SHA-256 checksum mismatch.');
console.log(`${file} verified (${stat.size} bytes, sha256 ${actualHash})`);
