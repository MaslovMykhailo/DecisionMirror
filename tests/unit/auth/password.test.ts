import { describe, expect, it } from "vitest";

import { buildCredentialsUserData, hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password helpers", () => {
  it("hashes passwords with bcrypt without returning the plaintext password", async () => {
    const password = "ValidPass1!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toContain(password);
  });

  it("compares a plaintext password with a stored hash", async () => {
    const hash = await hashPassword("ValidPass1!");

    await expect(verifyPassword("ValidPass1!", hash)).resolves.toBe(true);
    await expect(verifyPassword("WrongPass1!", hash)).resolves.toBe(false);
  });

  it("builds credentials user data with only a password hash persisted", async () => {
    const data = await buildCredentialsUserData({
      email: "user@example.com",
      name: "User",
      password: "ValidPass1!",
    });

    expect(data).toEqual({
      email: "user@example.com",
      name: "User",
      passwordHash: expect.stringMatching(/^\$2[aby]\$/),
    });
    expect(data).not.toHaveProperty("password");
    expect(JSON.stringify(data)).not.toContain("ValidPass1!");
  });
});
