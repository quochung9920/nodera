import fs from 'node:fs';

const missing = ['package-lock.json', 'composer.lock'].filter((file) => !fs.existsSync(file));
if (missing.length) {
	throw new Error(`Stable release requires committed reproducible dependency lockfiles: ${missing.join(', ')}. Generate them with the pinned manifests in a networked release environment, review the diff, and commit them before promoting beyond RC.`);
}
console.log('Stable-release dependency lockfiles are present.');
