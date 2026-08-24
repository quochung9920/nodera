# Nodera AI portability protocol

Nodera `0.1.0-rc.3` makes external-AI portability the primary AI workflow. No AI provider or API key is required.

## Transport schemas

### `nodera-ai-context/v1`

Internal editor context assembled from the live Gutenberg block tree. It includes the requested task, target scope/fingerprint, bounded block tree, contextual ancestors/siblings, live block contracts, design/visual facts and WordPress-native capabilities. WordPress validates the live target and sanitizes this context before export.

### `nodera-ai-export/v1`

Portable sanitized session returned by `POST /wp-json/nodera/v1/ai/export`.

RC3 adds a protocol descriptor and deterministic integrity metadata:

```json
{
  "schema": "nodera-ai-export/v1",
  "sessionId": "nds_...",
  "exportedAt": "...",
  "noderaVersion": "0.1.0-rc.3",
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

Integrity is transport evidence over the sanitized target/context/output requirements. It is not authorization and never bypasses import validation. Portable sessions are temporary transport context, never a second page document/history/revision store.

### `nodera-patch/v1`

The only accepted v1 AI result format. It must reuse the exact exported target kind, stable IDs and fingerprint. Nodera rejects stale or wrong-scope results.

Published schemas:

- `schemas/nodera-ai-context-v1.schema.json`
- `schemas/nodera-ai-export-v1.schema.json`
- `schemas/nodera-patch-v1.schema.json`

Authenticated editors can inspect protocol capabilities at `GET /wp-json/nodera/v1/protocol`.

## Target kinds

- `block`: only the selected root ID is editable; child structure cannot be changed.
- `subtree`: selected root plus descendants are editable.
- `page`: the full current Gutenberg document root is editable; root insert/move is allowed only here.

## Editor workflow

1. Select the target.
2. Optionally enter a task/contract scope.
3. **Copy for AI**, **Download Session JSON**, or **Download Prompt**.
4. Process with an external AI and request only `nodera-patch/v1` JSON.
5. Paste/upload the result.
6. **Validate & Preview**.
7. Review semantic diff, deterministic quality findings and responsive Before/After preview.
8. **Apply to Gutenberg**.
9. Use native Gutenberg Undo/Redo and Save/Update.

If the target changes after export, RC3 shows an explicit conflict. The user must re-export or discard the stale result; Nodera does not auto-merge it.

## Trust boundaries

Export requires edit capability, bounded request size, valid `nodera-ai-context/v1`, current fingerprint, exact editable stable IDs and `ContextSanitizer` redaction. Imported JSON remains untrusted and must pass schema, exact scope/fingerprint, operation, block-contract, attribute, URL/binding/CSS and candidate-tree checks before review/Apply.

See `AI_PROTOCOL.md` for protocol versioning/backward compatibility and `BLOCK_ADAPTERS.md` for third-party block extension rules.
