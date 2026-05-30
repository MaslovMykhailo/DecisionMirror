import { expect, test, type Page } from "@playwright/test";

let prisma: Awaited<typeof import("@/lib/db/client")>["prisma"] | undefined;
const userIds: string[] = [];

const SCRIPT_WARNING =
  /Encountered a script tag while rendering React component|Scripts inside React components are never executed/;

async function db() {
  if (!prisma) {
    ({ prisma } = await import("@/lib/db/client"));
  }
  return prisma;
}

async function createUser(email: string, password: string) {
  const { hashPassword } = await import("@/lib/auth/password");
  const client = await db();
  const user = await client.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
    },
  });
  userIds.push(user.id);
  return user;
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/en$/);
}

test.afterAll(async () => {
  const client = prisma;
  if (!client) return;
  for (const userId of userIds) {
    await client.user.delete({ where: { id: userId } }).catch(() => undefined);
  }
  await client.$disconnect();
});

test.describe("language switch", () => {
  test("switches locales without React script-tag warnings and preserves theme", async ({
    page,
  }) => {
    test.skip(!process.env.DATABASE_URL, "requires the e2e database");

    const consoleMessages: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning" || message.type() === "error") {
        consoleMessages.push(message.text());
      }
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("theme", "dark");
    });

    const password = "ValidPass1!";
    const user = await createUser(`locale-${Date.now()}@example.com`, password);
    await login(page, user.email, password);

    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.locator("select").selectOption("uk");
    await expect(page).toHaveURL(/\/uk$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.locator("select").selectOption("en");
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveClass(/dark/);

    expect(consoleMessages.filter((message) => SCRIPT_WARNING.test(message))).toEqual([]);
  });
});
