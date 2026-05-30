import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createAuthCallbacks } from "@/lib/auth/callbacks";
import { authErrorCodes } from "@/lib/auth/validation";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("Google sign-in callback (integration)", () => {
  let prisma: Awaited<typeof import("@/lib/db/client")>["prisma"];
  const emailsToDelete = new Set<string>();

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db/client"));
  });

  afterEach(async () => {
    if (emailsToDelete.size === 0) return;
    await prisma.user.deleteMany({ where: { email: { in: [...emailsToDelete] } } });
    emailsToDelete.clear();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  function callbacks() {
    return createAuthCallbacks({
      findUserByEmail: async (email) => {
        const user = await prisma.user.findUnique({
          where: { email },
          include: { accounts: true },
        });

        if (!user) return null;
        return {
          id: user.id,
          accounts: user.accounts.map((account) => ({
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          })),
        };
      },
    });
  }

  it("allows first-time and returning Google sign-in with verified provider data", async () => {
    const firstTimeEmail = `google-first-${Date.now()}@example.com`;

    await expect(
      callbacks().signIn({
        account: { provider: "google", providerAccountId: "google-first" },
        profile: { email: firstTimeEmail, email_verified: true },
      }),
    ).resolves.toBe(true);

    const returningEmail = `google-returning-${Date.now()}@example.com`;
    emailsToDelete.add(returningEmail);
    const user = await prisma.user.create({ data: { email: returningEmail } });
    await prisma.account.create({
      data: {
        userId: user.id,
        type: "oauth",
        provider: "google",
        providerAccountId: "google-returning",
      },
    });

    await expect(
      callbacks().signIn({
        account: { provider: "google", providerAccountId: "google-returning" },
        profile: { email: returningEmail, email_verified: true },
      }),
    ).resolves.toBe(true);
  });

  it("denies unverified Google email and unlinked credentials email conflict", async () => {
    await expect(
      callbacks().signIn({
        account: { provider: "google", providerAccountId: "google-unverified" },
        profile: { email: "unverified@example.com", email_verified: false },
      }),
    ).resolves.toBe(false);

    const credentialsEmail = `google-conflict-${Date.now()}@example.com`;
    emailsToDelete.add(credentialsEmail);
    await prisma.user.create({ data: { email: credentialsEmail, passwordHash: "existing" } });

    await expect(
      callbacks().signIn({
        account: { provider: "google", providerAccountId: "google-conflict" },
        profile: { email: credentialsEmail, email_verified: true },
      }),
    ).resolves.toBe(`/login?error=${authErrorCodes.providerConflict}`);
  });
});
