/**
 * Alert Monitor Service
 *
 * Runs compliance checks across all workspaces and sends email alerts to
 * workspace owners when thresholds are breached. Deduplication via the
 * workspace alertsSentAt JSONB map prevents repeated alerts within 20 hours.
 *
 * RTV-49: migrated off Mongoose — all data access via the Drizzle repos. Runs in the
 * monitoring worker (no request tenant context); the workspace/assessment queries here
 * are explicit cross-workspace/org (unscoped) reads.
 */

import {
  workspaceRepository,
  assessmentRepository,
  workspaceMemberRepository,
  organizationRepository,
  userRepository,
} from '../repositories/index.js';
import { safeDecrypt } from '../utils/security/fieldEncryption.js';
import emailService from './emailService.js';
import logger from '../config/logger.js';

const DEDUP_WINDOW_MS = 20 * 60 * 60 * 1000; // 20 hours
const CONCENTRATION_FN_THRESHOLD = Number(process.env.CONCENTRATION_ALERT_THRESHOLD || 3);

export async function runMonitoringAlerts() {
  logger.info('Starting monitoring alert checks', { service: 'alertMonitor' });

  const results = await Promise.allSettled([
    checkCertificationExpiry(),
    checkContractRenewal(),
    checkAnnualReviewOverdue(),
    checkAssessmentOverdue(),
    checkConcentrationRisk(),
  ]);
  const labels = ['Cert expiry', 'Contract renewal', 'Annual review', 'Assessment overdue', 'Concentration risk'];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      logger.error(`${labels[i]} check failed`, { error: r.reason?.message, service: 'alertMonitor' });
    }
  });

  logger.info('Monitoring alert checks complete', { service: 'alertMonitor' });
}

// Check 1 — Certification expiry (90 / 30 / 7 day windows)
async function checkCertificationExpiry() {
  const workspaces = await workspaceRepository.findWithCertifications();
  const now = new Date();

  for (const workspace of workspaces) {
    for (const cert of workspace.certifications) {
      if (!cert.validUntil) continue;

      const daysUntilExpiry = (new Date(cert.validUntil) - now) / (24 * 60 * 60 * 1000);

      let threshold = null;
      if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) threshold = 7;
      else if (daysUntilExpiry > 7 && daysUntilExpiry <= 30) threshold = 30;
      else if (daysUntilExpiry > 30 && daysUntilExpiry <= 90) threshold = 90;

      if (!threshold) continue;

      const alertKey = `cert-expiry-${threshold}-${cert.type}`;
      if (isWithinDedupWindow(workspace, alertKey)) continue;

      const details = {
        certType: cert.type,
        expiryDate: formatDate(cert.validUntil),
      };

      await sendAlertToOwners(workspace, `cert-expiry-${threshold}`, details);
      await workspaceRepository.setAlertSentAt(workspace.id, alertKey);

      logger.info('Cert expiry alert sent', {
        service: 'alertMonitor',
        workspaceId: workspace.id,
        certType: cert.type,
        threshold,
      });
    }
  }
}

// Check 2 — Contract renewal (60 days before contractEnd)
async function checkContractRenewal() {
  const now = new Date();
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const workspaces = await workspaceRepository.findByContractEndingSoon(now, in60Days);

  for (const workspace of workspaces) {
    const alertKey = 'contract-renewal-60';
    if (isWithinDedupWindow(workspace, alertKey)) continue;

    await sendAlertToOwners(workspace, 'contract-renewal-60', {
      contractEnd: formatDate(workspace.contractEnd),
    });
    await workspaceRepository.setAlertSentAt(workspace.id, alertKey);

    logger.info('Contract renewal alert sent', { service: 'alertMonitor', workspaceId: workspace.id });
  }
}

// Check 3 — Annual review overdue (nextReviewDate < now)
async function checkAnnualReviewOverdue() {
  const workspaces = await workspaceRepository.findDueForReview(new Date());

  for (const workspace of workspaces) {
    const alertKey = 'annual-review-overdue';
    if (isWithinDedupWindow(workspace, alertKey)) continue;

    await sendAlertToOwners(workspace, 'annual-review-overdue', {
      reviewDate: formatDate(workspace.nextReviewDate),
    });
    await workspaceRepository.setAlertSentAt(workspace.id, alertKey);

    logger.info('Annual review overdue alert sent', {
      service: 'alertMonitor',
      workspaceId: workspace.id,
    });
  }
}

// Check 4 — Assessment overdue (no complete assessment in 12 months)
async function checkAssessmentOverdue() {
  const workspaces = await workspaceRepository.find();
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const perWorkspace = workspaces.map(async (workspace) => {
    const latest = await assessmentRepository.findLatestByWorkspace(workspace.id);

    const isOverdue = !latest || new Date(latest.createdAt) < twelveMonthsAgo;
    if (!isOverdue) return;

    const alertKey = 'assessment-overdue-12mo';
    if (isWithinDedupWindow(workspace, alertKey)) return;

    await sendAlertToOwners(workspace, 'assessment-overdue-12mo', {
      lastAssessmentDate: latest ? formatDate(latest.createdAt) : null,
    });
    await workspaceRepository.setAlertSentAt(workspace.id, alertKey);

    logger.info('Assessment overdue alert sent', {
      service: 'alertMonitor',
      workspaceId: workspace.id,
    });
  });

  await Promise.allSettled(perWorkspace);
}

