import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOWS } from '../../lib/brand';
import { computeSpring } from '../../lib/spring';
import { SectionTitle } from '../../components/SectionTitle';

// The AI-native flow: agents do the work, you review & sign off, outcomes are delivered.
const STEPS = [
  { num: '1', title: 'Hand over data', sub: 'Connect your systems or drop in contracts — no data entry.' },
  { num: '2', title: 'Agents assess', sub: 'They discover providers and grade each against DORA.' },
  { num: '3', title: 'Agents draft', sub: 'Register, Art-30 amendments and exit plans — continuously.' },
  { num: '4', title: 'You sign off', sub: 'Every draft hits your inbox; agents propose, you dispose.' },
  { num: '5', title: 'Outcome delivered', sub: 'An audit-ready Register of Information, defensible in review.' },
];

export function Scene02HowItWorks() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 56,
        padding: '0 80px',
      }}
    >
      <SectionTitle title="How It Works" delay={0} fontSize={FONT_SIZES.xl} />

      <div style={{ display: 'flex', gap: 0, alignItems: 'center', width: '100%', maxWidth: 1400 }}>
        {STEPS.map((step, i) => {
          const delay = i * 54;
          const translateY = computeSpring(frame, fps, delay, 'smooth', 30, 0);
          const opacity = computeSpring(frame, fps, delay, 'smooth', 0, 1);

          return (
            <React.Fragment key={step.num}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                  opacity,
                  transform: `translateY(${translateY}px)`,
                  padding: '24px 16px',
                  background: COLORS.surface,
                  borderRadius: RADIUS.lg,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: SHADOWS.card,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: COLORS.blue,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FONTS.sans,
                    fontSize: FONT_SIZES.md,
                    fontWeight: 800,
                    boxShadow: `0 0 16px 4px ${COLORS.blueGlow}`,
                  }}
                >
                  {step.num}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: FONTS.sans,
                      fontSize: FONT_SIZES.base,
                      fontWeight: 600,
                      color: COLORS.text,
                      marginBottom: 6,
                    }}
                  >
                    {step.title}
                  </div>
                  <div
                    style={{
                      fontFamily: FONTS.sans,
                      fontSize: FONT_SIZES.sm,
                      color: COLORS.textMuted,
                      lineHeight: 1.4,
                    }}
                  >
                    {step.sub}
                  </div>
                </div>
              </div>

              {/* Arrow between cards */}
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    color: COLORS.border,
                    fontSize: 24,
                    padding: '0 8px',
                    opacity: computeSpring(frame, fps, (i + 1) * 54, 'smooth', 0, 1),
                    flexShrink: 0,
                  }}
                >
                  →
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
