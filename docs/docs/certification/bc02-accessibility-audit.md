---
sidebar_position: 2
---

# BC02 — Accessibility / RGAA audit (Retrieva)

**Bloc:** BC02 Concevoir & développer · **Date:** 2026-09-06 · **Target:** Retrieva frontend
(https://retrieva.online) · **Tool:** Lighthouse (headless Chrome) — automated RGAA-aligned checks.

## Result: **96 / 100** (gate: ≥ 80 ✅)

The accessibility gate flagged in `platform-backlog#195` was originally scoped (in error) to the
ktayl-solution public site; the correct target is the **certification project — Retrieva**. Audited
there, Retrieva's public frontend scores **96/100**, already above the required threshold.

## Automated findings (1 issue)

| Weight | Check | Elements | Detail |
|---|---|---|---|
| 7 | Insufficient colour contrast | 1 | A muted badge chip: foreground `#79879a` on background `#1b222d` = ratio **4.37** (WCAG AA needs **4.5** for this size). Selector: `div.min-h-screen > section.container > div > div.inline-flex` (`bg-muted` pill on the hero). |

**Fix:** nudge the `muted-foreground` token slightly lighter (e.g. `#8a97a8`+) → ratio ≥ 4.5 →
100/100. Single CSS-variable change.

## Continuous automated testing — axe-core in CI (2026-10-20)

The one-off Lighthouse run above is now backed by a **continuous, gating accessibility test** in the
CI pipeline — stronger evidence than a point-in-time score because it runs on **every pull request**
and also covers **authenticated** pages (behind the login) that a public Lighthouse scan can't reach.

- **Harness:** `@axe-core/playwright` in the Playwright E2E suite — `frontend/e2e/a11y.spec.ts`.
- **Standard:** axe rule tags `wcag2a, wcag2aa, wcag21a, wcag21aa` (WCAG 2.1 level AA — the RGAA basis).
- **Gate:** the test **fails the build** on any **serious** or **critical** violation; moderate/minor
  findings are logged for triage. Green CI ⇒ no serious/critical WCAG 2.1 AA violations on the scanned pages.
- **Coverage:** the public **login** and **register** forms + the **authenticated Command Center**
  (which renders the full app shell — sidebar navigation, header, and a content page). The pattern
  scales to any page by mocking its session/data like the other E2E specs.

**Re-run locally:** `cd frontend && npx playwright test e2e/a11y.spec.ts`.

### Violations found and fixed (this pass)

| WCAG / RGAA | Issue (axe rule) | Where | Fix |
|---|---|---|---|
| 1.4.3 contrast (RGAA 3.2) | `color-contrast` (serious, 17 nodes) | Command Center hero + the **app shell** (sidebar org label, section labels, inactive nav items at `/25`–`/50` opacity; header title) over the near-black surface | Raised the muted-text opacities to meet **≥ 4.5:1** (sidebar text `/70`–`/75`, hero text `/85`–`/90`, header title `/80`). Shell-level fix → benefits **every** authenticated page. |
| 4.1.2 name/role/value (RGAA 11.2) | `button-name` (critical, 2 nodes) | The two password-visibility toggle buttons on **register** (icon-only, no accessible name) | Added `aria-label` ("Show/Hide password"). |
| 2.4.1 bypass blocks (RGAA 12.7) | keyboard bypass (not auto-detected) | The dashboard shell had no skip link | Added a **"Skip to main content"** link (first focusable element) targeting the `<main id="main-content">` landmark. |

### Manual review still required (RGAA is 106 criteria)

Automated tooling covers a large subset; the remaining **manual** checks for a full RGAA dossier —
focus order on complex widgets, screen-reader walkthroughs, reflow/zoom at 200–400%, and content
structure — are tracked as follow-up BC02 work. The automated gate above is the regression backstop
that keeps the baseline from slipping between those manual reviews.

## Evidence

Full Lighthouse report (HTML + JSON) is stored with this section:
- `static/certification/retrieva-a11y-report.html` — the interactive report
- `static/certification/retrieva-a11y-report.json` — raw scores + audit details

Re-run: `lighthouse https://retrieva.online --only-categories=accessibility --chrome-flags="--headless"`.
