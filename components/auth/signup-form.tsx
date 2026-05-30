"use client";

import { Chrome, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { AuthErrorList } from "@/components/auth/error-messages";
import { Button } from "@/components/ui/button";
import type { AuthFormState } from "@/lib/auth/form-actions";

type SignupFieldErrors = {
  email?: string[];
  name?: string[];
  password?: string[];
};

type SignupFormAction = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
type ProviderFormAction = (formData: FormData) => Promise<void> | void;

export function SignupForm({
  fieldErrors = {},
  initialState,
  signupAction,
  googleAction,
  loginHref,
  redirectTo = "/",
}: {
  fieldErrors?: SignupFieldErrors;
  initialState?: AuthFormState;
  signupAction: SignupFormAction;
  googleAction: ProviderFormAction;
  loginHref: string;
  redirectTo?: string;
}) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(signupAction, {
    fieldErrors,
    ...initialState,
  });
  const currentFieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} noValidate className="grid w-full gap-5">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div>
        <h1 className="font-heading text-2xl font-semibold">{t("signupTitle")}</h1>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="signup-name">
          {t("name")} <span className="text-muted-foreground">({t("optional")})</span>
        </label>
        <input
          id="signup-name"
          name="name"
          autoComplete="name"
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
        />
        <AuthErrorList errors={currentFieldErrors.name} />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="signup-email">
          {t("email")}
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(currentFieldErrors.email)}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-10 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
        />
        <AuthErrorList errors={currentFieldErrors.email} />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="signup-password">
          {t("password")}
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(currentFieldErrors.password)}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive h-10 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
        />
        <AuthErrorList errors={currentFieldErrors.password} />
      </div>

      <Button type="submit" disabled={pending}>
        <UserPlus />
        {t("signupSubmit")}
      </Button>
      <Button type="submit" formAction={googleAction} variant="outline" disabled={pending}>
        <Chrome />
        {t("googleSignup")}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        {t("loginPrompt")}{" "}
        <a className="text-primary font-medium underline-offset-4 hover:underline" href={loginHref}>
          {t("loginLink")}
        </a>
      </p>
    </form>
  );
}
