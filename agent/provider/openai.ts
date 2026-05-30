import "server-only";

import type { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";

import { buildAnalysisPrompt } from "@/agent/prompts/analysis";
import { analysisOutputSchema } from "@/agent/schema";
import type { AnalysisProvider, AnalyzeDecisionInput } from "@/agent/provider/types";

type AnalysisPromptMessage = {
  role: "system" | "user";
  content: string;
};

type StructuredOutputOptions = {
  name: "decision_analysis";
  method: "jsonSchema";
  strict: true;
};

type StructuredAnalysisModel = {
  invoke: (messages: AnalysisPromptMessage[], config: RunnableConfig) => Promise<unknown>;
};

type StructuredOutputChatModel = {
  withStructuredOutput: (
    schema: typeof analysisOutputSchema,
    options: StructuredOutputOptions,
  ) => StructuredAnalysisModel;
};

type LangChainOpenAIAnalysisProviderOptions = {
  chatModel?: StructuredOutputChatModel;
  model?: string;
  apiKey?: string;
  environment?: string;
};

const DEFAULT_MODEL = "gpt-5.4-mini";
const PROMPT_CACHE_KEY = "decision-mirror-analysis-v1";
const STRUCTURED_OUTPUT_OPTIONS = {
  name: "decision_analysis",
  method: "jsonSchema",
  strict: true,
} satisfies StructuredOutputOptions;

function configuredModelName(model?: string) {
  return model ?? process.env.OPENAI_ANALYSIS_MODEL ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
}

function configuredEnvironment(environment?: string) {
  return environment ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
}

function createChatModel({ apiKey, model }: { apiKey?: string; model: string }) {
  return new ChatOpenAI({
    apiKey: apiKey ?? process.env.OPENAI_API_KEY,
    model,
    promptCacheKey: PROMPT_CACHE_KEY,
    temperature: 0,
    useResponsesApi: true,
    zdrEnabled: true,
  }) as unknown as StructuredOutputChatModel;
}

function buildMessages(input: AnalyzeDecisionInput): AnalysisPromptMessage[] {
  const prompt = buildAnalysisPrompt(input);

  return [
    { role: "system", content: prompt.staticPrefix },
    { role: "user", content: prompt.dynamicContent },
  ];
}

function buildRunnableConfig({
  environment,
  input,
  model,
}: {
  environment: string;
  input: AnalyzeDecisionInput;
  model: string;
}): RunnableConfig {
  return {
    runName: "decision-analysis",
    tags: ["agentic-analysis"],
    metadata: {
      environment,
      locale: input.locale,
      model,
      priorPatternCount: input.priorPatterns?.length ?? 0,
    },
  };
}

export function createLangChainOpenAIAnalysisProvider(
  options: LangChainOpenAIAnalysisProviderOptions = {},
): AnalysisProvider {
  const model = configuredModelName(options.model);
  const environment = configuredEnvironment(options.environment);
  const chatModel = options.chatModel ?? createChatModel({ apiKey: options.apiKey, model });
  const structuredModel = chatModel.withStructuredOutput(
    analysisOutputSchema,
    STRUCTURED_OUTPUT_OPTIONS,
  );

  return {
    async analyzeDecision(input: AnalyzeDecisionInput) {
      return structuredModel.invoke(
        buildMessages(input),
        buildRunnableConfig({ environment, input, model }),
      );
    },
  };
}

export const langChainOpenAIAnalysisProvider: AnalysisProvider = {
  analyzeDecision(input) {
    return createLangChainOpenAIAnalysisProvider().analyzeDecision(input);
  },
};
