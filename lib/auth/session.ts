type SessionLike = {
  user?: {
    id?: string | null;
  } | null;
} | null;

export type AuthenticatedUserIdResult =
  | {
      authenticated: true;
      userId: string;
    }
  | {
      authenticated: false;
      reason: "unauthenticated";
    };

export function sessionUserIdResult(session: SessionLike): AuthenticatedUserIdResult {
  const userId = session?.user?.id;

  if (typeof userId === "string" && userId.length > 0) {
    return {
      authenticated: true,
      userId,
    };
  }

  return {
    authenticated: false,
    reason: "unauthenticated",
  };
}

export async function readAuthenticatedUserId(
  readSession: () => Promise<SessionLike>,
): Promise<AuthenticatedUserIdResult> {
  return sessionUserIdResult(await readSession());
}
