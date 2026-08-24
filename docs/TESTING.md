# Testing

## Repository quality gates

Alpha.5 expects the following developer checks:

```bash
npm install --no-audit --no-fund
npm run typecheck
npm run lint:js
npm run lint:css
npm run test:unit
npx playwright test --list

composer install
vendor/bin/phpcs
vendor/bin/phpunit

rm -rf build
npm run build
test ! -e build/gutenberg-native.js
npm run check:runtime
npm run package
npm run verify:package
```

The current repository pins direct JavaScript dependency versions but does not yet contain a generated npm lockfile because the execution environment used for alpha.5 hardening cannot reach the npm registry. A committed lockfile plus `npm ci` is required before a stable release.

## Real WordPress browser acceptance

Playwright uses environment variables only:

```bash
WP_BASE_URL=http://localhost:8083 \
WP_ADMIN_USER=... \
WP_ADMIN_PASSWORD=... \
npm run test:e2e
```

Credentials must never be committed.

The acceptance suite currently defines evidence for:

- native Nodera controls on selected Gutenberg blocks;
- lazy stable IDs that do not mutate every block simply because the editor opened;
- WordPress 7.1 responsive `style.@tablet` authoring plus native Undo;
- legacy Nodera Tabs/Accordion hidden from new insertion;
- Core Tabs/Core Accordion availability on WordPress versions that provide them.

The next real-environment gate should also exercise a configured provider end-to-end: Generate → server validation → diff/quality → Apply → native Undo → Apply again → Save/Update → reload → frontend render.

Browser tests are skipped when the environment variables are absent. A skipped test is never reported as a PASS.

## CI evidence

`runner-smoke` intentionally contains only an `echo`. If it fails together with all other jobs before steps/logs are available, that is treated as external GitHub Actions runner evidence rather than as a Nodera source PASS or FAIL. Release status remains blocked until a real green run exists.
