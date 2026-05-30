import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/auth/signup/route";

describe("signup route handler", () => {
  it("returns validation errors without touching persistence", async () => {
    const response = await POST(
      new Request("https://decision-mirror.test/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "bad",
          password: "password",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      status: "validation_error",
      fieldErrors: {
        email: expect.any(Array),
        password: expect.arrayContaining(["password_number_required", "password_symbol_required"]),
      },
    });
  });
});
