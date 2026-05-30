import { useTranslations } from "next-intl";

const errorKeyMap = {
  email_invalid: "email_invalid",
  email_already_registered: "email_already_registered",
  password_required: "password_required",
  password_min_length: "password_min_length",
  password_letter_required: "password_letter_required",
  password_number_required: "password_number_required",
  password_symbol_required: "password_symbol_required",
  invalid_email_or_password: "invalid_email_or_password",
  provider_conflict: "provider_conflict",
  signup_failed: "signup_failed",
} as const;

type ErrorCode = keyof typeof errorKeyMap;

export function AuthErrorMessage({ code }: { code: string }) {
  const t = useTranslations("Auth.errors");
  const key = errorKeyMap[code as ErrorCode];

  return <>{key ? t(key) : code}</>;
}

export function AuthErrorList({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;

  return (
    <ul className="text-destructive mt-2 space-y-1 text-sm">
      {errors.map((error) => (
        <li key={error}>
          <AuthErrorMessage code={error} />
        </li>
      ))}
    </ul>
  );
}
