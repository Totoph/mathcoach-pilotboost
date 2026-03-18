# MathCoach — Frontend Design System

> Stitch project: `projects/2851247407943938863`

---

## Design Principles

- **Glass-morphism bento grid** — every card is `bg-white/80 backdrop-blur-sm rounded-3xl border border-white/60 shadow-bento`
- **Light slate canvas** — background is always `#F8FAFC`, cards float on top
- **Inter font** — weights 300–800 from Google Fonts
- **Minimal motion** — `animate-fade-in-up` (0.5s), `animate-float` (3s), `animate-shake-x` (0.18s)

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#3B82F6` | Buttons, links, progress bars, active states |
| `primary-light` | `#DBEAFE` | Badge backgrounds, chip fills |
| `secondary` | `#F97316` | Streak, warnings, secondary accents |
| `accent-purple` | `#8B5CF6` | Multiplication skill, speed mode |
| `accent-green` | `#10B981` | Correct answers, time stats |
| `accent-pink` | `#EC4899` | Decorative only |
| `background` | `#F8FAFC` | Page background |
| `foreground` | `#0F172A` | Body text |
| `slate-900` | `#0F172A` | Active nav pill, dark mode cards, submit buttons |
| `slate-400/500` | — | Secondary text, placeholders, labels |

Skill color mapping:

| Skill | Color |
|---|---|
| addition | `bg-blue-500` |
| subtraction | `bg-cyan-500` |
| multiplication | `bg-violet-500` |
| division | `bg-indigo-500` |
| tables_1_20 | `bg-amber-500` |
| fast_multiplication | `bg-orange-500` |
| chain | `bg-lime-600` |
| advanced | `bg-red-600` |

---

## Component Library

### `bento-card`
```css
bg-white/80 backdrop-blur-sm rounded-3xl border border-white/60
shadow-[0_1px_3px_rgba(0,0,0,0.04),_0_1px_2px_rgba(0,0,0,0.02)]
hover:shadow-[0_10px_40px_rgba(0,0,0,0.06),_0_2px_8px_rgba(0,0,0,0.04)]
hover:border-slate-200/80 transition-all duration-300
```

### `btn-gradient`
```css
px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white
rounded-2xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all
```

### `btn-primary`
```css
px-6 py-3 bg-primary text-white rounded-2xl font-semibold
hover:bg-blue-600 hover:shadow-lg transition-all
```

### Inputs
```css
w-full px-4 py-2.5 rounded-xl bg-slate-50/80 border border-slate-100
focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10
text-sm transition-all
```

### Gradient mode cards (dashboard)
```css
bento-card bg-gradient-to-br from-{color} to-{color} border-0
hover:scale-[1.02] active:scale-[0.98] transition-all
```

---

## Navigation — `FloatingMenuBar`

Fixed, top-5, centered via `left-1/2 -translate-x-1/2 z-50`.

```
bg-white/60 backdrop-blur-2xl rounded-2xl border border-white/80
shadow-[0_8px_32px_rgba(0,0,0,0.08)] px-2 py-2
```

Items: Home `/`, Dashboard `/dashboard`, Train `/train`, Profile `/profile`
Active item: `bg-slate-900 text-white shadow-md rounded-xl`
Inactive item: `text-slate-500 hover:text-slate-800 hover:bg-white/80 rounded-xl`
Language switcher (FR/EN) appended at the right.

---

## Screens

### 1. Home — `/`

