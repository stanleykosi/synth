# Design Token System — Cyberpunk Terminal UI

This document defines the **authoritative design tokens and layout rules** for the interface.
All implementations MUST follow this system exactly.
No additional colors, fonts, spacing units, or layout patterns are permitted.

---

## 1. Color Tokens

### 1.1 Base Colors

| Token | Value | Description |
|------|-------|-------------|
| `--color-bg-primary` | `#0B0D10` | Global page background |
| `--color-bg-panel` | `#0F1216` | Panel and container background |
| `--color-grid-line` | `rgba(255,255,255,0.04)` | Decorative grid overlay |
| `--color-text-primary` | `#E6E8EB` | Primary text |
| `--color-text-muted` | `#8A9099` | Secondary and descriptive text |

---

### 1.2 Accent Colors (STRICT: Exactly Three)

| Token | Value | Role | Usage Rules |
|-----|------|------|------------|
| `--accent-cool-1` | `#2DE2E6` | Primary system color | Section headers, borders, links |
| `--accent-cool-2` | `#3CFF9E` | Data and status color | Stats, ACTIVE / LIMIT indicators |
| `--accent-warm-1` | `#FF7A18` | Focus / highlight color | One highlighted element per screen |

#### Accent Rules
- No gradients
- No opacity variants
- Warm accent may only appear on **one element per screen**
- Accents must never be decorative

---

## 2. Typography Tokens

### 2.1 Font Families

| Token | Font | Usage |
|-----|------|------|
| `--font-display` | Geist Pixel | Page titles, section headers, key numbers |
| `--font-ui` | Geist Pixel | Buttons, labels, tags, board names |
| `--font-body` | Geist Mono | Descriptions and instructional text |

---

### 2.2 Font Sizes

| Token | Size | Usage |
|-----|------|------|
| `--text-xs` | `10px` | Metadata |
| `--text-sm` | `12px` | Labels |
| `--text-md` | `14px` | Body text |
| `--text-lg` | `18px` | Section headers |
| `--text-xl` | `24px` | Page titles |
| `--text-xxl` | `32px` | Key statistics |

---

### 2.3 Letter Spacing

| Context | Value |
|------|------|
| Headers | `0.12em` |
| Labels | `0.08em` |
| Body text | `0` |

---

## 3. Spacing & Grid System

### 3.1 Grid

| Token | Value |
|-----|------|
| `--grid-unit` | `8px` |

All spacing must be divisible by the grid unit.

---

### 3.2 Layout Spacing

| Token | Value |
|-----|------|
| `--section-gap` | `48px` |
| `--panel-padding` | `24px` |
| `--panel-gap` | `24px` |

---

## 4. Borders & Outlines

| Token | Value |
|-----|------|
| `--border-width` | `1px` |
| `--border-radius` | `0px` |
| `--border-style` | `solid` |

#### Border Rules
- Borders define hierarchy
- No drop shadows
- No rounded corners
- Neon borders replace visual depth

---

## 5. Layout System

### 5.1 Global Layout

- Max width: `1280px`
- Centered container
- Vertical flow only
- No overlapping sections

#### Page Structure

Follow what we have currently
---

### 5.2 Section Structure (MANDATORY)

Every section follows this pattern:


---

### 5.3 Panels

- Full width inside container
- Height determined by content
- Use `--color-bg-panel`
- Highlighted panel uses `--accent-warm-1` border

---

### 5.4 Boards List Rules

Each board row must include:
- Left: board name (Geist Pixel)
- Center: stats and indicators
- Right: action link
- Only one board may be highlighted at a time

---

## 6. Interaction Rules

- Hover states use subtle border or text color changes only
- No bounce, spring, or easing-heavy animations
- UI must feel mechanical and system-driven

---

## 7. Prohibited Styles (DO NOT USE)

- Rounded cards
- Glassmorphism
- Gradients
- Drop shadows
- Pastel colors
- Proportional fonts
- Decorative animations
- Modern SaaS styling patterns

---

## 8. Design Philosophy

The interface must resemble:
- A terminal dashboard
- A sci-fi system console
- A functional developer tool

Clarity, structure, and restraint take priority over decoration.
