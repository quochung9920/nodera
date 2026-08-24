# Known limitations

Version `0.1.0-rc.4` is a visual-fidelity/commercial-hardening release candidate, not a production-certified stable release.

- Portable Export → external AI → Import needs no API key, but external model quality and JSON compliance remain model-dependent; every returned patch must be reviewed before Apply.
- Portable sessions, multimodal ZIPs, screenshots and correction bundles are bounded/sanitized transport context, not a WordPress backup or second canonical document. Hidden third-party runtime state that is absent from registered block contracts cannot be reconstructed by Nodera.
- Export integrity is SHA-256 transport evidence, not a signature or authorization mechanism. Imported output remains untrusted and must pass the full validator.
- Stale-session conflicts intentionally require a fresh export or discard. RC4 does not perform automatic three-way AI patch merging.
- Nodera Visual AI measures Desktop/Tablet/Mobile through the native Gutenberg `core/editor` device preview and restores the original preview, but snapshot image generation remains best-effort. PNG conversion can fall back to SVG when browser canvas/media restrictions prevent rasterization.
- Same-origin images are embedded into visual snapshots on a best-effort basis. Cross-origin media, pseudo-elements, inaccessible third-party iframes, browser extensions and browser chrome cannot be guaranteed inside standalone screenshot files.
- Visual Facts v2 and the layout graph substantially improve external-AI visual understanding but do not claim mathematical pixel-perfect equivalence to a browser screenshot renderer or a Figma rendering engine.
- Change-policy fields (preserve text/links/media, insert/remove preferences, token preference, Custom CSS avoidance) are explicit AI instructions and review context; they do not replace the server-side patch security boundary.
- Visual QA is deterministic and intentionally conservative. It detects a defined set of measurable issues, not every subjective design defect.
- Unknown third-party blocks remain AI read-only unless a trusted `BlockContractRegistry` adapter explicitly opts them into authoring. Kadence, GenerateBlocks, Spectra and Stackable adapters are not bundled.
- ACF scalar and WooCommerce product Block Bindings are available only when those plugins are detected. AI-authored bindings remain intentionally more restrictive than manual editor bindings.
- Global Design writes to WordPress Global Styles but intentionally exposes a curated surface instead of recreating the Site Editor. RC4's design-context endpoint improves export understanding but does not add a parallel design engine.
- Native pseudo states are exposed only where the WordPress 7.1 Core block supports them. Restricted Custom CSS remains a fallback for unsupported effects.
- Legacy `nodera/accordion` and `nodera/tabs` remain registered for old content; new content uses Core Accordion/Tabs and automatic conversion is intentionally not performed.
- Direct npm/Composer dependencies are pinned, but generated `package-lock.json` and `composer.lock` are still required before stable promotion. The stable verification command fails while they are absent; lockfiles must be generated/reviewed in a trusted networked release environment rather than fabricated.
- The signed commercial updater is inert until a manifest URL and public verification key are explicitly configured. Nodera does not ship an update/licensing backend service in this repository.
- Repository-level branch protection/required checks must be enabled in GitHub settings; plugin runtime code cannot enforce repository governance.
- The compatibility matrix records intended support but real WordPress/PHP/theme/plugin/browser certification remains `NOT YET VERIFIED` until those environments are actually tested.
- Manual screen-reader certification remains required before a broad commercial stable claim.
- GitHub Actions for this repository has shown runner/storage failures even for the zero-dependency runner smoke job; a fully trustworthy green CI run is still required before stable promotion.

See `PRODUCTION_READINESS.md`, `COMPATIBILITY_MATRIX.md`, `AI_PROTOCOL.md`, `VISUAL_AI_PORTABILITY.md` and `COMMERCIAL_DISTRIBUTION.md`.
