/**
 * AUD-P1 scope-down — the frontend feature-flag accessor + nav filter. The out-of-scope surfaces
 * (chat, evaluations/procurement, billing) are hidden by default and reversibly re-enabled via
 * window.__ENV__.FEATURES (mirrors the backend env gates). These tests pin: default-OFF, the
 * window-override, and the nav filter (tagged items drop when off, pass when on, untagged always pass).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { getFeatureFlags } from '@/lib/runtime-env';
import { filterNavByFeatures, type NavItem } from '@/shared/constants/nav-items';
import { LayoutDashboard } from 'lucide-react';

const icon = LayoutDashboard;
const win = () => globalThis as unknown as { window?: { __ENV__?: unknown } };

afterEach(() => {
  // clean any injected runtime env between tests
  if (typeof window !== 'undefined') delete (window as { __ENV__?: unknown }).__ENV__;
});

describe('getFeatureFlags (AUD-P1)', () => {
  it('defaults every flag OFF when no window.__ENV__.FEATURES is injected', () => {
    if (typeof window !== 'undefined') delete (window as { __ENV__?: unknown }).__ENV__;
    expect(getFeatureFlags()).toEqual({ chat: false, evaluations: false, billing: false });
  });

  it('reads injected flags from window.__ENV__.FEATURES (merged over defaults)', () => {
    (win().window as { __ENV__?: unknown }).__ENV__ = { FEATURES: { chat: true } };
    const flags = getFeatureFlags();
    expect(flags.chat).toBe(true); // injected
    expect(flags.evaluations).toBe(false); // default preserved for unset keys
    expect(flags.billing).toBe(false);
  });
});

describe('filterNavByFeatures (AUD-P1)', () => {
  const items: NavItem[] = [
    { title: 'core', href: '/overview', icon }, // untagged → always visible
    { title: 'eval', href: '/evaluations', icon, feature: 'evaluations' },
    { title: 'chat', href: '/chat', icon, feature: 'chat' },
  ];

  it('drops feature-tagged items when their flag is OFF; keeps untagged', () => {
    const visible = filterNavByFeatures(items, { chat: false, evaluations: false, billing: false });
    expect(visible.map((i) => i.href)).toEqual(['/overview']);
  });

  it('keeps a feature-tagged item when its flag is ON', () => {
    const visible = filterNavByFeatures(items, { chat: true, evaluations: false, billing: false });
    expect(visible.map((i) => i.href)).toEqual(['/overview', '/chat']);
  });

  it('all flags ON ⇒ every item visible', () => {
    const visible = filterNavByFeatures(items, { chat: true, evaluations: true, billing: true });
    expect(visible).toHaveLength(3);
  });
});
