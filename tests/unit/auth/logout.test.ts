import { describe, expect, it, vi } from "vitest";

import { logout } from "@/lib/auth/logout";

describe("logout handling", () => {
  it("ends the application session and redirects to login", async () => {
    const endSession = vi.fn().mockResolvedValue(undefined);

    await logout({ endSession, redirectTo: "/en/login" });

    expect(endSession).toHaveBeenCalledWith({ redirectTo: "/en/login" });
  });
});
