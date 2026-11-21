'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { billingApi } from '@/shared/api/billing';
import { organizationsApi } from '@/shared/api/organizations';
import { navigateWindowTo } from '@/lib/navigation';

function getDaysLeft(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const msLeft = new Date(trialEndsAt).getTime() - Date.now();
  if (msLeft <= 0) return 0;
  return Math.ceil(msLeft / (1000 * 60 * 60 * 24));
}

type BillingOrg = { planStatus?: string; trialEndsAt?: string | null; plan?: string } | null | undefined;
type OrgData = { data?: { organization?: BillingOrg; role?: string | null } | null } | undefined;
type TFn = (key: string, opts?: Record<string, unknown>) => string;

// Shows the day-count line only while trialing with time left.
const showTrialDaysLeft = (isTrialing: boolean, daysLeft: number | null): boolean =>
  isTrialing && daysLeft !== null && daysLeft > 0;
// Shows the "trial ended" line while trialing with no time left.
const showTrialEnded = (isTrialing: boolean, daysLeft: number | null): boolean =>
  isTrialing && (daysLeft === null || daysLeft === 0);

// Plan-status flags derived from the raw status string.
function billingFlags(planStatus: string) {
  return {
    isTrialing: planStatus === 'trialing',
    isActive: planStatus === 'active',
    isPastDue: planStatus === 'past_due' || planStatus === 'paused',
    isPaused: planStatus === 'paused',
    isCanceled: planStatus === 'canceled',
  };
}

// Human labels for the plan + portal button.
function billingLabels(planName: string | undefined, isActive: boolean, t: TFn) {
  return {
    planLabel: planName
      ? t('settings.billing.planLabel', { plan: planName.charAt(0).toUpperCase() + planName.slice(1) })
      : t('settings.billing.starterPlan'),
    portalButtonLabel: isActive ? t('settings.billingLink.manage') : t('settings.billing.addPayment'),
  };
}

type BillingFlags = ReturnType<typeof billingFlags>;

// Status badges for the plan. Plain render helper (not a component) — identical tree, fewer body branches.
function renderStatusBadges(flags: BillingFlags, t: TFn): React.ReactNode {
  const { isTrialing, isActive, isPastDue, isPaused, isCanceled } = flags;
  return (
    <>
      {isTrialing && (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          {t('settings.billing.trialing')}
        </Badge>
      )}
      {isActive && <Badge className="bg-green-600 text-white">{t('settings.billing.active')}</Badge>}
      {isPastDue && (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          {isPaused ? t('settings.billing.paused') : t('settings.billing.pastDue')}
        </Badge>
      )}
      {isCanceled && <Badge variant="destructive">{t('settings.billing.canceled')}</Badge>}
    </>
  );
}

// Status detail lines for the plan. Plain render helper (not a component) — identical tree.
function renderStatusDetails(args: {
  flags: BillingFlags;
  trialDaysLeftVisible: boolean;
  trialEndedVisible: boolean;
  daysLeft: number | null;
  t: TFn;
}): React.ReactNode {
  const { flags, trialDaysLeftVisible, trialEndedVisible, daysLeft, t } = args;
  return (
    <>
      {trialDaysLeftVisible && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            <strong>{t('settings.billing.daysCount', { count: daysLeft })}</strong> {t('settings.billing.trialSuffix')}
          </span>
        </div>
      )}
      {trialEndedVisible && (
        <p className="text-sm text-muted-foreground">{t('settings.billing.trialEnded')}</p>
      )}
      {flags.isActive && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>{t('settings.billing.subActive')}</span>
        </div>
      )}
      {flags.isPastDue && (
        <Alert className="border-yellow-500/30">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            {t('settings.billing.pastDueAlert')}
          </AlertDescription>
        </Alert>
      )}
      {flags.isCanceled && (
        <p className="text-sm text-muted-foreground">{t('settings.billing.subCanceled')}</p>
      )}
    </>
  );
}

// All plan-status derivations + labels, keeping the branch logic out of the component render body.
function billingView(orgData: OrgData, t: TFn) {
  const org = orgData?.data?.organization;
  const planStatus = org?.planStatus ?? 'trialing';
  const daysLeft = getDaysLeft(org?.trialEndsAt ?? null);
  const flags = billingFlags(planStatus);
  const labels = billingLabels(org?.plan, flags.isActive, t);
  return { daysLeft, flags, ...labels };
}

export function BillingSettingsPage() {
  const { t } = useTranslation();
  const { data: orgData } = useQuery({
    queryKey: ['org'],
    queryFn: organizationsApi.getMe,
  });

  const portalMutation = useMutation({
    mutationFn: billingApi.createPortalSession,
    onSuccess: (data) => {
      const url = data.data?.url;
      if (url) {
        navigateWindowTo(url);
      }
    },
    onError: () => {
      toast.error(t('settings.billing.toastPortalFailed'));
    },
  });

  const { daysLeft, flags, planLabel, portalButtonLabel } = billingView(orgData, t);
  const trialDaysLeftVisible = showTrialDaysLeft(flags.isTrialing, daysLeft);
  const trialEndedVisible = showTrialEnded(flags.isTrialing, daysLeft);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back button */}
      <Link href="/settings">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('settings.security.back')}
        </Button>
      </Link>

      <PageHeader
        className="mb-6"
        icon={CreditCard}
        title={t('settings.billingLink.title')}
        description={t('settings.billingLink.desc')}
      />

      {/* Plan Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {t('settings.billing.planStatus')}
            {renderStatusBadges(flags, t)}
          </CardTitle>
          <CardDescription>
            {planLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderStatusDetails({ flags, trialDaysLeftVisible, trialEndedVisible, daysLeft, t })}
        </CardContent>
      </Card>

      {/* Manage Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('settings.billing.paymentMethod')}
          </CardTitle>
          <CardDescription>
            {flags.isActive
              ? t('settings.billing.paymentDescActive')
              : t('settings.billing.paymentDescInactive')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
          >
            {portalMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            {portalButtonLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
