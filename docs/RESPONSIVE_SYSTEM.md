# Responsive system

Nodera treats Gutenberg's Style Engine as authoritative.

## WordPress 7.1+

Base/Desktop values stay in normal Gutenberg block supports. Responsive overrides are written directly into the native block `style` attribute:

- `style.@tablet`
- `style.@mobile`

WordPress owns editor rendering, frontend CSS generation and `theme.json` viewport configuration. Nodera surfaces a professional inspector UI over those native values rather than running a second responsive engine.

Default WordPress 7.1 viewports are treated as Mobile ≤480px and Tablet ≤782px unless the active theme changes `settings.viewport`.

## Legacy compatibility

Alpha.4 content can contain `noderaResponsive`. The legacy `ResponsiveStyleCompiler` remains registered only so that existing content continues to render on older WordPress installs and during migration. Its filterable breakpoints remain Tablet 1024px / Mobile 767px because changing them would alter existing alpha.4 pages.

On WordPress 7.1+, Nodera can migrate common alpha.4 spacing, dimensions and typography overrides into the native `style.@tablet` / `style.@mobile` tree. Legacy flex/layout values without a proven native mapping remain in the compatibility layer rather than being silently rewritten.

The long-term rule is simple: when Gutenberg owns a responsive capability, Nodera writes the Gutenberg representation and does not duplicate it.
