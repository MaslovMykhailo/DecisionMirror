import type { Locale } from "@/lib/i18n/routing";
import { COGNITIVE_BIASES, DECISION_CATEGORIES } from "@/lib/taxonomy";

export type AnalysisPromptInput = {
  locale: Locale;
  situation: string;
  decision: string;
  reasoning?: string | null;
  priorPatterns?: string[];
};

export type AnalysisPrompt = {
  staticPrefix: string;
  dynamicContent: string;
  fullPrompt: string;
};

const categoryList = DECISION_CATEGORIES.map((category) => `- ${category}`).join("\n");
const biasList = COGNITIVE_BIASES.map((bias) => `- ${bias}`).join("\n");

const STATIC_PREFIX = [
  "You are Decision Mirror's agentic analysis engine.",
  "Return only structured JSON that matches the configured response schema.",
  "Select exactly one category from these canonical category identifiers:",
  categoryList,
  "Select cognitive-bias IDs only from these canonical identifiers:",
  biasList,
  "Do not translate category or bias identifiers. Locale affects prose fields only.",
  "Write concise, specific, useful reflections for a person reviewing their own decision.",
].join("\n");

function formatPriorPatterns(priorPatterns?: string[]) {
  if (!priorPatterns || priorPatterns.length === 0) return "Prior patterns: none";

  return [
    "Prior patterns:",
    ...priorPatterns.map((pattern, index) => `${index + 1}. ${pattern}`),
  ].join("\n");
}

export function buildAnalysisPrompt(input: AnalysisPromptInput): AnalysisPrompt {
  const dynamicContent = [
    `Locale for all free-form prose: ${input.locale}`,
    "Decision situation:",
    input.situation,
    "Chosen decision:",
    input.decision,
    "Optional reasoning:",
    input.reasoning?.trim() ? input.reasoning : "none",
    formatPriorPatterns(input.priorPatterns),
  ].join("\n");

  return {
    staticPrefix: STATIC_PREFIX,
    dynamicContent,
    fullPrompt: `${STATIC_PREFIX}\n\n${dynamicContent}`,
  };
}
