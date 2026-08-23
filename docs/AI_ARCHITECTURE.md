# AI architecture

## Native Gutenberg flow

1. User selects a Gutenberg block/subtree or chooses page scope.
2. Nodera resolves persistent IDs, editable scope and contextual ancestors/siblings from the live Gutenberg block tree.
3. Browser code captures bounded visual facts when editor DOM nodes are measurable.
4. Nodera builds `nodera-ai-context/v1` from Gutenberg state, registered block contracts, Global Style facts and the selected scope.
5. The primary in-editor **Generate** action sends that context to the provider-neutral `/nodera/v1/ai/generate` bridge.
6. A trusted provider integration may hook `nodera_ai_generate_patch` and return one decoded `nodera-patch/v1` object. Nodera core does not embed or expose a provider secret.
7. Regardless of provider, the server validates schema, fingerprint, scope, operations, block authorability, registered attributes and candidate relationships before the patch reaches Apply.
8. Nodera builds an in-memory candidate tree and returns semantic diff and deterministic quality findings.
9. Gutenberg `BlockPreview` renders candidate blocks for review where available.
10. User explicitly applies the already-validated patch through `core/block-editor` dispatch.
11. Native Gutenberg history owns Undo/Redo. The user still has to Save/Update the post.

## Manual provider-neutral fallback

When no direct provider bridge is configured, Nodera can still export the same context and one-shot prompt. The user sends it to an external AI and pastes back `nodera-patch/v1`; Nodera normalizes and runs the identical validation/review/apply pipeline.

This means direct and manual modes share one safety contract. No mode is allowed to bypass target fingerprints, editable scope, block contracts or candidate validation.

Nodera does not silently transmit page content to a third-party model provider. Direct transmission only exists when the WordPress installation explicitly configures a provider bridge.
