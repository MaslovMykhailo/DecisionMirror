import { z } from "zod";

export const authErrorCodes = {
  duplicateEmail: "duplicate_email",
  invalidCredentials: "invalid_credentials",
  providerConflict: "provider_conflict",
  unknown: "auth_unknown",
} as const;

type AuthErrorCode = (typeof authErrorCodes)[keyof typeof authErrorCodes];

type FieldErrors = {
  email?: string[];
  password?: string[];
  name?: string[];
};

export type AuthValidationError = {
  code: AuthErrorCode;
  fieldErrors?: FieldErrors;
  formErrors?: string[];
};

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "email_invalid" }));

const optionalNameSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().min(1, { error: "name_required" }).max(120, { error: "name_too_long" }).optional(),
);

const signupPasswordSchema = z
  .string()
  .min(8, { error: "password_min_length" })
  .regex(/[A-Za-z]/, { error: "password_letter_required" })
  .regex(/[0-9]/, { error: "password_number_required" })
  .regex(/[^A-Za-z0-9]/, { error: "password_symbol_required" });

export const signupSchema = z.object({
  email: emailSchema,
  name: optionalNameSchema,
  password: signupPasswordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "password_required" }),
});

type PrismaLikeError = {
  code?: unknown;
  meta?: {
    target?: unknown;
    driverAdapterError?: {
      cause?: {
        constraint?: {
          fields?: unknown;
        };
      };
    };
  };
};

function isDuplicateEmailPersistenceError(error: unknown): error is PrismaLikeError {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as PrismaLikeError;
  const target = maybeError.meta?.target;
  const adapterConstraintFields = maybeError.meta?.driverAdapterError?.cause?.constraint?.fields;

  return (
    maybeError.code === "P2002" &&
    (target === "User_email_key" ||
      (Array.isArray(target) && target.includes("email")) ||
      (typeof target === "string" && target.includes("email")) ||
      (Array.isArray(adapterConstraintFields) && adapterConstraintFields.includes("email")))
  );
}

export function mapSignupPersistenceError(error: unknown): AuthValidationError {
  if (isDuplicateEmailPersistenceError(error)) {
    return {
      code: authErrorCodes.duplicateEmail,
      fieldErrors: { email: ["email_already_registered"] },
    };
  }

  return {
    code: authErrorCodes.unknown,
    formErrors: ["signup_failed"],
  };
}

export function invalidCredentialsError(): AuthValidationError {
  return {
    code: authErrorCodes.invalidCredentials,
    formErrors: ["invalid_email_or_password"],
  };
}

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
