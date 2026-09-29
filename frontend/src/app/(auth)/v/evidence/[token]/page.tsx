'use client';

import { use, useEffect, useState, useRef } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Upload, FileCheck2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { publicEvidenceApi } from '@/features/evidence/api/publicEvidence';
import type { PublicEvidenceRequest, RequestedCategoryRef } from '@/features/evidence/api/publicEvidence';

type PageState =
  | { type: 'loading' }
  | { type: 'expired' }
  | { type: 'revoked' }
  | { type: 'already_complete' }
  | { type: 'error'; message: string }
  | { type: 'form'; request: PublicEvidenceRequest }
  | { type: 'submitted' };

export default function VendorEvidencePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [pageState, setPageState] = useState<PageState>({ type: 'loading' });
  // category → number of documents uploaded this session
  const [uploaded, setUploaded] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await publicEvidenceApi.getRequest(token);
        const request = res.data?.request;
        if (!request) return setPageState({ type: 'error', message: 'Evidence request not found.' });
        setPageState({ type: 'form', request });
      } catch (err: unknown) {
        const status =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined;
        if (status === 410) setPageState({ type: 'expired' });
        else if (status === 403) setPageState({ type: 'revoked' });
        else if (status === 409) setPageState({ type: 'already_complete' });
        else if (status === 404) setPageState({ type: 'error', message: 'Evidence request not found.' });
        else setPageState({ type: 'error', message: 'Unable to load this request. Please try again.' });
      }
    };
    load();
  }, [token]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await publicEvidenceApi.submit(token);
      setPageState({ type: 'submitted' });
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render states ─────────────────────────────────────────────────────────
  if (pageState.type === 'loading') {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading evidence request…</p>
        </div>
      </PublicLayout>
    );
  }

  if (pageState.type === 'expired' || pageState.type === 'revoked') {
    const revoked = pageState.type === 'revoked';
    return (
      <PublicLayout>
        <Card className="border-amber-200">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">{revoked ? 'Link Revoked' : 'Link Expired'}</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              This evidence request link has {revoked ? 'been revoked' : 'expired'}. Please contact the
              requesting organisation to request a new link.
            </p>
          </CardContent>
        </Card>
      </PublicLayout>
    );
  }

  if (pageState.type === 'already_complete') {
    return (
      <PublicLayout>
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Already Submitted</h2>
            <p className="text-muted-foreground text-sm">
              Thank you — this evidence request has already been submitted and is being reviewed.
            </p>
          </CardContent>
        </Card>
      </PublicLayout>
    );
  }

  if (pageState.type === 'submitted') {
    return (
      <PublicLayout>
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-3">Thank you!</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Your documents have been submitted to the requesting organisation&apos;s compliance team.
              You can close this page.
            </p>
          </CardContent>
        </Card>
      </PublicLayout>
    );
  }

  if (pageState.type === 'error') {
    return (
      <PublicLayout>
        <Card className="border-destructive/50">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground text-sm">{pageState.message}</p>
          </CardContent>
        </Card>
      </PublicLayout>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  const { request } = pageState;
  const totalUploaded = Object.values(uploaded).reduce((a, b) => a + b, 0);

  return (
    <PublicLayout>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">DORA Evidence Request</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            The requesting organisation has asked {request.vendorContactName || 'you'} to provide the
            documents below.
          </p>
        </div>

        {request.message && (
          <p className="text-sm leading-relaxed bg-muted/50 rounded-md px-3 py-2">{request.message}</p>
        )}

        <div className="space-y-3">
          {request.requestedCategories.map((cat) => (
            <CategoryUploadRow
              key={cat.category}
              token={token}
              cat={cat}
              count={uploaded[cat.category] ?? 0}
              onUploaded={() =>
                setUploaded((u) => ({ ...u, [cat.category]: (u[cat.category] ?? 0) + 1 }))
              }
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {totalUploaded} document{totalUploaded === 1 ? '' : 's'} uploaded
          </p>
          <Button onClick={handleSubmit} disabled={submitting || totalUploaded === 0} className="min-w-[160px]">
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {submitting ? 'Submitting…' : 'Submit Evidence'}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Accepted files: PDF, Word, Excel, images. Up to 25&nbsp;MB each. You can upload more than one
          document per category.
        </p>
      </div>
    </PublicLayout>
  );
}

// One requested category: a labelled row with an upload control + a per-session uploaded count.
function CategoryUploadRow({
  token,
  cat,
  count,
  onUploaded,
}: {
  token: string;
  cat: RequestedCategoryRef;
  count: number;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      await publicEvidenceApi.upload(token, cat.category, file);
      onUploaded();
      toast.success(`Uploaded "${file.name}"`);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium">{cat.label}</CardTitle>
          {count > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-600 shrink-0">
              <FileCheck2 className="h-3.5 w-3.5" /> {count} uploaded
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.xlsx,.xls,.docx,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.gif,.webp"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <Button variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {busy ? 'Uploading…' : count > 0 ? 'Add another' : 'Upload document'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Minimal public layout (no dashboard sidebar) — matches the /q/:token portal.
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <span className="font-bold text-base">Retrieva</span>
          <span className="text-xs text-muted-foreground">· Third-Party Risk</span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
