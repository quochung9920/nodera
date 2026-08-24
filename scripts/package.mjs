import fs from 'node:fs';
import archiver from 'archiver';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;
const required = ['nodera.php', 'includes', 'build', 'blocks', 'readme.txt', 'README.md'];
for (const entry of required) {
	if (!fs.existsSync(entry)) throw new Error(`Missing required package entry: ${entry}`);
}
for (const file of [
	'build/editor.js',
	'build/editor.asset.php',
	'build/editor.css',
	'build/accordion-view.js',
	'build/accordion-view.asset.php',
	'build/tabs-view.js',
	'build/tabs-view.asset.php',
]) {
	if (!fs.existsSync(file)) throw new Error(`Missing required runtime build: ${file}`);
}
if (fs.existsSync('build/gutenberg-native.js')) throw new Error('Legacy Gutenberg runtime bridge must not ship.');
fs.mkdirSync('dist', { recursive: true });
const filename = `dist/nodera-${version}.zip`;
const output = fs.createWriteStream(filename);
const zip = archiver('zip', { zlib: { level: 9 } });
const done = new Promise((resolve, reject) => {
	output.on('close', resolve);
	zip.on('error', reject);
});
zip.pipe(output);
for (const entry of required) {
	if (fs.statSync(entry).isDirectory()) zip.directory(entry, `nodera/${entry}`);
	else zip.file(entry, { name: `nodera/${entry}` });
}
await zip.finalize();
await done;
console.log(filename);
