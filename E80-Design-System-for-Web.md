# E80 Group — Design System reference for web/HTML projects

Drop-in spec for aligning a website's CSS to the E80 Group brand system.
Everything below is self-contained: copy the token block into your project and follow the rules.

---

## 1. Brand in one paragraph

E80 Group builds automated intralogistics systems (LGVs, palletizing/robotics, smart
warehouses). The visual identity is **amber-and-black, flat and engineered**: square
corners, hairline rules, almost no shadow, real industrial photography, uppercase
letter-spaced titles. Payoff: **TRANSFORM YOUR FACTORY**.

---

## 2. Tokens — paste into your global CSS

```css
/* ---------- E80 GROUP TOKENS ---------- */
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap');

:root {
  /* Brand constants */
  --e80-black:    #2D2926;   /* Pantone Black C / RAL 7022 — titles, body, dark surfaces */
  --e80-white:    #FFFFFF;
  --e80-gray:     #666666;   /* secondary text only */
  --e80-gray-line:#E0E0E0;   /* dividers, table borders */
  --e80-gray-bg:  #F5F5F5;   /* cards, alt rows */

  /* Palette A — primary (confirmed) — warm light amber */
  --a-accent: #FFDC73;
  --a-grad-1: #FFDC73; --a-grad-2: #FDD155; --a-grad-3: #F9C233; --a-grad-4: #F0AF10;

  /* Palette B — soft "template" (internal decks / reports) */
  --b-accent: #FBAE40; --b-footer: #FFC000;
  --b-grad-1: #FFC000; --b-grad-2: #FBAE40; --b-grad-3: #E89B30; --b-grad-4: #D08820;

  /* Semantic aliases (default = Palette A) */
  --accent:        var(--a-accent);
  --accent-footer: var(--a-accent);
  --accent-grad-1: var(--a-grad-1);
  --accent-grad-2: var(--a-grad-2);
  --accent-grad-3: var(--a-grad-3);
  --accent-grad-4: var(--a-grad-4);

  --text-title:    var(--e80-black);
  --text-body:     var(--e80-black);
  --text-subtle:   var(--e80-gray);
  --text-on-dark:  var(--e80-white);
  --text-on-accent:var(--e80-black);   /* amber is light → ALWAYS dark text */

  --surface-page:  var(--e80-white);
  --surface-card:  var(--e80-gray-bg);
  --surface-dark:  var(--e80-black);
  --border-line:   var(--e80-gray-line);
  --table-header-bg: var(--e80-black);

  /* Type */
  --font-primary: "Segoe UI", "Open Sans", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  --fw-regular:400; --fw-semibold:600; --fw-bold:700; --fw-black:800;
  --lh-tight:1.1; --lh-snug:1.25; --lh-body:1.35;
  --ls-cover:0.06em; --ls-title:0.04em; --ls-footer:0.22em; --ls-eyebrow:0.14em;

  /* Spacing */
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px;
  --sp-5:24px; --sp-6:32px; --sp-7:48px; --sp-8:64px;

  /* Shape */
  --radius-0:0px; --radius-sm:2px; --radius-pill:999px;
  --border-hair: 1px solid var(--border-line);
  --shadow-none:none;
  --shadow-card: 0 1px 3px rgba(45,41,38,.10);
  --shadow-float:0 6px 24px rgba(45,41,38,.16);
  --overlay-dark: rgba(45,41,38,.40);   /* over photography */
}

/* Switch any subtree to the soft internal palette */
[data-palette="template"] {
  --accent: var(--b-accent);
  --accent-footer: var(--b-footer);
  --accent-grad-1: var(--b-grad-1);
  --accent-grad-2: var(--b-grad-2);
  --accent-grad-3: var(--b-grad-3);
  --accent-grad-4: var(--b-grad-4);
}
```

---

## 3. Color rules

| Use | Token |
|---|---|
| Page background | `--surface-page` (flat white; mostly white sites) |
| Emphasis / executive sections | `--surface-dark` (solid black, **never** a gradient) |
| Accent bars, rules, icons, KPI numbers, active states | `--accent` |
| Card surface | `--surface-card` with a **4px `--accent` top rule** |
| Dividers, table rules | `--border-line` (hairline 1px) |
| Text on amber | `--e80-black` — amber is a light tint, white text fails contrast |

Hard rules
- Two brand colors only: amber + black (+ white and the gray ramp). No red/violet/blue/green.
- Max 1–2 background colors per page.
- No aggressive gradients. The 4-step amber gradient tokens are for **process-flow blocks only**.
- Photography always gets the `--overlay-dark` scrim so white text and the logo stay legible.

---

## 4. Typography

