import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.NOVAOPS_E2E_EMAIL ?? "admin@novaops.com";
const ADMIN_PASSWORD = process.env.NOVAOPS_E2E_PASSWORD ?? "admin123";
const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8000";

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

async function fetchOpenTaskId(page: Page): Promise<string | null> {
  const token = await page.evaluate(() => localStorage.getItem("novaops_token"));
  if (!token) return null;

  const response = await page.request.get(`${API_URL}/api/v1/tasks?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) return null;

  const tasks = (await response.json()) as Array<{ id: number | string; status?: string }>;
  const openTask = tasks.find((task) => task.status !== "Completed");

  return openTask ? String(openTask.id) : tasks[0] ? String(tasks[0].id) : null;
}

async function seedOfflineDraftMutation(page: Page, taskId: string) {
  await page.evaluate(async (queuedTaskId) => {
    const mutation = {
      id: `e2e-offline-${Date.now()}`,
      type: "EXECUTION_DRAFT",
      taskId: queuedTaskId,
      label: "E2E offline draft",
      payload: {
        task_id: Number(queuedTaskId),
        form_template_id: null,
        answers_json: {
          operator: { name: "E2E Offline Crew", position: "Crew" },
          note: "Playwright offline UAT",
        },
        existingSessionId: null,
      },
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("novaops-offline", 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("mutation_queue")) {
          const store = db.createObjectStore("mutation_queue", { keyPath: "id" });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("mutation_queue", "readwrite");
        tx.objectStore("mutation_queue").put(mutation);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });
  }, taskId);
}

test.describe("Offline sync (Fase F)", () => {
  test("syncs queued IndexedDB draft after reconnect", async ({ page, context }) => {
    await login(page);

    const taskId = await fetchOpenTaskId(page);
    test.skip(!taskId, "No backend tasks available for offline UAT");

    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("offline"));
    });
    await seedOfflineDraftMutation(page, taskId!);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("novaops-offline-queue-change"));
    });

    await expect(page.locator('button[title="Offline — changes queued locally"]')).toBeVisible({
      timeout: 20_000,
    });

    await context.setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });

    const syncBadge = page.locator('button[title="Tap to sync pending changes"]');
    await page.waitForTimeout(1500);

    if (await syncBadge.isVisible()) {
      await syncBadge.click();
    }

    await expect(syncBadge).toBeHidden({ timeout: 60_000 });
  });
});
