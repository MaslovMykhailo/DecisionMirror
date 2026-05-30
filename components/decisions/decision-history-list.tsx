"use client";

import { ArrowRight, History } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { AnalysisStateMessage, AnalysisStatusBadge } from "@/components/decisions/analysis-status";
import {
  DecisionStatusPoller,
  type DecisionStatusUpdate,
} from "@/components/decisions/decision-status-poller";
import { Link } from "@/lib/i18n/navigation";
import { useTaxonomyLabels } from "@/lib/i18n/taxonomy-labels";
import type { DecisionHistoryItem } from "@/lib/decisions/history";

type DecisionHistoryListProps = {
  decisions: DecisionHistoryItem[];
};

export function DecisionHistoryList({ decisions }: DecisionHistoryListProps) {
  const t = useTranslations("DecisionHistory");
  const labels = useTaxonomyLabels();
  const [statusUpdates, setStatusUpdates] = useState<Record<string, DecisionStatusUpdate>>({});

  const handleStatusChange = useCallback((update: DecisionStatusUpdate) => {
    setStatusUpdates((current) => ({ ...current, [update.decisionId]: update }));
  }, []);
  const visibleDecisions = decisions.map((decision) => {
    const update = statusUpdates[decision.id];
    return update
      ? {
          ...decision,
          newestAnalysis: {
            analysisId: update.analysisId,
            version: update.version,
            status: update.status,
            updatedAt: update.updatedAt,
            isStalled: update.isStalled,
            retryable: update.retryable,
            ...(update.failureReason ? { failureReason: update.failureReason } : {}),
          },
        }
      : decision;
  });

  return (
    <section className="grid gap-6">
      <DecisionStatusPoller
        decisions={visibleDecisions.map((decision) => ({
          decisionId: decision.id,
          status: decision.newestAnalysis?.status ?? null,
          isStalled: decision.newestAnalysis?.isStalled,
        }))}
        onStatusChange={handleStatusChange}
      />

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <History aria-hidden="true" className="text-primary size-5" />
          <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl text-sm">{t("description")}</p>
      </header>

      {visibleDecisions.length === 0 ? (
        <div className="border-border bg-muted/20 grid gap-2 rounded-md border px-4 py-6">
          <h2 className="font-heading text-lg font-semibold">{t("emptyTitle")}</h2>
          <p className="text-muted-foreground text-sm">{t("emptyDescription")}</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {visibleDecisions.map((decision) => (
            <li key={decision.id} className="border-border rounded-md border">
              <Link
                href={`/decisions/${decision.id}`}
                className="hover:bg-accent/60 focus-visible:ring-ring grid gap-3 rounded-md p-4 transition-colors outline-none focus-visible:ring-[3px]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="grid min-w-0 gap-2">
                    <p className="font-medium">{decision.summary}</p>
                    {decision.newestReadyCategory ? (
                      <p className="text-muted-foreground text-sm">
                        {t("categoryLabel", {
                          category: labels.category(decision.newestReadyCategory),
                        })}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {decision.newestAnalysis ? (
                      <AnalysisStatusBadge
                        status={decision.newestAnalysis.status}
                        isStalled={decision.newestAnalysis.isStalled}
                      />
                    ) : null}
                    <ArrowRight aria-hidden="true" className="text-muted-foreground size-4" />
                  </div>
                </div>

                {decision.newestAnalysis?.status === "ready" ? null : (
                  <AnalysisStateMessage
                    status={decision.newestAnalysis?.status ?? null}
                    isStalled={decision.newestAnalysis?.isStalled}
                    failureReason={decision.newestAnalysis?.failureReason}
                    hasReadyResult={Boolean(decision.newestReadyCategory)}
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
