# Known limitations

Version `0.1.0-rc.3` is a commercial-hardening release candidate, not a production-certified stable release.

- Portable Export → external AI → Import needs no API key, but external model quality and JSON compliance remain model-dependent; every returned patch must be reviewed before Apply.
- Portable sessions are bounded/sanitized transport context, not a WordPress backup or second canonical document. Hidden third-party runtime state that is absent from registered block contracts cannot be reconstructed by Nodera.
- Export integrity is SHA-256 transport evidence, not a signature or authorization mechanism. Imported output remains untrusted and must pass the full validator.
- Stale-session conflicts intentionally require a fresh export or discard. RC3 does not perform automatic three-way AI patch merging.
- Unknown third-party blocks remain AI read-only unless a trusted `BlockContractRegistry` adapter explicitly opts them into authoring. Kadence, GenerateBlocks, Spectra and Stackable adapters are not bundled.
- ACF scalar and WooCommerce product Block Bindings are available only when those plugins are detected. AI-authored bindings remain intentionally more restrictive than manual editor bindings.
- Global Design writes to WordPress Global Styles but intentionally exposes a curated surface instead of recreating the Site Editor.
- Visual capture is bounded to same-origin editor DOM/iframe facts and does not claim screenshot-level or pixel-perfect visual matching.
- Native pseudo states are exposed only where the WordPress 7.1 Core block supports them. Restricted Custom CSS remains a fallback for unsupported effects.
- Legacy `nodera/accordion` and `nodera/tabs` remain registered for old content; new content uses Core Accordion/Tabs and automatic conversion is intentionally not performed.
- Direct npm/Composer dependencies are pinned in RC3, but generated `package-lock.json` and `composer.lock` are still required before stable promotion. The stable verification command fails while they are absent; lockfiles must be generated/reviewed in a trusted networked release environment rather than fabricated.
- The signed commercial updater is inert until a manifest URL and public verification key are explicitly configured. Nodera does not ship an update/licensing backend service in this repository.
- Repository-level branch protection/required checks must be enabled in GitHub settings; plugin runtime code cannot enforce repository governance.
- The compatibility matrix records intended support but real WordPress/PHP/theme/plugin/browser certification remains `NOT YET VERIFIED` until those environments are actually tested.
- Manual screen-reader certification remains required before a broad commercial stable claim.
- GitHub Actions for this repository has shown runner/storage failures even for the zero-dependency runner smoke job; a fully trustworthy green CI run is still required before stable promotion.

See `PRODUCTION_READINESS.md`, `COMPATIBILITY_MATRIX.md`, `AI_PROTOCOL.md` and `COMMERCIAL_DISTRIBUTION.md`.
