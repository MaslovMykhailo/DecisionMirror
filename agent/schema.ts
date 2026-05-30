import { z } from "zod";

import { biasSchema, categorySchema } from "@/lib/taxonomy";

const nonEmptyProseSchema = z.string().trim().min(1);
const proseSectionSchema = z.array(nonEmptyProseSchema).min(1).max(5);

export const analysisBiasSchema = z
  .object({
    id: biasSchema,
    explanation: nonEmptyProseSchema,
  })
  .strict();

export const analysisOutputSchema = z
  .object({
    category: categorySchema,
    biases: z.array(analysisBiasSchema).min(1).max(3),
    missedAlternatives: proseSectionSchema,
    premortemRisks: proseSectionSchema,
    keyAssumptions: proseSectionSchema,
    warningSigns: proseSectionSchema,
  })
  .strict();

export type AnalysisBias = z.infer<typeof analysisBiasSchema>;
export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;
