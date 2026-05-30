import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const clientReadableFiles = [
  "messages/en.json",
  "messages/uk.json",
  "app/[locale]/page.tsx",
  "app/[locale]/layout.tsx",
  "components/language-switcher.tsx",
  "components/theme-toggle.tsx",
];

describe("OAuth secret boundary", () => {
  it("does not reference Auth.js or Google OAuth secrets from client-readable app surfaces", async () => {
    for (const file of clientReadableFiles) {
      const content = await readFile(file, "utf8");
      expect(content).not.toContain("AUTH_SECRET");
      expect(content).not.toContain("AUTH_GOOGLE_SECRET");
      expect(content).not.toContain("AUTH_GOOGLE_ID");
    }
  });
});
