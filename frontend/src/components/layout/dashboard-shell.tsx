'use client';

import { useEffect, lazy, Suspense } from 'react';

import { Header } from '@/components/layout/header';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { ModalOutlet } from '@/components/layout/modal-outlet';
import { Sidebar } from '@/components/layout/sidebar';

const WelcomeScreen = lazy(() =>
  import('@/components/onboarding/WelcomeScreen').then((m) => ({ default: m.WelcomeScreen })),
);
import { useUIStore } from '@/state/ui-store';
import type { User } from '@/types';

interface DashboardShellProps {
  children: React.ReactNode;
  initialUser?: User;
}

export function DashboardShell({ children, initialUser: user }: DashboardShellProps) {
  const setIsMobile = useUIStore((state) => state.setIsMobile);
  const isMobile = useUIStore((state) => state.isMobile);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  return (
    <div className="flex h-screen overflow-hidden isolate">
      {/* RGAA — keyboard bypass block: first focusable element jumps past the chrome to the content. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      {!isMobile && <Sidebar />}
      <MobileSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <ModalOutlet />

      {user?.organizationId && user.onboardingCompleted === false && (
        <Suspense fallback={null}>
          <WelcomeScreen />
        </Suspense>
      )}
    </div>
  );
}
