# NutriPanda Design System

Shared design reference for both the customer-facing site (`nutri-panda`) and the admin dashboard (`nutri-panda-dashboard`). Both projects must follow this spec to maintain visual consistency.

---

## Colors

### Brand

| Name       | Hex       | Tailwind Token       | Usage                              |
|------------|-----------|----------------------|------------------------------------|
| Green      | `#12BC00` | `brand-green`        | Primary CTA, success states, logo  |
| Black      | `#000000` | `brand-black`        | Headings, primary text             |
| White      | `#FFFFFF` | `brand-white`        | Backgrounds, inverted text         |

### Product Colors

Used for product-specific accents, badges, and chart visualizations in the dashboard.

| Name   | Hex       | Tailwind Token     | Product           |
|--------|-----------|--------------------|-------------------|
| Orange | `#FF7731` | `product-orange`   | Immunity Support  |
| Green  | `#12BC00` | `product-green`    | Daily Vitality    |
| Purple | `#9231FF` | `product-purple`   | Upcoming          |
| Yellow | `#FFC731` | `product-yellow`   | Upcoming          |
| Pink   | `#F995FF` | `product-pink`     | Upcoming          |
| Blue   | `#70A9FF` | `product-blue`     | Upcoming          |

### Accent

| Name        | Hex       | Tailwind Token       | Usage                        |
|-------------|-----------|----------------------|------------------------------|
| Light Green | `#DCFDCC` | `accent-light-green` | Subtle highlights, tag bg    |

### Semantic (Dashboard-specific)

| Name    | Hex       | Usage                                |
|---------|-----------|--------------------------------------|
| Success | `#12BC00` | Paid badges, stock OK, confirmations |
| Warning | `#FFC731` | Low stock, pending states            |
| Danger  | `#EF4444` | Failed payments, errors, delete      |
| Info    | `#70A9FF` | Informational badges, links          |

### Neutral Scale

Used for backgrounds, borders, and secondary text across both projects.

```
50:  #F9FAFB
100: #F3F4F6
200: #E5E7EB
300: #D1D5DB
400: #9CA3AF
500: #6B7280
600: #4B5563
700: #374151
800: #1F2937
900: #111827
950: #030712
```

These map to Tailwind's default `gray-*` scale.

---

## Typography

### Fonts

| Role    | Font Family  | Weight(s) | File                              |
|---------|-------------|-----------|-----------------------------------|
| Heading | Uneko Bold  | 700       | `/public/fonts/Uneko Bold Demo Regular.otf` |
| Body    | Avenir      | 100–900   | `/public/fonts/Avenir Font.ttc`   |

Both font files must be present in each project's `/public/fonts/` directory.

### @font-face Setup

```css
@font-face {
  font-family: "Uneko Bold";
  src: url("/fonts/Uneko Bold Demo Regular.otf") format("opentype");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Avenir";
  src: url("/fonts/Avenir Font.ttc") format("collection");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```

### Tailwind Theme Tokens

```css
--font-heading: "Uneko Bold", sans-serif;
--font-body: "Avenir", sans-serif;
```

### Application

```css
body {
  font-family: var(--font-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}
```

### Scale

| Element        | Size (Tailwind)           | Weight     |
|----------------|---------------------------|------------|
| Page title     | `text-3xl` / `sm:text-4xl`| `font-bold`|
| Section heading| `text-2xl` / `sm:text-3xl`| `font-bold`|
| Card heading   | `text-lg`                 | `font-bold`|
| Body text      | `text-base`               | normal     |
| Small / helper | `text-sm`                 | normal     |
| Badge / label  | `text-xs`                 | `font-semibold` |

---

## Tailwind CSS v4 Theme Block

Copy this into `globals.css` in both projects:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);

  /* Brand */
  --color-brand-green: #12BC00;
  --color-brand-black: #000000;
  --color-brand-white: #FFFFFF;

  /* Product colors */
  --color-product-orange: #FF7731;
  --color-product-green: #12BC00;
  --color-product-purple: #9231FF;
  --color-product-yellow: #FFC731;
  --color-product-pink: #F995FF;
  --color-product-blue: #70A9FF;

  /* Accent */
  --color-accent-light-green: #DCFDCC;

  /* Fonts */
  --font-heading: "Uneko Bold", sans-serif;
  --font-body: "Avenir", sans-serif;
}
```

---

## Spacing & Layout

### Containers

- Max width: `max-w-7xl` (1280px) for full-width sections
- Content max: `max-w-3xl` (768px) for text-heavy content
- Horizontal padding: `px-4 sm:px-6 lg:px-8`

### Section Spacing

- Vertical padding: `py-16 md:py-24` for major sections
- Between elements: `space-y-6` or `gap-6` typical
- Cards grid gap: `gap-6`

### Dashboard Sidebar

- Sidebar width: `w-64` (256px) on desktop, collapsible on mobile
- Main content area: remaining width with `px-6 py-8`

---

## Border Radius

| Element         | Radius          |
|-----------------|-----------------|
| Buttons         | `rounded-full` (pill) for primary, `rounded-xl` for secondary |
| Cards           | `rounded-2xl`   |
| Inputs          | `rounded-xl`    |
| Badges          | `rounded-full`  |
| Modals/Drawers  | `rounded-2xl`   |
| Sidebar items   | `rounded-lg`    |

---

## Shadows

| Usage           | Shadow              |
|-----------------|----------------------|
| Cards (hover)   | `hover:shadow-md`    |
| Dropdowns       | `shadow-lg`          |
| Modals          | `shadow-xl`          |
| Default cards   | none (border only)   |

---

## Component Patterns

### Buttons

**Primary (green):**
```
bg-brand-green text-white rounded-full px-8 py-3 text-sm font-semibold
hover:opacity-90 transition-opacity
disabled:opacity-50
```

**Secondary (outline):**
```
border border-gray-300 text-gray-700 rounded-full px-6 py-2 text-sm font-medium
hover:border-gray-900 hover:text-gray-900 transition-colors
```

**Danger:**
```
bg-red-500 text-white rounded-full px-6 py-2 text-sm font-semibold
hover:bg-red-600 transition-colors
```

**Ghost:**
```
text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors
```

### Inputs

```
rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900
placeholder:text-gray-400
focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green
```

### Badges

**Status badges (dashboard):**
```
inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold

