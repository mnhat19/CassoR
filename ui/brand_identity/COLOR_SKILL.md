---
name: color-retheme
description: >
  Apply a new color palette to an existing UI system without touching layout, structure, or component logic.
  Use this skill whenever the user wants to retheme, rebrand, or reskin an interface with a different color scheme —
  including requests like "apply this palette", "swap the colors", "restyle the UI to match these colors",
  "update the color system", or "replace the theme colors". Also trigger when the user provides a hex palette,
  a color swatch image, or a design token file and asks for it to be applied to existing code.
  Focus ONLY on color logic: CSS variables, token mapping, contrast rules, and semantic role assignment.
  Do NOT touch typography, spacing, layout, component structure, or any non-color property.
---

# Color Retheme Skill

Remap a UI's color system to a new palette while preserving all non-color aspects of the design.
This skill enforces a strict separation of concerns: **only color values change**, nothing else.

---

## Source Palette

The reference palette for this skill is a **10-step green monochrome scale**:

| Token Name        | Hex       | Lightness Role             |
|-------------------|-----------|----------------------------|
| `--color-50`      | `#cceedf` | Lightest tint — backgrounds, hover states   |
| `--color-100`     | `#99dcbf` | Light tint — subtle fills, disabled states  |
| `--color-200`     | `#66cb9e` | Soft mid — secondary backgrounds            |
| `--color-300`     | `#33b97e` | Mid — secondary actions, tags               |
| `--color-400`     | `#00a85e` | Core brand — primary interactive color      |
| `--color-500`     | `#007e47` | Emphasis — hover/active on primary          |
| `--color-600`     | `#00542f` | Dark — pressed states, borders              |
| `--color-700`     | `#002a18` | Deepest green — text on light bg, overlays  |
| `--color-900`     | `#000000` | Pure black — high-contrast text, icons      |

> Note: Steps follow a perceptual lightness gradient. `--color-400` is the primary brand anchor.

---

## Step 1 — Audit the Existing Color System

Before making changes, inventory all color definitions in the codebase:

```bash
# Find all hex color values
grep -rE '#([0-9a-fA-F]{3,8})\b' src/ --include="*.css" --include="*.scss" --include="*.tsx" --include="*.jsx" --include="*.vue"

# Find CSS custom properties (variables)
grep -rE 'var\(--[a-z-]*color[a-z-]*\)' src/

# Find Tailwind color classes if applicable
grep -rE 'class="[^"]*(?:bg|text|border|ring|fill|stroke)-[a-z]+-[0-9]+' src/
```

Map each found color to one of three categories:
- **Semantic colors** — have a named role (`primary`, `success`, `error`, `muted`, etc.)
- **Raw hex values** — hardcoded without abstraction
- **Third-party tokens** — from a design system (MUI, shadcn, Tailwind config)

---

## Step 2 — Define the Semantic Token Map

Translate the 10-step scale into semantic roles. Use this standard mapping unless the project's existing roles differ:

```css
:root {
  /* === Brand / Primary === */
  --color-primary:          #00a85e;   /* --color-400: main CTA, links, active nav */
  --color-primary-hover:    #007e47;   /* --color-500: hover state on primary */
  --color-primary-active:   #00542f;   /* --color-600: pressed / focus ring */
  --color-primary-subtle:   #cceedf;   /* --color-50:  tinted background areas */
  --color-primary-muted:    #99dcbf;   /* --color-100: disabled primary, light fills */

  /* === Surface & Background === */
  --color-bg-base:          #ffffff;   /* Keep white — do not override with palette */
  --color-bg-subtle:        #cceedf;   /* --color-50:  section backgrounds, sidebar */
  --color-bg-raised:        #f5fdf9;   /* Derived: mix of white + color-50 for cards */

  /* === Border === */
  --color-border-default:   #99dcbf;   /* --color-100 */
  --color-border-strong:    #33b97e;   /* --color-300 */
  --color-border-focus:     #00a85e;   /* --color-400: focus ring */

  /* === Text === */
  --color-text-primary:     #002a18;   /* --color-700: body text */
  --color-text-secondary:   #00542f;   /* --color-600: labels, captions */
  --color-text-muted:       #007e47;   /* --color-500: placeholders, helper text */
  --color-text-inverse:     #ffffff;   /* White text on dark/primary backgrounds */
  --color-text-on-primary:  #ffffff;   /* Text on --color-primary buttons */

  /* === Interactive States === */
  --color-interactive-idle:   #00a85e;
  --color-interactive-hover:  #007e47;
  --color-interactive-active: #00542f;
  --color-interactive-focus:  #33b97e;
  --color-interactive-disabled: #99dcbf;

  /* === Status (map to semantic intent, not green) === */
  /* Only override if project uses primary color for success states */
  --color-success:   #00a85e;   /* Primary green = success signal */
  --color-success-bg: #cceedf;

  /* Keep error/warning/info as system defaults unless user requests override */
}
```

### Mapping Rules

| Situation | Action |
|-----------|--------|
| Existing `--primary` / `--brand` token | Replace value with `#00a85e` |
| Existing `--primary-dark` / `--primary-foreground` | Map to `#007e47` / `#ffffff` |
| Grey scale used for borders/text | Map to green-tinted equivalents from step scale |
| Pure black `#000000` in text | Keep or map to `--color-700` (`#002a18`) for softer feel |
| White `#ffffff` backgrounds | Do NOT replace — white stays white |
| `rgba()` values with alpha | Extract the base hex, remap, reapply same alpha |

