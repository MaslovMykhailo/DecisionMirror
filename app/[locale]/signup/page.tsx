import { SignupForm } from "@/components/auth/signup-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { googleSignInAction } from "@/lib/auth/actions";
import { signupWithCredentials } from "@/lib/auth/signup";
import type { AuthFormState } from "@/lib/auth/form-actions";

type SignupPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SignupPage({ params }: SignupPageProps) {
  const { locale } = await params;

  async function signupAction(
    _prevState: AuthFormState,
    formData: FormData,
  ): Promise<AuthFormState> {
    "use server";

    const result = await signupWithCredentials(Object.fromEntries(formData), {
      redirectTo: `/${locale}`,
    });

    if (result.status === "validation_error") {
      return { fieldErrors: result.fieldErrors };
    }

    if (result.status === "error") {
      return {
        fieldErrors: result.error.fieldErrors,
        formErrors: result.error.formErrors,
      };
    }

    return {};
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col px-6">
      <div className="flex items-center justify-between gap-2 py-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center">
        <SignupForm
          signupAction={signupAction}
          googleAction={googleSignInAction}
          loginHref={`/${locale}/login`}
          redirectTo={`/${locale}`}
        />
      </div>
    </main>
  );
}
