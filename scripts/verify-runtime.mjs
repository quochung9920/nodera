import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const plugin = fs.readFileSync('nodera.php', 'utf8');
const runtime = fs.readFileSync('build/editor.js', 'utf8');
const asset = fs.readFileSync('build/editor.asset.php', 'utf8');

if (!plugin.includes(`Version: ${pkg.version}`) || !plugin.includes(`NODERA_VERSION', '${pkg.version}'`)) {
	throw new Error('Plugin and package versions differ.');
}
if (!asset.includes(pkg.version)) throw new Error('Editor asset metadata version differs from package.json.');
if (fs.existsSync('build/gutenberg-native.js')) throw new Error('Temporary Gutenberg-native bridge must not exist.');
for (const file of [
	'includes/Security/RequestThrottle.php',
	'includes/Protocols/ProtocolRegistry.php',
	'includes/Commercial/UpdateClient.php',
	'includes/Compatibility/CompatibilityRegistry.php',
	'includes/Migrations/MigrationManager.php',
	'uninstall.php',
]) {
	if (!fs.existsSync(file)) throw new Error(`Production hardening file is missing: ${file}`);
}
for (const marker of [
	'NoderaNativeUI',
	'nodera/gutenberg-native-controls',
	'/nodera/v1/ai/export',
	'/nodera/v1/ai/validate',
	'nodera-ai-export/v1',
	'nodera-patch/v1',
	'Copy for AI',
	'Import AI Result',
	'.nodera-ai.json',
	'Conflict detected',
	'Export Fresh Session',
	'ACF field',
	'WooCommerce product',
	'@tablet',
	'@mobile',
	':focus-visible',
	'core/accordion',
	'core/tabs',
]) {
	if (!runtime.includes(marker)) throw new Error(`Production editor runtime missing marker: ${marker}`);
}
if (runtime.includes('nodera-studio')) throw new Error('Legacy Nodera Studio runtime leaked into production editor.js.');
console.log(`Runtime integrity verified for ${pkg.version}`);
