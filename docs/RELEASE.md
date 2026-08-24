# Release

Nodera is alpha software. A package is releasable only when source quality gates, a clean production build, package verification and real WordPress browser acceptance are all backed by evidence.

## Package contract

The release ZIP is `dist/nodera-<version>.zip`. It contains runtime PHP, `build/`, legacy compatibility block metadata/runtime, README and WordPress readme. It excludes development tests, `node_modules`, provider credentials and local WordPress data.

Alpha.5 has one production editor runtime: `build/editor.js`. The temporary alpha.4 `build/gutenberg-native.js` bridge is forbidden by both packaging and verification scripts.

A clean developer build must be able to recreate:

- `build/editor.js`
- `build/editor.asset.php`
- `build/editor.css`
- `build/accordion-view.js` + asset metadata for legacy content compatibility
- `build/tabs-view.js` + asset metadata for legacy content compatibility

`scripts/verify-package.mjs` additionally checks the plugin/package version agreement and alpha.5 runtime markers.

## Stable-release gates

Before claiming a stable release, all of the following must be true:

1. PHP syntax, PHPUnit and WordPress Coding Standards pass.
2. TypeScript, JS/CSS lint and JS unit tests pass.
3. A clean `rm -rf build && npm run build` succeeds.
4. No `build/gutenberg-native.js` bridge is regenerated.
5. Runtime syntax, package creation and package verification pass.
6. Direct dependency versions are locked reproducibly and `npm ci` is used in CI.
7. A real WordPress install/activate test passes from the exact packaged ZIP.
8. Playwright proves the Gutenberg-native block workflow, responsive native styles, Undo, provider generation/validation, Save/reload and frontend render.
9. No secrets or local credentials exist in the package/repository.

A green CI package is automated evidence only. Real WordPress acceptance must be reported independently when it is actually run. If infrastructure prevents CI or browser execution, release status remains partially verified or blocked rather than being promoted by assumption.
