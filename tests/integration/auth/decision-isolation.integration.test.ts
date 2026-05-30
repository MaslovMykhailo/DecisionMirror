import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("authenticated decision isolation (integration)", () => {
  let prisma: Awaited<typeof import("@/lib/db/client")>["prisma"];
  let service: typeof import("@/lib/decisions/service");
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db/client"));
    service = await import("@/lib/decisions/service");
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
});
