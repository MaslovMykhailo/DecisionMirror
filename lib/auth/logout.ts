type EndSession = (input: { redirectTo: string }) => Promise<void>;

type LogoutDeps = {
  endSession?: EndSession;
  redirectTo?: string;
};

async function defaultEndSession({ redirectTo }: { redirectTo: string }): Promise<void> {
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo });
}

export async function logout({
  endSession = defaultEndSession,
  redirectTo = "/login",
}: LogoutDeps = {}): Promise<void> {
  await endSession({ redirectTo });
}
