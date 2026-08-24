import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const buildDir = 'build';
const moduleDir = path.join(buildDir, 'modules');

for (const required of ['editor.js', 'editor.asset.php', 'editor.css']) {
	const file = path.join(buildDir, required);
	if (!fs.existsSync(file)) throw new Error(`Editor build is missing ${file}.`);
}

for (const name of ['accordion-view', 'tabs-view']) {
	for (const suffix of ['.js', '.asset.php']) {
		const source = path.join(moduleDir, `${name}${suffix}`);
		const destination = path.join(buildDir, `${name}${suffix}`);
		if (!fs.existsSync(source)) throw new Error(`Module build is missing ${source}.`);
		fs.copyFileSync(source, destination);
	}
}

for (const asset of ['visual-fidelity.js', 'visual-fidelity.css']) {
	const source = path.join('src', 'runtime', asset);
	const destination = path.join(buildDir, asset);
	if (!fs.existsSync(source)) throw new Error(`Visual fidelity source is missing ${source}.`);
	fs.copyFileSync(source, destination);
}

fs.rmSync(moduleDir, { recursive: true, force: true });

for (const asset of ['editor.asset.php', 'accordion-view.asset.php', 'tabs-view.asset.php']) {
	const file = path.join(buildDir, asset);
	let source = fs.readFileSync(file, 'utf8');
	const versionPattern = /'version'\s*=>\s*'[^']*'/;
	if (!versionPattern.test(source)) throw new Error(`Cannot locate version metadata in ${file}.`);
	source = source.replace(versionPattern, `'version' => '${pkg.version}'`);
	fs.writeFileSync(file, source);
}

for (const blockJson of ['blocks/accordion/block.json', 'blocks/tabs/block.json']) {
	const metadata = JSON.parse(fs.readFileSync(blockJson, 'utf8'));
	if (metadata.version !== pkg.version) {
		throw new Error(`${blockJson} version ${metadata.version || '(missing)'} does not match package ${pkg.version}.`);
	}
}

console.log(`Build finalized for ${pkg.version}`);
