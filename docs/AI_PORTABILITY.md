# Nodera AI portability protocol

Nodera `0.1.0-rc.2` makes external-AI portability the primary AI workflow. No AI provider or API key is required.

## Transport schemas

### `nodera-ai-context/v1`

Internal editor context assembled from the live Gutenberg block tree. It includes the requested task, target scope/fingerprint, bounded block tree, contextual ancestors/siblings, live block contracts, design facts, visual facts and WordPress-native capabilities.

This raw context is not exported directly. WordPress first validates the live target and passes the context through `ContextSanitizer`.

### `nodera-ai-export/v1`

Portable, sanitized session returned by `POST /wp-json/nodera/v1/ai/export`.

Top-level shape:

```json
{
  "schema": "nodera-ai-export/v1",
  "sessionId": "nds_...",
  "exportedAt": "...",
  "noderaVersion": "0.1.0-rc.2",
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
  }
}
```

The session is temporary transport context. It is never the canonical page document, is not stored as a second editor state, and does not own history/revisions.

### `nodera-patch/v1`

The only accepted AI result format.

```json
{
  "schema": "nodera-patch/v1",
  "target": {
    "kind": "block",
    "stableIds": ["nd_..."],
    "fingerprint": "..."
  },
  "operations": [
    {
      "op": "updateAttributes",
      "stableId": "nd_...",
      "attributes": {}
    }
  ]
}
```

The patch must reuse the exact exported target kind, stable IDs and fingerprint. Nodera rejects stale or wrong-scope results.

## Target kinds

### `block`

Only selected root IDs are editable. Descendants may be visible in the exported context for understanding, but are not editable target stable IDs. This is the safest option for rewriting text/style/attributes on one selected block.

### `subtree`

The selected root and its descendants are materialized with stable IDs and are editable. Use this when the AI must restructure a section/group and its child blocks.

### `page`

The whole current Gutenberg page scope is editable. Root-level insert/move operations are allowed only for page scope.

## Editor workflow

1. Select block/subtree or open whole-page Nodera tools.
2. Optionally enter a task and contract scope.
3. Click **Copy for AI**, **Download Session JSON**, or **Download Prompt**.
4. Give the session/prompt to an external AI.
5. Require the AI to return only `nodera-patch/v1` JSON.
6. Paste the JSON or upload the result file under **Import AI Result**.
7. Click **Validate & Preview**.
8. Review diff and quality evidence.
9. Click **Apply to Gutenberg**.
10. Use native Gutenberg Undo/Redo and Save/Update.

## Export security

The export endpoint:

- requires `edit_post` capability for the current post;
- caps request size;
- requires `nodera-ai-context/v1`;
- recalculates the live target fingerprint;
- verifies exact editable stable IDs;
- runs `ContextSanitizer`, including secret-like key redaction and block-contract-aware attribute filtering;
- does not export WordPress nonce/cookies/provider credentials as part of the portable session.

## Import security

Imported JSON is untrusted. Before Apply, the server validates:

- schema and target kind;
- exact editable stable IDs;
- live target fingerprint;
- operation count and operation fields;
- scope boundaries;
- registered/AI-authorable block types;
- registered attributes and value types;
- unsafe URLs, bindings and restricted CSS;
- candidate tree relationships and duplicate stable IDs.

A validation success produces only an in-memory candidate/diff/quality response. It never auto-saves the WordPress post.

## External AI instruction

A compatible external AI should follow these rules:

- treat Gutenberg `post_content` as canonical;
- edit only `target.stableIds`;
- use only supplied block contracts;
- prefer WordPress Core blocks and native Style Engine/Block Bindings/Global Styles capabilities;
- never return normal HTML as a substitute for Gutenberg Core structure;
- never return a full replacement Nodera session/page document;
- return exactly one valid `nodera-patch/v1` JSON object.