![Home](https://lh3.googleusercontent.com/aida/ADBb0ug5vQkAKglGk1v73uYzCba6Jy_G_l9rLu3BT-RTMjPAWcFwTUJ8PEo9buBXdGzmYmkx1l4qPj8P7dm20ZZKys849vfiexkGlWDnm3u4Qh1U2h4-VBP03B4glk_uRr54UKnJvFOrdAQodV4WFhuSJr5Hju2Ii8wzj0n3T-hovgfqQFw7XsEZb5VRSPwCf580sivY53fvYFWvJVw2oduksfnopgERj6Ytll_Di2KeWxICR4CAH6I_SDnaTg)

**Layout** (`flex flex-col gap-3`, fills viewport height on desktop):

1. **Hero bento-card** (`flex-1`, centered content)
   - Badge: `bg-primary/10 text-primary rounded-full` + Sparkles icon + `t("home_badge")`
   - H1 extrabold: line 1 slate-900, line 2 `text-primary`
   - Subtitle: `text-base text-slate-500 max-w-lg`
   - CTAs: `btn-gradient` + outline secondary button

2. **Feature grid** (`grid grid-cols-2 sm:grid-cols-4 gap-3`)
   - Each: `bento-card p-4`, icon in colored rounded-xl, title bold sm, description xs slate-500
   - Brain → blue-50/blue-600 | Target → purple-50/purple-600 | Timer → green-50/green-600 | Trophy → orange-50/orange-600

3. **CTA banner** (`bento-card bg-gradient-to-r from-primary to-blue-600 border-0`)
   - White H2 + blue-100 subtitle + white button

4. **Footer**: `text-center text-slate-400 text-xs`

---

### 2. Auth — `/auth`

![Auth](https://lh3.googleusercontent.com/aida/ADBb0uiEXFBA-ApI58TbwYKSIRXEpLV5mgO-tZkhh2LVer6XC3Nmuy9VW87v-jSGzMf2l-zBXzyvfGMVeTL4__tYvsUQJBbTMNmtMiq7-JNvlL2Qdwu2bFS-GPt87uFHRCd1lTIlWd5wRe_oNPievPEdGuiRJb5joVEc_vINItiKxdUiO7YbVh-8IXFZRGYivbFtFqIwurhkYoFdoJf5Nhk93x7OWZ7wUeu5PWehhX5OEyKs4SO2QZOiCOp4uw)

**Layout**: `min-h-[calc(100vh-8rem)] flex items-center justify-center`

1. **Back link**: inline `bento-card p-3` with ArrowLeft icon
2. **Main card** (`bento-card p-8 max-w-md`):
   - **Tab toggle**: `bg-slate-100 rounded-xl p-1` — active tab = `bg-white shadow-sm text-slate-900`
   - **Google button**: white, `border-slate-200`, multicolor Google SVG logo
   - **Divider**: `h-px bg-slate-200` + `text-xs text-slate-400`
   - **Inputs**: standard input style above
   - **Submit**: `bg-slate-900 text-white rounded-xl` (not blue — intentional dark button)

State: login (default) ↔ signup — same card, tabs swap form content.

---

### 3. Dashboard — `/dashboard`

![Dashboard](https://lh3.googleusercontent.com/aida/ADBb0ujUJO-o9kCFS-8Y6i8duW4p4fVhMb5DQhpuq8asT7FbKhQMooLR7Sxgz6BsdZd9cNtGvWpdp_iJXi6VIm8YmrrmJM1_EjysEzI9Gb8d_Rk6SecpM0MNXwIGq2C2B7Uc_X7FXpPH9_pE8G_WLLVcsHbNCuDHbQ3U239gN3XpkpaTFrUWH1Scw42lMx_vm56_OF9V3ZYxtjHpvaRFD6qAkCXCqtEYJWbmcLEMY1Ov65VLinBpi7JOsWEB7NI)

**Layout** (`space-y-4`):

| Row | Cols | Content |
|---|---|---|
| 1 | 3 (2+1) | Welcome card + Level card (blue gradient, Trophy, giant number/100) |
| 2 | 4 | Stat cards: Zap/blue, Clock/green, TrendingUp/orange, Timer/purple |
| 3 | 1 | Skills grid (2 inner cols): colored progress bars + score |
| 4 | 1 | SVG line chart — daily score history (blue line + gradient fill) |
| 5 | 1 | Weaknesses pills (orange-50, orange-700) — conditional |
| 6 | 4 | Mode cards (gradient bg, white text): Libre, Tables, Vitesse, Techniques |

**Level card**: `bg-gradient-to-br from-primary to-blue-600 border-0 rounded-3xl`. Two absolute decorative circles `bg-white/10`. Trophy icon + giant score + `/100 · {levelLabel}`.

**Skill bars**: `h-3 bg-slate-100 rounded-full` track, colored fill, `transition-all duration-700`. Status icons: ⚡ automated (green), ⏸ plateau (orange).

**Score chart**: pure SVG, `viewBox="0 0 600 120"`, blue stroke `#3b82f6`, gradient area fill, slate grid lines, date labels on x-axis.

---

### 4. Training Interface — `/train`

![Training](https://lh3.googleusercontent.com/aida/ADBb0uhOwCuwfRcFDsy0-EFaudDdi4EyCYCxGE9gtp98XpA_RFCOJVejHe1ag7IGAsX6DTbMIBW_nIxYd1TomfZ4lNmsrcVZLJxXlob-5BbJnZAwbRQn5z2yi4FTA5sI3EeodS26H1ZN4m1BNPYjWpteFw576bWD-d9zabF8wY_9guM-HHmqRzeSsZTEbV1uC04V6sX7UrkfmIbEr3j6su1fACgV1YL-JwJ_b653_AkwBV0Y0sNFmwuquQUiRA0)

**Layout**: 2-column grid (~65/35) below navbar.

**Left column** (`space-y-3`):

1. **Mode selector bar** (`bento-card p-3 flex flex-wrap gap-2`)
   - Exclusive mode pills: Adaptatif, Choix multiple, Tables 1-20, Avancé, Chaîne +−, Chaîne +−×
   - Active: `bg-slate-900 text-white rounded-xl`; Inactive: `text-slate-500 hover:bg-slate-100 rounded-xl`
   - Operations dropdown button with ChevronDown (combinable: Addition, Soustraction, Multiplication, Division)
   - Right: Eye toggle (show/hide hints) + Mic toggle (voice mode)

2. **Progress bar** (`bento-card p-4`)
   - `Exercice {n} / 20` + skill label + level
   - `h-1.5 bg-slate-100 rounded-full` track with blue fill at `(n/20 * 100)%`

3. **Exercise card** (`bento-card p-8 text-center`)
   - Problem: `text-4xl sm:text-5xl font-extrabold text-slate-900`
   - Input: large centered, `rounded-2xl border-slate-200 text-2xl font-bold text-center`
   - Row: `±` toggle button (slate border) | Mic ghost button | `btn-primary` "Valider" + Send icon
   - Shake animation (`animate-shake-x`) on wrong answer

4. **Feedback card** (`bento-card p-4`) — conditional
   - Correct: green Check icon + "Correct !" + technique tip
   - Wrong: red X icon + correct answer + technique tip

**Right sidebar** (`space-y-3`):

1. **Skills mastery** (`bento-card p-5`)
   - List of skills with icon + label + mini progress bar + score
   - Active skill highlighted

2. **Coach suggestion** (`bento-card p-4 bg-amber-50 border-amber-100`) — conditional
   - Sparkles icon amber + "Coach IA" title + suggestion text + "Changer de mode" button

3. **Slowest exercises** (`bento-card p-4`) — shown post-series
   - Clock icon + "Plus lents" + top 3 slowest exercise types with avg time

**Session flow**: 20 exercises per series → pause screen (series summary) → continue or switch mode.

---

## Responsive Breakpoints

| Breakpoint | Layout changes |
|---|---|
| `sm` (640px) | Feature grid 4 cols, stat cards 4 cols, nav labels visible |
| `lg` (1024px) | Dashboard row 1 becomes 3-col, home hero fills viewport height, training 2-col sidebar |

Mobile: single column stacking, nav labels hidden (icons only), coach sidebar becomes bottom sheet.

---

## Animations

| Class | Definition | Use |
|---|---|---|
| `animate-fade-in-up` | `opacity: 0 → 1`, `translateY: 16px → 0`, 0.5s | Card entrances, staggered with `animationDelay` |
| `animate-float` | `translateY: 0 → -6px → 0`, 3s infinite | Decorative elements |
| `animate-shake-x` | Horizontal shake, 0.18s | Wrong answer input feedback |
| `animate-spin` | Tailwind built-in | Loading spinners |

---

## Paywall & Subscription

`PaywallPopup` — modal overlay triggered at 300 exercises (free limit).
`isPremium` state disables the limit. Checkout via `api.createCheckout(plan)` → Stripe redirect.

---

## i18n

Default language: **French**. English supported.
All user-visible strings go through `t("key")` from `useTranslation()`.
Language switcher rendered in navbar via `LanguageSwitcher` component.
