# Visual AI portability

Nodera `0.1.0-rc.4` adds a high-fidelity multimodal export layer for external AI workflows without changing the canonical document model. Gutenberg `post_content` remains the only editable page document; the visual bundle is temporary transport context.

## Why this exists

A structural block tree is not enough for reliable visual redesign. RC4 combines Gutenberg structure/contracts with measurements from the actual editor canvas at native Desktop, Tablet and Mobile preview states.

The visual exporter uses the public `core/editor` device preview store (`getDeviceType` / `setDeviceType`) and restores the user's original preview after capture. WordPress 7.1's post editor is iframe-based, so Nodera reads the same-origin editor iframe rather than creating a second renderer.

## Nodera Visual AI sidebar

The **Nodera Visual AI** sidebar supports:

- selected block, selected subtree or whole-page scope;
- an explicit design task;
- change-policy hints to preserve text, links and media, control insert/remove behavior, prefer design tokens and avoid Custom CSS;
- up to three optional reference images (12 MiB total);
- **Download Multimodal Bundle**;
- **Copy Visual AI Prompt**;
- deterministic **Capture Visual QA**;
- **Download Correction Bundle** when QA finds remaining issues.

Returned AI output is still `nodera-patch/v1` and should be imported through the normal Nodera AI panel, which performs the existing fingerprint/scope/contracts/candidate validation and explicit Apply flow.

## Multimodal bundle

The generated ZIP is intentionally provider-neutral. Typical contents:

```text
nodera-<session>-visual.zip
├── session.json
├── prompt.txt
├── visual/
│   ├── manifest.json
│   ├── desktop.png (or .svg fallback)
│   ├── tablet.png  (or .svg fallback)
│   └── mobile.png  (or .svg fallback)
└── references/
    ├── manifest.json
    └── <optional user reference images>
```

PNG capture is best-effort. If browser canvas conversion is unavailable for the current DOM/media, Nodera keeps an SVG foreignObject snapshot instead. Cross-origin media that cannot be safely embedded remains represented by structural/media metadata and may not appear in a standalone visual snapshot.

## Visual facts v2

`session.context.visualFacts` includes:

- real native device-preview measurements for desktop/tablet/mobile;
- block rectangles and overflow/clipping/offscreen state;
- flex/grid flow, gap, alignment and dimensional CSS facts;
- typography, line count and text clipping information;
- border, radius, shadows, transforms and object-fit/object-position facts;
- media natural/rendered dimensions and aspect ratios;
- semantic tag/role/ARIA/link/button/image counts;
- measured text/background contrast when both colors can be resolved;
- Gutenberg style-attribute/preset provenance hints;
- a parent/child layout graph with per-viewport size ratios;
- read-only context-ring facts for ancestors and nearby siblings;
- optional reference-image metadata;
- deterministic visual and design fingerprints.

Context-ring nodes never become editable stable IDs merely because they are measured. The AI must still target only `session.target.stableIds`.

## Design context

Authenticated editors can read `GET /wp-json/nodera/v1/design-context`. It returns bounded, redacted resolved WordPress Global Settings and Global Styles plus active-theme metadata.

The visual session combines those server-resolved values with curated editor design settings such as colors, gradients, duotone, font families/sizes, spacing sizes/units, layout, dimensions, shadows and typography. This gives an external AI a substantially better design-token vocabulary than raw computed CSS alone.

## Visual QA and correction loop

Visual QA re-runs native Desktop/Tablet/Mobile measurement and reports deterministic issues such as:

- horizontal overflow;
- clipped content;
- zero-size blocks;
- excessive mobile heading wrapping;
- low measured text/background contrast where computable;
- obvious image aspect-ratio distortion when `object-fit` is not protecting the media.

A correction bundle performs a fresh export and adds the QA issues to the task context. The intended no-API workflow is:

```text
Gutenberg
  → Multimodal export
  → external AI
  → nodera-patch/v1
  → Nodera validate/review/apply
  → Visual QA
  → correction bundle if needed
  → external AI
  → corrected nodera-patch/v1
```

## Trust and limitations

- screenshots and reference files improve model understanding but never authorize changes;
- imported AI output remains untrusted until the normal server validator succeeds;
- browser screenshots are best-effort and cannot guarantee pixel-perfect capture of cross-origin media, pseudo-elements, browser extensions or inaccessible third-party iframe content;
- a visual fingerprint is evidence about the measured editor state, not a replacement for the canonical Gutenberg target fingerprint;
- change-policy fields are strong AI instructions and review context, not a substitute for the existing patch security boundary;
- real-browser certification is still required before a stable production claim.
