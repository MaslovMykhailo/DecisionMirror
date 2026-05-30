import bcrypt from "bcryptjs";

import type { SignupInput } from "@/lib/auth/validation";

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function buildCredentialsUserData(input: SignupInput): Promise<{
  email: string;
  name?: string;
  passwordHash: string;
}> {
  const passwordHash = await hashPassword(input.password);

  return {
    email: input.email,
    ...(input.name ? { name: input.name } : {}),
    passwordHash,
  };
}
