"use client";

import { ArrowLeft, RefreshCw, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { AnalysisStateMessage, AnalysisStatusBadge } from "@/components/decisions/analysis-status";
import {
  DecisionStatusPoller,
  type DecisionStatusUpdate,
} from "@/components/decisions/decision-status-poller";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { useTaxonomyLabels } from "@/lib/i18n/taxonomy-labels";
import type {
  DecisionHistoryDetailResult,
  DecisionHistoryReadyAnalysis,
} from "@/lib/decisions/history";

type DecisionDetailViewProps = {
  result: DecisionHistoryDetailResult;
};

type AnalysisAction = "retry" | "reanalyze";
type MutationStatusPayload = Omit<DecisionStatusUpdate, "decisionId">;

type SectionProps = {
  title: string;
  items: string[];
};

function TextSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-muted-foreground text-sm font-medium">{label}</h2>
      <p className="text-sm leading-6">{children}</p>
    </section>
  );
}

function ProseList({ title, items }: SectionProps) {
  return (
    <section className="grid gap-2">
      <h3 className="font-heading text-base font-semibold">{title}</h3>
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item} className="border-border rounded-md border px-3 py-2 text-sm leading-6">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReadyAnalysisSections({ analysis }: { analysis: DecisionHistoryReadyAnalysis }) {
  const t = useTranslations("DecisionDetail");
  const labels = useTaxonomyLabels();
  const result = analysis.result;

  return (
    <div className="grid gap-5">
      <p className="text-muted-foreground text-sm">
        {t("categoryLabel", { category: labels.category(result.category) })}
      </p>

      <section className="grid gap-2">
        <h3 className="font-heading text-base font-semibold">{t("biases")}</h3>
        <ul className="grid gap-2">
          {result.biases.map((bias) => (
            <li key={bias.id} className="border-border grid gap-1 rounded-md border px-3 py-2">
              <p className="text-sm font-medium">{labels.bias(bias.id)}</p>
              <p className="text-muted-foreground text-sm leading-6">{bias.explanation}</p>
            </li>
          ))}
        </ul>
      </section>

      <ProseList title={t("missedAlternatives")} items={result.missedAlternatives} />
      <ProseList title={t("premortemRisks")} items={result.premortemRisks} />
      <ProseList title={t("keyAssumptions")} items={result.keyAssumptions} />
      <ProseList title={t("warningSigns")} items={result.warningSigns} />
    </div>
  );
}

function isAnalysisStatus(value: unknown): value is MutationStatusPayload["status"] {
  return value === "processing" || value === "ready" || value === "failed";
}

function parseMutationStatusPayload(payload: unknown): MutationStatusPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const analysis = data.analysis;
  if (!analysis || typeof analysis !== "object") return null;

  const statusData = analysis as Record<string, unknown>;
  if (
    typeof statusData.analysisId !== "string" ||
    typeof statusData.version !== "number" ||
    !isAnalysisStatus(statusData.status) ||
    typeof statusData.updatedAt !== "string" ||
    typeof statusData.isStalled !== "boolean" ||
    typeof statusData.retryable !== "boolean"
  ) {
    return null;
  }

  return {
    analysisId: statusData.analysisId,
    version: statusData.version,
    status: statusData.status,
    updatedAt: statusData.updatedAt,
    isStalled: statusData.isStalled,
    retryable: statusData.retryable,
    ...(typeof statusData.failureReason === "string"
      ? { failureReason: statusData.failureReason }
      : {}),
  };
}

