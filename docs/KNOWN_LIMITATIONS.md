# Known limitations

Version `0.1.0-alpha.4` is not a stable release.

- Nodera now exposes direct AI generation inside Gutenberg, but the core plugin intentionally does not ship a third-party AI credential. A trusted provider integration must hook `nodera_ai_generate_patch`; otherwise the manual external-AI workflow is the fallback.
- Global Design intentionally exposes only a small native Global Styles surface in the current alpha.
- Dynamic Data currently proves one safe `core/post-meta` text source and Heading/Paragraph content bindings.
- Responsive overrides cover a bounded subset only where Gutenberg base controls are insufficient; they are not a second general CSS engine.
- The committed `build/gutenberg-native.js` runtime is a no-Node release bridge for this alpha. The TypeScript source is the long-term canonical implementation and future production builds should fold the native controls into the normal editor bundle.
- Browser visual capture is measured only for editor DOM nodes reachable in the current editor/iframe context.
- Candidate preview is a Gutenberg BlockPreview, not pixel-level reference-image similarity.
- Manual screen-reader certification and broad commercial theme/plugin compatibility require separate real-environment evidence.
- The current execution environment cannot access the maintainer's `localhost` WordPress instance, so localhost browser acceptance must be run on that machine.
