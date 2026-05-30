import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against a real Postgres. Self-skips when DATABASE_URL is unset so the
// default offline `pnpm test` is unaffected; run with a live DB via `pnpm test:integration`.
const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("data model (integration)", () => {
  let prisma: Awaited<typeof import("@/lib/db/client")>["prisma"];
  let userId: string;
  let decisionId: string;

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db/client"));
    const user = await prisma.user.create({ data: { email: `test-${Date.now()}@example.com` } });
    userId = user.id;
    const decision = await prisma.decision.create({
      data: { userId, situation: "situation", decision: "decision" },
    });
    decisionId = decision.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("appends a new incremented version on re-analysis, leaving prior rows unchanged", async () => {
    const first = await prisma.analysis.create({
      data: { decisionId, version: 1, status: "ready" },
    });
    const second = await prisma.analysis.create({
      data: { decisionId, version: 2, status: "processing" },
    });

    const rereadFirst = await prisma.analysis.findUnique({ where: { id: first.id } });
    expect(rereadFirst?.version).toBe(1);
    expect(rereadFirst?.status).toBe("ready");
    expect(second.version).toBe(2);

    const count = await prisma.analysis.count({ where: { decisionId } });
    expect(count).toBe(2);
  });

  it("rejects an out-of-range status value at the database boundary", async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "Analysis" (id, "decisionId", version, status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4::"AnalysisStatus", now(), now())`,
        "invalid-status-row",
        decisionId,
        99,
        "archived",
      ),
    ).rejects.toBeTruthy();
  });

  it("has the structured analysis result columns required by the agent and history views", async () => {
    const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'Analysis'
       ORDER BY ordinal_position`,
    );

    expect(columns.map((column) => column.column_name)).toEqual(
      expect.arrayContaining([
        "biases",
        "missedAlternatives",
        "premortemRisks",
        "keyAssumptions",
        "warningSigns",
      ]),
    );
  });

  it("has the pgvector-backed DecisionMemory table required by production memory recall", async () => {
    const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'DecisionMemory'
       ) AS "exists"`,
    );

    expect(rows[0]?.exists).toBe(true);
  });
});
