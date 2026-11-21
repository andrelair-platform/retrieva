'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Loader2, User, Mail, Shield, Bell, CheckCircle, AlertCircle, Users, CreditCard, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { getFeatureFlags } from '@/lib/runtime-env';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/auth-store';
import { authApi } from '@/shared/api';
import type { User as AppUser } from '@/types';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

const RESEND_COOLDOWN_SECONDS = 60;

type ProfileFormData = z.infer<typeof profileSchema>;

/** True if any of the given boolean flags is set. */
function anyTrue(...flags: boolean[]): boolean {
  return flags.some(Boolean);
}

/** Profile form defaults from the current user (empty strings when absent). */
function profileDefaults(user: AppUser | null): ProfileFormData {
  return {
    name: user?.name || '',
    email: user?.email || '',
  };
}

/** Display primitives for the current user (keeps the render branch-light). */
function userView(user: AppUser | null) {
  return {
    name: user?.name,
    email: user?.email,
    verified: Boolean(user?.isEmailVerified),
    initials: userInitials(user?.name),
  };
}

/** Two-letter avatar initials derived from a display name (falls back to 'U'). */
function userInitials(name: string | undefined): string {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  );
}

/** How a resend-verification error should surface to the user. */
interface ResendErrorOutcome {
  /** True when the 429 rate-limit hit → the caller restarts the cooldown. */
  startCooldown: boolean;
  /** Toast style: 400 (already-verified) uses info, everything else uses error. */
  toastKind: 'error' | 'info';
  /** i18n key / backend message to display. */
  message: string;
}

/** Classify a resend-verification mutation error into a user-facing outcome. */
function classifyResendError(
  error: unknown,
  t: (key: string) => string,
): ResendErrorOutcome {
  if (!axios.isAxiosError(error) || !error.response) {
    return { startCooldown: false, toastKind: 'error', message: t('settings.emailVerify.toastSendFailed') };
  }
  const backendMessage = error.response.data?.message;
  if (error.response.status === 429) {
    return {
      startCooldown: true,
      toastKind: 'error',
      message: backendMessage ?? t('settings.emailVerify.toastWaitDefault'),
    };
  }
  if (error.response.status === 400) {
    return {
      startCooldown: false,
      toastKind: 'info',
      message: backendMessage ?? t('settings.emailVerify.toastUnable'),
    };
  }
  return {
    startCooldown: false,
    toastKind: 'error',
    message: backendMessage ?? t('settings.emailVerify.toastSendFailed'),
  };
}

