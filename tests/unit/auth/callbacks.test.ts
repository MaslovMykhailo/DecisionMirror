import { describe, expect, it, vi } from "vitest";

import { authCallbacks } from "@/lib/auth/callbacks";
import { authErrorCodes } from "@/lib/auth/validation";

describe("Auth.js session callbacks", () => {
  it("copies the canonical signed-in user ID into the JWT", async () => {
    const token = await authCallbacks.jwt({
      token: {},
      user: { id: "user_canonical" },
    });

    expect(token).toMatchObject({ userId: "user_canonical" });
  });

  it("exposes the canonical user ID on session.user.id", async () => {
    const session = await authCallbacks.session({
      session: { user: {}, expires: new Date().toISOString() },
      token: { userId: "user_canonical" },
    });

    expect((session.user as { id?: string } | undefined)?.id).toBe("user_canonical");
  });
});

describe("Google sign-in callback boundaries", () => {
  it("allows verified Google email when no existing app user owns it", async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(null);

    await expect(
      authCallbacks.signIn({
        account: { provider: "google", providerAccountId: "google-1" },
        profile: { email: "New@Example.COM", email_verified: true },
        findUserByEmail,
      }),
    ).resolves.toBe(true);

    expect(findUserByEmail).toHaveBeenCalledWith("new@example.com");
  });

  it("allows a returning Google account already linked to the app user", async () => {
    await expect(
      authCallbacks.signIn({
        account: { provider: "google", providerAccountId: "google-1" },
        profile: { email: "user@example.com", email_verified: true },
        findUserByEmail: vi.fn().mockResolvedValue({
          id: "user_google",
          accounts: [{ provider: "google", providerAccountId: "google-1" }],
        }),
      }),
    ).resolves.toBe(true);
  });

  it("denies unverified Google email", async () => {
    await expect(
      authCallbacks.signIn({
        account: { provider: "google", providerAccountId: "google-1" },
        profile: { email: "user@example.com", email_verified: false },
        findUserByEmail: vi.fn(),
      }),
    ).resolves.toBe(false);
  });

  it("denies verified Google email that belongs to an unlinked credentials account", async () => {
    await expect(
      authCallbacks.signIn({
        account: { provider: "google", providerAccountId: "google-1" },
        profile: { email: "user@example.com", email_verified: true },
        findUserByEmail: vi.fn().mockResolvedValue({
          id: "user_credentials",
          accounts: [],
        }),
      }),
    ).resolves.toBe(`/login?error=${authErrorCodes.providerConflict}`);
  });
});
