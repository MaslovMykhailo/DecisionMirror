import type { NextAuthConfig, User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { createAuthCallbacks } from "@/lib/auth/callbacks";

type CredentialsInput = Partial<Record<"email" | "password", unknown>>;

export type CredentialsAuthorizer = (credentials: CredentialsInput) => Promise<User | null>;

export type AuthConfigDeps = {
  authorizeCredentials: CredentialsAuthorizer;
  findUserByEmail: Parameters<typeof createAuthCallbacks>[0]["findUserByEmail"];
};

export const authPages = {
  signIn: "/login",
  error: "/login",
} satisfies NextAuthConfig["pages"];

function googleProvider() {
  return Google({
    allowDangerousEmailAccountLinking: false,
  });
}

function credentialsProvider(authorizeCredentials: CredentialsAuthorizer) {
  return Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => authorizeCredentials(credentials),
  });
}

export function createEdgeAuthConfig(): NextAuthConfig {
  return {
    pages: authPages,
    providers: [googleProvider()],
  };
}

export function createServerAuthConfig(deps: AuthConfigDeps): NextAuthConfig {
  const callbacks = createAuthCallbacks({
    findUserByEmail: deps.findUserByEmail,
  });

  return {
    ...createEdgeAuthConfig(),
    session: { strategy: "jwt" },
    providers: [googleProvider(), credentialsProvider(deps.authorizeCredentials)],
    callbacks: {
      jwt: ({ token, user }) => callbacks.jwt({ token, user }),
      session: async ({ session, token }) => callbacks.session({ session, token }),
      signIn: ({ account, profile }) => callbacks.signIn({ account, profile }),
    },
  };
}
