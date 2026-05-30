import type { AnalysisOutput } from "@/agent/schema";

export const MAX_MEMORY_DOCUMENT_CHARS = 4_000;
export const MAX_PRIOR_PATTERN_CHARS = 360;

export type MemoryDecisionInput = {
  situation: string;
  decision: string;
  reasoning?: string | null;
};

export type PriorMemoryMatch = {
  decisionId: string;
  content: string;
  distance?: number | string | null;
};

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxChars: number) {
  const compact = compactWhitespace(value);
  if (compact.length <= maxChars) return compact;
  if (maxChars <= 3) return compact.slice(0, maxChars);
  return `${compact.slice(0, maxChars - 3).trimEnd()}...`;
}

function joinSection(title: string, values: string[]) {
  return `${title}: ${values.map(compactWhitespace).join(" | ")}`;
}

export function buildDecisionRecallText(decisionInput: MemoryDecisionInput) {
  return [
    `Situation: ${decisionInput.situation}`,
    `Decision: ${decisionInput.decision}`,
    decisionInput.reasoning ? `Reasoning: ${decisionInput.reasoning}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildDecisionMemoryDocument({
  analysis,
  decisionInput,
}: {
  decisionInput: MemoryDecisionInput;
  analysis: AnalysisOutput;
}) {
  const lines = [
    buildDecisionRecallText(decisionInput),
    `Category: ${analysis.category}`,
    `Biases: ${analysis.biases
      .map((bias) => `${bias.id} (${compactWhitespace(bias.explanation)})`)
      .join(" | ")}`,
    joinSection("Missed alternatives", analysis.missedAlternatives),
    joinSection("Premortem risks", analysis.premortemRisks),
    joinSection("Key assumptions", analysis.keyAssumptions),
    joinSection("Warning signs", analysis.warningSigns),
  ];

  return truncateText(lines.join("\n"), MAX_MEMORY_DOCUMENT_CHARS);
}

export function formatPriorPatterns(
  matches: PriorMemoryMatch[],
  {
    currentDecisionId,
    maxChars = MAX_PRIOR_PATTERN_CHARS,
    maxPatterns = 3,
  }: {
    currentDecisionId?: string;
    maxChars?: number;
    maxPatterns?: number;
  } = {},
) {
  return matches
    .filter((match) => match.decisionId !== currentDecisionId)
    .slice(0, maxPatterns)
    .map((match) => {
      const distance =
        match.distance === null || match.distance === undefined
          ? undefined
          : Number(match.distance);
      const similarity =
        distance === undefined || !Number.isFinite(distance)
          ? undefined
          : Math.max(0, Math.min(1, 1 - distance));
      const prefix =
        similarity === undefined
          ? "Prior decision: "
          : `Prior decision (similarity ${similarity.toFixed(3)}): `;

      return truncateText(`${prefix}${match.content}`, maxChars);
    });
}
