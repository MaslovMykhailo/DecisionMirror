"use client";

import { ArrowRight, History } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";

import { AnalysisStateMessage, AnalysisStatusBadge } from "@/components/decisions/analysis-status";
import {
  DecisionStatusPoller,
  type DecisionStatusUpdate,
} from "@/components/decisions/decision-status-poller";
import type {
  DecisionHistoryFilters,
  DecisionHistoryItem,
  DecisionHistorySort,
} from "@/lib/decisions/history";
import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { useTaxonomyLabels } from "@/lib/i18n/taxonomy-labels";
import {
  COGNITIVE_BIASES,
  DECISION_CATEGORIES,
  type CognitiveBias,
  type DecisionCategory,
} from "@/lib/taxonomy";

type DecisionHistoryListProps = {
  decisions: DecisionHistoryItem[];
  filters?: DecisionHistoryFilters;
  sort?: DecisionHistorySort;
};

type DecisionHistoryQueryState = DecisionHistoryFilters & {
  sort: DecisionHistorySort;
};

const defaultFilters: DecisionHistoryFilters = { category: null, bias: null };

function historyListHref(pathname: string, state: DecisionHistoryQueryState) {
  const params = new URLSearchParams();

  if (state.category) params.set("category", state.category);
  if (state.bias) params.set("bias", state.bias);
  if (state.sort !== "created_at") params.set("sort", state.sort);

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function DecisionHistoryList({
  decisions,
  filters = defaultFilters,
  sort = "created_at",
}: DecisionHistoryListProps) {
  const t = useTranslations("DecisionHistory");
  const labels = useTaxonomyLabels();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [statusUpdates, setStatusUpdates] = useState<Record<string, DecisionStatusUpdate>>({});

  const handleStatusChange = useCallback((update: DecisionStatusUpdate) => {
    setStatusUpdates((current) => ({ ...current, [update.decisionId]: update }));
  }, []);
  const updateQueryState = useCallback(
    (nextState: Partial<DecisionHistoryQueryState>) => {
      const href = historyListHref(pathname, {
        category: filters.category,
        bias: filters.bias,
        sort,
        ...nextState,
      });

      startTransition(() => {
        router.replace(href);
      });
    },
    [filters.bias, filters.category, pathname, router, sort],
  );
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
  const hasActiveFilters = Boolean(filters.category || filters.bias);

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

      <div className="border-border bg-muted/20 grid gap-3 rounded-md border p-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{t("categoryFilter")}</span>
          <select
            value={filters.category ?? ""}
            disabled={isPending}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            onChange={(event) => {
              updateQueryState({
                category: event.target.value ? (event.target.value as DecisionCategory) : null,
              });
            }}
          >
            <option value="">{t("allCategories")}</option>
            {DECISION_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {labels.category(category)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{t("biasFilter")}</span>
          <select
            value={filters.bias ?? ""}
            disabled={isPending}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            onChange={(event) => {
              updateQueryState({
                bias: event.target.value ? (event.target.value as CognitiveBias) : null,
              });
            }}
          >
            <option value="">{t("allBiases")}</option>
            {COGNITIVE_BIASES.map((bias) => (
              <option key={bias} value={bias}>
                {labels.bias(bias)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">{t("sortControl")}</span>
          <select
            value={sort}
            disabled={isPending}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            onChange={(event) => {
              updateQueryState({ sort: event.target.value as DecisionHistorySort });
            }}
          >
            <option value="created_at">{t("sortCreatedAt")}</option>
            <option value="complexity">{t("sortComplexity")}</option>
          </select>
        </label>
      </div>

      {visibleDecisions.length === 0 ? (
        <div className="border-border bg-muted/20 grid gap-2 rounded-md border px-4 py-6">
          <h2 className="font-heading text-lg font-semibold">
            {hasActiveFilters ? t("filteredEmptyTitle") : t("emptyTitle")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {hasActiveFilters ? t("filteredEmptyDescription") : t("emptyDescription")}
          </p>
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
