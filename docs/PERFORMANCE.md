# Performance

Nodera avoids rebuilding AI context or visual geometry on every keystroke. Both are created only on explicit AI export. Identity reconciliation uses a lightweight document signature and runs only when the block identity structure changes.

The target performance baseline is measured with 50, 200 and 500-block documents for identity reconciliation, Studio opening, AI context generation, visual capture, patch validation and responsive compilation. This document does not claim measured timings until the benchmark is actually executed in a WordPress browser environment.
