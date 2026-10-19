import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared page primitives (redesign Phase 2 — visual consistency).
 *
 * Before: every page rolled its own container + header (p-6 vs none, text-xl vs text-2xl vs text-3xl,
 * ad-hoc icon placement). PageShell + PageHeader give one consistent, command-center-language header
 * across the app: a standard max-width container, an icon chip, a display-font title, a muted
 * description, and a right-aligned actions slot.
 */

export interface PageShellProps extends React.ComponentProps<'div'> {
  /** max-width of the content column (default 7xl). */
  width?: 'full' | '7xl' | '6xl' | '5xl' | '4xl' | '3xl';
}

const WIDTH: Record<NonNullable<PageShellProps['width']>, string> = {
  full: 'max-w-none',
  '7xl': 'max-w-7xl',
  '6xl': 'max-w-6xl',
  '5xl': 'max-w-5xl',
  '4xl': 'max-w-4xl',
  '3xl': 'max-w-3xl',
};

export function PageShell({ width = '7xl', className, children, ...props }: PageShellProps) {
  return (
    <div
      className={cn('mx-auto w-full space-y-6 p-5 text-foreground animate-fade-in sm:p-6', WIDTH[width], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Lucide-style icon component rendered in a chip to the left of the title. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Right-aligned actions (buttons, toggles). */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
