import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.NOVAOPS_E2E_EMAIL ?? "admin@novaops.com";
const ADMIN_PASSWORD = process.env.NOVAOPS_E2E_PASSWORD ?? "admin123";
const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8000";

const ZENPUT_CATEGORY_LABELS = [
  "Opening",
  "Closing",
  "Food Safety",
  "Cleaning & Sanitation",
  "Audit",
  "Inventory",
  "Maintenance",
  "Quality Check",
  "Corrective Action",
  "Uncategorized",
];

async function login(page: Page) {
  const loginResponse = await page.request.post(`${API_URL}/api/v1/auth/login`, {
    data: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  expect(loginResponse.ok()).toBeTruthy();
  const payload = (await loginResponse.json()) as { access_token: string };

  await page.goto("/login");
  await page.evaluate((token) => {
    localStorage.setItem("novaops_token", token);
  }, payload.access_token);

  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

async function switchToOutletWorkspace(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("novaops_token"));
  expect(token).toBeTruthy();

  const outletsResponse = await page.request.get(`${API_URL}/api/v1/identity/outlets`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!outletsResponse.ok()) {
    return false;
  }

  const outlets = (await outletsResponse.json()) as Array<{
    id: string;
    name: string;
    code?: string | null;
  }>;

  const outlet = outlets[0];
  if (!outlet) {
    return false;
  }

  await page.evaluate(
    ({ outletId, outletName, outletCode }) => {
      localStorage.setItem("novaops_workspace_role", "OUTLET");
      localStorage.setItem(
        "novaops_workspace_context",
        JSON.stringify({
          outletId,
          outletName,
          outletCode: outletCode ?? "",
        })
      );
      window.dispatchEvent(new Event("novaops-workspace-change"));
    },
    { outletId: outlet.id, outletName: outlet.name, outletCode: outlet.code ?? "" }
  );

  return true;
}

test.describe("Zenput parity — Form Builder & Templates", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("form builder shows Zenput category sidebar and no Money Safe Count preset", async ({ page }) => {
    await page.goto("/dashboard/forms");
    await expect(page.getByRole("heading", { name: /My Form/i })).toBeVisible({ timeout: 20_000 });

    await expect(page.getByText("Categories", { exact: true })).toBeVisible();
    for (const label of ZENPUT_CATEGORY_LABELS) {
      await expect(page.getByRole("button", { name: new RegExp(label, "i") })).toBeVisible();
    }

    await expect(page.getByRole("button", { name: /Money Safe Count/i })).toHaveCount(0);

    const newFormButton = page.getByRole("button", { name: /Form Baru|New Form/i }).first();
    await expect(newFormButton).toBeVisible();
    await newFormButton.click();

    await expect(page.getByLabel("Category")).toBeVisible();
    await expect(page.getByLabel("Category")).toContainText("Uncategorized");
  });

  test("bootstrap templates map to Zenput operational categories", async ({ page }) => {
    await page.goto("/dashboard/forms");
    await expect(page.getByRole("heading", { name: /My Form/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /^Opening$/i }).click();
    await expect(page.getByText(/Opening Checklist/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /Food Safety/i }).click();
    await expect(page.getByText(/Food Safety/i).first()).toBeVisible();

    await page.getByRole("button", { name: /Cleaning & Sanitation/i }).click();
    await expect(page.getByText(/Cleaning & Sanitation/i).first()).toBeVisible();

    await page.getByRole("button", { name: /^Closing$/i }).click();
    await expect(page.getByText(/Closing Checklist/i)).toBeVisible();
  });

  test("form preview renders checklist fields like Zenput execution form", async ({ page }) => {
    await page.goto("/dashboard/forms");
    await expect(page.getByRole("heading", { name: /My Form/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /^Opening$/i }).click();
    await page.getByText(/Opening Checklist/i).first().click();

    await page.getByRole("button", { name: /Pratinjau|Preview/i }).click();
    await expect(page.getByText(/Store unlocked|Equipment pre-check|Opening photo/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Zenput parity — Task execution UI", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("outlet task execution opens sectioned form without separate evidence gallery", async ({ page }) => {
    const switched = await switchToOutletWorkspace(page);
    test.skip(!switched, "No outlet available for crew execution parity");

    await page.goto("/dashboard/tasks");
    await expect(page.getByRole("heading", { name: /Tasks/i })).toBeVisible({ timeout: 20_000 });

    const taskButton = page.locator("button").filter({ hasText: /Checklist|Opening|Closing|Task/i }).first();
    test.skip((await taskButton.count()) === 0, "No tasks available for execution parity");

    await taskButton.click();

    await expect(page.getByText(/Task Execution|Eksekusi Task/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Evidence Gallery|Galeri Evidence/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Submit|Kirim/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Save Draft|Simpan Draft/i })).toBeVisible();
  });

  test("admin task detail shows template context without execution drawer", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem("novaops_workspace_role");
      localStorage.removeItem("novaops_workspace_context");
      window.dispatchEvent(new Event("novaops-workspace-change"));
    });

    await page.goto("/dashboard/tasks");
    await expect(page.getByRole("heading", { name: /^Task$/i })).toBeVisible({ timeout: 20_000 });

    const taskButton = page.locator("button").filter({ hasText: /Checklist|Opening|Closing|Task/i }).first();
    test.skip((await taskButton.count()) === 0, "No tasks available for admin detail parity");

    await taskButton.click();
    await expect(page.getByText(/Task Execution|Eksekusi Task/i)).toHaveCount(0);
  });
});
