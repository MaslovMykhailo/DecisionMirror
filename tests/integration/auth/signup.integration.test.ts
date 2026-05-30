import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { authErrorCodes } from "@/lib/auth/validation";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("credentials signup (integration)", () => {
  let prisma: Awaited<typeof import("@/lib/db/client")>["prisma"];
  let signupWithCredentials: Awaited<typeof import("@/lib/auth/signup")>["signupWithCredentials"];
  const emailsToDelete = new Set<string>();

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db/client"));
    ({ signupWithCredentials } = await import("@/lib/auth/signup"));
  });

  afterEach(async () => {
    if (emailsToDelete.size === 0) return;
    await prisma.user.deleteMany({ where: { email: { in: [...emailsToDelete] } } });
    emailsToDelete.clear();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("creates a credentials user and establishes a session after signup", async () => {
    const establishSession = vi.fn().mockResolvedValue(undefined);
    const rawEmail = ` Signup-${Date.now()}@Example.COM `;
    const normalizedEmail = rawEmail.trim().toLowerCase();
    emailsToDelete.add(normalizedEmail);

    const result = await signupWithCredentials(
      {
        email: rawEmail,
        name: " Test User ",
        password: "ValidPass1!",
      },
      { establishSession, redirectTo: "/en" },
    );

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.userId).toEqual(expect.any(String));
    expect(establishSession).toHaveBeenCalledWith({
      email: normalizedEmail,
      password: "ValidPass1!",
      redirectTo: "/en",
    });

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    expect(user).toMatchObject({
      id: result.userId,
      email: normalizedEmail,
      name: "Test User",
    });
    expect(user?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(user?.passwordHash).not.toContain("ValidPass1!");
  });

  it("returns a duplicate-email error without creating another user", async () => {
    const email = `duplicate-${Date.now()}@example.com`;
    emailsToDelete.add(email);
    await prisma.user.create({ data: { email, passwordHash: "already-hashed" } });

    const result = await signupWithCredentials({
      email,
      password: "ValidPass1!",
    });

    expect(result).toEqual({
      status: "error",
      error: {
        code: authErrorCodes.duplicateEmail,
        fieldErrors: { email: ["email_already_registered"] },
      },
    });
    await expect(prisma.user.count({ where: { email } })).resolves.toBe(1);
  });

  it("returns field errors for invalid input and does not create a user", async () => {
    const establishSession = vi.fn().mockResolvedValue(undefined);
    const email = `invalid-${Date.now()}@example.com`;
    emailsToDelete.add(email);

    const result = await signupWithCredentials(
      {
        email: "not-an-email",
        password: "password",
      },
      { establishSession },
    );

    expect(result.status).toBe("validation_error");
    if (result.status !== "validation_error") return;
    expect(result.fieldErrors.email).toBeDefined();
    expect(result.fieldErrors.password).toEqual(
      expect.arrayContaining(["password_number_required", "password_symbol_required"]),
    );
    expect(establishSession).not.toHaveBeenCalled();
    await expect(prisma.user.count({ where: { email } })).resolves.toBe(0);
  });
});
