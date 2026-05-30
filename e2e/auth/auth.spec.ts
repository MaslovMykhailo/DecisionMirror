import { expect, test } from "@playwright/test";

test.describe("authentication", () => {
  test("redirects protected app access to the localized login page", async ({ page }) => {
    await page.goto("/en");

    await expect(page).toHaveURL(/\/en\/login$/);
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  });

  test("renders the localized signup page", async ({ page }) => {
    await page.goto("/uk/signup");

    await expect(page.getByRole("heading", { name: "Створити акаунт" })).toBeVisible();
    await expect(page.getByLabel("Електронна пошта")).toBeVisible();
  });

  test("credentials signup, login, logout, and authenticated app access", async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, "requires the e2e database");

    const email = `e2e-${Date.now()}@example.com`;
    await page.goto("/en/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("ValidPass1!");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/en$/);
    await page.goto("/en/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("ValidPass1!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/en\/login$/);
  });

  test("mocked Google sign-in provider path remains deterministic", async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, "requires the e2e database and OAuth route stubbing");

    await page.goto("/en/login");
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect(page).not.toHaveURL(/\/api\/auth\/signin\/google/);
  });
});
