---
version: alpha
name: Supabase
description: A green emerald shadcn/ui theme — forest-green primary, clean white canvas, and developer-friendly open-source warmth by tweakcn.
colors:
  background: "#fcfcfc"
  foreground: "#161616"
  card: "#fcfcfc"
  primary: "#0d623b"
  primary-foreground: "#e4f7ed"
  secondary: "#fcfcfc"
  secondary-foreground: "#161616"
  muted: "#eeeeee"
  muted-foreground: "#1f1f1f"
  accent: "#eeeeee"
  accent-foreground: "#1f1f1f"
  destructive: "#c83316"
  border: "#dedede"
  input: "#f5f5f5"
  ring: "#0d623b"
  sidebar: "#fcfcfc"
  sidebar-foreground: "#717171"
  sidebar-primary: "#0d623b"
  sidebar-accent: "#eeeeee"
  chart-1: "#71e1ac"
  chart-2: "#3981f6"
  chart-3: "#8c5df8"
  chart-4: "#f49f1e"
  chart-5: "#10ba82"
  dark-background: "#121212"
  dark-foreground: "#e4e8ef"
  dark-card: "#181818"
  dark-primary: "#0d623b"
  dark-secondary: "#242424"
  dark-muted: "#1f1f1f"
  dark-muted-foreground: "#a1a1a1"
  dark-accent: "#2e2e2e"
  dark-border: "#292929"
  dark-sidebar: "#121212"
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 48px
  section: 64px
  gutter: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.lg}"
    padding: 12px
  button-outline:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 12px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: 24px
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 12px
  sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
---

# Supabase

