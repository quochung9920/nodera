# AI architecture

1. User selects a subtree or uses page scope.
2. Nodera resolves persistent IDs and contextual ancestors/siblings.
3. Browser code captures bounded visual facts when DOM nodes are measurable.
4. Nodera exports `nodera-ai-context/v1` and a one-shot provider-neutral prompt.
5. External AI returns `nodera-patch/v1` only.
6. Nodera normalizes the pasted result.
7. The server validates schema, fingerprint, scope, operations, block authorability, registered attributes and candidate relationships.
8. Nodera builds an in-memory candidate tree and returns semantic diff and quality findings.
9. Gutenberg `BlockPreview` renders the candidate for review.
10. User explicitly applies the already-validated patch through `core/block-editor` dispatch.
11. Native Gutenberg history owns undo. The user still has to Save/Update the post.

Nodera v0.1 does not automatically transmit page content to third-party model providers.
