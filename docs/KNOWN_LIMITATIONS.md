# Known limitations

Version `0.1.0-alpha.5` is not a stable or production-certified release.

- Nodera now includes server-side provider adapters, but a site administrator must still provide a valid provider/model/API key under **Settings → Nodera AI**. Provider availability, model names, quotas and pricing are controlled by third parties.
- New responsive editing uses WordPress 7.1 native viewport style states. The old `noderaResponsive` compiler remains only to render/migrate alpha.4 content and should not be used for new authoring.
- Native block-instance pseudo states are exposed only where WordPress 7.1 Core currently supports them; Custom CSS remains a deliberately restricted fallback for unsupported effects.
- Legacy `nodera/accordion` and `nodera/tabs` remain registered so existing content renders. New content and AI output use WordPress Core Accordion/Tabs; automatic conversion of every legacy block is not performed because it could alter saved content without explicit user intent.
- Dynamic Data exposes safe Core Block Bindings workflows. The Nodera-specific editable post-meta key remains intentionally narrow; ACF and WooCommerce adapters are not bundled in this alpha.
- Global Design writes directly to WordPress Global Styles and intentionally exposes a curated surface instead of trying to recreate the full Site Editor UI.
- Browser visual capture is measured only for same-origin editor DOM/iframe nodes reachable by the current editor session. It does not claim pixel-level screenshot similarity.
- AI provider output is untrusted and validated, but AI quality remains model-dependent; users must review diff/quality evidence before Apply.
- Dependency versions are currently resolved by the developer/CI install process; a committed dependency lockfile is still recommended before a production release.
- Manual screen-reader certification and broad commercial theme/plugin compatibility require separate real-environment evidence.
- This execution environment cannot access the maintainer's `localhost` WordPress instance. The Playwright acceptance suite must be run on that machine before calling the alpha fully verified.
