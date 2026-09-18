---
name: IndieVault Gaming Marketplace
colors:
  surface: '#101319'
  surface-dim: '#101319'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2eb'
  on-surface-variant: '#c8c4d7'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#928ea0'
  outline-variant: '#474554'
  surface-tint: '#c6bfff'
  primary: '#c6bfff'
  on-primary: '#2900a0'
  primary-container: '#6c5ce7'
  on-primary-container: '#faf6ff'
  inverse-primary: '#5847d2'
  secondary: '#c6bfff'
  on-secondary: '#28019f'
  secondary-container: '#4230b7'
  on-secondary-container: '#b7afff'
  tertiary: '#a2c9ff'
  on-tertiary: '#00315c'
  tertiary-container: '#0673c9'
  on-tertiary-container: '#f4f7ff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c6bfff'
  on-primary-fixed: '#160066'
  on-primary-fixed-variant: '#4029ba'
  secondary-fixed: '#e4dfff'
  secondary-fixed-dim: '#c6bfff'
  on-secondary-fixed: '#160066'
  on-secondary-fixed-variant: '#402db4'
  tertiary-fixed: '#d3e4ff'
  tertiary-fixed-dim: '#a2c9ff'
  on-tertiary-fixed: '#001c38'
  on-tertiary-fixed-variant: '#004882'
  background: '#101319'
  on-background: '#e1e2eb'
  surface-variant: '#32353c'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system crafts an immersive, high-utility digital storefront tailored for indie game developers, studio collectors, and passionate players. Drawing inspiration from modern desktop clients and creator-first storefronts, the aesthetic balances deep atmospheric darkness with laser-focused content hierarchy. 

The design narrative merges contemporary digital storefront minimalism with developer-centric structural precision:
- **Atmospheric Immersion:** Ultra-deep slate and obsidian surfaces eliminate eye fatigue during long browsing sessions and frame rich game media (concept art, cinematic trailers, pixel sprites) without interference.
- **Focused Utility:** Stripped of skeuomorphic chrome or distracting hyper-skeuomorphic game textures, the system operates as a neutral, high-end gallery that yields the spotlight entirely to the creators' games.
- **Precision Accents:** Electric violet and neon-tinted state indicators inject punchy energy into interactive nodes, guiding users through purchasing, library management, and discovery flows.

## Colors

The palette establishes an ergonomic, pitch-black gaming console feel using high-grade contrast ratios for readability and distinct surface depth.

### Core Canvas & Surfaces
- **Canvas Base (`#0e1117`):** The foundational viewport floor. Used for global page backgrounds and deep structural wells.
- **Surface Elevation 1 (`#161b22`):** Primary content regions, sidebars, navigation headers, and segmented panels.
- **Surface Elevation 2 / Cards (`#1c2128`):** Elevated game cards, dropdown popovers, modal dialogues, and active item containers.
- **Subtle Borders (`#30363d`):** Fine architectural lines providing definition without visual noise.

### Accents & Interactivity
- **Primary CTA Accent (`#6c5ce7`):** Vibrant electric violet reserved for primary conversions, checkout triggers, "Buy Now" ribbons, and active tab indicators.
- **Primary Hover (`#5a4bcf`):** Deepened electric violet for pressed and hovered interactive nodes.
- **Tertiary Accent (`#58a6ff` / `#a371f7`):** Electric cyan-to-purple spectrum employed strictly for AI generated tags, experimental tech badges, and featured curator highlights.

### Text & Iconography
- **Text Primary (`#f0f6fc`):** Crisp high-contrast near-white for game titles, critical metadata, prices, and active statuses.
- **Text Muted (`#8b949e`):** Low-strain silver for developer handles, genre tags, timestamps, secondary navigation, and form placeholders.

### Semantic Status
- **Success / Approved (`#2ea043`):** Emerald green for verified builds, positive review sentiment scores, and completed downloads.
- **Warning / Review (`#d29922`):** Amber gold for early access flags, pending mod approvals, and developmental warnings.
- **Danger / Reject (`#f85149`):** Ruby coral for purchase cancellations, deprecation warnings, risk alerts, and destructive actions.

## Typography

The typographic hierarchy uses **Geist** across all roles to achieve a clean, technical, high-legibility interface reminiscent of contemporary developer tools and modern gaming clients. 

To maintain strict visual discipline and performance efficiency, the system operates on exactly two weights:
- **Regular (400):** Applied universally across long-form game descriptions, changelogs, system requirement specifications, and secondary body metadata.
- **Semi-Bold (600):** Applied across all headers, navigational anchors, price tags, button labels, and tag chips to establish clear semantic landmarks.

Letter spacing is subtly tightened on display headlines to balance high-contrast hero layouts, while smaller metadata labels receive expanded tracking for instant legibility in dense lists.

## Layout & Spacing

The layout is built on a responsive 12-column fluid grid that transitions effortlessly into single- and two-column configurations on smaller screens. 

