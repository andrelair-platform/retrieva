'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, ShieldCheck, ShieldOff, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { authApi, getErrorMessage } from '@/shared/api';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { MfaSetupResponse } from '@/types';

/** A 6+ digit TOTP code is required to enable/disable. */
const TOTP_MIN_LENGTH = 6;

/** Render flags for the MFA section, derived from enabled state + in-flight setup. */
function mfaRenderFlags(enabled: boolean, hasSetup: boolean) {
  return {
    showEnrollButton: !enabled && !hasSetup,
    showVerifyStep: !enabled && hasSetup,
    descKey: enabled ? 'settings.mfa.descEnabled' : 'settings.mfa.descDisabled',
  };
}

/** The enable button is disabled while in-flight or until a full-length code is entered. */
function enableDisabled(pending: boolean, code: string): boolean {
  return pending || code.trim().length < TOTP_MIN_LENGTH;
}

/** The disable button needs a password and a full-length code, and not be in-flight. */
function disableDisabled(pending: boolean, password: string, code: string): boolean {
  return pending || password.length < 1 || code.trim().length < TOTP_MIN_LENGTH;
}

/**
 * Two-factor authentication (TOTP) enrollment + teardown.
 *
 * Flow: Set up → scan/enter the secret in an authenticator app → confirm a code
 * → MFA enabled, recovery codes shown once. Disable requires password + a code.
 */
// eslint-disable-next-line complexity -- residual complexity is the enabled/setup/verify JSX render branches (incl. the `setup` narrowing guard); non-JSX logic is in mfaRenderFlags; reducing further needs JSX extraction. tracked minicloud-gitops#2353
export function MfaSection() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const enabled = Boolean(user?.mfaEnabled);

  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const setupMutation = useMutation({
    mutationFn: () => authApi.setupMfa(),
    onSuccess: (res) => {
      if (res.data) setSetup(res.data);
      setRecoveryCodes(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const enableMutation = useMutation({
    mutationFn: () => authApi.enableMfa(code.trim()),
    onSuccess: (res) => {
      setRecoveryCodes(res.data?.recoveryCodes ?? []);
      setSetup(null);
      setCode('');
      if (user) setUser({ ...user, mfaEnabled: true });
      toast.success(t('settings.mfa.toastEnabled'));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const disableMutation = useMutation({
    mutationFn: () => authApi.disableMfa(disablePassword, disableCode.trim()),
    onSuccess: () => {
      if (user) setUser({ ...user, mfaEnabled: false });
      setDisablePassword('');
      setDisableCode('');
      toast.success(t('settings.mfa.toastDisabled'));
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const copyRecoveryCodes = () => {
    if (recoveryCodes) {
      void navigator.clipboard?.writeText(recoveryCodes.join('\n'));
      toast.success(t('settings.mfa.toastCopied'));
    }
  };

  const { showEnrollButton, showVerifyStep, descKey } = mfaRenderFlags(enabled, Boolean(setup));
  const isEnableDisabled = enableDisabled(enableMutation.isPending, code);
  const isDisableDisabled = disableDisabled(disableMutation.isPending, disablePassword, disableCode);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
          )}
          {t('settings.mfa.title')}
        </CardTitle>
        <CardDescription>
          {t(descKey)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* One-time recovery codes shown right after enabling */}
        {recoveryCodes && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4 space-y-3 dark:bg-amber-950/30">
            <p className="text-sm font-medium">
              {t('settings.mfa.recoveryNote')}
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {recoveryCodes.map((rc) => (
                <span key={rc}>{rc}</span>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={copyRecoveryCodes}>
              <Copy className="mr-2 h-4 w-4" />
              {t('settings.mfa.copyCodes')}
            </Button>
          </div>
        )}

        {/* Disabled → enrollment */}
        {showEnrollButton && (
          <Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
            {setupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('settings.mfa.setup')}
          </Button>
        )}

        {showVerifyStep && setup && (
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-medium">{t('settings.mfa.step1')}</p>
              <p className="text-xs text-muted-foreground">
                {t('settings.mfa.step1Desc')}
              </p>
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <QRCodeSVG value={setup.otpauthUrl} size={180} />
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.mfa.manualEntry')}</p>
              <code className="block break-all rounded bg-muted px-2 py-1 text-xs select-all">
                {setup.secret}
              </code>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('settings.mfa.step2')}</p>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t('settings.mfa.codePlaceholder')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={enableMutation.isPending}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => enableMutation.mutate()}
                  disabled={isEnableDisabled}
                >
                  {enableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('settings.mfa.enable')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSetup(null);
                    setCode('');
                  }}
                  disabled={enableMutation.isPending}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Enabled → disable form */}
        {enabled && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('settings.mfa.disablePrompt')}
            </p>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder={t('settings.mfa.currentPasswordPlaceholder')}
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              disabled={disableMutation.isPending}
            />
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t('settings.mfa.disableCodePlaceholder')}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              disabled={disableMutation.isPending}
            />
            <Button
              variant="destructive"
              onClick={() => disableMutation.mutate()}
              disabled={isDisableDisabled}
            >
              {disableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('settings.mfa.disable')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
