import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { validAnalysisOutput } from "@/tests/support/fixtures/analysis-output";

vi.mock("server-only", () => ({}));

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("authenticated decision isolation (integration)", () => {
  let prisma: Awaited<typeof import("@/lib/db/client")>["prisma"];
  let service: typeof import("@/lib/decisions/service");
  let history: typeof import("@/lib/decisions/history");
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db/client"));
    service = await import("@/lib/decisions/service");
    history = await import("@/lib/decisions/history");
    const suffix = Date.now();
    const a = await prisma.user.create({ data: { email: `user-a-${suffix}@example.com` } });
    const b = await prisma.user.create({ data: { email: `user-b-${suffix}@example.com` } });
    userA = a.id;
    userB = b.id;
  });

  afterAll(async () => {
    if (userA) await prisma.user.delete({ where: { id: userA } }).catch(() => undefined);
    if (userB) await prisma.user.delete({ where: { id: userB } }).catch(() => undefined);
    await prisma?.$disconnect();
  });

  const asUserA = async () => ({ authenticated: true as const, userId: userA });

  it("creates decisions with the session user ID, ignoring client owner identifiers", async () => {
    const result = await service.createDecision(
      {
        situation: "Situation",
        decision: "Decision",
        userId: userB,
        ownerId: userB,
      },
      { getUser: asUserA },
    );

    expect(result.status).toBe("success");
    if (result.status !== "success") return;

    await expect(
      prisma.decision.findUnique({ where: { id: result.decisionId } }),
    ).resolves.toMatchObject({
      userId: userA,
    });
    await expect(
      prisma.analysis.findUnique({ where: { id: result.analysisId } }),
    ).resolves.toMatchObject({
      decisionId: result.decisionId,
      version: 1,
      status: "processing",
    });
  });

  it("denies cross-user read, retry, re-analysis, dashboard leakage, and memory recall", async () => {
    const otherDecision = await prisma.decision.create({
      data: { userId: userB, situation: "Other", decision: "Other" },
    });
    await prisma.analysis.create({
      data: { decisionId: otherDecision.id, version: 1, status: "failed" },
    });

    await expect(
      service.getDecisionDetails(otherDecision.id, { getUser: asUserA }),
    ).resolves.toEqual({ status: "not_found" });
    await expect(
      service.retryDecisionAnalysis(otherDecision.id, { getUser: asUserA }),
    ).resolves.toEqual({ status: "not_found" });
    await expect(
      service.reanalyzeDecision(otherDecision.id, { getUser: asUserA }),
    ).resolves.toEqual({ status: "not_found" });

    const dashboard = await service.getDashboardAggregation({ getUser: asUserA });
    expect(dashboard.status).toBe("success");
    if (dashboard.status === "success") {
      expect(dashboard.categories).toEqual({});
    }

    const memoryStore = { recall: vi.fn().mockResolvedValue([]) };
    await service.recallDecisionMemory(otherDecision.id, {
      getUser: asUserA,
      memoryStore,
    });
    expect(memoryStore.recall).toHaveBeenCalledWith({
      userId: userA,
      decisionId: otherDecision.id,
    });
  });

  it("retries an owned failed analysis in place with provider execution stubbed", async () => {
    const triggerAnalysis = vi.fn();
    const retryNow = new Date("2026-05-30T12:00:00.000Z");
    const decision = await prisma.decision.create({
      data: { userId: userA, situation: "Own retry situation", decision: "Retry analysis" },
    });
    const analysis = await prisma.analysis.create({
      data: {
        decisionId: decision.id,
        version: 1,
        status: "failed",
        locale: "uk",
        failureReason: "Provider contract failed.",
      },
    });

    const result = await service.retryDecisionAnalysis(decision.id, {
      getUser: asUserA,
      triggerAnalysis,
      now: () => retryNow,
    });

    expect(result.status).toBe("success");
    expect(triggerAnalysis).toHaveBeenCalledWith(decision.id);
    await expect(prisma.analysis.findUnique({ where: { id: analysis.id } })).resolves.toMatchObject(
      {
        version: 1,
        status: "processing",
        locale: "uk",
        failureReason: null,
      },
    );
  });

  it("appends owned re-analysis versions while preserving prior ready output", async () => {
    const triggerAnalysis = vi.fn();
    const reanalysisNow = new Date("2026-05-30T12:10:00.000Z");
    const decision = await prisma.decision.create({
      data: {
        userId: userA,
        situation: "Own re-analysis situation",
        decision: "Run another analysis",
      },
    });
    const readyAnalysis = await prisma.analysis.create({
      data: {
        decisionId: decision.id,
        version: 1,
        status: "ready",
        locale: "en",
        category: validAnalysisOutput.category,
        biases: validAnalysisOutput.biases,
        missedAlternatives: validAnalysisOutput.missedAlternatives,
        premortemRisks: validAnalysisOutput.premortemRisks,
        keyAssumptions: validAnalysisOutput.keyAssumptions,
        warningSigns: validAnalysisOutput.warningSigns,
      },
    });

    const result = await service.reanalyzeDecision(decision.id, {
      getUser: asUserA,
      triggerAnalysis,
      locale: "uk",
      now: () => reanalysisNow,
    });

    expect(result.status).toBe("success");
    expect(triggerAnalysis).toHaveBeenCalledWith(decision.id);
    const analyses = await prisma.analysis.findMany({
      where: { decisionId: decision.id },
      orderBy: { version: "asc" },
    });
    expect(analyses).toHaveLength(2);
    expect(analyses[0]).toMatchObject({
      id: readyAnalysis.id,
      version: 1,
      status: "ready",
      locale: "en",
    });
    expect(analyses[1]).toMatchObject({
      version: 2,
      status: "processing",
      locale: "uk",
    });
  });

  it("blocks owned re-analysis while the newest analysis is active processing", async () => {
    const triggerAnalysis = vi.fn();
    const now = new Date("2026-05-30T12:30:00.000Z");
    const decision = await prisma.decision.create({
      data: { userId: userA, situation: "Active processing", decision: "Wait" },
    });
    await prisma.analysis.create({
      data: {
        decisionId: decision.id,
        version: 1,
        status: "processing",
        updatedAt: new Date("2026-05-30T12:29:00.000Z"),
      },
    });

    await expect(
      service.reanalyzeDecision(decision.id, {
        getUser: asUserA,
        triggerAnalysis,
        now: () => now,
      }),
    ).resolves.toEqual({ status: "already_processing" });

    await expect(prisma.analysis.count({ where: { decisionId: decision.id } })).resolves.toBe(1);
    expect(triggerAnalysis).not.toHaveBeenCalled();
  });

  it("excludes other users from history list and detail read models", async () => {
    const ownDecision = await prisma.decision.create({
      data: {
        userId: userA,
        situation: "Own private situation",
        decision: "Keep consulting",
      },
    });
    const otherDecision = await prisma.decision.create({
      data: {
        userId: userB,
        situation: "Other private situation",
        decision: "Sell the company",
      },
    });

    await prisma.analysis.create({
      data: {
        decisionId: ownDecision.id,
        version: 1,
        status: "ready",
        category: validAnalysisOutput.category,
        biases: validAnalysisOutput.biases,
        missedAlternatives: validAnalysisOutput.missedAlternatives,
        premortemRisks: validAnalysisOutput.premortemRisks,
        keyAssumptions: validAnalysisOutput.keyAssumptions,
        warningSigns: validAnalysisOutput.warningSigns,
      },
    });
    await prisma.analysis.create({
      data: {
        decisionId: otherDecision.id,
        version: 1,
        status: "ready",
        category: "business",
        biases: validAnalysisOutput.biases,
        missedAlternatives: ["Other user's private alternative"],
        premortemRisks: ["Other user's private risk"],
        keyAssumptions: ["Other user's private assumption"],
        warningSigns: ["Other user's private warning"],
      },
    });

    const list = await history.getDecisionHistoryList({ getUser: asUserA });
    expect(list.status).toBe("success");
    if (list.status !== "success") return;
    expect(list.decisions.map((decision) => decision.id)).toContain(ownDecision.id);
    expect(list.decisions.map((decision) => decision.id)).not.toContain(otherDecision.id);
    expect(JSON.stringify(list)).not.toContain("Sell the company");
    expect(JSON.stringify(list)).not.toContain("Other user's private");

    await expect(
      history.getDecisionHistoryDetail(otherDecision.id, { getUser: asUserA }),
    ).resolves.toEqual({ status: "not_found" });

    const detail = await history.getDecisionHistoryDetail(ownDecision.id, { getUser: asUserA });
    expect(detail.status).toBe("success");
    if (detail.status === "success") {
      expect(detail.decision.decision).toBe("Keep consulting");
      expect(detail.readyAnalysis?.result.category).toBe(validAnalysisOutput.category);
    }
  });
});