Paid:       bg-green-100 text-green-800
Pending:    bg-yellow-100 text-yellow-800
Failed:     bg-red-100 text-red-800
Refunded:   bg-gray-100 text-gray-800

Confirmed:  bg-blue-100 text-blue-800
Processing: bg-yellow-100 text-yellow-800
Shipped:    bg-purple-100 text-purple-800
Delivered:  bg-green-100 text-green-800
Cancelled:  bg-red-100 text-red-800
```

**Product badges:**
```
Color-coded using product-* colors with 10% opacity background.
```

### Cards

```
rounded-2xl border border-gray-200 bg-white p-6
hover:shadow-md transition-shadow (if interactive)
```

### Tables (Dashboard)

```
Table:    w-full text-sm text-left
Header:   bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3
Row:      border-b border-gray-100 px-4 py-3.5 hover:bg-gray-50 transition-colors
```

---

## Iconography

Both projects use **Lucide React** (`lucide-react`).

- Default size: `h-5 w-5` for inline, `h-6 w-6` for prominent
- Stroke width: default (2)
- Color: inherit from parent text color

---

## Interaction States

| State    | Treatment                          |
|----------|------------------------------------|
| Hover    | `opacity-90` for filled buttons, `hover:bg-gray-50` for rows |
| Focus    | `focus:ring-1 focus:ring-brand-green focus:border-brand-green` |
| Disabled | `opacity-50 cursor-not-allowed`    |
| Loading  | Spinner (animate-spin) replacing content or inline |
| Active   | `bg-brand-green/10 text-brand-green` for sidebar nav |

---

## Dashboard-Specific Patterns

### Sidebar Navigation

```
- Width: w-64, bg-white, border-r border-gray-200
- Logo area: p-6, NutriPanda branding (heading font)
- Nav items: px-3 py-2 rounded-lg text-sm font-medium text-gray-600
- Active item: bg-brand-green/10 text-brand-green font-semibold
- Hover: hover:bg-gray-100
- Icons: h-5 w-5 mr-3
```

### Page Header

```
- Title: text-2xl font-bold text-gray-900 (heading font)
- Description: text-sm text-gray-500 mt-1
- Actions: flex gap-3, aligned right
```

### Stat Cards

```
- rounded-2xl border border-gray-200 bg-white p-6
- Label: text-sm text-gray-500
- Value: text-2xl font-bold text-gray-900 mt-1 (heading font)
- Trend: text-xs text-green-600 or text-red-600
```

### Empty States

```
- Centered, py-12
- Icon: h-12 w-12 text-gray-300 mx-auto
- Title: text-lg font-semibold text-gray-900 mt-4
- Description: text-sm text-gray-500 mt-1
- CTA button (optional)
```

---

## Responsive Breakpoints

| Name    | Min Width | Usage                    |
|---------|-----------|--------------------------|
| Mobile  | 0px       | Single column, stacked   |
| sm      | 640px     | Two columns, larger text |
| md      | 768px     | Tablet adjustments       |
| lg      | 1024px    | Sidebar visible, grids   |
| xl      | 1280px    | Max-width containers     |

**Customer site:** Mobile-first (70%+ mobile traffic).
**Dashboard:** Desktop-first (admin uses computer), but sidebar collapses on mobile.

---

## API Integration

The dashboard communicates with the main NutriPanda site's API routes:

```
Base URL: process.env.NEXT_PUBLIC_API_URL (e.g., https://nutripanda.com or http://localhost:3000)

Auth:
  POST   /api/admin/auth          — Login (password)
  GET    /api/admin/auth          — Check session
  DELETE /api/admin/auth          — Logout

Products:
  GET    /api/admin/products      — List all
  POST   /api/admin/products      — Create
  GET    /api/admin/products/:id  — Get one
  PUT    /api/admin/products/:id  — Update
  DELETE /api/admin/products/:id  — Soft delete

Orders:
  GET    /api/admin/orders        — List (pagination, filters, search)
  GET    /api/admin/orders/:id    — Get one
  PUT    /api/admin/orders/:id    — Update status

Inventory:
  GET    /api/admin/inventory     — Overview + log
  POST   /api/admin/inventory     — Stock adjustment
```

All admin routes require cookie-based auth and return CORS headers.

---

## Environment Variables (Dashboard)

```env
NEXT_PUBLIC_API_URL=         # Main NutriPanda site URL (API base)
```

---

*This document is the single source of truth for visual consistency across both NutriPanda projects.*