---

## Step 3 — Apply Changes by System Type

### A. CSS / SCSS Custom Properties

Replace variable definitions only in the `:root` block or theme file:

```css
/* BEFORE */
:root {
  --primary: #6366f1;
  --primary-hover: #4f46e5;
}

/* AFTER */
:root {
  --primary: #00a85e;
  --primary-hover: #007e47;
}
```

**Do not** modify selectors, property names, or any value that is not a color.

### B. Tailwind CSS (`tailwind.config.js`)

Extend only the `colors` key:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#cceedf',
          100: '#99dcbf',
          200: '#66cb9e',
          300: '#33b97e',
          400: '#00a85e',  // primary
          500: '#007e47',  // hover
          600: '#00542f',  // active
          700: '#002a18',  // deep
          900: '#000000',
        },
        // Replace old primary key
        primary: {
          DEFAULT: '#00a85e',
          hover:   '#007e47',
          active:  '#00542f',
          subtle:  '#cceedf',
          muted:   '#99dcbf',
        },
      },
    },
  },
}
```

### C. MUI / shadcn / Chakra Token Files

Follow the token schema of the respective system. Only update color-related keys. Example for MUI:

```js
createTheme({
  palette: {
    primary: {
      light:   '#66cb9e',
      main:    '#00a85e',
      dark:    '#007e47',
      contrastText: '#ffffff',
    },
  },
})
```

### D. Hardcoded hex values in components

Do not edit component files directly. Instead:
1. Create CSS variables for each unique hardcoded color found in Step 1
2. Apply the variable globally in the theme file
3. Replace hardcoded values with `var(--color-token-name)` references

---

## Step 4 — Contrast & Accessibility Check

Before finalizing, verify WCAG 2.1 contrast ratios for all text/background combinations:

| Foreground              | Background           | Ratio Target | Notes                        |
|-------------------------|----------------------|--------------|------------------------------|
| `#ffffff` (white)       | `#00a85e` (primary)  | ≥ 4.5:1      | Text on primary buttons      |
| `#002a18` (text-primary)| `#ffffff`            | ≥ 7:1        | Body text                    |
| `#002a18` (text-primary)| `#cceedf` (subtle bg)| ≥ 4.5:1      | Text in tinted sections      |
| `#007e47` (muted text)  | `#ffffff`            | ≥ 3:1        | Large text / UI labels only  |
| `#ffffff`               | `#007e47` (hover)    | ≥ 4.5:1      | Hover state readability      |

**Known contrast notes for this palette:**
- `#00a85e` on white = ~4.6:1 — passes AA for normal text (just barely; prefer `#007e47` for small text)
- `#ffffff` on `#007e47` = ~5.8:1 — passes AA
- `#002a18` on white = ~18.7:1 — passes AAA
- Avoid using `#66cb9e` or lighter as text on white — fails contrast

Use a contrast checker to verify programmatically if needed:
```bash
npx color-contrast-checker --fg "#ffffff" --bg "#00a85e"
```

---

## Step 5 — Dark Mode (Optional)

If the project has a dark mode, apply this inverted mapping:

```css
[data-theme="dark"], .dark {
  --color-bg-base:         #002a18;   /* --color-700 */
  --color-bg-subtle:       #00542f;   /* --color-600 */
  --color-bg-raised:       #00542f;

  --color-border-default:  #007e47;   /* --color-500 */
  --color-border-strong:   #33b97e;   /* --color-300 */

  --color-text-primary:    #cceedf;   /* --color-50 */
  --color-text-secondary:  #99dcbf;   /* --color-100 */
  --color-text-muted:      #66cb9e;   /* --color-200 */

  --color-primary:         #33b97e;   /* Lighter anchor for dark bg */
  --color-primary-hover:   #66cb9e;
  --color-primary-subtle:  #00542f;
}
```

---

## Strict Constraints — What NOT to Change

The following must remain **completely untouched**:

- Font families, sizes, weights, line heights
- Spacing values (margin, padding, gap)
- Border radius, box-shadow geometry (only shadow color may change)
- Component structure (HTML, JSX, Vue templates)
- Layout rules (flexbox/grid definitions)
- Animation timing, easing, duration
- z-index values
- Any non-color CSS property

If a value is ambiguous (e.g., `box-shadow: 0 2px 4px rgba(0,0,0,0.1)`), **only replace the color portion** (`rgba(0,0,0,0.1)` → `rgba(0,42,24,0.1)`), not the geometry.

---

## Deliverables Checklist

When applying this skill, produce:

- [ ] Updated theme/token file with new CSS variables
- [ ] (If Tailwind) Updated `tailwind.config.js` colors block
- [ ] Summary table mapping old tokens → new tokens
- [ ] Contrast compliance notes for key color pairs
- [ ] List of any hardcoded hex values found and how they were handled
- [ ] Dark mode overrides (if project has dark mode)

Do NOT produce:
- [ ] Redesigned components
- [ ] Layout changes
- [ ] New UI patterns or features
