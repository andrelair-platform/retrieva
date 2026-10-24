import {
  MessageSquare,
  FolderOpen,
  Settings,
  Building2,
  ShieldCheck,
  ClipboardList,
  BarChart3,
  Network,
  Share2,
  BookText,
  Inbox,
  Activity,
  Gavel,
  LayoutDashboard,
  Radar,
  Radio,
  DoorOpen,
  FileSignature,
  PackageSearch,
} from 'lucide-react';

export interface NavItem {
  /** i18n key (e.g. 'nav.items.riskRegister') — resolved with t() at render. */
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  workspaceRoles?: Array<'owner' | 'member' | 'viewer'>;
}

export interface NavSection {
  /** i18n key (e.g. 'nav.sections.compliance') — resolved with t() at render. */
  label: string;
  items: NavItem[];
}

// Grouped navigation for the desktop sidebar.
// Job-based IA (redesign 2026-10): Overview → Monitor (always-on agents) → Assess → Govern →
// Register → Intelligence. The Monitor + Govern sections surface the autonomous agents
// (discovery, CTPP surveillance, exit strategy, contract redliner) that the backend runs.
export const desktopNavSections: NavSection[] = [
  {
    label: 'nav.sections.overview',
    items: [{ title: 'nav.items.commandCenter', href: '/overview', icon: LayoutDashboard }],
  },
  {
    label: 'nav.sections.onboard',
    items: [{ title: 'nav.items.onboardTool', href: '/evaluations', icon: PackageSearch }],
  },
  {
    label: 'nav.sections.monitor',
    items: [
      { title: 'nav.items.decisionInbox', href: '/decision-inbox', icon: Inbox },
      { title: 'nav.items.surveillance', href: '/surveillance', icon: Radar },
      { title: 'nav.items.discovery', href: '/discovery', icon: Radio },
    ],
  },
  {
    label: 'nav.sections.assess',
    items: [
      { title: 'nav.items.assessmentWorkspace', href: '/assessment-runs', icon: Activity },
      { title: 'nav.items.gapAnalysis', href: '/assessments', icon: ShieldCheck },
      {
        title: 'nav.items.questionnaires',
        href: '/questionnaires',
        icon: ClipboardList,
        workspaceRoles: ['owner', 'member'],
      },
      { title: 'nav.items.approvalCenter', href: '/approvals', icon: Gavel },
    ],
  },
  {
    label: 'nav.sections.govern',
    items: [
      { title: 'nav.items.riskRegister', href: '/risk-register', icon: BarChart3 },
      { title: 'nav.items.exitStrategy', href: '/exit-strategy', icon: DoorOpen },
      { title: 'nav.items.contractAmendments', href: '/contract-amendments', icon: FileSignature },
    ],
  },
  {
    label: 'nav.sections.register',
    items: [
      { title: 'nav.items.register', href: '/register-of-information', icon: BookText },
      { title: 'nav.items.arrangements', href: '/arrangements', icon: Network },
      { title: 'nav.items.concentration', href: '/concentration', icon: Share2 },
      { title: 'nav.items.vendors', href: '/workspaces', icon: Building2 },
    ],
  },
  {
    label: 'nav.sections.intelligence',
    items: [
      { title: 'nav.items.askAi', href: '/chat', icon: MessageSquare },
      { title: 'nav.items.history', href: '/conversations', icon: FolderOpen },
    ],
  },
];

// Flattened list kept for backward compatibility
export const desktopMainNavItems: NavItem[] = desktopNavSections.flatMap((s) => s.items);

export const mobileMainNavItems: NavItem[] = [
  { title: 'nav.items.commandCenter', href: '/overview', icon: LayoutDashboard },
  { title: 'nav.items.decisionInbox', href: '/decision-inbox', icon: Inbox },
  { title: 'nav.items.gapAnalysis', href: '/assessments', icon: ShieldCheck },
  {
    title: 'nav.items.questionnaires',
    href: '/questionnaires',
    icon: ClipboardList,
    workspaceRoles: ['owner', 'member'],
  },
  { title: 'nav.items.askAi', href: '/chat', icon: MessageSquare },
  { title: 'nav.items.history', href: '/conversations', icon: FolderOpen },
];

export const bottomNavItems: NavItem[] = [
  { title: 'nav.items.settings', href: '/settings', icon: Settings },
];
