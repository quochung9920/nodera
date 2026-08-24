import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import archiver from 'archiver';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;
const required = ['nodera.php', 'uninstall.php', 'includes', 'build', 'blocks', 'readme.txt', 'README.md', 'LICENSE'];
for (const entry of required) {
	if (!fs.existsSync(entry)) throw new Error(`Missing required package entry: ${entry}`);
}
for (const file of ['build/editor.js', 'build/editor.asset.php', 'build/editor.css', 'build/accordion-view.js', 'build/tabs-view.js']) {
	if (!fs.existsSync(file)) throw new Error(`Missing required runtime build: ${file}`);
}
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
const hash = createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
const checksumFile = `${filename}.sha256`;
fs.writeFileSync(checksumFile, `${hash}  ${path.basename(filename)}\n`);
console.log(filename);
console.log(checksumFile);
