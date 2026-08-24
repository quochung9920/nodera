import fs from 'node:fs';
import path from 'node:path';

const source = 'build-modules';
const target = 'build';
const prefixes = ['accordion-view', 'tabs-view'];

if (!fs.existsSync(source)) {
	throw new Error('Module build directory is missing.');
}
fs.mkdirSync(target, { recursive: true });
for (const entry of fs.readdirSync(source)) {
	if (!prefixes.some((prefix) => entry === `${prefix}.js` || entry === `${prefix}.asset.php`)) continue;
	fs.copyFileSync(path.join(source, entry), path.join(target, entry));
}
for (const prefix of prefixes) {
	for (const suffix of ['.js', '.asset.php']) {
		const file = path.join(target, `${prefix}${suffix}`);
		if (!fs.existsSync(file)) throw new Error(`Merged module artifact is missing: ${file}`);
	}
}
fs.rmSync(source, { recursive: true, force: true });
