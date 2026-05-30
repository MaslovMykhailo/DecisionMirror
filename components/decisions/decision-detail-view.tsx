"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { AnalysisStateMessage, AnalysisStatusBadge } from "@/components/decisions/analysis-status";
import {
  DecisionStatusPoller,
  type DecisionStatusUpdate,
} from "@/components/decisions/decision-status-poller";
import { Link } from "@/lib/i18n/navigation";
import { useTaxonomyLabels } from "@/lib/i18n/taxonomy-labels";
import type {
  DecisionHistoryDetailResult,
  DecisionHistoryReadyAnalysis,
} from "@/lib/decisions/history";

type DecisionDetailViewProps = {
  result: DecisionHistoryDetailResult;
};

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

export function DecisionDetailView({ result }: DecisionDetailViewProps) {
  const t = useTranslations("DecisionDetail");
  const [statusUpdate, setStatusUpdate] = useState<DecisionStatusUpdate | null>(null);

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

  return (
    <main className="min-h-screen">
      <DecisionStatusPoller
        decisions={[
          {
            decisionId: visibleResult.decision.id,
            status: newestStatus,
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
              <AnalysisStatusBadge status={visibleResult.newestAnalysis.status} />
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
                failureReason={visibleResult.newestAnalysis?.failureReason}
                hasReadyResult={Boolean(visibleResult.readyAnalysis)}
              />
            )}
            {visibleResult.readyAnalysis ? (
              <ReadyAnalysisSections analysis={visibleResult.readyAnalysis} />
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
