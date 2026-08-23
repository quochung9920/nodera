# nodera-patch/v1

A structured, untrusted AI result. Initial operations are `updateAttributes`, `insertBlock`, `removeBlock`, `moveBlock`, `replaceBlock` and `replaceInnerBlocks`. Operations identify blocks by persistent Nodera IDs, never by Gutenberg `clientId`. Every patch carries the exported target fingerprint and is rejected when the target changed.