export default function SettingsPage() {
  const { t } = useTranslation();
  // Scope-down (AUD-P1): the billing surface is hidden unless the billing feature flag is ON (default
  // OFF — Retrieva is self-hosted single-tenant, not a SaaS). Mirrors the backend BILLING_ENABLED gate.
  const billingEnabled = getFeatureFlags().billing;
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    syncAlerts: true,
    weeklyDigest: false,
  });
  const [resendCooldownEnd, setResendCooldownEnd] = useState<Date | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }

    if (!resendCooldownEnd) return;

    const updateRemaining = () => {
      const remainingMs = resendCooldownEnd.getTime() - Date.now();
      if (remainingMs <= 0) {
        setCooldownRemaining(0);
        setResendCooldownEnd(null);
        return;
      }
      setCooldownRemaining(Math.ceil(remainingMs / 1000));
    };

    updateRemaining();
    cooldownIntervalRef.current = setInterval(updateRemaining, 1000);
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [resendCooldownEnd]);

  const startResendCooldown = () => {
    setResendCooldownEnd(new Date(Date.now() + RESEND_COOLDOWN_SECONDS * 1000));
  };

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults(user),
  });

  // Reset form when user data becomes available
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await authApi.updateProfile(data);
      return response.data?.user;
    },
    onSuccess: (updatedUser) => {
      if (updatedUser) {
        updateUser(updatedUser);
      }
      toast.success(t('settings.profile.toastUpdated'));
    },
    onError: () => {
      toast.error(t('settings.profile.toastFailed'));
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await authApi.resendVerification();
      return response;
    },
    onSuccess: () => {
      startResendCooldown();
      toast.success(t('settings.emailVerify.toastSent'));
    },
    onError: (error: unknown) => {
      const outcome = classifyResendError(error, t);
      if (outcome.startCooldown) {
        startResendCooldown();
      }
      if (outcome.toastKind === 'info') {
        toast.info(outcome.message);
      } else {
        toast.error(outcome.message);
      }
    },
  });

  const inCooldown = cooldownRemaining > 0;
  const isResendButtonDisabled = anyTrue(resendVerificationMutation.isPending, inCooldown);
  const { name: userName, email: userEmail, verified: emailVerified, initials } = userView(user);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        className="mb-6"
        icon={SettingsIcon}
        title={t('settings.title')}
        description={t('settings.subtitle')}
      />

      {/* Profile Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('settings.profile.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.profile.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{userName}</p>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) =>
                updateProfileMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.profile.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.profile.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} disabled />
                    </FormControl>
                    <FormDescription>
                      {t('settings.profile.emailDesc')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t('settings.profile.save')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Email Verification Status */}
      {!emailVerified && (
        <Card className="mb-6 border-warning/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('settings.emailVerify.title')}
              <Badge variant="outline" className="ml-2 text-warning border-warning/50">
                <AlertCircle className="h-3 w-3 mr-1" />
                {t('settings.emailVerify.notVerified')}
              </Badge>
            </CardTitle>
            <CardDescription>
              {t('settings.emailVerify.notVerifiedDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('settings.emailVerify.sentTo1')}<strong>{userEmail}</strong>{t('settings.emailVerify.sentTo2')}
            </p>
            <Button
              variant="outline"
              onClick={() => resendVerificationMutation.mutate()}
              disabled={isResendButtonDisabled}
            >
              {resendVerificationMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {inCooldown
                ? t('settings.emailVerify.pleaseWait', { seconds: cooldownRemaining })
                : t('settings.emailVerify.resend')}
            </Button>
            {inCooldown && (
              <p className="text-xs text-muted-foreground mt-2">
                {t('settings.emailVerify.rateLimitNote')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {emailVerified && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('settings.emailVerify.title')}
              <Badge variant="default" className="ml-2 bg-success">
                <CheckCircle className="h-3 w-3 mr-1" />
                {t('settings.emailVerify.verified')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('settings.emailVerify.verifiedDesc')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('settings.notifications.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.notifications.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.notifications.email')}</p>
              <p className="text-sm text-muted-foreground">
                {t('settings.notifications.emailDesc')}
              </p>
            </div>
            <Switch
              checked={notificationSettings.emailNotifications}
              onCheckedChange={(checked) =>
                setNotificationSettings((prev) => ({
                  ...prev,
                  emailNotifications: checked,
                }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.notifications.sync')}</p>
              <p className="text-sm text-muted-foreground">
                {t('settings.notifications.syncDesc')}
              </p>
            </div>
            <Switch
              checked={notificationSettings.syncAlerts}
              onCheckedChange={(checked) =>
                setNotificationSettings((prev) => ({
                  ...prev,
                  syncAlerts: checked,
                }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.notifications.digest')}</p>
              <p className="text-sm text-muted-foreground">
                {t('settings.notifications.digestDesc')}
              </p>
            </div>
            <Switch
              checked={notificationSettings.weeklyDigest}
              onCheckedChange={(checked) =>
                setNotificationSettings((prev) => ({
                  ...prev,
                  weeklyDigest: checked,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Team Management Link */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('settings.teamLink.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.teamLink.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/team">
            <Button variant="outline">{t('settings.teamLink.manage')}</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Security Settings Link */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('settings.securityLink.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.securityLink.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/security">
            <Button variant="outline">{t('settings.securityLink.manage')}</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Billing Link — scope-down (AUD-P1): shown only when the billing feature flag is ON. */}
      {billingEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('settings.billingLink.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.billingLink.desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/billing">
              <Button variant="outline">{t('settings.billingLink.manage')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
