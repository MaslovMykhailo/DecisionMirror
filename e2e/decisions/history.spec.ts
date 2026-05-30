import { expect, test, type Page } from "@playwright/test";

import { validAnalysisOutput } from "@/tests/support/fixtures/analysis-output";

let prisma: Awaited<typeof import("@/lib/db/client")>["prisma"] | undefined;
const userIds: string[] = [];

async function db() {
  if (!prisma) {
    ({ prisma } = await import("@/lib/db/client"));
  }
  return prisma;
}

async function createUser(email: string, password: string) {
  const { hashPassword } = await import("@/lib/auth/password");
  const client = await db();
  const user = await client.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
    },
  });
  userIds.push(user.id);
  return user;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/en$/);
}

async function createAnalysis(decisionId: string, status: "processing" | "ready" | "failed") {
  const client = await db();
  if (status === "processing") {
    await client.analysis.create({
      data: { decisionId, version: 1, status },
    });
    return;
  }

  if (status === "failed") {
    await client.analysis.create({
      data: {
        decisionId,
        version: 1,
        status,
        failureReason: "The structured output did not match the contract.",
      },
    });
    return;
  }

  await client.analysis.create({
    data: {
      decisionId,
      version: 1,
      status,
      category: validAnalysisOutput.category,
      biases: validAnalysisOutput.biases,
      missedAlternatives: validAnalysisOutput.missedAlternatives,
      premortemRisks: validAnalysisOutput.premortemRisks,
      keyAssumptions: validAnalysisOutput.keyAssumptions,
      warningSigns: validAnalysisOutput.warningSigns,
    },
  });
}

test.afterAll(async () => {
  const client = prisma;
  if (!client) return;
  for (const userId of userIds) {
    await client.user.delete({ where: { id: userId } }).catch(() => undefined);
  }
  await client.$disconnect();
});

test.describe("decision history", () => {
  test("renders empty history for an authenticated user", async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, "requires the e2e database");

    const password = "ValidPass1!";
    const user = await createUser(`history-empty-${Date.now()}@example.com`, password);

    await login(page, user.email, password);
    await page.goto("/en/decisions");

    await expect(page.getByRole("heading", { name: "Decision history" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No decisions yet" })).toBeVisible();
  });

  test("renders processing, failed, and ready detail states from seeded analysis data", async ({
    page,
  }) => {
    test.skip(!process.env.DATABASE_URL, "requires the e2e database");

    const password = "ValidPass1!";
    const user = await createUser(`history-seeded-${Date.now()}@example.com`, password);
    const client = await db();
    const processing = await client.decision.create({
      data: {
        userId: user.id,
        situation: "Choosing whether to move cities",
        decision: "Wait before moving cities",
      },
    });
    const failed = await client.decision.create({
      data: {
        userId: user.id,
        situation: "Evaluating a mortgage refinance",
        decision: "Refinance the mortgage",
      },
    });
    const ready = await client.decision.create({
      data: {
        userId: user.id,
        situation: "Choosing between a stable role and a startup",
        decision: "Accept the startup offer",
        reasoning: "The product mission fits my long-term goals.",
      },
    });
    await createAnalysis(processing.id, "processing");
    await createAnalysis(failed.id, "failed");
    await createAnalysis(ready.id, "ready");

    await login(page, user.email, password);
    await page.goto("/en/decisions");

    await expect(page.getByText("Wait before moving cities")).toBeVisible();
    await expect(page.getByText("Processing", { exact: true })).toBeVisible();
    await expect(page.getByText("Analysis is still processing.")).toBeVisible();
    await expect(page.getByText("Refinance the mortgage")).toBeVisible();
    await expect(page.getByText("Failed", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Analysis failed: The structured output did not match the contract."),
    ).toBeVisible();

    await page.getByRole("link", { name: /Accept the startup offer/ }).click();
    await expect(page).toHaveURL(new RegExp(`/en/decisions/${ready.id}$`));
    await expect(page.getByRole("heading", { name: "Original input" })).toBeVisible();
    await expect(page.getByText("Choosing between a stable role and a startup")).toBeVisible();
    await expect(page.getByText("Category: Career")).toBeVisible();
    await expect(page.getByText("Biases")).toBeVisible();
    await expect(page.getByText("Anchoring")).toBeVisible();
    await expect(
      page.getByText("Negotiate a trial consulting project before resigning."),
    ).toBeVisible();
  });
});
