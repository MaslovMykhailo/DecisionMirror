import { z } from "zod";

import { routing } from "@/lib/i18n/routing";

function requiredTrimmedString(error: string) {
  return z.string({ error }).trim().min(1, { error });
}

export const createDecisionInputSchema = z.object({
  situation: requiredTrimmedString("situation_required"),
  decision: requiredTrimmedString("decision_required"),
  locale: z.enum(routing.locales, { error: "locale_unsupported" }).default(routing.defaultLocale),
  reasoning: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type CreateDecisionInput = z.input<typeof createDecisionInputSchema>;
export type CreateDecisionData = z.output<typeof createDecisionInputSchema>;
