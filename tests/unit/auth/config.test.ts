import { describe, expect, it } from "vitest";

import { createServerAuthConfig } from "@/lib/auth/config";

describe("Auth.js server configuration", () => {
  it("uses JWT sessions with Google and Credentials providers", () => {
    const config = createServerAuthConfig({
      authorizeCredentials: async () => null,
      findUserByEmail: async () => null,
    });

    expect(config.session).toEqual({ strategy: "jwt" });
    expect(config.providers).toHaveLength(2);
    const providers = config.providers as Array<{ id: string }>;
    expect(providers.map((provider) => provider.id)).toEqual(["google", "credentials"]);
  });
});
