// Single accessor for the backend API URL, resolved at RUNTIME.
//  - client: window.__ENV__.API_URL (set by /__env.js before hydration)
//  - server: process.env.API_URL (runtime container env)
//  - fallback: the (possibly still-baked) NEXT_PUBLIC_API_URL, then localhost — so a
//    misconfigured deploy degrades to prior behaviour instead of hard-breaking.
declare global {
  interface Window {
    __ENV__?: { API_URL?: string; FEATURES?: Partial<FeatureFlags> };
  }
}

const FALLBACK_API_URL = 'http://localhost:3007/api/v1';

export function getApiUrl(): string {
  if (typeof window !== 'undefined' && window.__ENV__?.API_URL) {
    return window.__ENV__.API_URL;
  }
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_URL;
}

// Scope-down feature flags (AUD-P1) — the UI counterpart of the BACKEND env gates. The out-of-scope
// surfaces (chat assistant, vendor-evaluation/procurement, billing) are HIDDEN by default so the nav
// matches what the backend actually serves (those APIs 404 unless their backend flag is on). Each flag
// is read at RUNTIME from window.__ENV__.FEATURES (server-injected per deployment — see layout.tsx), so
// one image serves every environment and the hide is reversible by setting the env var (no rebuild).
//
//   chat        ↔ backend CHAT_ENABLED                      → /chat, /conversations
//   evaluations ↔ backend EVALUATIONS_PROCUREMENT_ENABLED   → /evaluations
//   billing     ↔ backend BILLING_ENABLED                   → /settings/billing
export interface FeatureFlags {
  chat: boolean;
  evaluations: boolean;
  billing: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = { chat: false, evaluations: false, billing: false };

export function getFeatureFlags(): FeatureFlags {
  if (typeof window !== 'undefined' && window.__ENV__?.FEATURES) {
    return { ...DEFAULT_FLAGS, ...window.__ENV__.FEATURES };
  }
  // SSR / pre-hydration: read the same env the layout injects (default OFF).
  return {
    chat: String(process.env.CHAT_ENABLED).toLowerCase() === 'true',
    evaluations: String(process.env.EVALUATIONS_PROCUREMENT_ENABLED).toLowerCase() === 'true',
    billing: String(process.env.BILLING_ENABLED).toLowerCase() === 'true',
  };
}
