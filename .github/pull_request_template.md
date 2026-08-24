## Summary

Describe the Gutenberg-native/product change and why it is needed.

## Architecture invariant

- [ ] Gutenberg `post_content` remains canonical.
- [ ] No parallel page/session document or custom history/save engine was introduced.
- [ ] Existing native WordPress APIs are used where available.

## Security / AI scope

- [ ] AI output remains untrusted until server validation succeeds.
- [ ] Fingerprint and editable-scope boundaries are preserved.
- [ ] No credentials, cookies, nonces or private content were added to logs/diagnostics.
- [ ] Third-party block authoring is opt-in through a reviewed contract adapter.

## Verification

- [ ] PHP syntax
- [ ] PHPUnit
- [ ] PHPCS
- [ ] TypeScript
- [ ] JS/CSS lint
- [ ] JS unit tests
- [ ] Clean build + runtime verification
- [ ] Package + SHA-256 verification
- [ ] Real WordPress/browser acceptance, or explicitly documented as NOT YET VERIFIED

## Release impact

- [ ] Version/build metadata synchronized when required.
- [ ] Protocol/schema compatibility considered.
- [ ] Migration/rollback does not rewrite Gutenberg `post_content`.
- [ ] Known limitations/documentation updated.
