'use client';

import { Gauge, AlertTriangle, Clock, CalendarClock, FileDown } from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { auditReadinessApi, type DeadlineItem } from '@/features/audit-readiness/api/audit-readiness';
import { useAuditDashboardQuery } from '@/features/audit-readiness/queries/use-audit-dashboard-query';

const sevVariant = (c: string | null): 'destructive' | 'secondary' =>
  c === 'critical' || c === 'important' ? 'destructive' : 'secondary';

function MetricCard({
  icon: Icon,
  title,
  value,
  hint,
  tone = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'warn' | 'danger';
}) {
  const valueColor =
    tone === 'danger' ? 'text-destructive' : tone === 'warn' ? 'text-amber-600' : '';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-semibold ${valueColor}`}>{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

const deadlineLabel = (d: DeadlineItem) =>
  d.dueInDays < 0
    ? `${d.kind === 'contract' ? 'Contract' : 'Reassessment'} overdue by ${Math.abs(d.dueInDays)}d`
    : `${d.kind === 'contract' ? 'Contract expires' : 'Reassessment due'} in ${d.dueInDays}d`;

export function AuditReadinessPage() {
  const { data, isLoading } = useAuditDashboardQuery();

  return (
    <div className="page-container mx-auto max-w-7xl space-y-6">
      <PageHeader
        icon={Gauge}
        title="Audit Readiness"
        description={
          <>
            DORA Art. 28(1) — overdue reassessments, evidence freshness, register coverage and
            upcoming deadlines, computed live from the arrangement register.
          </>
        }
      />

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Gauge className="h-4 w-4" /> Register coverage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{data.coverage.percent}%</div>
                <Progress value={data.coverage.percent} className="mt-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.coverage.complete} of {data.coverage.total} arrangements with no open gap
                </p>
              </CardContent>
            </Card>

            <MetricCard
              icon={AlertTriangle}
              title="Overdue reassessments"
              value={data.overdueReassessments.total}
              tone={data.overdueReassessments.total > 0 ? 'danger' : 'default'}
              hint={`${data.overdueReassessments.cif} critical · ${data.overdueReassessments.standard} standard`}
            />

            <MetricCard
              icon={Clock}
              title="Evidence freshness"
              value={`${data.freshness.fresh} fresh`}
              tone={data.freshness.stale + data.freshness.neverAssessed > 0 ? 'warn' : 'default'}
              hint={`${data.freshness.aging} aging · ${data.freshness.stale} stale · ${data.freshness.neverAssessed} never assessed`}
            />

            <MetricCard
              icon={CalendarClock}
              title={`Deadlines (${data.upcomingDeadlines.windowDays}d)`}
              value={
                data.upcomingDeadlines.contractsExpired +
                data.upcomingDeadlines.contractsExpiringSoon +
                data.upcomingDeadlines.reassessmentsDueSoon
              }
              tone={data.upcomingDeadlines.contractsExpired > 0 ? 'danger' : 'warn'}
              hint={`${data.upcomingDeadlines.contractsExpired} expired · ${data.upcomingDeadlines.contractsExpiringSoon} expiring · ${data.upcomingDeadlines.reassessmentsDueSoon} reassessments due`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Overdue reassessments</CardTitle>
              <CardDescription>
                Arrangements past their re-assessment cadence (critical 90d / standard 180d). Download a
                tamper-evident evidence pack for the auditor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.overdueReassessments.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nothing overdue — every active arrangement is within its cadence.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arrangement</TableHead>
                        <TableHead>Criticality</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Evidence pack</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.overdueReassessments.items.slice(0, 20).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm font-medium">{item.label}</TableCell>
                          <TableCell>
                            <Badge variant={sevVariant(item.criticality)}>
                              {item.criticality ?? 'unclassified'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.neverAssessed ? 'Never assessed' : `Overdue by ${item.overdueByDays}d`}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => auditReadinessApi.downloadPack(item.id)}
                            >
                              <FileDown className="mr-2 h-4 w-4" /> Pack
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {data.upcomingDeadlines.items.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming deadlines</CardTitle>
                <CardDescription>
                  Contracts and reassessments falling due within {data.upcomingDeadlines.windowDays} days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arrangement</TableHead>
                        <TableHead>Deadline</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.upcomingDeadlines.items.slice(0, 20).map((d, i) => (
                        <TableRow key={`${d.id}-${d.kind}-${i}`}>
                          <TableCell className="text-sm font-medium">{d.label}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {deadlineLabel(d)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