A premade shadcn/ui theme by [tweakcn](https://tweakcn.com). Install tokens with `npx shadcn@latest add @shadcnblocks/theme/supabase`, then keep this DESIGN.md in the project root (or `.agents/`) so coding agents stay on-brand.

## Overview

Supabase feels like a well-organized developer console with a splash of optimism: clean white surfaces, dark near-black type, and a deep forest-green primary (`#0d623b`) that signals growth, reliability, and institutional trust. The same green is used in light and dark themes, so the brand reads identically in both and stays legible on the near-white canvas.

The system is **developer-friendly, clean, and gently branded**. It suits database tools, backend platforms, API consoles, developer documentation, and products that bridge technical depth with approachable UX. The neutral canvas lets the green primary serve as a wayfinding accent without overwhelming dense interfaces.

Emotional targets: capable, approachable, open-source-spirited — never corporate stiff, never neon flashy, never playful-cute.

## Colors

The palette pairs a **forest-green primary** with a **nearly achromatic neutral stage**. Green carries brand identity and positive actions; everything else stays gray.

- **Primary (`#0d623b`):** Forest green — primary buttons, active states, brand moments, focus rings. Light text (`#e4f7ed`) on the green (~6.7:1); the green itself reaches ~7.3:1 against the canvas, so borders, rings and active items never wash out. Same value in light and dark mode. (The original tweakcn theme used mint `#71e1ac` in light mode, too faint on white; mint survives only as `chart-1`.)
- **Secondary (`#fcfcfc`):** Near-white — secondary buttons match the canvas; borders provide their shape.
- **Muted (`#eeeeee`):** Light gray for quiet chrome — table headers, skeleton fills, secondary wells.
- **Foreground (`#161616`):** Near-black ink — body text. Dark and legible without being pure black.
- **Background (`#fcfcfc`):** Near-white canvas — clean and neutral.
- **Card (`#fcfcfc`):** Same as background — cards rely on borders and shadows for elevation, not background contrast.
- **Border (`#dedede`):** Mid-light gray — visible separators that provide structure without heaviness.
- **Ring (`#0d623b`):** Green focus ring (applied at 50% opacity by shadcn) — matches primary so focused elements read as "active."
- **Destructive (`#c83316`):** Burnt orange-red for errors — distinct from the green brand palette.

Dark mode shifts to a near-black canvas (`#121212`) with the same forest-green primary, deep enough that buttons don't blare in dim environments.

## Typography

**Inter** is the single typeface for the whole product (`--font-sans` / `--font-heading`): display, reading and UI chrome alike. Hierarchy comes from size, weight and tracking — never from mixing families. System **monospace** covers code and hardware identifiers only.

- **Display / headlines:** Inter Bold–SemiBold, tight tracking. Clear product typography without theatrical display faces.
- **Body:** Inter Regular at 16px with 1.6 line-height. The standard developer-docs reading experience.
- **Labels / UI chrome:** Inter Medium at 14px (buttons, badges, menus, table headers). Sentence case throughout.
- **Mono:** System monospace for code blocks, SQL queries, and API references.

Avoid heavy display faces, rounded comic-style fonts, or swapping Inter for a serif — the theme's voice is technical-approachable, not editorial.

## Layout

Use a **clean developer-console rhythm**: 8px base, comfortable density, and logical grouping.

- Prefer a max-width content column (~1200px) with `2rem` horizontal gutters.
- Cards and panels sit on the same-tone background; borders and subtle shadows provide visual separation.
- Marketing pages: product screenshots front-and-center, one headline, one green CTA.
- App shells: white sidebar with gray text, white content pane. Green appears only on active nav items and primary CTAs.
- Density: medium-high. Developer tools need information density without claustrophobia.

## Elevation & Depth

Depth is **soft and purposeful** — shadows at moderate opacity (`0.09`–`0.17`) provide structure without drama.

- Cards use border + subtle shadow together for a clean floating look.
- Prefer tonal layering: gray muted well → white card → green action.
- Avoid heavy drop-shadows, colored glows, or dramatic multi-layer stacks.
- Dark mode: elevate with slightly lighter card backgrounds and border contrast, not bright borders.

## Shapes

Corner radius is **modest** — base `--radius` is `0.5rem` (8px).

- Buttons, inputs, and controls: ~8px (`rounded-lg`).
- Cards and large panels: ~12px (`rounded-xl`).
- Pills/avatars: full rounding only for status dots and chip-like elements.
- Keep shapes consistent — no mixing sharp SQL-terminal edges with rounded marketing panels.

## Components

Built for the shadcn/ui token contract. Prefer semantic tokens (`bg-primary`, `text-muted-foreground`) over raw hex in component code.

- **Primary button:** Forest-green fill with light text. The signature green CTA — one per view ideally.
- **Secondary button:** White/near-white fill, dark text, border stroke. Quiet companion action.
- **Outline / ghost:** Dark text on transparent; borders use `border`, not primary green.
- **Cards:** White surface, gray border, xl radius, comfortable padding (24px).
- **Inputs:** Light gray or white fields, gray borders, green focus ring. Error borders use destructive orange-red.
- **Sidebar:** White shell, gray labels. Active item gets a green accent or muted background lift.
- **Charts:** Series order green → blue → purple → amber → teal. Keep grids in `muted`/`border`.
- **Badges:** Green or muted fills for positive status; destructive for alerts. Avoid a rainbow of badge colors.

## Do's and Don'ts

**Do**

- Do let emerald green serve as the sole brand accent — primary buttons, active states, success indicators.
- Do keep all structural chrome achromatic (white, near-white, gray).
- Do use Inter for everything — headlines, body and UI chrome; vary weight and size, not the family.
- Do preserve the 8px radius and moderate shadow language.
- Do ensure dark mode green is deep enough for readability on dark backgrounds.

**Don't**

- Don't flood the interface with green — if every surface is minty, nothing is emphasized.
- Don't introduce secondary brand colors (blue links, purple badges) that compete with the green story.
- Don't warm the backgrounds to cream or parchment — Supabase is cool-neutral.
- Don't use neon-bright green variants that look unfinished or "terminal-retro."
- Don't mix pill-shaped and square-cornered controls in the same view.
- Don't invent one-off hex values when the existing neutral scale already provides the right tone.
