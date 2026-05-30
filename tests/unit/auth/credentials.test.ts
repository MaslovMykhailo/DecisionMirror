import { describe, expect, it, vi } from "vitest";

import { authorizeCredentialsWithDeps } from "@/lib/auth/credentials";
import { hashPassword } from "@/lib/auth/password";

describe("credentials authorization", () => {
  it("returns the Auth.js user for a matching credentials account", async () => {
    const passwordHash = await hashPassword("ValidPass1!");
    const findUserByEmail = vi.fn().mockResolvedValue({
      id: "user_123",
      email: "user@example.com",
      name: "User",
      image: null,
      passwordHash,
    });

    await expect(
      authorizeCredentialsWithDeps(
        { email: " User@Example.COM ", password: "ValidPass1!" },
        { findUserByEmail },
      ),
    ).resolves.toEqual({
      id: "user_123",
      email: "user@example.com",
      name: "User",
      image: null,
    });

    expect(findUserByEmail).toHaveBeenCalledWith("user@example.com");
  });

  it("returns null for an incorrect password", async () => {
    const passwordHash = await hashPassword("ValidPass1!");

    await expect(
      authorizeCredentialsWithDeps(
        { email: "user@example.com", password: "WrongPass1!" },
        {
          findUserByEmail: vi.fn().mockResolvedValue({
            id: "user_123",
            email: "user@example.com",
            passwordHash,
          }),
        },
      ),
    ).resolves.toBeNull();
  });

  it("returns null for an unknown email", async () => {
    await expect(
      authorizeCredentialsWithDeps(
        { email: "missing@example.com", password: "ValidPass1!" },
        { findUserByEmail: vi.fn().mockResolvedValue(null) },
      ),
    ).resolves.toBeNull();
  });

  it("returns null for a Google-only user with no password hash", async () => {
    await expect(
      authorizeCredentialsWithDeps(
        { email: "google@example.com", password: "ValidPass1!" },
        {
          findUserByEmail: vi.fn().mockResolvedValue({
            id: "user_google",
            email: "google@example.com",
            passwordHash: null,
          }),
        },
      ),
    ).resolves.toBeNull();
  });
});
