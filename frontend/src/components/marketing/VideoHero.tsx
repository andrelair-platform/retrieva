'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Radar, ShieldCheck, UserCheck, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, Check, X } from 'lucide-react';

/**
 * On-brand animated "product loop" — a dark app-window mock that cycles the AI-native workflow the
 * product actually runs: agents discover providers → agents assess & draft against DORA → you review
 * and sign off in the decision inbox → the Register is delivered. "Agents propose, you dispose" shown,
 * not just told. No video toolchain; pure React/CSS. Under prefers-reduced-motion it freezes on the
 * review step (the differentiator) and does not auto-cycle. The whole mock is decorative (aria-hidden):
 * the message lives in the headline beside it, and auto-cycling content should not be read aloud.
 */
const STEPS = [
  { key: 'discover', label: 'Agents discover providers', icon: Radar },
  { key: 'assess', label: 'Agents assess & draft', icon: ShieldCheck },
  { key: 'review', label: 'You review & sign off', icon: UserCheck },
  { key: 'register', label: 'Register delivered', icon: FileSpreadsheet },
] as const;

const REVIEW_STEP = 2; // the on-message step to freeze on under reduced motion

export function VideoHero() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  // Only cycle when motion is allowed. `useReducedMotion` resolves to its real value after the first
  // client render (SSR-safe), so the interval re-arms via the dep; the reduced freeze-frame is derived
  // below (not stored) to avoid a redundant setState-in-effect.
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setActive((i) => (i + 1) % STEPS.length), 2600);
    return () => clearInterval(id);
  }, [reduce]);

  const step = reduce ? REVIEW_STEP : active;

  return (
    <section aria-hidden="true" className="container mx-auto px-4 my-4">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
          style={{ boxShadow: '0 0 80px 0 hsl(var(--primary)/0.12) inset' }}
        />
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-background/40 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="ml-3 font-mono text-xs text-muted-foreground">retrieva.online · workspace</span>
        </div>

        <div className="grid sm:grid-cols-[220px_1fr]">
          {/* step rail */}
          <div className="hidden border-r border-border p-4 sm:block">
            <ol className="space-y-1">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const on = i === step;
                return (
                  <li
                    key={s.key}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      on ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${on ? 'text-primary' : 'text-muted-foreground/60'}`} />
                    <span className="truncate">{s.label}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* panel */}
          <div className="relative min-h-[320px] p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={STEPS[step].key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="h-full"
              >
                {STEPS[step].key === 'discover' && <DiscoverPanel />}
                {STEPS[step].key === 'assess' && <AssessPanel />}
                {STEPS[step].key === 'review' && <InboxPanel />}
                {STEPS[step].key === 'register' && <RegisterPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

const Chip = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm text-muted-foreground">
    <FileText className="h-4 w-4 text-primary/70" />
    {children}
  </div>
);

function DiscoverPanel() {
  const found = [
    'OpenAI — API',
    'Azure — Cloud infra',
    'Datadog — Monitoring',
    'SignFlow — e-Signature',
  ];
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] p-4 text-sm text-muted-foreground">
        <Radar className="h-4 w-4 text-primary" />
        Swept your source systems — 4 ICT providers found, proposed to the Register
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {found.map((f) => (
          <Chip key={f}>{f}</Chip>
        ))}
      </div>
    </div>
  );
}

function AssessPanel() {
  const rows = [
    { c: 'Art. 28(2) — contractual arrangements', s: 'ok' },
    { c: 'Art. 28(4) — concentration assessment', s: 'ok' },
    { c: 'Art. 30(2)(d) — exit strategy', s: 'warn' },
    { c: 'Art. 30(2)(e) — subcontracting chain', s: 'gap' },
  ];
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.c} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-4 py-3 text-sm">
          {r.s === 'ok' && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
          {r.s === 'warn' && <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />}
          {r.s === 'gap' && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />}
          <span className="text-muted-foreground">{r.c}</span>
        </li>
      ))}
    </ul>
  );
}

function InboxPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <UserCheck className="h-3.5 w-3.5 text-primary" />
        Decision inbox · the agent drafted, you decide
      </div>
      <div className="rounded-xl border border-border bg-background/40 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Azure — exit strategy</span>
          <span className="rounded-md bg-destructive/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-destructive">
            Gap · Art. 30(2)(d)
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          No audited exit plan on file for a critical function. The agent drafted an exit blueprint and
          flagged it for your sign-off.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            <Check className="h-3.5 w-3.5" /> Approve
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Reject
          </span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">maker-checker · audited</span>
        </div>
      </div>
    </div>
  );
}

function RegisterPanel() {
  const rows = [
    ['OpenAI', 'API', 'High', 'RT.02.01'],
    ['Azure', 'Cloud', 'Critical', 'RT.02.01'],
    ['Datadog', 'Monitoring', 'Important', 'RT.02.01'],
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-4 bg-background/50 px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>Provider</span><span>Service</span><span>Criticality</span><span>Register</span>
      </div>
      {rows.map((r) => (
        <div key={r[0]} className="grid grid-cols-4 border-t border-border px-4 py-2.5 text-sm text-muted-foreground">
          <span className="text-foreground">{r[0]}</span><span>{r[1]}</span>
          <span>{r[2]}</span><span className="font-mono text-xs text-primary/80">{r[3]}</span>
        </div>
      ))}
    </div>
  );
}
