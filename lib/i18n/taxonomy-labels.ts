import { useTranslations } from "next-intl";

import type { CognitiveBias, DecisionCategory } from "@/lib/taxonomy";

/**
 * Resolves language-neutral taxonomy identifiers to translated display labels.
 *
 * The stored/aggregated value is always the identifier (e.g. `"sunk_cost_fallacy"`);
 * only the displayed label is localized, so filtering and dashboard aggregation
 * stay deterministic across locales.
 */
export function useTaxonomyLabels() {
  const t = useTranslations("Taxonomy");
  return {
    category: (id: DecisionCategory) => t(`category.${id}`),
    bias: (id: CognitiveBias) => t(`bias.${id}`),
  };
}
