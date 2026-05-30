import { describe, expect, it, vi } from "vitest";

import {
  invalidAnalysisOutputs,
  validAnalysisOutput,
} from "@/tests/support/fixtures/analysis-output";

vi.mock("server-only", () => ({}));

function createDecision() {
  return {
    id: "decision_1",
    userId: "user_1",
    situation: "Should I accept the new role?",
    decision: "Accept the offer.",
    reasoning: "It has more scope.",
  };
}

function createDb() {
  return {
    decision: { findUnique: vi.fn().mockResolvedValue(createDecision()) },
    analysis: {
      findFirst: vi.fn().mockResolvedValue({ id: "analysis_1", version: 1, locale: "uk" }),
      update: vi.fn().mockResolvedValue({ id: "analysis_1" }),
    },
  };
}

describe("agent graph", () => {
  it("persists ready structured output and remembers it", async () => {
    const db = createDb();
    const provider = { analyzeDecision: vi.fn().mockResolvedValue(validAnalysisOutput) };
    const memory = {
      recall: vi.fn().mockResolvedValue([]),
      remember: vi.fn().mockResolvedValue(undefined),
    };
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db, provider, memory });

    expect(provider.analyzeDecision).toHaveBeenCalledWith({
      locale: "uk",
      situation: "Should I accept the new role?",
      decision: "Accept the offer.",
      reasoning: "It has more scope.",
      priorPatterns: [],
    });
    expect(db.analysis.update).toHaveBeenCalledWith({
      where: { id: "analysis_1" },
      data: {
        status: "ready",
        category: validAnalysisOutput.category,
        biases: validAnalysisOutput.biases,
        missedAlternatives: validAnalysisOutput.missedAlternatives,
        premortemRisks: validAnalysisOutput.premortemRisks,
        keyAssumptions: validAnalysisOutput.keyAssumptions,
        warningSigns: validAnalysisOutput.warningSigns,
        failureReason: null,
      },
      select: { id: true },
    });
    expect(memory.remember).toHaveBeenCalledWith({
      decisionId: "decision_1",
      analysisId: "analysis_1",
      decisionInput: {
        situation: "Should I accept the new role?",
        decision: "Accept the offer.",
        reasoning: "It has more scope.",
      },
      userId: "user_1",
      analysis: validAnalysisOutput,
    });
  });

  it("persists failed state when provider output is invalid", async () => {
    const db = createDb();
    const provider = {
      analyzeDecision: vi.fn().mockResolvedValue(invalidAnalysisOutputs.unknownCategory),
    };
    const memory = { recall: vi.fn().mockResolvedValue([]), remember: vi.fn() };
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db, provider, memory });

    expect(db.analysis.update).toHaveBeenCalledWith({
      where: { id: "analysis_1" },
      data: {
        status: "failed",
        category: null,
        failureReason: expect.stringContaining("structured analysis output"),
      },
      select: { id: true },
    });
    expect(memory.remember).not.toHaveBeenCalled();
  });

  it("invokes a checkpointer-backed graph with an analysis-scoped thread id", async () => {
    const db = createDb();
    const provider = { analyzeDecision: vi.fn().mockResolvedValue(validAnalysisOutput) };
    const memory = { recall: vi.fn().mockResolvedValue([]), remember: vi.fn() };
    const checkpointer = { kind: "test-checkpointer" };
    const invoke = vi.fn().mockResolvedValue(undefined);
    const graphFactory = vi.fn().mockReturnValue({ invoke });
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db, provider, memory, checkpointer, graphFactory });

    expect(graphFactory).toHaveBeenCalledWith({ db, provider, memory, checkpointer });
    expect(invoke).toHaveBeenCalledWith(
      { decisionId: "decision_1" },
      { configurable: { thread_id: "analysis:analysis_1" } },
    );
  });

  it("persists failed state when the provider throws", async () => {
    const db = createDb();
    const provider = {
      analyzeDecision: vi.fn().mockRejectedValue(new Error("provider unavailable")),
    };
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db, provider });

    expect(db.analysis.update).toHaveBeenCalledWith({
      where: { id: "analysis_1" },
      data: {
        status: "failed",
        category: null,
        failureReason: expect.stringContaining("provider unavailable"),
      },
      select: { id: true },
    });
  });

  it("persists failed state when memory recall throws before provider analysis", async () => {
    const db = createDb();
    const provider = { analyzeDecision: vi.fn() };
    const memory = {
      recall: vi.fn().mockRejectedValue(new Error("memory unavailable")),
      remember: vi.fn(),
    };
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db, provider, memory });

    expect(provider.analyzeDecision).not.toHaveBeenCalled();
    expect(db.analysis.update).toHaveBeenCalledWith({
      where: { id: "analysis_1" },
      data: {
        status: "failed",
        category: null,
        failureReason: expect.stringContaining("memory unavailable"),
      },
      select: { id: true },
    });
    expect(memory.remember).not.toHaveBeenCalled();
  });
});
