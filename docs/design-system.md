# Design System

How Kinetex LiveOps looks, and why. The goal was the calm, editorial quality of a
well-made Notion template rather than a dark operations dashboard.

## 1. Research inputs

The conventions below are drawn from how popular Notion templates are built, in
particular the aesthetic guidance in Thomas Frank's [17 Tips for Building Your
Perfect Notion Aesthetic](https://thomasjfrank.com/17-tips-for-building-your-perfect-notion-aesthetic/)
and the [LifeOS](https://www.notion.com/templates/life-os-all-in-one-aesthetic-dashboard)
style all-in-one dashboards, plus Anthropic's published brand palette
([Crail `#C15F3C`, Pampas `#F4F3EE`, Cloudy](https://mobbin.com/colors/brand/claude)).

What those systems do, and what we copied:

| Template convention | Where it is applied here |
|---|---|
| One coordinated icon per section, never mixed families | `components/icons.tsx` (web), one emoji per database (Notion) |
| Serif option for page titles, large display type | Fraunces for `h1`/`h2`, `--text-display` / `--text-hero` |
| Callouts with a subtle outline instead of a loud fill | `Callout` uses a tinted border and soft background |
| Dividers between sections to create rhythm | `border-b border-line` rows; dividers between Notion sections |
| Toggles to hide detail that would clutter | Notion detail lives in a toggle block; web uses progressive detail |
| Cover image and page icon | Notion page icon `🎪` plus a cover image |
| Colour-coordinated databases, not rainbow | Six muted accent hues, one per entity or role |
| Generous whitespace, few hard lines | 8px spacing rhythm, section gaps step by φ |
| Nav as cards, not just links | Role picker is a grid of 5 cards with icons and counts |

## 2. Palette

| Token | Hex | Use |
|---|---|---|
| `paper` | `#FAF8F4` | Page background (warm, not white) |
| `paper-deep` | `#F3F0E9` | Inset surfaces, hover states |
| `surface` | `#FFFFFF` | Cards |
| `surface-sunk` | `#FBFAF7` | Nested panels inside cards |
| `ink` | `#1E1C19` | Primary text (near-black, warm) |
| `ink-soft` | `#46433D` | Secondary text |
| `muted` | `#6E6A61` | Body copy on cards |
| `faint` | `#9B958A` | Metadata, labels |
| `line` / `line-strong` | `#E8E3D9` / `#D7D1C3` | Hairlines and borders |
| `accent` | `#C15F3C` | Primary action, focus, active nav (Anthropic Crail) |
| `moss` | `#5C7350` | Success, completion |
| `ochre` | `#A97C26` | Warning |
| `clay` | `#A8402F` | Blocking |
| `slate` | `#4A6A80` | Informational |
| `plum` | `#7B5A72` | Change records |

Contrast: `ink` on `paper` is ~15:1, `muted` on `surface` ~5.6:1, white on
`accent` ~4.6:1. All meet WCAG AA for their use.

## 3. Typography

- **Display**: Fraunces (variable serif) for `h1`, `h2`, and metric values. This
  is what gives the pages their template feel rather than a product-dashboard feel.
- **UI**: Inter, with `cv11` and `ss01` feature settings for a cleaner `a` and `l`.
- **Scale** (golden ratio, φ ≈ 1.618, off a 16px base):

| Token | Size | Use |
|---|---|---|
| `--text-display` | 3.25rem | Dashboard hero title |
| `--text-hero` | 2.2rem | Page titles |
| `--text-title` | 1.5rem | Section headings, stat values |
| `--text-lead` | 1.0625rem | Lead paragraphs |
| base / `sm` / `xs` | 1 / 0.875 / 0.75rem | Body, UI, metadata |

Numbers use `tabular-nums` wherever they align in a column.

## 4. Space, shape, elevation

- Base rhythm 8px; card padding 24px (`p-6`); section gaps 40px (`space-y-10`).
- Radii: cards `1rem`, feature panels `1.375rem`, controls `0.5rem`, pills full.
- Two shadows only: `--shadow-card` (resting) and `--shadow-lift` (hover, hero).
  The hero uses `lift` so it reads as the page's anchor.
- Texture instead of images: `.paper-texture` (two soft radial glows) and
  `.hero-art` (four-layer warm gradient) plus `.hero-grid` (a masked 36px grid).
  No external image requests, so nothing can break offline or in CI.

## 5. Components

`components/ui.tsx` is the whole vocabulary: `Card`, `CardBody`, `SectionTitle`,
`Chip`, `Callout`, `Stat`, `Meter`, `Avatar`, `IconTile`, `Steps`, `Empty`,
`PageHeader`, plus `toneFor`, `severityTone`, and `severityIcon`.

Rules the components enforce:

- Colour always carries meaning: `clay` is blocking, `ochre` is warning, `slate`
  is informational, `moss` is done, `plum` is a change record, `accent` is the
  primary action or the active state.
- Avatars and chips get a deterministic hue from their id (`toneFor`), so the
  same venue or role keeps the same colour on every page.
- `Steps` shows where a user is in the change flow: Request, Preview, Approve.

## 6. Where it is applied

| Surface | Treatment |
|---|---|
| Dashboard | Gradient hero with cover art, status chips, completion meter, run-of-show timeline with capacity meters, role-coloured task list, change log cards |
| Change console | Sticky request panel with a 3-step indicator, then generated summary, blast radius grid, severity-coded conflicts, follow-up cards with candidate proposals |
| Role briefings | Five role cards with icons and open counts, blocker callout, task list, recent changes |
| Report | Metric tiles, method callout, numbered lesson cards in two columns, linked source records |
| Notion page | Icon and cover, eight icons in a consistent language, workflow list, workspace map, roles, two callouts, detail toggle |

## 7. Non-claims

The design does not imply capabilities the build lacks. "Generated" is always
labeled with its generator; role views say they are filtered, not access
controlled; the report says out loud that it is rules-based and claims no
measured improvement.
