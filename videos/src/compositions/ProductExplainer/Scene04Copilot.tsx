import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SHADOWS } from '../../lib/brand';
import { computeSpring } from '../../lib/spring';
import { SectionTitle } from '../../components/SectionTitle';
import { CodeLine } from '../../components/CodeLine';
import { Badge } from '../../components/Badge';

const Q1 = 'What DORA articles did the agents review for third-party ICT risk?';
const A1 = 'The agents assessed Articles 28-44 on ICT third-party risk, covering due diligence, contractual provisions, and the Register of Information under Art. 28(3).';

const Q2 = 'What did the agents find for vendor Acme Corp on Art. 11?';
const A2 = 'The agents flagged Acme Corp as partially covering Art. 11, based on its uploaded ICT BCP. Missing: recovery time objectives documentation.';

export function Scene04Copilot() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chatOpacity = computeSpring(frame, fps, 0, 'smooth', 0, 1);
  const sourceOpacity = computeSpring(frame, fps, 90, 'smooth', 0, 1);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        padding: '0 160px',
      }}
    >
      <SectionTitle
        title="Ask the agent workforce"
        accentWord="agent"
        accentColor={COLORS.green}
        delay={0}
        fontSize={FONT_SIZES.xl}
      />

      {/* Chat window */}
      <div
        style={{
          width: '100%',
          maxWidth: 800,
          background: COLORS.surface,
          borderRadius: RADIUS.xl,
          border: `1px solid ${COLORS.border}`,
          boxShadow: SHADOWS.card,
          overflow: 'hidden',
          opacity: chatOpacity,
        }}
      >
        {/* Chat header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: `1px solid ${COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.green, boxShadow: `0 0 8px 2px ${COLORS.greenGlow}` }} />
          <span style={{ fontFamily: FONTS.sans, fontSize: FONT_SIZES.sm, color: COLORS.textMuted }}>
            DORA Copilot
          </span>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Q1 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div
              style={{
                background: `${COLORS.blue}22`,
                border: `1px solid ${COLORS.blue}44`,
                borderRadius: RADIUS.lg,
                padding: '10px 16px',
                maxWidth: '70%',
              }}
            >
              <CodeLine text={Q1} startFrame={10} durationFrames={30} color={COLORS.text} fontSize={FONT_SIZES.sm} />
            </div>
          </div>

          {/* A1 */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: `${COLORS.green}22`,
                border: `1px solid ${COLORS.green}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLORS.green,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              ✦
            </div>
            <div
              style={{
                background: COLORS.surfaceAlt,
                borderRadius: RADIUS.lg,
                padding: '10px 16px',
                maxWidth: '75%',
              }}
            >
              <CodeLine text={A1} startFrame={50} durationFrames={60} color={COLORS.textMuted} fontSize={FONT_SIZES.sm} showCursor={false} />
            </div>
          </div>

          {/* Q2 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div
              style={{
                background: `${COLORS.blue}22`,
                border: `1px solid ${COLORS.blue}44`,
                borderRadius: RADIUS.lg,
                padding: '10px 16px',
                maxWidth: '70%',
              }}
            >
              <CodeLine text={Q2} startFrame={120} durationFrames={25} color={COLORS.text} fontSize={FONT_SIZES.sm} />
            </div>
          </div>

          {/* A2 */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: `${COLORS.green}22`,
                border: `1px solid ${COLORS.green}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: COLORS.green,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              ✦
            </div>
            <div
              style={{
                background: COLORS.surfaceAlt,
                borderRadius: RADIUS.lg,
                padding: '10px 16px',
                maxWidth: '75%',
              }}
            >
              <CodeLine text={A2} startFrame={155} durationFrames={65} color={COLORS.textMuted} fontSize={FONT_SIZES.sm} showCursor={false} />
            </div>
          </div>
        </div>

        {/* Source citation */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: `1px solid ${COLORS.border}`,
            opacity: sourceOpacity,
          }}
        >
          <Badge text="Source: Acme_ICT_BCP_2024.pdf · Page 12" color={COLORS.purple} delay={90} />
        </div>
      </div>
    </div>
  );
}
