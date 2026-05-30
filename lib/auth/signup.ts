import { buildCredentialsUserData } from "@/lib/auth/password";
import {
  type AuthValidationError,
  mapSignupPersistenceError,
  signupSchema,
} from "@/lib/auth/validation";

type CreateUserData = Awaited<ReturnType<typeof buildCredentialsUserData>>;

type CreateUser = (data: CreateUserData) => Promise<{ id: string }>;

type EstablishSessionInput = {
  email: string;
  password: string;
  redirectTo: string;
};

type EstablishSession = (input: EstablishSessionInput) => Promise<void>;

type SignupDeps = {
  createUser?: CreateUser;
  establishSession?: EstablishSession;
  redirectTo?: string;
};

type SignupSuccess = {
  status: "success";
  userId: string;
  redirectTo: string;
};

type SignupValidationFailure = {
  status: "validation_error";
  fieldErrors: {
    email?: string[];
    name?: string[];
    password?: string[];
  };
};

type SignupFailure = {
  status: "error";
  error: AuthValidationError;
};

export type SignupResult = SignupSuccess | SignupValidationFailure | SignupFailure;

async function defaultCreateUser(data: CreateUserData): Promise<{ id: string }> {
  const { prisma } = await import("@/lib/db/client");
  return prisma.user.create({
    data,
    select: { id: true },
  });
}

async function defaultEstablishSession({
  email,
  password,
  redirectTo,
}: EstablishSessionInput): Promise<void> {
  const { signIn } = await import("@/auth");
  await signIn("credentials", {
    email,
    password,
    redirectTo,
  });
}

export async function signupWithCredentials(
  input: unknown,
  {
    createUser = defaultCreateUser,
    establishSession = defaultEstablishSession,
    redirectTo = "/",
  }: SignupDeps = {},
): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "validation_error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const userData = await buildCredentialsUserData(parsed.data);

  let user: { id: string };
  try {
    user = await createUser(userData);
  } catch (error) {
    return {
      status: "error",
      error: mapSignupPersistenceError(error),
    };
  }

  await establishSession({
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo,
  });

  return {
    status: "success",
    userId: user.id,
    redirectTo,
  };
}
