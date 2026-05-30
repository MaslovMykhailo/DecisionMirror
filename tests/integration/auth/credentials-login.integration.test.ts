import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("credentials login (integration)", () => {
  let prisma: Awaited<typeof import("@/lib/db/client")>["prisma"];
  let authorizeCredentials: Awaited<
    typeof import("@/lib/auth/credentials")
  >["authorizeCredentials"];
  let hashPassword: Awaited<typeof import("@/lib/auth/password")>["hashPassword"];
  const emailsToDelete = new Set<string>();

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db/client"));
    ({ authorizeCredentials } = await import("@/lib/auth/credentials"));
    ({ hashPassword } = await import("@/lib/auth/password"));
  });

  afterEach(async () => {
    if (emailsToDelete.size === 0) return;
    await prisma.user.deleteMany({ where: { email: { in: [...emailsToDelete] } } });
    emailsToDelete.clear();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("authorizes a credentials user with the correct password", async () => {
    const email = `login-${Date.now()}@example.com`;
    emailsToDelete.add(email);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword("ValidPass1!"),
      },
    });

    await expect(authorizeCredentials({ email, password: "ValidPass1!" })).resolves.toMatchObject({
      id: user.id,
      email,
    });
  });

  it("returns null for incorrect password, unknown email, and Google-only user", async () => {
    const email = `failure-${Date.now()}@example.com`;
    const googleOnlyEmail = `google-${Date.now()}@example.com`;
    emailsToDelete.add(email);
    emailsToDelete.add(googleOnlyEmail);
    await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword("ValidPass1!"),
      },
    });
    await prisma.user.create({ data: { email: googleOnlyEmail } });

    await expect(authorizeCredentials({ email, password: "WrongPass1!" })).resolves.toBeNull();
    await expect(
      authorizeCredentials({ email: `missing-${Date.now()}@example.com`, password: "ValidPass1!" }),
    ).resolves.toBeNull();
    await expect(
      authorizeCredentials({ email: googleOnlyEmail, password: "ValidPass1!" }),
    ).resolves.toBeNull();
  });
});
