"use client";

import { Chrome, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { AuthErrorList, AuthErrorMessage } from "@/components/auth/error-messages";
import { Button } from "@/components/ui/button";
import type { AuthFormState } from "@/lib/auth/form-actions";

type LoginFormAction = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
type ProviderFormAction = (formData: FormData) => Promise<void> | void;

export function LoginForm({
  error,
  initialState,
  loginAction,
  googleAction,
  signupHref,
  redirectTo = "/",
}: {
  error?: string;
  initialState?: AuthFormState;
  loginAction: LoginFormAction;
  googleAction: ProviderFormAction;
  signupHref: string;
  redirectTo?: string;
}) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(loginAction, initialState ?? {});
  const fieldErrors = state.fieldErrors ?? {};
  const formErrors = state.formErrors ?? (error ? [error] : []);

  return (
    <form action={formAction} noValidate className="grid w-full gap-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div>
        <h1 className="font-heading text-2xl font-semibold">{t("loginTitle")}</h1>
      </div>

      {formErrors.length > 0 ? (
        <p
          aria-live="polite"
          className="text-destructive border-destructive/30 rounded-md border px-3 py-2 text-sm"
        >
          <AuthErrorMessage code={formErrors[0] ?? ""} />
        </p>
      ) : null}

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="login-email">
          {t("email")}
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(fieldErrors.email)}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-10 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
        />
        <AuthErrorList errors={fieldErrors.email} />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="login-password">
          {t("password")}
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(fieldErrors.password)}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-10 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
        />
        <AuthErrorList errors={fieldErrors.password} />
      </div>

      <Button type="submit" disabled={pending}>
        <LogIn />
        {t("loginSubmit")}
      </Button>
      <Button type="submit" formAction={googleAction} variant="outline" disabled={pending}>
        <Chrome />
        {t("google")}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        {t("signupPrompt")}{" "}
        <a
          className="text-primary font-medium underline-offset-4 hover:underline"
          href={signupHref}
        >
          {t("signupLink")}
        </a>
      </p>
    </form>
  );
}
