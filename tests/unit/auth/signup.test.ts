import { describe, expect, it, vi } from "vitest";

import { signupWithCredentials } from "@/lib/auth/signup";
import { authErrorCodes } from "@/lib/auth/validation";

describe("signup service", () => {
  it("normalizes input, persists only a password hash, and establishes a session", async () => {
    const createUser = vi.fn().mockResolvedValue({ id: "user_123" });
    const establishSession = vi.fn().mockResolvedValue(undefined);

    const result = await signupWithCredentials(
      {
        email: " User@Example.COM ",
        name: " User ",
        password: "ValidPass1!",
      },
      { createUser, establishSession, redirectTo: "/en" },
    );

    expect(result).toEqual({ status: "success", userId: "user_123", redirectTo: "/en" });
    expect(createUser).toHaveBeenCalledWith({
      email: "user@example.com",
      name: "User",
      passwordHash: expect.stringMatching(/^\$2[aby]\$/),
    });
    expect(JSON.stringify(createUser.mock.calls[0]?.[0])).not.toContain("ValidPass1!");
    expect(establishSession).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "ValidPass1!",
      redirectTo: "/en",
    });
  });

  it("returns validation errors before persistence", async () => {
    const createUser = vi.fn();
    const establishSession = vi.fn();

    const result = await signupWithCredentials(
      {
        email: "bad",
        password: "password",
      },
      { createUser, establishSession },
    );

    expect(result.status).toBe("validation_error");
    expect(createUser).not.toHaveBeenCalled();
    expect(establishSession).not.toHaveBeenCalled();
  });

  it("maps duplicate email persistence failures without establishing a session", async () => {
    const createUser = vi.fn().mockRejectedValue({
      code: "P2002",
      meta: { target: ["email"] },
    });
    const establishSession = vi.fn();

    const result = await signupWithCredentials(
      {
        email: "user@example.com",
        password: "ValidPass1!",
      },
      { createUser, establishSession },
    );

    expect(result).toEqual({
      status: "error",
      error: {
        code: authErrorCodes.duplicateEmail,
        fieldErrors: { email: ["email_already_registered"] },
      },
    });
    expect(establishSession).not.toHaveBeenCalled();
  });
});
