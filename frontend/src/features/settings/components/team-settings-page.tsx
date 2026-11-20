'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Users,
  UserPlus,
  Loader2,
  Mail,
  Trash2,
  Clock,
  Crown,
  Eye,
  BarChart2,
  ShieldCheck,
  Scale,
  Lock,
  FileLock2,
  Briefcase,
  Search,
  Plus,
  X,
  PackageSearch,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/lib/stores/auth-store';
import { organizationsApi, type OrgMember, type DomainRole } from '@/shared/api/organizations';

// ── Org-tier role config (coarse access tier — used for pending-invite badges) ──────────────────

const ROLE_CONFIG = {
  org_admin: {
    labelKey: 'settings.team.roles.adminLabel',
    icon: Crown,
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
  },
  analyst: {
    labelKey: 'settings.team.roles.analystLabel',
    icon: BarChart2,
    badgeClass: 'bg-info-muted text-info border-info-muted',
  },
  viewer: {
    labelKey: 'settings.team.roles.viewerLabel',
    icon: Eye,
    badgeClass: 'bg-muted text-muted-foreground border-border',
  },
} as const;

type RoleKey = keyof typeof ROLE_CONFIG;

// ── DORA domain-role config (the workflow roles the Team UI assigns) ─────────────────────────────
// `category` groups roles for the legend + badge colour; `tier` is the coarse org-member role the
// invite derives (governs who can invite — only the admin tier → org_admin).

type RoleCategory = 'admin' | 'maker' | 'checker' | 'attester' | 'read';

interface DomainRoleMeta {
  labelKey: string;
  descKey: string;
  icon: React.ComponentType<{ className?: string }>;
  category: RoleCategory;
  tier: 'org_admin' | 'analyst' | 'viewer';
}

const DOMAIN_ROLE_CONFIG: Record<DomainRole, DomainRoleMeta> = {
  entity_admin: { labelKey: 'settings.team.domainRoles.entity_admin.label', descKey: 'settings.team.domainRoles.entity_admin.desc', icon: Crown, category: 'admin', tier: 'org_admin' },
  analyst: { labelKey: 'settings.team.domainRoles.analyst.label', descKey: 'settings.team.domainRoles.analyst.desc', icon: BarChart2, category: 'maker', tier: 'analyst' },
  procurement: { labelKey: 'settings.team.domainRoles.procurement.label', descKey: 'settings.team.domainRoles.procurement.desc', icon: PackageSearch, category: 'maker', tier: 'viewer' },
  ict_risk_officer: { labelKey: 'settings.team.domainRoles.ict_risk_officer.label', descKey: 'settings.team.domainRoles.ict_risk_officer.desc', icon: ShieldCheck, category: 'checker', tier: 'viewer' },
  legal: { labelKey: 'settings.team.domainRoles.legal.label', descKey: 'settings.team.domainRoles.legal.desc', icon: Scale, category: 'checker', tier: 'viewer' },
  security_officer: { labelKey: 'settings.team.domainRoles.security_officer.label', descKey: 'settings.team.domainRoles.security_officer.desc', icon: Lock, category: 'checker', tier: 'viewer' },
  dpo: { labelKey: 'settings.team.domainRoles.dpo.label', descKey: 'settings.team.domainRoles.dpo.desc', icon: FileLock2, category: 'checker', tier: 'viewer' },
  business_owner: { labelKey: 'settings.team.domainRoles.business_owner.label', descKey: 'settings.team.domainRoles.business_owner.desc', icon: Briefcase, category: 'attester', tier: 'viewer' },
  auditor: { labelKey: 'settings.team.domainRoles.auditor.label', descKey: 'settings.team.domainRoles.auditor.desc', icon: Search, category: 'read', tier: 'viewer' },
  viewer: { labelKey: 'settings.team.domainRoles.viewer.label', descKey: 'settings.team.domainRoles.viewer.desc', icon: Eye, category: 'read', tier: 'viewer' },
};

// Display order (admin → makers → checkers → attester → read) for the invite list + legend.
const DOMAIN_ROLE_ORDER: DomainRole[] = [
  'entity_admin',
  'analyst',
  'procurement',
  'ict_risk_officer',
  'legal',
  'security_officer',
  'dpo',
  'business_owner',
  'auditor',
  'viewer',
];

const CATEGORY_BADGE: Record<RoleCategory, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  maker: 'bg-info-muted text-info border-info-muted',
  checker: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  attester: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  read: 'bg-muted text-muted-foreground border-border',
};

