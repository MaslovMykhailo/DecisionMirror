import { describe, expect, it } from "vitest";

import { getAuthRedirectPath, isPublicAuthPath } from "@/lib/auth/route-policy";

describe("auth route policy", () => {
  it("keeps localized auth pages public", () => {
    expect(isPublicAuthPath("/en/login")).toBe(true);
    expect(isPublicAuthPath("/uk/signup")).toBe(true);
  });

  it("redirects unauthenticated localized app pages to the locale login page", () => {
    expect(getAuthRedirectPath({ pathname: "/en", authenticated: false })).toBe("/en/login");
    expect(getAuthRedirectPath({ pathname: "/uk/design", authenticated: false })).toBe("/uk/login");
  });

  it("does not redirect authenticated app pages or auth internals", () => {
    expect(getAuthRedirectPath({ pathname: "/en", authenticated: true })).toBeNull();
    expect(getAuthRedirectPath({ pathname: "/api/auth/session", authenticated: false })).toBeNull();
  });
});
