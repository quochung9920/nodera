import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const file = `dist/nodera-${pkg.version}.zip`;
if (!fs.existsSync(file)) throw new Error(`Package not found: ${file}`);
const stat = fs.statSync(file);
if (stat.size < 10_000) throw new Error(`Package is unexpectedly small: ${stat.size} bytes`);
const plugin = fs.readFileSync('nodera.php', 'utf8');
if (!plugin.includes(`Version: ${pkg.version}`)) throw new Error('Plugin header version does not match package.json.');
for (const runtime of [
	'build/editor.js',
	'build/editor.asset.php',
	'build/editor.css',
	'build/accordion-view.js',
	'build/tabs-view.js',
	'blocks/accordion/block.json',
	'blocks/tabs/block.json',
]) {
	if (!fs.existsSync(runtime)) throw new Error(`Runtime file missing before packaging: ${runtime}`);
}
if (fs.existsSync('build/gutenberg-native.js')) {
	throw new Error('Legacy Gutenberg runtime bridge must not ship in alpha.5 packages.');
}
const editor = fs.readFileSync('build/editor.js', 'utf8');
for (const marker of ['nodera/gutenberg-native-controls', 'Generate in Gutenberg', 'nativeResponsive']) {
	if (!editor.includes(marker)) throw new Error(`Editor runtime is missing alpha.5 marker: ${marker}`);
}
console.log(`${file} verified (${stat.size} bytes)`);