/** The coarse org-member tier the invite derives from the chosen DORA role (governs invite power). */
function tierForDomainRole(role: DomainRole): 'org_admin' | 'analyst' | 'viewer' {
  return DOMAIN_ROLE_CONFIG[role].tier;
}

function RoleBadge({ role }: { role: RoleKey }) {
  const { t } = useTranslation();
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.viewer;
  return (
    <Badge variant="outline" className={`text-xs ${cfg.badgeClass}`}>
      {t(cfg.labelKey)}
    </Badge>
  );
}

function DomainRoleBadge({
  role,
  onRemove,
}: {
  role: DomainRole;
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const cfg = DOMAIN_ROLE_CONFIG[role];
  if (!cfg) return null;
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${CATEGORY_BADGE[cfg.category]}`}>
      {t(cfg.labelKey)}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
          aria-label={t('settings.team.removeRole', { role: t(cfg.labelKey) })}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

function memberInitials(member: OrgMember): string {
  const name = member.user?.name;
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return member.email.slice(0, 2).toUpperCase();
}

// ── Invite form schema ────────────────────────────────────────────────────────

const DOMAIN_ROLE_VALUES = DOMAIN_ROLE_ORDER as [DomainRole, ...DomainRole[]];
const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: z.enum(DOMAIN_ROLE_VALUES),
});
type InviteFormData = z.infer<typeof inviteSchema>;

// ── Per-member role manager (admin only) ────────────────────────────────────────

function MemberRoleManager({
  member,
  onAssign,
  onRevoke,
  pending,
}: {
  member: OrgMember;
  onAssign: (userId: string, role: DomainRole) => void;
  onRevoke: (userId: string, role: DomainRole) => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const userId = member.user?.id;
  const roles = member.domainRoles ?? [];
  const assignable = DOMAIN_ROLE_ORDER.filter((r) => !roles.includes(r));

  if (!userId) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {roles.map((r) => (
        <DomainRoleBadge key={r} role={r} onRemove={() => onRevoke(userId, r)} />
      ))}
      {assignable.length > 0 && (
        <Select
          onValueChange={(value) => onAssign(userId, value as DomainRole)}
          disabled={pending}
        >
          <SelectTrigger className="h-6 w-auto gap-1 border-dashed px-2 text-xs text-muted-foreground">
            <Plus className="h-3 w-3" />
            {t('settings.team.addRole')}
          </SelectTrigger>
          <SelectContent>
            {assignable.map((r) => (
              <SelectItem key={r} value={r} className="text-xs">
                {t(DOMAIN_ROLE_CONFIG[r].labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TeamSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['org-me'],
    queryFn: () => organizationsApi.getMe(),
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => organizationsApi.getMembers(),
    enabled: !!orgData?.data?.organization,
  });

  const isLoading = orgLoading || membersLoading;
  const org = orgData?.data?.organization ?? null;
  const myRole = orgData?.data?.role as RoleKey | null;
  const isAdmin = myRole === 'org_admin';

  const { activeMembers, pendingMembers } = useMemo(() => {
    const members: OrgMember[] = membersData?.data?.members ?? [];
    return {
      activeMembers: members.filter((m) => m.status === 'active'),
      pendingMembers: members.filter((m) => m.status === 'pending'),
    };
  }, [membersData]);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'analyst' },
  });

  const inviteMutation = useMutation({
    mutationFn: (data: InviteFormData) =>
      organizationsApi.invite({
        email: data.email,
        role: tierForDomainRole(data.role),
        domainRole: data.role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      toast.success(t('settings.team.toastInviteSent'));
      form.reset();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t('settings.team.toastInviteFailed');
      toast.error(msg);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => organizationsApi.removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      toast.success(t('settings.team.toastMemberRemoved'));
      setRemovingId(null);
    },
    onError: () => toast.error(t('settings.team.toastRemoveFailed')),
  });

  const assignRoleMutation = useMutation({
    mutationFn: (v: { userId: string; role: DomainRole }) => organizationsApi.assignRole(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      toast.success(t('settings.team.toastRoleAssigned'));
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t('settings.team.toastRoleFailed');
      toast.error(msg);
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: (v: { userId: string; role: DomainRole }) => organizationsApi.revokeRole(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      toast.success(t('settings.team.toastRoleRevoked'));
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t('settings.team.toastRoleFailed');
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('settings.team.loading')}
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-muted-foreground text-sm">{t('settings.team.noOrg')}</p>
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl mx-auto">
      <PageHeader
        title={t('settings.team.title')}
        description={
          <>
            {org.name} · {t('settings.team.subActiveMembers', { count: activeMembers.length })}
            {pendingMembers.length > 0 &&
              ` · ${t('settings.team.subPending', { count: pendingMembers.length })}`}
          </>
        }
      />

      {/* DORA role legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('settings.team.roles.title')}
          </CardTitle>
          <CardDescription>{t('settings.team.roles.doraDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {DOMAIN_ROLE_ORDER.map((key) => {
            const cfg = DOMAIN_ROLE_CONFIG[key];
            const Icon = cfg.icon;
            return (
              <div key={key} className="flex items-start gap-3">
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t(cfg.labelKey)}</p>
                  <p className="text-xs text-muted-foreground">{t(cfg.descKey)}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Active members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t('settings.team.activeMembers')}</CardTitle>
          {isAdmin && (
            <CardDescription>{t('settings.team.manageRolesHint')}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-0">
          {activeMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('settings.team.noActiveMembers')}</p>
          ) : (
            activeMembers.map((member, idx) => {
              const isSelf = user?.email === member.email;
              const roles = member.domainRoles ?? [];
              return (
                <div key={member.id}>
                  {idx > 0 && <Separator className="my-2" />}
                  <div className="flex items-start gap-3 py-2">
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarFallback className="text-xs">{memberInitials(member)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-sm font-medium truncate">
                        {member.user?.name ?? member.email}
                        {isSelf && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {t('settings.team.you')}
                          </span>
                        )}
                      </p>
                      {member.user?.name && (
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      )}
                      {/* Domain roles: editable for admins, read-only badges otherwise */}
                      {isAdmin ? (
                        <MemberRoleManager
                          member={member}
                          onAssign={(userId, role) => assignRoleMutation.mutate({ userId, role })}
                          onRevoke={(userId, role) => revokeRoleMutation.mutate({ userId, role })}
                          pending={assignRoleMutation.isPending || revokeRoleMutation.isPending}
                        />
                      ) : roles.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {roles.map((r) => (
                            <DomainRoleBadge key={r} role={r} />
                          ))}
                        </div>
                      ) : (
                        <RoleBadge role={member.role as RoleKey} />
                      )}
                    </div>
                    {member.joinedAt && (
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block mt-0.5">
                        {t('settings.team.joined', {
                          date: format(new Date(member.joinedAt), 'dd MMM yyyy'),
                        })}
                      </span>
                    )}
                    {isAdmin && !isSelf && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => setRemovingId(member.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('settings.team.removeTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('settings.team.removeDesc1', {
                                name: member.user?.name ?? member.email,
                              })}
                              <strong>{org.name}</strong>
                              {t('settings.team.removeDesc2')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setRemovingId(null)}>
                              {t('common.cancel')}
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => removeMutation.mutate(member.id)}
                              disabled={removeMutation.isPending && removingId === member.id}
                            >
                              {removeMutation.isPending && removingId === member.id ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              ) : null}
                              {t('settings.team.remove')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Pending invites */}
      {pendingMembers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('settings.team.pendingInvites')}
            </CardTitle>
            <CardDescription>{t('settings.team.pendingDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-0">
            {pendingMembers.map((member, idx) => (
              <div key={member.id}>
                {idx > 0 && <Separator className="my-2" />}
                <div className="flex items-center gap-3 py-1">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-muted">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <RoleBadge role={member.role as RoleKey} />
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                    {t('settings.team.pendingBadge')}
                  </Badge>
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setRemovingId(member.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('settings.team.cancelInviteTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('settings.team.cancelInviteDesc1')}
                            <strong>{member.email}</strong>
                            {t('settings.team.cancelInviteDesc2')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setRemovingId(null)}>
                            {t('settings.team.keep')}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => removeMutation.mutate(member.id)}
                            disabled={removeMutation.isPending && removingId === member.id}
                          >
                            {t('settings.team.cancelInvite')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invite new member — admins only */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {t('settings.team.inviteTitle')}
            </CardTitle>
            <CardDescription>{t('settings.team.inviteDoraDesc', { org: org.name })}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => inviteMutation.mutate(data))}
                className="flex flex-col sm:flex-row gap-3"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="sr-only">{t('settings.profile.email')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('settings.team.emailPlaceholder')}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="w-full sm:w-56">
                      <FormLabel className="sr-only">{t('settings.team.roleLabel')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('settings.team.rolePlaceholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DOMAIN_ROLE_ORDER.map((r) => (
                            <SelectItem key={r} value={r}>
                              {t(DOMAIN_ROLE_CONFIG[r].labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={inviteMutation.isPending} className="shrink-0">
                  {inviteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {t('settings.team.sendInvite')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
