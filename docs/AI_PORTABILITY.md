# Nodera AI portability protocol

Nodera `0.1.0-rc.4` makes external-AI portability the primary AI workflow. No AI provider or API key is required.

## Transport schemas

### `nodera-ai-context/v1`

Internal editor context assembled from the live Gutenberg block tree. It includes the requested task, target scope/fingerprint, bounded block tree, contextual ancestors/siblings, live block contracts, design/visual facts and WordPress-native capabilities. WordPress validates the live target and sanitizes this context before export.

RC4 keeps the v1 transport schema backward-compatible while enriching open object fields such as `task`, `design`, `visualFacts` and `environment`. Visual Fidelity 2.0 can add change-policy hints, three native device-preview measurements, layout graph/context ring, optional reference metadata and design/visual fingerprints without creating a second document format.

### `nodera-ai-export/v1`

Portable sanitized session returned by `POST /wp-json/nodera/v1/ai/export`.

```json
{
  "schema": "nodera-ai-export/v1",
  "sessionId": "nds_...",
  "exportedAt": "...",
  "noderaVersion": "0.1.0-rc.4",
  "wordpressVersion": "7.1",
  "target": {
    "kind": "block|subtree|page",
    "stableIds": [],
    "fingerprint": "..."
  },
  "task": {},
  "context": {},
  "outputRequirements": {
    "schema": "nodera-patch/v1",
    "rules": []
  },
  "protocol": {
    "version": "1.0",
    "contextSchema": "nodera-ai-context/v1",
    "exportSchema": "nodera-ai-export/v1",
    "patchSchema": "nodera-patch/v1"
  },
  "integrity": {
    "algorithm": "sha256",
    "value": "..."
  }
}
```

Integrity is transport evidence over the sanitized target/context/output requirements. It is not authorization and never bypasses import validation. Portable sessions, screenshots, references and correction bundles are temporary transport context, never a second page document/history/revision store.

### `nodera-patch/v1`

The only accepted v1 AI result format. It must reuse the exported target kind, stable IDs and fingerprint. Nodera rejects stale or wrong-scope results.

Published schemas:

- `schemas/nodera-ai-context-v1.schema.json`
- `schemas/nodera-ai-export-v1.schema.json`
- `schemas/nodera-patch-v1.schema.json`

Authenticated editors can inspect protocol capabilities at `GET /wp-json/nodera/v1/protocol`.

## Target kinds

- `block`: only the selected root ID is editable; child structure cannot be changed.
- `subtree`: selected root plus descendants are editable.
- `page`: the full current Gutenberg document root is editable; root insert/move is allowed only here.

## Standard editor workflow

1. Select the target.
2. Optionally enter a task/contract scope.
3. **Copy for AI**, **Download Session JSON**, or **Download Prompt**.
4. Process with an external AI and request only `nodera-patch/v1` JSON.
5. Paste/upload the result.
6. **Validate & Preview**.
7. Review semantic diff, deterministic quality findings and responsive Before/After preview.
8. **Apply to Gutenberg**.
9. Use native Gutenberg Undo/Redo and Save/Update.

If the target changes after export, Nodera shows an explicit conflict. The user must re-export or discard the stale result; Nodera does not auto-merge it.

## High-fidelity visual workflow

When external AI needs more than structural context, use **Nodera Visual AI**:

1. Choose block/subtree/page scope and a design task.
2. Optionally set preservation/change-policy hints and attach up to three design reference images.
3. Choose **Download Multimodal Bundle**.
4. Nodera switches the native Gutenberg device preview through Desktop, Tablet and Mobile, measures the live editor DOM at each state and restores the original device preview.
5. The bundle contains the sanitized session, AI prompt, visual manifest, best-effort PNG/SVG captures and optional reference images.
6. Send the bundle to an external AI and request one `nodera-patch/v1`.
7. Import through the standard Nodera AI validator/review/apply flow.
8. Run **Capture Visual QA**. If deterministic issues remain, export a correction bundle and repeat without an API key.

`GET /wp-json/nodera/v1/design-context` provides authenticated editors a bounded/redacted resolved WordPress design-system view (Global Settings, Global Styles and active-theme metadata) for the visual export.

See `VISUAL_AI_PORTABILITY.md` for the Visual Facts v2 structure, screenshot/reference bundle behavior, layout graph, QA and correction loop.

## Trust boundaries

Export requires edit capability, bounded request size, valid `nodera-ai-context/v1`, current fingerprint, exact editable stable IDs and `ContextSanitizer` redaction. Imported JSON remains untrusted and must pass schema, exact scope/fingerprint, operation, block-contract, attribute, URL/binding/CSS and candidate-tree checks before review/Apply.

Visual screenshots/reference files improve model understanding only. They never widen the editable scope or bypass the normal patch validator.

See `AI_PROTOCOL.md` for protocol versioning/backward compatibility and `BLOCK_ADAPTERS.md` for third-party block extension rules.
