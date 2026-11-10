# Codebase Migration Studio — Guidelines

## Components

The design system exports these components — import them from `@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd` and compose them before building anything from scratch:

`Button`, `CartLink`, `Constants`, `DarajaSandboxCheck`, `DigitalIdCard`, `OrderReceipt`, `PortalShell`, `ShopCartProvider`, `ShopDeliveryQuotes`, `ShopFulfilment`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd/styles.css` (source — preferred import)
- `@ws-78a0e5377e1b2f44578c/bf2d016a-4949-4243-a5cc-c9149b8b72cd/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