### Breakpoints & Adaptive Strategy
- **Mobile (< 768px):** Single-column stack with `margin-mobile` (16px) and compact `gutter-mobile` (16px). Navigation collapses to a pinned bottom command bar or top slide-out drawer. Game media switches to vertical 16:9 carousel stacks.
- **Tablet (768px - 1024px):** 6-column to 12-column dynamic reflow. Sidebar drawers collapse into icon rails, allowing catalog browsing cards to sit comfortably in a 2- or 3-column auto-fill arrangement.
- **Desktop (> 1024px):** Full 12-column structure anchored by a 260px fixed side navigation or full-width discovery header, max-width bounded at 1440px with `margin` (32px) and `gutter` (24px).

Generous spacing tokens govern layouts, preventing cognitive overload in media-heavy game lists. Spacing values maintain consistent multiple increments of 4px/8px to match standardized display coordinate systems.

## Elevation & Depth

This design system avoids heavy blurred drop shadows that muddy dark themes. Instead, it relies on **Tonal Layering** paired with **Low-Contrast Structural Outlines**.

### Elevation Stack
- **Floor 0 (Base Viewport):** `#0e1117` with no border.
- **Floor 1 (Structural Rail / App Bar):** `#161b22` bounded by a 1px solid `#30363d` bottom or right border.
- **Floor 2 (Standard Cards / List Items):** `#1c2128` bounded by a 1px solid `#30363d` perimeter.
- **Floor 3 (Interactive Hover / Focus State):** Retains `#1c2128` fill, but the border dynamically brightens to `#6c5ce7` (primary) or `#8b949e` (neutral interaction).
- **Floor 4 (Floating Overlays / Modals / Tooltips):** `#1c2128` background with an ambient perimeter glow: `0 8px 24px rgba(0, 0, 0, 0.65)`, rimmed with a 1px solid `#30363d` edge to prevent bleed against the base floor.

## Shapes

The design system incorporates balanced, contemporary geometry using the **Rounded (Level 2)** standard:
- **Base Components (Inputs, Buttons, Badges):** `0.5rem` (8px) radius creates an approachable, refined technical profile.
- **Cards & Visual Containers (`rounded-lg`):** `1rem` (16px) radius softens game cover art frames, hero carousels, and modular store sections.
- **Modal Dialogs & Mega Menus (`rounded-xl`):** `1.5rem` (24px) radius encapsulates floating panels cleanly.
- **System Tags & Status Pills:** Pill-form (`9999px`) is reserved solely for verified platform badges, category micro-chips, and status alerts.

## Components

### Buttons
- **Primary CTA:** Background `#6c5ce7`, text `#f0f6fc`, weight 600. Border: transparent. Radius: 8px. Hover state: `#5a4bcf`. Focus: 2px offset ring in `#6c5ce7`.
- **Secondary / Ghost:** Background `#161b22`, border 1px solid `#30363d`, text `#f0f6fc`. Hover state: background `#1c2128`, border color `#8b949e`.
- **Danger:** Background `#161b22`, border 1px solid `#f85149`, text `#f85149`. Hover state: background `#f85149`, text `#ffffff`.

### Game Cards
- **Container:** Background `#1c2128`, border 1px solid `#30363d`, border-radius 16px, overflow hidden.
- **Media Frame:** Aspect ratio 16:9 (or 3:4 for vertical box art). Smooth scale zoom (1.02x) on hover.
- **Content Area:** Padding `1rem` (16px). Primary title `#f0f6fc` (Geist 600), developer subtitle `#8b949e` (Geist 400).
- **Footer Shelf:** Flex layout displaying price tag (crisp white `#f0f6fc` with an emerald badge `#2ea043` if discounted) and platform OS icons tinted in `#8b949e`.

### Chips & Badges
- **Category Chips:** Background `#161b22`, border 1px solid `#30363d`, text `#8b949e`, font size 12px, weight 600, border-radius 9999px.
- **AI Highlight Badge:** Background `rgba(88, 166, 255, 0.1)`, border 1px solid `rgba(163, 113, 247, 0.4)`, text `#58a6ff` gradient or light violet highlight, weight 600.
- **Status Indicator:** 6px solid dot with semantic fills (Emerald `#2ea043`, Amber `#d29922`, Ruby `#f85149`) with adjacent 12px label.

### Input Fields & Search
- **Input Field:** Background `#0e1117`, border 1px solid `#30363d`, text `#f0f6fc`, placeholder `#8b949e`, radius 8px, padding 10px 14px.
- **Active / Focus:** Border transitions instantly to `#6c5ce7`, accompanied by an outline glow of `0 0 0 1px #6c5ce7`.

### Selection Controls
- **Checkboxes & Radios:** 18px square (checkbox) or circle (radio), background `#161b22`, border 1px solid `#30363d`. When checked: fill `#6c5ce7`, border `#6c5ce7`, with crisp white tick or pip.

### Lists & Activity Rows
- **List Item:** Flat background transparent, padding 12px 16px, separated by 1px solid `#30363d` borders.
- **Hover State:** Background shifts to `#161b22`, text remains `#f0f6fc`.