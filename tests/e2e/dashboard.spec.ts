import { expect, test } from "@playwright/test";

import { TEST_IDS } from "../../src/utils/testIds";
import { loadFixture } from "../support/fixtures";
import { openE2EApp, seedE2EState } from "../support/setup";
import { toggleTheme } from "../support/commands";

test.describe("Dashboard", () => {
  test("carrega resumo, metas, coach, assinaturas e gráficos", async ({ page }) => {
    const wallets = loadFixture<any[]>("wallets.json");
    const transactions = loadFixture<any[]>("transactions.json");

    await seedE2EState(page, {
      authenticated: true,
      userName: "Verona Mazza",
      wallets,
      transactions,
    });
    await openE2EApp(page);

    await expect(page.getByTestId(TEST_IDS.dashboardPage)).toBeVisible();
    await expect(page.getByText("Meta mensal")).toBeVisible();
    await expect(page.getByText("Próximos vencimentos")).toBeVisible();
    await expect(page.getByText("Insights do Coach Pibble")).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.dashboardSubscriptions)).toBeVisible();

    await page.getByRole("button", { name: "Ver análise profunda" }).click();
    await expect(page.getByText("Análise financeira")).toBeVisible();

    await page.getByRole("button", { name: "Abrir coach" }).click();
    await expect(page.getByTestId(TEST_IDS.coachCard)).toBeVisible();

    const html = page.locator("html");
    const beforeTheme = await html.getAttribute("data-theme");
    await toggleTheme(page);
    await expect(html).not.toHaveAttribute("data-theme", beforeTheme || "");
  });
});
