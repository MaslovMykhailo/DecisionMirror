import { authErrorCodes } from "@/lib/auth/validation";

type AuthToken = {
  sub?: string;
  userId?: string;
};

type AuthUser = {
  id?: string | null;
};

type AuthSession = {
  expires?: string;
  user?: { id?: string } | null;
};

type AuthAccount = {
  provider?: string;
  providerAccountId?: string;
};

type GoogleProfile = {
  email?: unknown;
  email_verified?: unknown;
};

type ExistingAuthUser = {
  id: string;
  accounts: Array<{
    provider: string;
    providerAccountId: string;
  }>;
};

type FindUserByEmail = (email: string) => Promise<ExistingAuthUser | null>;

type AuthCallbackDeps = {
  findUserByEmail: FindUserByEmail;
};

type JwtCallbackInput = {
  token: AuthToken;
  user?: AuthUser | null;
};

type SignInCallbackInput = {
  account?: AuthAccount | null;
  profile?: GoogleProfile | null;
  findUserByEmail?: FindUserByEmail;
};

const providerConflictUrl = `/login?error=${authErrorCodes.providerConflict}`;

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function isLinkedGoogleAccount(existingUser: ExistingAuthUser, account: AuthAccount): boolean {
  return existingUser.accounts.some(
    (linkedAccount) =>
      linkedAccount.provider === "google" &&
      linkedAccount.providerAccountId === account.providerAccountId,
  );
}

export function createAuthCallbacks(deps: AuthCallbackDeps) {
  return {
    async jwt({ token, user }: JwtCallbackInput): Promise<AuthToken> {
      if (typeof user?.id === "string" && user.id.length > 0) {
        token.userId = user.id;
      }

      return token;
    },

    async session<TSession extends AuthSession>({
      session,
      token,
    }: {
      session: TSession;
      token: AuthToken;
    }): Promise<TSession> {
      const userId =
        typeof token.userId === "string"
          ? token.userId
          : typeof token.sub === "string"
            ? token.sub
            : null;

      if (userId) {
        session.user = {
          ...(session.user ?? {}),
          id: userId,
        };
      }

      return session;
    },

    async signIn({
      account,
      profile,
      findUserByEmail,
    }: SignInCallbackInput): Promise<boolean | string> {
      if (account?.provider !== "google") return true;
      if (profile?.email_verified !== true) return false;

      const email = normalizeEmail(profile.email);
      if (!email) return false;

      const existingUser = await (findUserByEmail ?? deps.findUserByEmail)(email);
      if (!existingUser) return true;

      return isLinkedGoogleAccount(existingUser, account) ? true : providerConflictUrl;
    },
  };
}

export const authCallbacks = createAuthCallbacks({
  findUserByEmail: async () => null,
});
