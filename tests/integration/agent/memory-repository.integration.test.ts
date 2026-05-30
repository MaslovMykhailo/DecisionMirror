import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPgVectorMemoryRepository } from "@/agent/memory/repository";
import { validAnalysisOutput } from "@/tests/support/fixtures/analysis-output";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
const VECTOR_DIMENSIONS = 1024;

function vectorAt(index: number) {
  return Array.from({ length: VECTOR_DIMENSIONS }, (_, current) => (current === index ? 1 : 0));
}

function decisionInput(label: string) {
  return {
    situation: `Situation ${label}`,
    decision: `Decision ${label}`,
    reasoning: `Reasoning ${label}`,
  };
}

describeDb("pgvector agent memory repository", () => {
  let prisma: Awaited<typeof import("@/lib/db/client")>["prisma"];
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db/client"));
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const user = await prisma.user.create({ data: { email: `memory-${suffix}@example.com` } });
    const otherUser = await prisma.user.create({
      data: { email: `memory-other-${suffix}@example.com` },
    });
    userId = user.id;
    otherUserId = otherUser.id;
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM "DecisionMemory"`);
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: otherUserId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  async function createDecisionWithAnalysis(ownerId: string, label: string) {
    const decision = await prisma.decision.create({
      data: {
        userId: ownerId,
        situation: `Situation ${label}`,
        decision: `Decision ${label}`,
        reasoning: `Reasoning ${label}`,
      },
    });
    const analysis = await prisma.analysis.create({
      data: { decisionId: decision.id, version: 1, status: "ready" },
    });

    return { decision, analysis };
  }

  it("returns empty recall when no eligible memories exist", async () => {
    const current = await createDecisionWithAnalysis(userId, "current");
    const embeddings = {
      metadata: { provider: "stub" as const, model: "test", dimensions: VECTOR_DIMENSIONS },
      embedQuery: vi.fn().mockResolvedValue(vectorAt(0)),
      embedDocument: vi.fn(),
    };
    const repository = createPgVectorMemoryRepository({ db: prisma, embeddings });

    await expect(
      repository.recall({
        userId,
        decisionId: current.decision.id,
        decisionInput: decisionInput("current"),
      }),
    ).resolves.toEqual({ patterns: [], recalledIds: [] });
  });

  it("orders same-user recall by vector distance and respects top-k", async () => {
    const priorClose = await createDecisionWithAnalysis(userId, "prior-close");
    const priorFar = await createDecisionWithAnalysis(userId, "prior-far");
    const current = await createDecisionWithAnalysis(userId, "current");
    const embeddings = {
      metadata: { provider: "stub" as const, model: "test", dimensions: VECTOR_DIMENSIONS },
      embedQuery: vi.fn().mockResolvedValue(vectorAt(0)),
      embedDocument: vi.fn().mockResolvedValueOnce(vectorAt(0)).mockResolvedValueOnce(vectorAt(1)),
    };
    const repository = createPgVectorMemoryRepository({ db: prisma, embeddings, topK: 1 });

    await repository.remember({
      userId,
      decisionId: priorClose.decision.id,
      analysisId: priorClose.analysis.id,
      decisionInput: decisionInput("prior-close"),
      analysis: validAnalysisOutput,
    });
    await repository.remember({
      userId,
      decisionId: priorFar.decision.id,
      analysisId: priorFar.analysis.id,
      decisionInput: decisionInput("prior-far"),
      analysis: validAnalysisOutput,
    });

    const recalled = await repository.recall({
      userId,
      decisionId: current.decision.id,
      decisionInput: decisionInput("current"),
    });

    expect(recalled.patterns).toHaveLength(1);
    expect(recalled.patterns[0]).toContain("Situation prior-close");
    expect(recalled.patterns[0]).not.toContain("Situation prior-far");
    expect(recalled.recalledIds).toHaveLength(1);
  });

  it("upserts one current memory row per user and decision", async () => {
    const target = await createDecisionWithAnalysis(userId, "upsert");
    const nextAnalysis = await prisma.analysis.create({
      data: { decisionId: target.decision.id, version: 2, status: "ready" },
    });
    const embeddings = {
      metadata: { provider: "stub" as const, model: "test", dimensions: VECTOR_DIMENSIONS },
      embedQuery: vi.fn(),
      embedDocument: vi.fn().mockResolvedValue(vectorAt(0)),
    };
    const repository = createPgVectorMemoryRepository({ db: prisma, embeddings });

    await repository.remember({
      userId,
      decisionId: target.decision.id,
      analysisId: target.analysis.id,
      decisionInput: decisionInput("first"),
      analysis: validAnalysisOutput,
    });
    await repository.remember({
      userId,
      decisionId: target.decision.id,
      analysisId: nextAnalysis.id,
      decisionInput: decisionInput("second"),
      analysis: validAnalysisOutput,
    });

    const rows = await prisma.$queryRawUnsafe<Array<{ count: string; analysisId: string }>>(
      `SELECT count(*)::text, max("analysisId") AS "analysisId"
       FROM "DecisionMemory"
       WHERE "userId" = $1 AND "decisionId" = $2`,
      userId,
      target.decision.id,
    );

    expect(rows[0]).toEqual({ count: "1", analysisId: nextAnalysis.id });
  });

  it("rejects embedding vectors with the wrong dimension before writing", async () => {
    const target = await createDecisionWithAnalysis(userId, "bad-vector");
    const embeddings = {
      metadata: { provider: "stub" as const, model: "test", dimensions: VECTOR_DIMENSIONS },
      embedQuery: vi.fn(),
      embedDocument: vi.fn().mockResolvedValue([1, 0, 0]),
    };
    const repository = createPgVectorMemoryRepository({ db: prisma, embeddings });

    await expect(
      repository.remember({
        userId,
        decisionId: target.decision.id,
        analysisId: target.analysis.id,
        decisionInput: decisionInput("bad-vector"),
        analysis: validAnalysisOutput,
      }),
    ).rejects.toThrow(/1024-dimensional embedding/);
  });

  it("never returns another user's memory even when vectors are identical", async () => {
    const otherMemory = await createDecisionWithAnalysis(otherUserId, "other-user-private");
    const current = await createDecisionWithAnalysis(userId, "current-isolated");
    const embeddings = {
      metadata: { provider: "stub" as const, model: "test", dimensions: VECTOR_DIMENSIONS },
      embedQuery: vi.fn().mockResolvedValue(vectorAt(0)),
      embedDocument: vi.fn().mockResolvedValue(vectorAt(0)),
    };
    const repository = createPgVectorMemoryRepository({ db: prisma, embeddings, topK: 5 });

    await repository.remember({
      userId: otherUserId,
      decisionId: otherMemory.decision.id,
      analysisId: otherMemory.analysis.id,
      decisionInput: decisionInput("other-user-private"),
      analysis: validAnalysisOutput,
    });

    const recalled = await repository.recall({
      userId,
      decisionId: current.decision.id,
      decisionInput: decisionInput("current-isolated"),
    });

    expect(recalled.patterns).toEqual([]);
    expect(recalled.recalledIds).toEqual([]);
  });
});
