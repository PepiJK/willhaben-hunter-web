---
description: Alpine Telemetry Lab visual design system, Tailwind CSS v4 tokens, typography, and layout rules for the Willhaben Hunter Web Angular frontend.
---

# Willhaben Hunter Web — Frontend Design (`Alpine Telemetry Lab`)

The Willhaben Hunter Web Angular 22 SPA (`frontend/`) uses **Tailwind CSS v4** (`@import 'tailwindcss'` in `frontend/src/styles.css`) and shares the **Alpine Telemetry Lab** visual identity established by [`garmin-monitor`](../../garmin-monitor/frontend/DESIGN.md). It avoids generic e-commerce or AI SaaS clichés in favor of high-contrast night-telemetry instrumentation: crisp hairline borders, tabular monospace readouts for prices, fit scores, counts, and durations, and semantic status pills.

**Sources:** `frontend/src/styles.css` (`@import 'tailwindcss'`, `:root { color-scheme: dark; }`, `body` font stack and `#0b1120` background, sticky `table thead` / `th`), `frontend/src/index.html` (`class="dark"`, `bg-[#0b1120] text-slate-100`), and `frontend/.postcssrc.json` (`@tailwindcss/postcss`).

## Colors

| Purpose                                                                     | Utility Classes                                                         | Hex                   |
| :-------------------------------------------------------------------------- | :---------------------------------------------------------------------- | :-------------------- |
| Page background (**Obsidian Slate**)                                        | `body` background in `src/styles.css`, `bg-slate-950`                   | `#0B1120` / `#020617` |
| Elevated surfaces (**Instrument Surface**)                                  | `bg-slate-900`, `bg-slate-900/95`                                       | `#0F172A`             |
| Sticky table headers (Results Ledger)                                       | `bg-slate-950`                                                          | `#020617`             |
| Primary text (**Crisp Telemetry Ink**)                                      | `text-slate-100`, `text-white`                                          | `#F8FAFC`             |
| Secondary text & field labels (**Muted Mineral**)                           | `text-slate-400`, `text-slate-300`                                      | `#94A3B8` / `#CBD5E1` |
| Brand, primary actions & `good-alternative` (**Cobalt Pace**)               | `bg-sky-500`, `text-sky-400`, `border-sky-500/40`                       | `#38BDF8` / `#0EA5E9` |
| Neutral hairline borders                                                    | `border-slate-800`                                                      | `#1E293B`             |
| Positive status & `top-pick` verdict (**Alpine Pine**)                      | `bg-teal-400`, `text-teal-400`, `bg-emerald-500/15`, `text-emerald-300` | `#2DD4BF`             |
| Active scrape / `caution` verdict / truncation notice (**Amber Threshold**) | `bg-amber-400`, `text-amber-300`, `border-amber-500/40`                 | `#FBBF24`             |
| Errors / failed or timed-out jobs (**Crimson Alert**)                       | `bg-red-400`, `text-red-300`, `border-red-500/50`                       | `#F87171`             |

## Typography

- **Primary Sans (`Inter` / system geometric sans)**: Declared on `body` in `frontend/src/styles.css` for form labels, listing titles, descriptions, and AI justifications.
- **Tabular Figures (`font-mono tabular-nums` / `JetBrains Mono`)**: Used strictly for numeric telemetry readouts:
  - Listing prices (`€ 6.600`, `€ 8`) and price filter inputs (`priceMin`, `priceMax`)
  - Item counts, limit inputs (`25`, `100`, `250`), and scrape duration (`18,4 s`)
  - AI recommendation `rank` (`#1`), `fitScore` (`92/100`), `truncatedFields`, and `droppedRecommendations`
  - Listing IDs (`932558165`) and Vienna district numbers (`1`–`23`)
- **Rules**:
  - Sentence case for all section headings, labels, and table headers (never tracked-out ALL-CAPS eyebrows).
  - Direct action verbs (`Start scrape`, `Import JSON`, `Clear session`, `Analyze with Haiku 5.5`, `Download JSON`, `Download CSV`).

## Layout Architecture

```text
+-----------------------------------------------------------------------+
| Willhaben Hunter [Marktplatz]  [Ready | Scraping…] [Import] [Clear]   |
+-----------------------------------------------------------------------+
| Marktplatz Search Panel (Query, Price, Sort, Bundesländer, Districts) |
+-----------------------------------------------------------------------+
| Telemetry KPI Strip (Listings | Query & URL | Duration/Source | AI)   |
+-----------------------------------------------------------------------+
| Claude Haiku 5.5 Analyzer Panel (Presets, Prompt, Summary & Picks)    |
+-----------------------------------------------------------------------+
| Results Ledger Table (Filter, JSON/CSV Export, Sticky Header, Rows)   |
+-----------------------------------------------------------------------+
```

## Spacing, radius, borders

- **Page container:** `mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6`.
- **Primary panels & cards:** `rounded-xl border border-slate-800 bg-slate-900 p-5` (KPI cards `p-4`; dialog max width `max-w-2xl`).
- **Inner inputs, buttons & sub-cards:** `rounded-lg border border-slate-700 bg-slate-950`; filter/preset pills use `rounded-full`; Vienna district toggles use `rounded`.

## Breakpoints

- Uses Tailwind CSS v4 default responsive prefixes as observed in components: `sm:` (`640px`, 2-column KPI grid, inline analyzer submit), `md:` (`768px`, 12-column search filter grid), and `lg:` (`1024px`, 4-column KPI grid, 2-column AI recommendation cards).

## Component & Accessibility Invariants

- **Container Spacing**: `mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6`.
- **Structural Hairline Borders**: `border border-slate-800 rounded-xl bg-slate-900` for primary instrument panels.
- **Sticky Table Headers (`StickyTableHeaderDirective`)**: `thead[appStickyHeader]` constrains the results ledger scroll container height to the viewport and pins `bg-slate-950` column headers.
- **Strict Link Safety (`SafeWillhabenUrlPipe`)**: Only URLs starting with `https://www.willhaben.at/` are rendered as clickable `<a target="_blank" rel="noopener noreferrer">` anchors.
- **Angular Component Standards**: Every component sets `changeDetection: ChangeDetectionStrategy.OnPush` and `host: { class: 'block' }`. Interactive chip groups, dialogs, and status banners include explicit ARIA attributes (`aria-pressed`, `aria-label`, `role="status"`, `role="dialog"`).

## Rules

- Preserve the Tailwind CSS v4 dark slate token palette and avoid introducing uncoordinated light themes or parallel hex palettes.
- Keep status colors (`teal-400`, `sky-500`/`sky-400`, `amber-400`, `red-400`) tied strictly to status/verdict meaning.
- Use `font-mono tabular-nums` exclusively on numeric telemetry readouts (prices, limits, counts, durations, fit scores, IDs, district numbers).
