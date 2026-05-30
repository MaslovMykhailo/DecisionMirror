import { z } from "zod";

/**
 * Controlled taxonomies — the single source of truth.
 *
 * `category` and the cognitive-bias catalog are fixed sets of language-neutral
 * identifiers. The LLM must select only from these, which keeps filtering and dashboard
 * aggregation deterministic. Display labels are localized separately (next-intl) over
 * these identifiers; the identifiers themselves never change for translation.
 *
 * Every consumer (the agent output contract, persistence, filters, charts) imports from
 * here. Do not redeclare these values anywhere else.
 */

export const DECISION_CATEGORIES = [
  "career",
  "finance",
  "relationships",
  "health",
  "education",
  "business",
  "lifestyle",
  "other",
] as const;

/** Fixed catalog of exactly eight cognitive biases the analysis may surface. */
export const COGNITIVE_BIASES = [
  "anchoring",
  "confirmation_bias",
  "sunk_cost_fallacy",
  "overconfidence",
  "availability_heuristic",
  "loss_aversion",
  "status_quo_bias",
  "optimism_bias",
] as const;

export const categorySchema = z.enum(DECISION_CATEGORIES);
export const biasSchema = z.enum(COGNITIVE_BIASES);

export type DecisionCategory = z.infer<typeof categorySchema>;
export type CognitiveBias = z.infer<typeof biasSchema>;
