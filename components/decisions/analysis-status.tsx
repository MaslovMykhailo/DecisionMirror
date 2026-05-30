"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AnalysisStatus } from "@/lib/decisions/history";
import { cn } from "@/lib/utils";

type DisplayedAnalysisStatus = AnalysisStatus | "stalled";

const badgeStyles: Record<DisplayedAnalysisStatus, string> = {
  processing:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300",
  ready:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300",
  failed:
    "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/15",
  stalled:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
};

const statusIcons = {
  processing: LoaderCircle,
  ready: CheckCircle2,
  failed: AlertTriangle,
  stalled: AlertTriangle,
} as const;

type AnalysisStatusBadgeProps = {
  status: AnalysisStatus;
  isStalled?: boolean;
  className?: string;
};

type AnalysisStateMessageProps = {
  status: AnalysisStatus | null;
  isStalled?: boolean;
  failureReason?: string;
  hasReadyResult?: boolean;
  className?: string;
};

export function AnalysisStatusBadge({
  status,
  isStalled = false,
  className,
}: AnalysisStatusBadgeProps) {
  const t = useTranslations("AnalysisState.status");
  const displayedStatus: DisplayedAnalysisStatus =
    status === "processing" && isStalled ? "stalled" : status;
  const Icon = statusIcons[displayedStatus];

  return (
    <span
      data-analysis-status={displayedStatus}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium",
        badgeStyles[displayedStatus],
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn(displayedStatus === "processing" && "animate-spin")} />
      {t(displayedStatus)}
    </span>
  );
}

export function AnalysisStateMessage({
  status,
  isStalled = false,
  failureReason,
  hasReadyResult = false,
  className,
}: AnalysisStateMessageProps) {
  const t = useTranslations("AnalysisState");
  const message =
    status === "failed"
      ? failureReason
        ? t("failedWithReason", { reason: failureReason })
        : t("failed")
      : status === "processing" && isStalled && hasReadyResult
        ? t("stalledWithReady")
        : status === "processing" && isStalled
          ? t("stalled")
          : status === "processing" && hasReadyResult
            ? t("newerProcessing")
            : status === "processing"
              ? t("processing")
              : t("notReady");

  return (
    <p
      data-analysis-state={status ?? "none"}
      className={cn("text-muted-foreground text-sm", className)}
    >
      {message}
    </p>
  );
}
