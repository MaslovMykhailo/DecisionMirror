import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { googleSignInAction, loginWithCredentialsAction } from "@/lib/auth/actions";
import { authErrorCodes } from "@/lib/auth/validation";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

const supportedErrors = new Set<string>([
  "invalid_email_or_password",
  authErrorCodes.providerConflict,
]);

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  const { error } = await searchParams;
  const safeError = error && supportedErrors.has(error) ? error : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col px-6">
      <div className="flex items-center justify-between gap-2 py-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center">
        <LoginForm
          error={safeError}
          loginAction={loginWithCredentialsAction}
          googleAction={googleSignInAction}
          signupHref={`/${locale}/signup`}
          redirectTo={`/${locale}`}
        />
      </div>
    </main>
  );
}
