import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { LoginForm } from "@/components/auth/login-form";
import { LogoutButton } from "@/components/auth/logout-button";
import { SignupForm } from "@/components/auth/signup-form";
import type { AuthFormState } from "@/lib/auth/form-actions";

const messages = {
  Auth: {
    email: "Email",
    password: "Password",
    name: "Name",
    optional: "optional",
    loginTitle: "Log in",
    signupTitle: "Create account",
    loginSubmit: "Log in",
    signupSubmit: "Create account",
    loginLink: "Log in",
    loginPrompt: "Already have an account?",
    signupLink: "Create account",
    signupPrompt: "New to Decision Mirror?",
    google: "Continue with Google",
    googleSignup: "Sign up with Google",
    logout: "Log out",
    errors: {
      email_invalid: "Enter a valid email.",
      password_required: "Enter your password.",
      password_number_required: "Use at least one number.",
      password_symbol_required: "Use at least one symbol.",
      invalid_email_or_password: "Email or password is incorrect.",
      provider_conflict: "Use the sign-in method already linked to this email.",
    },
  },
};

const ukMessages = {
  Auth: {
    ...messages.Auth,
    email: "Електронна пошта",
    password: "Пароль",
    name: "Ім'я",
    optional: "необов'язково",
    signupTitle: "Створити акаунт",
    signupSubmit: "Створити акаунт",
  },
};

function renderWithIntl(component: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>,
  );
}

async function idleAuthAction(): Promise<AuthFormState> {
  return {};
}

async function idleVoidAction(): Promise<void> {}

afterEach(() => cleanup());

describe("auth forms", () => {
  it("renders localized signup fields and field-level validation errors", () => {
    renderWithIntl(
      <SignupForm
        signupAction={idleAuthAction}
        googleAction={idleVoidAction}
        loginHref="/en/login"
        fieldErrors={{
          email: ["email_invalid"],
          password: ["password_number_required", "password_symbol_required"],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Create account" })).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByText("Enter a valid email.")).toBeDefined();
    expect(screen.getByText("Use at least one number.")).toBeDefined();
    expect(screen.getByText("Use at least one symbol.")).toBeDefined();
  });

  it("renders localized generic login and provider-conflict errors", () => {
    const { rerender } = renderWithIntl(
      <LoginForm
        loginAction={idleAuthAction}
        googleAction={idleVoidAction}
        signupHref="/en/signup"
        error="invalid_email_or_password"
      />,
    );

    expect(screen.getByRole("heading", { name: "Log in" })).toBeDefined();
    expect(screen.getByText("Email or password is incorrect.")).toBeDefined();

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LoginForm
          loginAction={idleAuthAction}
          googleAction={idleVoidAction}
          signupHref="/en/signup"
          error="provider_conflict"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText("Use the sign-in method already linked to this email.")).toBeDefined();
  });

  it("renders localized login validation errors as field and form state", () => {
    renderWithIntl(
      <LoginForm
        loginAction={idleAuthAction}
        googleAction={idleVoidAction}
        signupHref="/en/signup"
        initialState={{
          fieldErrors: {
            email: ["email_invalid"],
            password: ["password_required"],
          },
          formErrors: ["invalid_email_or_password"],
        }}
      />,
    );

    expect(screen.getByText("Enter a valid email.")).toBeDefined();
    expect(screen.getByText("Enter your password.")).toBeDefined();
    expect(screen.getByText("Email or password is incorrect.")).toBeDefined();
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Password").getAttribute("aria-invalid")).toBe("true");
  });

  it("links login and signup pages while preserving the active locale", () => {
    const { rerender } = renderWithIntl(
      <LoginForm
        loginAction={idleAuthAction}
        googleAction={idleVoidAction}
        signupHref="/en/signup"
      />,
    );

    expect(screen.getByRole("link", { name: "Create account" }).getAttribute("href")).toBe(
      "/en/signup",
    );

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SignupForm
          signupAction={idleAuthAction}
          googleAction={idleVoidAction}
          loginHref="/en/login"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/en/login");
  });

  it("does not wire provider buttons to raw Auth.js endpoints", () => {
    const { rerender } = renderWithIntl(
      <LoginForm
        loginAction={idleAuthAction}
        googleAction={idleVoidAction}
        signupHref="/en/signup"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Continue with Google" }).getAttribute("formaction"),
    ).not.toBe("/api/auth/signin/google");
    expect(
      screen.getByRole("button", { name: "Log in" }).closest("form")?.getAttribute("action"),
    ).not.toBe("/api/auth/login");

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SignupForm
          signupAction={idleAuthAction}
          googleAction={idleVoidAction}
          loginHref="/en/login"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("button", { name: "Sign up with Google" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Sign up with Google" }).getAttribute("formaction"),
    ).not.toBe("/api/auth/signin/google");
    expect(
      screen
        .getByRole("button", { name: "Create account" })
        .closest("form")
        ?.getAttribute("action"),
    ).not.toBe("/api/auth/signup");
  });

  it("renders a localized logout button without raw Auth.js signout posting", () => {
    renderWithIntl(<LogoutButton action={idleVoidAction} redirectTo="/en/login" />);

    const button = screen.getByRole("button", { name: "Log out" });
    expect(button).toBeDefined();
    expect(button.closest("form")?.getAttribute("action")).not.toBe("/api/auth/signout");
  });

  it("renders signup controls in Ukrainian", () => {
    render(
      <NextIntlClientProvider locale="uk" messages={ukMessages}>
        <SignupForm
          signupAction={idleAuthAction}
          googleAction={idleVoidAction}
          loginHref="/uk/login"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Створити акаунт" })).toBeDefined();
    expect(screen.getByLabelText("Електронна пошта")).toBeDefined();
    expect(screen.getByLabelText("Пароль")).toBeDefined();
  });
});
