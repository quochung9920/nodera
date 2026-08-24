# Known limitations

Version `0.1.0-alpha.5` is not a stable release.

- Direct AI now has built-in server-side OpenAI, Anthropic, Gemini and custom HTTPS adapters, but a valid provider account/model/credential is still required. Nodera does not bundle a third-party credential.
- Provider output is untrusted and must pass Nodera's server-side scope/fingerprint/contract/security validator before Apply. This reduces risk but does not make model output infallible.
- WordPress 7.1 native responsive style states are used where available. Pre-7.1 sites and alpha.4 content retain a bounded `noderaResponsive` compatibility layer; some legacy flex/layout overrides do not have a direct native migration path yet.
- Native pseudo-state authoring in the current Nodera UI focuses on the WordPress blocks for which Core exposes the strongest native state UX. Other blocks retain the compatibility fallback.
- Legacy `nodera/tabs` and `nodera/accordion` remain parseable but are hidden from the inserter and are not AI-authorable. Automatic structural migration of existing legacy blocks to the Core block families is intentionally not performed without browser evidence that content mapping is lossless.
- Dynamic Data exposes a safe subset of WordPress Core Block Bindings plus the dedicated `nodera_dynamic_text` post-meta source. ACF and WooCommerce adapters are not part of alpha.5.
- Global Design now covers common native Global Styles values but is not a replacement for the full WordPress Styles UI.
- The committed production `build/editor.js` is a no-Node runtime snapshot for end users. `src/` remains canonical for developer builds; clean-build drift must be checked before releases.
- Direct JavaScript dependencies are pinned, but this repository does not yet contain a generated npm lockfile because the current execution environment cannot reach the npm registry. Release CI must generate/verify a clean dependency graph before a stable release.
- Browser visual capture is measured only for editor DOM nodes reachable in the current Gutenberg document/iframe context. It is evidence, not pixel-level reference-image matching.
- Candidate preview is Gutenberg BlockPreview, not a guaranteed exact frontend screenshot under every theme/plugin combination.
- Manual screen-reader certification, high-volume performance profiling and broad commercial theme/plugin compatibility require real-environment evidence.
- This execution environment cannot access the maintainer's localhost WordPress instance, so the Playwright acceptance suite must still be run on the machine hosting that WordPress site.
- GitHub Actions in this repository has previously failed even for the zero-dependency runner smoke job and returned unavailable log blobs. A green CI run is still a release gate; external runner failure must not be reported as a code pass.
