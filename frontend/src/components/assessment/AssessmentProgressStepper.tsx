'use client';

import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssessmentStatus } from '@/features/assessments/api/assessments';

interface Step {
  key: AssessmentStatus;
  labelKey: string;
  descKey: string;
}

const STEPS: Step[] = [
  { key: 'pending', labelKey: 'assessments.stepper.submitted', descKey: 'assessments.stepper.submittedDesc' },
  { key: 'indexing', labelKey: 'assessments.stepper.indexing', descKey: 'assessments.stepper.indexingDesc' },
  { key: 'analyzing', labelKey: 'assessments.stepper.analyzing', descKey: 'assessments.stepper.analyzingDesc' },
  { key: 'complete', labelKey: 'assessments.stepper.complete', descKey: 'assessments.stepper.completeDesc' },
];

const STATUS_ORDER: Record<AssessmentStatus, number> = {
  pending: 0,
  indexing: 1,
  analyzing: 2,
  complete: 3,
  failed: 4,
};

interface AssessmentProgressStepperProps {
  status: AssessmentStatus;
  statusMessage?: string;
}

type StepIconKind = 'failed' | 'done' | 'active' | 'upcoming';

interface StepState {
  isLast: boolean;
  iconKind: StepIconKind;
  connectorClass: string;
  circleClass: string;
  labelClass: string;
}

function pickIconKind(
  isFailed: boolean,
  isPendingStep: boolean,
  isDone: boolean,
  isActive: boolean,
): StepIconKind {
  if (isFailed && isPendingStep) return 'failed';
  if (isDone) return 'done';
  if (isActive) return 'active';
  return 'upcoming';
}

interface StepFlags {
  isDone: boolean;
  isActive: boolean;
  isUpcoming: boolean;
  isFailedHere: boolean;
  labelActive: boolean;
}

function stepClasses(flags: StepFlags) {
  const { isDone, isActive, isUpcoming, isFailedHere, labelActive } = flags;
  return {
    connectorClass: isDone ? 'bg-primary' : 'bg-border',
    circleClass: cn(
      isDone && 'border-primary text-primary',
      isActive && 'border-primary text-primary',
      isUpcoming && 'border-border text-muted-foreground',
      isFailedHere && 'border-destructive text-destructive',
    ),
    labelClass: labelActive ? 'text-foreground' : 'text-muted-foreground',
  };
}

function computeStepState(args: {
  step: Step;
  i: number;
  currentOrder: number;
  isFailed: boolean;
  status: AssessmentStatus;
}): StepState {
  const { step, i, currentOrder, isFailed, status } = args;
  const stepOrder = STATUS_ORDER[step.key];
  const isDone = !isFailed && currentOrder > stepOrder;
  const isActive = !isFailed && currentOrder === stepOrder;
  const flags: StepFlags = {
    isDone,
    isActive,
    isUpcoming: currentOrder < stepOrder,
    isFailedHere: isFailed && step.key === status,
    labelActive: (isDone || isActive) && !isFailed,
  };
  return {
    isLast: i === STEPS.length - 1,
    iconKind: pickIconKind(isFailed, step.key === 'pending', isDone, isActive),
    ...stepClasses(flags),
  };
}

export function AssessmentProgressStepper({ status, statusMessage }: AssessmentProgressStepperProps) {
  const { t } = useTranslation();
  const currentOrder = STATUS_ORDER[status];
  const isFailed = status === 'failed';

  return (
    <div className="w-full">
      <ol className="flex items-start gap-0">
        {STEPS.map((step, i) => {
          const { isLast, iconKind, connectorClass, circleClass, labelClass } = computeStepState({
            step,
            i,
            currentOrder,
            isFailed,
            status,
          });

          return (
            <li key={step.key} className={cn('flex-1 flex flex-col', !isLast && 'relative')}>
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2',
                    connectorClass
                  )}
                />
              )}

              <div className="flex flex-col items-center z-10">
                {/* Icon */}
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full border-2 bg-background',
                    circleClass
                  )}
                >
                  {iconKind === 'failed' ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : iconKind === 'done' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : iconKind === 'active' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>

                {/* Labels */}
                <p
                  className={cn(
                    'mt-2 text-xs font-medium text-center',
                    labelClass
                  )}
                >
                  {t(step.labelKey)}
                </p>
                <p className="text-xs text-muted-foreground text-center hidden sm:block">
                  {t(step.descKey)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Status message */}
      {statusMessage && (
        <p
          className={cn(
            'mt-4 text-sm text-center',
            isFailed ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {statusMessage}
        </p>
      )}
    </div>
  );
}
