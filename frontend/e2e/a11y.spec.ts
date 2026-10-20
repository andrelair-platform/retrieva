/**
 * E2E — Accessibility (RGAA / WCAG 2.1 AA) — BC02 certification evidence.
 *
 * Runs axe-core against representative pages and FAILS on serious/critical violations (the blocking
 * RGAA bar). Moderate/minor findings are logged, not gated. Covers the public auth pages and an
 * authenticated dashboard page (session + data mocked, like the other e2e specs).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import {
  mockUnauthenticated,
  mockDashboardSession,
} from './helpers/api-mocks';

const GATING = new Set(['serious', 'critical']);

// Next dev compiles a route on first hit, then triggers a fast-refresh reload that can detach the
// frame mid-navigation (net::ERR_ABORTED). Retry past the first cold compile so the test is stable
// both locally and in CI (where routes are always cold).
async function gotoStable(page: Page, url: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      return;
    } catch (err) {
      if (attempt < 2 && String(err).includes('ERR_ABORTED')) {
        await page.waitForTimeout(1500);
        continue;
      }
      throw err;
    }
  }
}

async function analyze(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const gating = results.violations.filter((v) => GATING.has(v.impact ?? ''));
  const other = results.violations.filter((v) => !GATING.has(v.impact ?? ''));
  if (other.length) {
    console.log(
      `[a11y] non-gating (moderate/minor): ${other.map((v) => `${v.id}×${v.nodes.length}`).join(', ')}`
    );
  }
  return gating;
}

function describe(violations: Awaited<ReturnType<typeof analyze>>) {
  return violations
    .map((v) => `• [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))\n    ${v.nodes[0]?.target?.join(' ')}`)
    .join('\n');
}

// Cold Next-dev route compiles can be slow, and the dashboard holds a socket.io connection (so
// `networkidle` never settles). Use generous timeouts + explicit element waits, never networkidle.
test.describe('Accessibility (RGAA / WCAG 2.1 AA)', () => {
  test.describe.configure({ timeout: 90_000 });

  test('landing page has no serious/critical violations', async ({ page }) => {
    await mockUnauthenticated(page);
    await gotoStable(page, '/');
    await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1200); // let framer-motion entrance fades settle (else axe sees mid-fade text)
    const v = await analyze(page);
    expect(v, `\n${describe(v)}`).toEqual([]);
  });

  test('pricing page has no serious/critical violations', async ({ page }) => {
    await mockUnauthenticated(page);
    await gotoStable(page, '/pricing');
    await page.getByRole('heading', { name: /outcome/i }).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1200); // let the pricing-card whileInView animations settle
    const v = await analyze(page);
    expect(v, `\n${describe(v)}`).toEqual([]);
  });

  test('login page has no serious/critical violations', async ({ page }) => {
    await mockUnauthenticated(page);
    await gotoStable(page, '/login');
    await page.getByRole('button', { name: 'Sign in' }).waitFor({ timeout: 30_000 });
    const v = await analyze(page);
    expect(v, `\n${describe(v)}`).toEqual([]);
  });

  test('register page has no serious/critical violations', async ({ page }) => {
    await mockUnauthenticated(page);
    await gotoStable(page, '/register');
    await page.getByLabel('Email').waitFor({ timeout: 30_000 });
    const v = await analyze(page);
    expect(v, `\n${describe(v)}`).toEqual([]);
  });

  test('command center (authenticated) has no serious/critical violations', async ({ page }) => {
    await mockDashboardSession(page);
    await page.route('**/api/v1/decision-queue', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', message: '', data: { items: [], counts: { findings: 0, risks: 0, total: 0 } } }),
      })
    );
    await gotoStable(page, '/overview');
    await page.getByRole('heading', { name: 'Command Center' }).waitFor({ timeout: 30_000 });
    const v = await analyze(page);
    expect(v, `\n${describe(v)}`).toEqual([]);
  });
});
