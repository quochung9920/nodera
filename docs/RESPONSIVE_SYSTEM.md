# Responsive system

Base/desktop values stay in native Gutenberg block supports and attributes. Nodera stores only responsive overrides in `noderaResponsive`.

Initial breakpoints:

- Tablet: max-width 1024px
- Mobile: max-width 767px

The registry is filterable through `nodera_breakpoints`. Supported overrides include spacing, dimensions, font size/line height and common flex layout values. The frontend compiler emits consolidated media-query CSS scoped to `data-nodera-id`. Unsupported or malformed values are ignored rather than emitted as arbitrary CSS.