Family: **Segoe UI**, falling back to **Open Sans** (Windows-only font; Open Sans is the
shipped cross-platform match). Montserrat, Arial, Calibri, Inter, Roboto are forbidden.

Deck scale (1280×720 canvas) → web-page equivalents:

| Role | Deck px | Suggested web | Style |
|---|---|---|---|
| Hero / cover title | 52 | `clamp(40px, 6vw, 72px)` | 800, UPPERCASE, `--ls-cover` |
| Section / page title | 30 | `clamp(28px, 3.4vw, 40px)` | 700, UPPERCASE, `--ls-title` |
| KPI number | 64 | `clamp(44px, 5vw, 64px)` | 700, `--accent`, `--lh-tight` |
| Pull quote | 28 | 24–28px | 400 *italic* |
| Card heading | 17 | 18–20px | 700 |
| Body | 18 | 16–18px | 400, `--lh-body`, left-aligned |
| Subtitle | 17 | 17px | 400, `--text-subtle` |
| Caption / source | 14 | 13–14px | 400, `--text-subtle` |
| Footer payoff / eyebrow | 13 | 12–13px | 700, UPPERCASE, `--ls-footer` / `--ls-eyebrow` |

Signature move: **uppercase + positive tracking** on titles, eyebrows and the payoff.
Body copy stays sentence case. Never letter-space body text.

---

## 5. Layout & shape language

- Side margins: 64px on a 1280 canvas → use a max-width container (~1152px) with 64px gutters, 24px on mobile.
- Spacing: use the `--sp-*` scale only; lay sibling groups out with flex/grid + `gap`.
- **Square corners.** `--radius-0` everywhere; `--radius-sm` only for incidental UI chrome; `--radius-pill` only for status pills.
- Shadows near-absent. Prefer hairline borders and flat gray surfaces over elevation.
- Tables: black header row (`--table-header-bg`, white text), hairline `--border-line` rules, alternating `--e80-gray-bg` rows.
- Standard page chrome: short vertical amber accent bar (9px wide) beside an uppercase title; logo locked top-right; full-width amber footer band with the payoff.

Card pattern:

```css
.e80-card{background:var(--surface-card);border-top:4px solid var(--accent);border-radius:0;box-shadow:none;padding:var(--sp-5)}
```

Links (define these — never leave browser-default blue):

```css
a{color:var(--e80-black);text-decoration:underline;text-decoration-color:var(--accent);text-underline-offset:3px}
a:hover{color:var(--accent-grad-4)}
```

Buttons:

```css
.e80-btn{background:var(--e80-black);color:var(--text-on-dark);border:0;border-radius:0;padding:var(--sp-3) var(--sp-5);font:var(--fw-bold) 14px/1 var(--font-primary);letter-spacing:var(--ls-eyebrow);text-transform:uppercase;cursor:pointer}
.e80-btn:hover{background:var(--accent-grad-4);color:var(--e80-black)}
.e80-btn--accent{background:var(--accent);color:var(--text-on-accent)}
```

---

## 6. Iconography & imagery

- **Lucide** (`unpkg.com/lucide`) monoline icons, ~1.6 stroke, no fill, tinted `var(--accent)`; optionally inside a thin amber circle. Icons in use: `truck`, `bot`, `boxes`, `shield-check`, `line-chart`, `leaf`, `layout-grid`.
- **No emoji. No multicolor or filled icon sets.**
- Imagery: real photography of plants, LGVs, the Viano valley — natural, slightly cool daylight, no heavy filters/grain. Always with the dark overlay when text sits on top.
- Logo files in this system: `assets/e80-logo-dark.png` (on light), `assets/e80-logo-white.png` (on dark/photo).

---

## 7. Voice & content

- Language: English throughout the interface, system messages and documentation. Preserve original source names, codes and quotations.
- Impersonal, factual third person ("Il progetto prevede…", "Si evidenzia…"). No "I", no "tu".
- Concise: bullets over paragraphs, one idea per line. Action-oriented — surface risks, decisions, next steps.
- Uppercase titles and payoff; sentence case body.
- English number convention: `5,000+`, `2,000+`.
- Nothing invented: state gaps explicitly ("TBD", "Missing information").
- Motion: restrained quick fades only — no bounces, no entrance animations on core content.

---

## 8. Quick checklist before shipping a page

- [ ] Only amber + black + white + gray ramp used
- [ ] Segoe UI / Open Sans stack, no other face
- [ ] Titles uppercase + tracked; body sentence case, untracked
- [ ] Square corners, hairline borders, no drop shadows
- [ ] Dark text on every amber surface
- [ ] Photos carry the 40% dark overlay
- [ ] `a` / `a:hover` colors defined
- [ ] No emoji, no filled/multicolor icons
- [ ] Payoff "TRANSFORM YOUR FACTORY" present where the page has a footer band
