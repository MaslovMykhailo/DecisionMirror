import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/actions", () => ({
  googleSignInAction: vi.fn(),
  loginWithCredentialsAction: vi.fn(),
}));
vi.mock("@/lib/auth/validation", () => ({
  authErrorCodes: { providerConflict: "provider_conflict" },
}));
vi.mock("@/lib/auth/signup", () => ({ signupWithCredentials: vi.fn() }));
vi.mock("@/components/auth/login-form", () => ({
  LoginForm: () => <form aria-label="Log in" />,
}));
vi.mock("@/components/auth/signup-form", () => ({
  SignupForm: () => <form aria-label="Create account" />,
}));
vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));
vi.mock("@/components/language-switcher", () => ({
  LanguageSwitcher: () => <button type="button">Language</button>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("auth pages theme & language controls", () => {
  it("renders theme and language controls alongside the login form", async () => {
    const { default: LoginPage } = await import("@/app/[locale]/login/page");
    render(
      await LoginPage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("form", { name: "Log in" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Theme" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Language" })).toBeDefined();
  });

  it("renders theme and language controls alongside the signup form", async () => {
    const { default: SignupPage } = await import("@/app/[locale]/signup/page");
    render(await SignupPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(screen.getByRole("form", { name: "Create account" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Theme" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Language" })).toBeDefined();
  });
});
