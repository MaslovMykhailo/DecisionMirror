import { describe, expect, it, vi } from "vitest";

import {
  googleSignInActionWithDeps,
  loginWithCredentialsActionWithDeps,
  logoutActionWithDeps,
} from "@/lib/auth/form-actions";

describe("CSRF-safe auth actions", () => {
  it("uses the Auth.js credentials helper for credentials login", async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    const formData = new FormData();
    formData.set("email", "User@Example.COM");
    formData.set("password", "ValidPass1!");
    formData.set("redirectTo", "/en");

    await expect(loginWithCredentialsActionWithDeps({}, formData, { signIn })).resolves.toEqual({});

    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "user@example.com",
      password: "ValidPass1!",
      redirectTo: "/en",
    });
  });

  it("returns login validation state without calling Auth.js", async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    const formData = new FormData();
    formData.set("email", "bad");
    formData.set("password", "");

    await expect(loginWithCredentialsActionWithDeps({}, formData, { signIn })).resolves.toEqual({
      fieldErrors: {
        email: ["email_invalid"],
        password: ["password_required"],
      },
    });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("maps credentials sign-in failures to a generic form error", async () => {
    const signIn = vi.fn().mockRejectedValue({ type: "CredentialsSignin" });
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "WrongPass1!");

    await expect(loginWithCredentialsActionWithDeps({}, formData, { signIn })).resolves.toEqual({
      formErrors: ["invalid_email_or_password"],
    });
  });

  it("uses the Auth.js Google helper for login and signup entry points", async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    const formData = new FormData();
    formData.set("redirectTo", "/uk");

    await expect(googleSignInActionWithDeps(formData, { signIn })).resolves.toBeUndefined();

    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/uk" });
  });

  it("uses the Auth.js sign-out helper for logout", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    const formData = new FormData();
    formData.set("redirectTo", "/en/login");

    await expect(logoutActionWithDeps(formData, { signOut })).resolves.toBeUndefined();

    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/en/login" });
  });
});
