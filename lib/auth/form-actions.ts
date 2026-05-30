import { invalidCredentialsError, loginSchema } from "@/lib/auth/validation";

type AuthFieldErrors = {
  email?: string[];
  name?: string[];
  password?: string[];
};

export type AuthFormState = {
  fieldErrors?: AuthFieldErrors;
  formErrors?: string[];
};

type SignIn = (
  provider: "credentials" | "google",
  options: Record<string, unknown>,
) => Promise<unknown>;
type SignOut = (options: { redirectTo: string }) => Promise<unknown>;

type LoginActionDeps = {
  signIn: SignIn;
};

type GoogleActionDeps = {
  signIn: SignIn;
};

type LogoutActionDeps = {
  signOut: SignOut;
};

function stringValue(formData: FormData, key: string, fallback: string): string {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function isCredentialsSignInError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type?: unknown }).type === "CredentialsSignin"
  );
}

export async function loginWithCredentialsActionWithDeps(
  _prevState: AuthFormState,
  formData: FormData,
  { signIn }: LoginActionDeps,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: stringValue(formData, "redirectTo", "/"),
    });
  } catch (error) {
    if (isCredentialsSignInError(error)) {
      return {
        formErrors: invalidCredentialsError().formErrors,
      };
    }

    throw error;
  }

  return {};
}

export async function googleSignInActionWithDeps(
  formData: FormData,
  { signIn }: GoogleActionDeps,
): Promise<void> {
  await signIn("google", {
    redirectTo: stringValue(formData, "redirectTo", "/"),
  });
}

export async function logoutActionWithDeps(
  formData: FormData,
  { signOut }: LogoutActionDeps,
): Promise<void> {
  await signOut({
    redirectTo: stringValue(formData, "redirectTo", "/login"),
  });
}
