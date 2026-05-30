import "server-only";

import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";

import { authorizeCredentials } from "@/lib/auth/credentials";
import { createServerAuthConfig } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";

const authConfig = createServerAuthConfig({
  authorizeCredentials,
  findUserByEmail: async (email) => {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    if (!user) return null;

    return {
      id: user.id,
      accounts: user.accounts.map((account) => ({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      })),
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma as never),
});
