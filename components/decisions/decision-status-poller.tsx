"use client";

import { useEffect } from "react";

import type { AnalysisStatus } from "@/lib/decisions/history";
import { useRouter } from "@/lib/i18n/navigation";

type VisibleDecisionStatus = {
  decisionId: string;
  status: AnalysisStatus | null;
};

export type DecisionStatusUpdate = {
  decisionId: string;
  analysisId: string;
  version: number;
  status: AnalysisStatus;
  updatedAt: string;
  failureReason?: string;
};

type DecisionStatusPollerProps = {
  decisions: VisibleDecisionStatus[];
  onStatusChange?: (update: DecisionStatusUpdate) => void;
  initialDelayMs?: number;
  maxDelayMs?: number;
};

type StatusPayload = Omit<DecisionStatusUpdate, "decisionId">;

function isAnalysisStatus(value: unknown): value is AnalysisStatus {
  return value === "processing" || value === "ready" || value === "failed";
}

function parseStatusPayload(payload: unknown): StatusPayload | null {
  if (!payload || typeof payload !== "object") return null;

  const data = payload as Record<string, unknown>;
  if (
    typeof data.analysisId !== "string" ||
    typeof data.version !== "number" ||
    !isAnalysisStatus(data.status) ||
    typeof data.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    analysisId: data.analysisId,
    version: data.version,
    status: data.status,
    updatedAt: data.updatedAt,
    ...(typeof data.failureReason === "string" ? { failureReason: data.failureReason } : {}),
  };
}

function processingDecisionIds(decisions: VisibleDecisionStatus[]) {
  return decisions
    .filter((decision) => decision.status === "processing")
    .map((decision) => decision.decisionId)
    .sort();
}

export function DecisionStatusPoller({
  decisions,
  onStatusChange,
  initialDelayMs = 1000,
  maxDelayMs = 8000,
}: DecisionStatusPollerProps) {
  const router = useRouter();
  const pollKey = processingDecisionIds(decisions).join("|");

  useEffect(() => {
    const decisionIds = processingDecisionIds(decisions);
    if (decisionIds.length === 0) return undefined;

    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    function schedule(decisionId: string, delayMs: number) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        void poll(decisionId, delayMs);
      }, delayMs);
      timers.add(timer);
    }

    async function poll(decisionId: string, currentDelayMs: number) {
      if (cancelled) return;

      try {
        const response = await fetch(`/api/decisions/${decisionId}/status`, {
          headers: { Accept: "application/json" },
        });
        const payload = response.ok ? parseStatusPayload(await response.json()) : null;

        if (!payload) {
          schedule(decisionId, Math.min(currentDelayMs * 2, maxDelayMs));
          return;
        }

        onStatusChange?.({ decisionId, ...payload });

        if (payload.status === "ready") {
          router.refresh();
          return;
        }

        if (payload.status === "failed") return;

        schedule(decisionId, Math.min(currentDelayMs * 2, maxDelayMs));
      } catch {
        schedule(decisionId, Math.min(currentDelayMs * 2, maxDelayMs));
      }
    }

    for (const decisionId of decisionIds) {
      void poll(decisionId, initialDelayMs);
    }

    return () => {
      cancelled = true;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    };
  }, [decisions, initialDelayMs, maxDelayMs, onStatusChange, pollKey, router]);

  return null;
}
