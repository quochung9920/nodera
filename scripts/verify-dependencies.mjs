import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const groups = ['dependencies', 'devDependencies'];
const invalid = [];
for (const group of groups) {
	for (const [name, version] of Object.entries(pkg[group] || {})) {
		if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
			invalid.push(`${group}.${name}=${String(version)}`);
		}
	}
}
if (invalid.length) {
	throw new Error(`All direct npm dependencies must be exact versions:\n${invalid.join('\n')}`);
}
console.log(`Direct npm dependency pins verified (${groups.reduce((count, group) => count + Object.keys(pkg[group] || {}).length, 0)} packages).`);
