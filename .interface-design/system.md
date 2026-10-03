# Casa & Atacado interface system

## Direction

Warm, reliable wholesale shopping: orange is reserved for identity and decisive actions; ink, parchment and quiet shelf-like surfaces provide the structure. The focal action is always the next purchase decision.

## Tokens

- `--accent` / `--accent-strong`: orange brand and active action states.
- `--ink`: primary text and dark operational surfaces.
- `--parchment`, `--surface`, `--field`: canvas, raised content and inset controls.
- `--muted`, `--border`, `--leaf`: supporting copy, quiet structure and catalog fallback tone.
- Customize values only through `src/config/store.ts`.

## Foundations

- 4px spacing rhythm; consumer surfaces use 16–20px padding and operational panels use 20px.
- 8px controls, 12px cards and 20px authentication surface radius.
- Subtle border + quiet shadow depth; no decorative gradients or extra brand colors.
- Manrope communicates the customer journey; DM Mono marks wholesale labels, prices and identifiers.

## Reusable patterns

- Primary button: 42px minimum height, orange fill, 12px/800 label.
- Secondary button: 42px minimum height, parchment surface and quiet border.
- Product quantity rail: 2px orange top edge, tabular price, factual unit-price label, and no unsupported inventory or discount claims.
- Data status: color only supports a visible label or adjacent state; every interactive element keeps focus, hover, active and disabled states.
