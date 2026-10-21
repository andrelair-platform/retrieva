'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * "See it work" — a click-to-play embed of the rendered ProductExplainer (the Remotion video).
 *
 * Lazy by design: the heavy <video> only mounts after the user clicks, so it never costs LCP/bandwidth
 * on load — a branded CSS poster stands in until then. Serves the 720p render to small screens and the
 * full render to large ones.
 *
 * NOTE: the files in /public/videos are rendered manually (`cd videos && npm run render:explainer`).
 * Re-render after any script change so the footage matches the current copy.
 */
export function ProductTour() {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);

  return (
    <section className="container mx-auto px-4 py-24" aria-label={t('landing.tour.heading')}>
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          {t('landing.tour.heading')}
        </h2>
        <p className="mt-3 text-lg text-muted-foreground">{t('landing.tour.subtitle')}</p>
      </div>

      <div className="relative mx-auto aspect-video max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {playing ? (
          <video
            className="h-full w-full"
            controls
            autoPlay
            playsInline
            preload="metadata"
          >
            <source src="/videos/product-explainer-720p.mp4" type="video/mp4" media="(max-width: 768px)" />
            <source src="/videos/product-explainer.mp4" type="video/mp4" />
          </video>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-card to-background transition-colors hover:from-card/80"
          >
            {/* ambient brand glow */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
            />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105">
              <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
              <Play className="relative ml-0.5 h-7 w-7 fill-current" />
            </span>
            <span className="relative font-medium text-foreground">{t('landing.tour.play')}</span>
            <span className="relative font-mono text-xs text-muted-foreground">
              {t('landing.tour.duration')}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
