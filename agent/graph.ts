import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

import {
  createAnalyzeNode,
  createFailNode,
  createLoadMemoryNode,
  createPersistRememberNode,
  type AgentDb,
  type AgentMemory,
  type AgentState,
  validateNode,
} from "@/agent/nodes";
import type { AnalysisProvider } from "@/agent/provider/types";
import type { AnalysisOutput } from "@/agent/schema";
import type { Locale } from "@/lib/i18n/routing";

export type AgentCheckpointer = unknown;

export type AgentGraphDeps = {
  db: AgentDb;
  provider: AnalysisProvider;
  memory?: AgentMemory;
  checkpointer?: AgentCheckpointer;
};

const AgentGraphAnnotation = Annotation.Root({
  decisionId: Annotation<string>(),
  analysisId: Annotation<string | undefined>(),
  analysisVersion: Annotation<number | undefined>(),
  userId: Annotation<string | undefined>(),
  locale: Annotation<Locale | undefined>(),
  decisionInput: Annotation<AgentState["decisionInput"] | undefined>(),
  priorPatterns: Annotation<string[] | undefined>(),
  rawOutput: Annotation<unknown>(),
  validatedOutput: Annotation<AnalysisOutput | undefined>(),
  failureReason: Annotation<string | undefined>(),
  canAnalyze: Annotation<boolean | undefined>(),
});

function routeAfterLoad(state: AgentState) {
  return state.canAnalyze ? "analyze" : END;
}

function routeAfterValidate(state: AgentState) {
  return state.validatedOutput ? "persist+remember" : "fail";
}

export function createAgentGraph(deps: AgentGraphDeps) {
  const builder = new StateGraph(AgentGraphAnnotation)
    .addNode("load-memory", createLoadMemoryNode(deps))
    .addNode("analyze", createAnalyzeNode(deps))
    .addNode("validate", validateNode)
    .addNode("persist+remember", createPersistRememberNode(deps))
    .addNode("fail", createFailNode(deps))
    .addEdge(START, "load-memory")
    .addConditionalEdges("load-memory", routeAfterLoad, ["analyze", END])
    .addEdge("analyze", "validate")
    .addConditionalEdges("validate", routeAfterValidate, ["persist+remember", "fail"])
    .addEdge("persist+remember", END)
    .addEdge("fail", END);

  if (!deps.checkpointer) return builder.compile();
  return builder.compile({ checkpointer: deps.checkpointer as never });
}