export function DecisionDetailView({ result }: DecisionDetailViewProps) {
  const t = useTranslations("DecisionDetail");
  const locale = useLocale();
  const [statusUpdate, setStatusUpdate] = useState<DecisionStatusUpdate | null>(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(
    result.status === "success" ? (result.readyAnalysis?.analysisId ?? "") : "",
  );
  const [pendingAction, setPendingAction] = useState<AnalysisAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleStatusChange = useCallback((update: DecisionStatusUpdate) => {
    setStatusUpdate(update);
  }, []);
  const visibleResult =
    result.status === "success" && statusUpdate?.decisionId === result.decision.id
      ? {
          ...result,
          newestAnalysis: {
            analysisId: statusUpdate.analysisId,
            version: statusUpdate.version,
            status: statusUpdate.status,
            updatedAt: statusUpdate.updatedAt,
            isStalled: statusUpdate.isStalled,
            retryable: statusUpdate.retryable,
            ...(statusUpdate.failureReason ? { failureReason: statusUpdate.failureReason } : {}),
          },
        }
      : result;

  if (visibleResult.status !== "success") {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-10">
        <div className="border-border grid w-full max-w-xl gap-3 rounded-md border px-4 py-6">
          <h1 className="font-heading text-xl font-semibold">{t("notFoundTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("notFoundDescription")}</p>
          <Link className="text-primary inline-flex text-sm font-medium" href="/decisions">
            {t("backToHistory")}
          </Link>
        </div>
      </main>
    );
  }

  const newestStatus = visibleResult.newestAnalysis?.status ?? null;
  const readyAnalyses =
    visibleResult.readyAnalyses.length > 0
      ? visibleResult.readyAnalyses
      : visibleResult.readyAnalysis
        ? [visibleResult.readyAnalysis]
        : [];
  const selectedReadyAnalysis =
    readyAnalyses.find((analysis) => analysis.analysisId === selectedAnalysisId) ??
    visibleResult.readyAnalysis;
  const newestAnalysis = visibleResult.newestAnalysis;
  const activeProcessing = newestAnalysis?.status === "processing" && !newestAnalysis.isStalled;
  const showRetry = Boolean(newestAnalysis?.retryable);
  const showReanalysis = Boolean(selectedReadyAnalysis) && !activeProcessing && !showRetry;

  async function runAnalysisAction(action: AnalysisAction) {
    if (visibleResult.status !== "success") return;

    setPendingAction(action);
    setActionError(null);

    const url =
      action === "retry"
        ? `/api/decisions/${visibleResult.decision.id}/retry`
        : `/api/decisions/${visibleResult.decision.id}/reanalyze`;
    const response = await fetch(url, {
      method: "POST",
      headers:
        action === "retry"
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      ...(action === "reanalyze" ? { body: JSON.stringify({ locale }) } : {}),
    });
    const payload = response.ok ? parseMutationStatusPayload(await response.json()) : null;

    setPendingAction(null);
    if (!payload) {
      setActionError(response.status === 409 ? t("alreadyProcessing") : t("actionError"));
      return;
    }

    setStatusUpdate({ decisionId: visibleResult.decision.id, ...payload });
  }

  return (
    <main className="min-h-screen">
      <DecisionStatusPoller
        decisions={[
          {
            decisionId: visibleResult.decision.id,
            status: newestStatus,
            isStalled: visibleResult.newestAnalysis?.isStalled,
          },
        ]}
        onStatusChange={handleStatusChange}
      />

      <div className="mx-auto grid min-h-screen w-full max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-5">
          <Link
            className="text-muted-foreground inline-flex items-center gap-2 text-sm"
            href="/decisions"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t("backToHistory")}
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="font-heading text-2xl font-semibold">
              {visibleResult.decision.decision}
            </h1>
            {visibleResult.newestAnalysis ? (
              <AnalysisStatusBadge
                status={visibleResult.newestAnalysis.status}
                isStalled={visibleResult.newestAnalysis.isStalled}
              />
            ) : null}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="grid content-start gap-5">
            <h2 className="font-heading text-lg font-semibold">{t("originalInput")}</h2>
            <TextSection label={t("situation")}>{visibleResult.decision.situation}</TextSection>
            <TextSection label={t("decision")}>{visibleResult.decision.decision}</TextSection>
            {visibleResult.decision.reasoning ? (
              <TextSection label={t("reasoning")}>{visibleResult.decision.reasoning}</TextSection>
            ) : null}
          </section>

          <section className="grid content-start gap-5">
            <h2 className="font-heading text-lg font-semibold">{t("analysis")}</h2>
            {newestStatus === "ready" ? null : (
              <AnalysisStateMessage
                status={newestStatus}
                isStalled={visibleResult.newestAnalysis?.isStalled}
                failureReason={visibleResult.newestAnalysis?.failureReason}
                hasReadyResult={Boolean(visibleResult.readyAnalysis)}
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              {showRetry ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void runAnalysisAction("retry")}
                  disabled={pendingAction !== null}
                >
                  <RotateCcw aria-hidden="true" />
                  {pendingAction === "retry" ? t("retryPending") : t("retryAnalysis")}
                </Button>
              ) : null}
              {showReanalysis ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void runAnalysisAction("reanalyze")}
                  disabled={pendingAction !== null}
                >
                  <RefreshCw aria-hidden="true" />
                  {pendingAction === "reanalyze" ? t("reanalyzePending") : t("reanalyze")}
                </Button>
              ) : null}
              {activeProcessing ? (
                <Button type="button" size="sm" variant="outline" disabled>
                  <RefreshCw aria-hidden="true" />
                  {t("alreadyProcessing")}
                </Button>
              ) : null}
            </div>
            {actionError ? (
              <p className="text-destructive text-sm" role="status">
                {actionError}
              </p>
            ) : null}
            {readyAnalyses.length > 1 ? (
              <label className="grid max-w-xs gap-2 text-sm font-medium">
                {t("versionSwitcherLabel")}
                <select
                  className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
                  value={selectedReadyAnalysis?.analysisId ?? ""}
                  onChange={(event) => setSelectedAnalysisId(event.target.value)}
                >
                  {readyAnalyses.map((analysis) => (
                    <option key={analysis.analysisId} value={analysis.analysisId}>
                      {t("versionOption", { version: analysis.version })}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {selectedReadyAnalysis ? (
              <ReadyAnalysisSections analysis={selectedReadyAnalysis} />
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
