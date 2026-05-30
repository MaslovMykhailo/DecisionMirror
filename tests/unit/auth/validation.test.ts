import { describe, expect, it } from "vitest";

import {
  authErrorCodes,
  invalidCredentialsError,
  loginSchema,
  mapSignupPersistenceError,
  signupSchema,
} from "@/lib/auth/validation";

describe("auth validation schemas", () => {
  it("normalizes signup email and trims optional display name", () => {
    const parsed = signupSchema.parse({
      email: "  Ada.Lovelace@Example.COM ",
      name: "  Ada Lovelace  ",
      password: "ValidPass1!",
    });

    expect(parsed).toEqual({
      email: "ada.lovelace@example.com",
      name: "Ada Lovelace",
      password: "ValidPass1!",
    });
  });

  it("rejects invalid signup email and weak passwords with field-level errors", () => {
    const parsed = signupSchema.safeParse({
      email: "not-an-email",
      password: "password",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      expect(errors.email).toBeDefined();
      expect(errors.password).toEqual(
        expect.arrayContaining(["password_number_required", "password_symbol_required"]),
      );
    }
  });

  it("normalizes login email and validates required credentials", () => {
    expect(
      loginSchema.parse({
        email: "  User@Example.COM ",
        password: "not-empty",
      }),
    ).toEqual({
      email: "user@example.com",
      password: "not-empty",
    });

    expect(loginSchema.safeParse({ email: "bad", password: "" }).success).toBe(false);
  });
});

describe("auth error mapping", () => {
  it("maps Prisma duplicate email persistence errors to a duplicate-email field error", () => {
    const mapped = mapSignupPersistenceError({
      code: "P2002",
      meta: { target: ["email"] },
    });

    expect(mapped).toEqual({
      code: authErrorCodes.duplicateEmail,
      fieldErrors: { email: ["email_already_registered"] },
    });
  });

  it("does not expose whether invalid credentials failed by email or password", () => {
    const unknownEmail = invalidCredentialsError();
    const incorrectPassword = invalidCredentialsError();

    expect(unknownEmail).toEqual(incorrectPassword);
    expect(unknownEmail).toEqual({
      code: authErrorCodes.invalidCredentials,
      formErrors: ["invalid_email_or_password"],
    });
  });
});
