import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const runtime = 'build/visual-fidelity.js';
const source = 'runtime-src/visual-fidelity.js';
const runtimeCss = 'build/visual-fidelity.css';
const sourceCss = 'runtime-src/visual-fidelity.css';
for (const file of [runtime, source, runtimeCss, sourceCss, 'includes/Rest/VisualContextController.php']) {
	if (!fs.existsSync(file)) throw new Error(`Visual fidelity file missing: ${file}`);
}
execFileSync(process.execPath, ['--check', runtime], { stdio: 'inherit' });
const built = fs.readFileSync(runtime, 'utf8');
const sourceText = fs.readFileSync(source, 'utf8');
if (built !== sourceText) throw new Error('Visual fidelity JavaScript source/runtime drift detected.');
if (fs.readFileSync(runtimeCss, 'utf8') !== fs.readFileSync(sourceCss, 'utf8')) {
	throw new Error('Visual fidelity CSS source/runtime drift detected.');
}
for (const marker of [
	'NoderaVisualFidelity',
	'core/editor',
	'setDeviceType',
	'Download Multimodal Bundle',
	'Download Correction Bundle',
	'nodera-ai-context/v1',
	'nodera-patch/v1',
	'layoutGraph',
	'visualFingerprint',
	'designFingerprint',
]) {
	if (!built.includes(marker)) throw new Error(`Visual fidelity runtime missing marker: ${marker}`);
}
console.log('Visual fidelity runtime verified.');
