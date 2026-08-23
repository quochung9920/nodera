# nodera-patch/v1

`nodera-patch/v1` is untrusted structured input. It never carries executable PHP/JavaScript and never uses Gutenberg runtime `clientId` as identity.

Initial operations:

- `updateAttributes`
- `insertBlock`
- `removeBlock`
- `moveBlock`
- `replaceBlock`
- `replaceInnerBlocks`

Every patch includes the exported target fingerprint. The server rejects stale targets, unknown fields/operations, scope escapes, unregistered/unauthorized block types, invalid attributes and duplicate persistent IDs before Apply becomes available.
