# 📦 Grido Studio Pro — Design System & UI Specification (v1.0)

> **Design System Architect:** Lead UI/UX Engineer  
> **Platform:** Desktop Web (Landing Page)  
> **Aesthetic:** Microsoft Fluent 2, Windows 11 Mica/Acrylic, Pure Neutral Charcoal  
> **Language Paradigm:** Bi-directional (Primary Arabic RTL, Secondary English LTR)

---

## 📑 Table of Contents
1. [Product Context & Philosophy](#1-product-context--philosophy)
2. [Design Tokens (The Foundation)](#2-design-tokens-the-foundation)
3. [Typography System](#3-typography-system)
4. [Fluent Materials & Elevation](#4-fluent-materials--elevation)
5. [Core Component Library](#5-core-component-library)
6. [Landing Page UI Architecture (Wireframe Spec)](#6-landing-page-ui-architecture-wireframe-spec)
7. [Motion & Interaction Guidelines](#7-motion--interaction-guidelines)
8. [Internationalization (RTL/LTR) & Accessibility (A11y)](#8-internationalization-rtlltr--accessibility-a11y)

---

## 1. Product Context & Philosophy

**Product Name:** Grido Studio Pro (استوديو جريدو)  
**Tagline:** "استوديو متكامل لطباعة صور الهوية والفيزا، الكولاج، وتعديل الصور بدقة فائقة مع محرك ذكاء اصطناعي فوري وتجربة ويندوز 11 العصرية."

**Design Philosophy:**  
The Grido Studio Pro landing page is engineered to feel like a native, high-performance Windows 11 desktop application running in the browser. We achieve this through the meticulous use of **Fluent 2 design principles**: subtle rounded corners (radii), layered depth using Mica and Acrylic materials, strict adherence to an 8px spacing grid, and physics-based motion. 

The visual identity relies on a **Pure Neutral Charcoal** base to let the creative work of our users pop, accented by an **Electric Blue** to signify action and an **AI Beam Cyan/Purple** to highlight artificial intelligence features.

---

## 2. Design Tokens (The Foundation)

All design decisions are driven by semantic tokens. These should be mapped directly to Tailwind CSS or CSS-in-JS variables.

### A. Core Color Palette
```css
:root {
  /* --- Dark Mode Palette (Primary Identity) --- */
  --grido-workspace-canvas: #141414;   /* Main page background */
  --grido-surface-sidebar:   #1A1A1A;   /* Sidebars & secondary panels */
  --grido-surface-card:      #242424;   /* Raised cards & elevated UI */
  --grido-surface-inset:     #171717;   /* Inset fields & input tracks */
  --grido-border-subtle:     #333333;   /* Standard borders & dividers */
  --grido-border-specular:   rgba(255, 255, 255, 0.08); /* Windows 11 illuminated edge */

  /* --- Brand Accent & Gradients --- */
  --grido-brand-primary:     #3b82f6;   /* Electric Blue */
  --grido-brand-hover:       #2563eb;   /* Deep Blue */
  --grido-brand-glow:        rgba(59, 130, 246, 0.25);
  --grido-accent-purple:     #8b5cf6;   /* AI & Creative tools gradient end */

  /* --- Text & Contrasts --- */
  --grido-text-primary:      #F5F5F5;   /* High-contrast pure text */
  --grido-text-secondary:    #A3A3A3;    /* Readable secondary gray */
  --grido-text-muted:        #737373;    /* Hints & disabled states */

  /* --- Semantic Statuses --- */
  --grido-status-success:    #10b981;   /* Active licenses & success */
  --grido-status-warning:    #f59e0b;   /* Print margins & warnings */
  --grido-status-error:      #ef4444;   /* Export errors */
  --grido-ai-beam:           #38bdf8;   /* AI laser & face scan */
}
```

### B. Tailwind Config Mapping (Reference)
```javascript
colors: {
  canvas: '#141414',
  surface: { DEFAULT: '#1A1A1A', card: '#242424', inset: '#171717' },
  border: { DEFAULT: '#333333', specular: 'rgba(255,255,255,0.08)' },
  brand: { DEFAULT: '#3b82f6', hover: '#2563eb', glow: 'rgba(59,130,246,0.25)' },
  // ...
}
```

---

## 3. Typography System

We pair `IBM Plex Sans Arabic` / `Cairo` for Arabic text with `Inter` / `Segoe UI Variable` for numerals and Latin characters to ensure a native OS feel.

### Typographic Scale
| Token | Size (px/rem) | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `text-hero` | 64px / 4rem | 700 | 1.1 | Hero Section Headline |
| `text-h1` | 48px / 3rem | 600 | 1.2 | Section Headlines |
| `text-h2` | 36px / 2.25rem | 600 | 1.2 | Sub-headlines |
| `text-h3` | 24px / 1.5rem | 600 | 1.3 | Card Titles, Features |
| `text-body`| 18px / 1.125rem | 400 | 1.5 | Paragraphs, Descriptions |
| `text-small`| 14px / 0.875rem | 400 | 1.4 | Captions, Badges, Footnotes |

```css
:root {
  --font-arabic: 'IBM Plex Sans Arabic', 'Segoe UI Variable', sans-serif;
  --font-latin: 'Inter', 'Segoe UI Variable', sans-serif;
}
```

---

## 4. Fluent Materials & Elevation

To mimic Windows 11 Mica and Acrylic materials on the web, we use layered backgrounds, backdrop-filters, and specific box-shadows.

### Geometry & Radii
*   `--radius-sm: 4px;` (Tags, small chips)
*   `--radius-md: 8px;` (Buttons, Text Inputs)
*   `--radius-lg: 12px;` (Cards, Panels)
*   `--radius-xl: 16px;` (Modals, Hero containers)

### Spacing Grid
Strict adherence to an 8px base grid: `8px, 16px, 24px, 32px, 48px, 64px, 96px`.

### Elevation (Shadows)
Fluent shadows are subtle, layered, and avoid harsh edges.
```css
:root {
  --material-shadow-2: 0 2px 8px rgba(0,0,0,0.3);      /* Resting state */
  --material-shadow-4: 0 8px 16px rgba(0,0,0,0.4);     /* Hover state */
  --material-shadow-8: 0 16px 32px rgba(0,0,0,0.5);    /* Active/Floating */
  --material-shadow-glow: 0 0 20px var(--grido-brand-glow); /* Brand emphasis */
}

/* Acrylic Surfaces */
.acrylic-panel {
  background: rgba(36, 36, 36, 0.7);
  backdrop-filter: blur(30px) saturate(120%);
  border: 1px solid var(--grido-border-specular);
  border-top: 1px solid rgba(255,255,255,0.15); /* Specular highlight */
}
```

---

## 5. Core Component Library

### A. Fluent Buttons
**1. Primary Action (Accent Filled)**
*   **Style:** Background: `--grido-brand-primary`, Text: `#FFFFFF`, Radius: `--radius-md`, Padding: `14px 32px`.
*   **Hover:** Background: `--grido-brand-hover`, Box-Shadow: `--material-shadow-glow`.
*   **Active:** Transform: `scale(0.98)`, Transition: `150ms ease-out`.

**2. Secondary Action (Subtle Outline)**
*   **Style:** Background: transparent, Border: `1px solid var(--grido-border-subtle)`, Text: `--grido-text-primary`.
*   **Hover:** Background: `rgba(255,255,255,0.05)`, Border: `1px solid var(--grido-border-specular)`.

### B. Surface Cards (Acrylic Panels)
*   **Container:** `background: var(--acrylic-blur-light)`, `backdrop-filter: blur(30px)`, `border: 1px solid var(--grido-border-specular)`.
*   **Inner Top Border:** `1px solid rgba(255,255,255,0.15)` to simulate Windows 11 light reflection.
*   **Radius:** `--radius-lg`.

### C. Navigation Bar (Sticky Header)
*   **Container:** Background: `rgba(20, 20, 20, 0.85)`, Backdrop-filter: `blur(60px)`, Border-Bottom: `1px solid var(--grido-border-subtle)`.
*   **Layout (RTL):** Logo Right, Nav Links Center, CTA + Language Toggle Left.

---

## 6. Landing Page UI Architecture (Wireframe Spec)

### Section 1: The Hero (Above the Fold)
*   **Layout:** Full-viewport (100vh) split 45/55. Content Right (RTL), App Showcase Left.
*   **Background:** `--grido-workspace-canvas` with a large radial gradient of `--grido-brand-glow` at the top edge.
*   **Content:**
    *   *Badge:* "مدعوم بالذكاء الاصطناعي" (Pill shape, `--grido-ai-beam` text, transparent blue bg).
    *   *Headline:* "استوديو جريدو برو" (`--text-hero`).
    *   *Sub-headline:* Provided Tagline (`--text-h2`, secondary text).
    *   *CTA Row:* Primary "تحميل البرنامج" + Secondary "شاهد العرض التوضيحي".
*   **Showcase:** High-fidelity screenshot of the app in a Windows 11 window chrome, tilted slightly (`perspective(1000px) rotateY(-5deg)`), shadow: `--material-shadow-8`.

### Section 2: Core Capabilities (Bento Grid)
*   **Header:** Center-aligned. "كل ما تحتاجه في مكان واحد".
*   **Grid Layout:** Fluent 2 Bento style (2 rows, specific spans).
    1.  *Large (col-span-2):* AI ID/Visa Generation. (Visual: Face scanned with `--grido-ai-beam` transforming to passport sheet).
    2.  *Medium (col-span-1):* Smart Collage Maker. (Visual: Konva-based layout snapping).
    3.  *Medium (col-span-1):* Offline & Privacy First. (Visual: Padlock + Go/Wails logo, text: "بياناتك تبقى على جهازك").
    4.  *Wide (col-span-2):* Print Center Tools. (Visual: Print margins in `--grido-status-warning` with cutting guides).

### Section 3: The AI Engine Spotlight
*   **Layout:** Full-width dark panel (`--grido-surface-inset`).
*   **Visual:** Step-by-step horizontal flow (RTL).
    *   Step 1: Raw Image Upload → Step 2: AI Background Removal → Step 3: Visa Template Compositing.
*   **Colors:** Uses gradient from `--grido-accent-purple` to `--grido-brand-primary` for visual flow lines.

### Section 4: Windows 11 Native Experience
*   **Layout:** Split 50/50.
*   **Left Content:** Heading "تجربة ويندوز 11 العصرية". Checklist with `--grido-status-success` checkmarks (Mica effects, Sego UI integration, Go/Wails high performance).
*   **Right Visual:** Mockup of app's settings panel or Command Bar flying out, demonstrating Fluent design icons.

### Section 5: Target Audience Segmentation
*   **Layout:** 4 Vertical Acrylic Cards.
*   **Cards:** Studios, Print Centers, Designers, Individuals.
*   **Interaction:** On hover, lift (`translateY(-4px)`) and specular border becomes prominent.

### Section 6: Pricing & Licensing (Conversion Anchor)
*   **Layout:** Centralized card.
*   **Card Style:** `--acrylic-blur-light`, shadow: `--material-shadow-8` + outer `--material-shadow-glow`.
*   **Content:** "رخصة مدى الحياة", Price, Feature list, Full-width Primary CTA.

### Section 7: Footer
*   **Style:** Solid `--grido-surface-sidebar`, top border `1px solid var(--grido-border-subtle)`.
*   **Content:** 3 columns (Product, Support, Brand), "Made with Pride" badge.

---

## 7. Motion & Interaction Guidelines

To make the web experience feel like a native desktop app, motion must be physics-based.

1.  **Easing Functions:**
    *   Standard: `cubic-bezier(0.1, 0.9, 0.2, 1)` (Fast in, slow out).
    *   Emphasized: `cubic-bezier(0.2, 0.0, 0, 1)` (For element entrances).
2.  **Durations:**
    *   Micro-interactions (Hover, Focus): `150ms`.
    *   Element Entrance (Scroll triggered): `300ms`.
    *   Page load sequence: Staggered `50ms` delays between Hero elements fading in.
3.  **Scroll Reveal:** Bento grid cards fade in (`opacity: 0 -> 1`) and slide up slightly (`translateY(20px) -> 0`) when entering the viewport.

---

## 8. Internationalization (RTL/LTR) & Accessibility (A11y)

### A. Bidirectional (RTL/LTR) Strategy
*   **CSS Logical Properties:** The codebase MUST use `margin-inline-start`, `padding-inline-end`, and `inset-inline-start` instead of physical `right/left` properties. This ensures seamless flipping when `<html dir="ltr">` is toggled.
*   **Directional Icons:** Icons implying direction (Next/Back) must swap based on `dir` attribute.
*   **Typography Alignment:** `text-align: start;` as default.

### B. Accessibility (A11y) Standards
*   **Contrast Ratios:** Exceeds WCAG AA. (Primary text 18:1, Secondary text 7:1).
*   **Focus Rings:** Crucial for desktop-grade feel. All interactive elements require `:focus-visible` utilizing a 2px solid `--grido-brand-primary` outline with a 2px offset of `#141414` to pierce through dark backgrounds.
*   **Keyboard Navigation:** Navigation, Bento cards, and Pricing CTA must be fully operable via `Tab` and `Enter` keys.
