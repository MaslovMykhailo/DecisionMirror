import type { User } from "next-auth";

import type { CredentialsAuthorizer } from "@/lib/auth/config";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/auth/validation";

type CredentialsUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  passwordHash?: string | null;
};

type FindUserByEmail = (email: string) => Promise<CredentialsUser | null>;

type CredentialsDeps = {
  findUserByEmail: FindUserByEmail;
};

async function defaultFindUserByEmail(email: string): Promise<CredentialsUser | null> {
  const { prisma } = await import("@/lib/db/client");
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      passwordHash: true,
    },
  });
}

export async function authorizeCredentialsWithDeps(
  credentials: Parameters<CredentialsAuthorizer>[0],
  { findUserByEmail }: CredentialsDeps,
): Promise<User | null> {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await findUserByEmail(parsed.data.email);
  if (!user?.passwordHash) return null;

  const passwordMatches = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!passwordMatches) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
  };
}

export const authorizeCredentials: CredentialsAuthorizer = async (
  credentials,
): Promise<User | null> =>
  authorizeCredentialsWithDeps(credentials, { findUserByEmail: defaultFindUserByEmail });
