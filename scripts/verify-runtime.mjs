import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const plugin = fs.readFileSync('nodera.php', 'utf8');
const runtime = fs.readFileSync('build/editor.js', 'utf8');
const asset = fs.readFileSync('build/editor.asset.php', 'utf8');

if (!plugin.includes(`Version: ${pkg.version}`) || !plugin.includes(`NODERA_VERSION', '${pkg.version}'`)) {
	throw new Error('Plugin and package versions differ.');
}
if (!asset.includes(pkg.version)) throw new Error('Editor asset metadata version differs.');
if (fs.existsSync('build/gutenberg-native.js')) throw new Error('Temporary Gutenberg-native bridge must not exist.');
for (const marker of [
	'NoderaNativeUI',
	'nodera/gutenberg-native-controls',
	'/nodera/v1/ai/generate',
	"'@tablet'",
	"'@mobile'",
	"':focus-visible'",
	'core/accordion',
	'core/tabs',
]) {
	if (!runtime.includes(marker)) throw new Error(`Production editor runtime missing marker: ${marker}`);
}
if (runtime.includes("target: 'nodera-studio'")) throw new Error('Legacy Nodera Studio runtime leaked into production editor.js.');
console.log(`Runtime integrity verified for ${pkg.version}`);