// Check 5 — Concentration risk (RTV-15 P3, DORA Art 28(4)/29)
async function checkConcentrationRisk() {
  const { analyzeOrganization } = await import('./concentrationService.js');
  const orgs = await organizationRepository.find();

  const perOrg = orgs.map(async (org) => {
    let analysis;
    try {
      analysis = await analyzeOrganization(org.id);
    } catch {
      return; // best-effort per org
    }

    // (a) providers over the concentration threshold → alert that provider's owners
    for (const p of analysis.providerConcentration || []) {
      if (!p.isAssessedProvider || p.weightedScore < CONCENTRATION_FN_THRESHOLD) continue;
      const workspaceId = p.key.replace(/^w:/, '');
      const workspace = await workspaceRepository.findById(workspaceId);
      if (!workspace) continue;
      const alertKey = 'concentration-risk';
      if (isWithinDedupWindow(workspace, alertKey)) continue;
      await sendAlertToOwners(workspace, alertKey, { supportedFunctions: p.supportedFunctions });
      await workspaceRepository.setAlertSentAt(workspace.id, alertKey);
      logger.info('Concentration risk alert sent', {
        service: 'alertMonitor',
        workspaceId,
        supportedFunctions: p.supportedFunctions,
      });
    }

    // (b) single points of failure on a CRITICAL function → alert the sole provider's owners
    for (const spof of analysis.singlePointsOfFailure || []) {
      if (spof.criticality !== 'critical') continue;
      const workspace = await workspaceRepository.findByOrgAndName(org.id, spof.soleProvider);
      if (!workspace) continue;
      const alertKey = `spof:${spof.functionId}`;
      if (isWithinDedupWindow(workspace, alertKey)) continue;
      await sendAlertToOwners(workspace, 'single-point-of-failure', {
        functionName: spof.functionName,
      });
      await workspaceRepository.setAlertSentAt(workspace.id, alertKey);
      logger.info('SPOF alert sent', {
        service: 'alertMonitor',
        workspaceId: workspace.id,
        functionName: spof.functionName,
      });
    }
  });

  await Promise.allSettled(perOrg);
}

/**
 * Sends a 30-day review reminder to all workspace owners.
 * Called by monitoringWorker when the delayed 'review-reminder' job fires.
 */
export async function sendReviewReminderAlert(workspaceId) {
  const workspace = await workspaceRepository.findById(workspaceId);
  if (!workspace) {
    logger.warn('Review reminder: workspace not found', { service: 'alertMonitor', workspaceId });
    return;
  }

  await sendAlertToOwners(workspace, 'review-due-30', {
    reviewDate: workspace.nextReviewDate ? formatDate(workspace.nextReviewDate) : 'soon',
  });
  logger.info('Review reminder sent', { service: 'alertMonitor', workspaceId });
}

// Shared helpers
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isWithinDedupWindow(workspace, alertKey) {
  const lastSent = workspace.alertsSentAt?.[alertKey];
  if (!lastSent) return false;
  return Date.now() - new Date(lastSent).getTime() < DEDUP_WINDOW_MS;
}

async function sendAlertToOwners(workspace, alertType, details) {
  const members = await workspaceMemberRepository.findOwnersWithUser(workspace.id);

  for (const member of members) {
    const user = member.user;
    if (!user?.email) continue;
    if (user.notificationPreferences?.email?.system_alert === false) continue;

    try {
      await emailService.sendMonitoringAlert({
        toEmail: user.email,
        toName: safeDecrypt(user.name),
        workspaceName: workspace.name,
        alertType,
        details,
      });
    } catch (err) {
      logger.error('Failed to send monitoring alert email', {
        service: 'alertMonitor',
        userId: user.id,
        workspaceId: workspace.id,
        alertType,
        error: err.message,
      });
    }
  }
}

// Weekly Digest — summary email sent once per week to workspace owners
export async function runWeeklyDigest() {
  logger.info('Starting weekly digest run', { service: 'alertMonitor' });

  const ownerGroups = await workspaceMemberRepository.groupOwnerWorkspaces();

  let sent = 0;
  for (const { userId, workspaceIds } of ownerGroups) {
    try {
      const user = await userRepository.findById(userId); // sanitized: email, decrypted name, prefs
      if (!user) continue;
      if (user.notificationPreferences?.email?.weekly_digest === false) continue;

      const workspaces = await workspaceRepository.findByIds(workspaceIds);
      if (!workspaces.length) continue;

      const cutoff30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const items = await Promise.all(
        workspaces.map(async (ws) => {
          const score = await assessmentRepository.getComplianceScore(ws.id);
          const reviewDue =
            ws.nextReviewDate && new Date(ws.nextReviewDate) < cutoff30
              ? new Date(ws.nextReviewDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : null;
          return {
            workspaceId: ws.id.toString(),
            workspaceName: ws.name,
            score: score?.score ?? null,
            trend: score?.trend ?? 0,
            status: score?.status ?? null,
            reviewDue,
          };
        })
      );

      await emailService.sendWeeklyDigest({ toEmail: user.email, toName: user.name, items });
      sent++;
    } catch (err) {
      logger.error('Failed to send weekly digest', {
        service: 'alertMonitor',
        userId,
        error: err.message,
      });
    }
  }

  logger.info('Weekly digest run complete', { service: 'alertMonitor', sent });
}
