import { z } from "zod";

import { biasSchema, categorySchema } from "@/lib/taxonomy";

/**
 * The controlled-taxonomy facets of an analysis, composed *by reference* from the canonical
 * taxonomy in `@/lib/taxonomy`. This is the seam the LLM output contract (agent/schema.ts)
 * and the dashboard aggregation build on, so the taxonomy is defined once and reused.
 */
export const decisionFacetsSchema = z.object({
  category: categorySchema,
  biases: z.array(biasSchema),
});

export type DecisionFacets = z.infer<typeof decisionFacetsSchema>;
