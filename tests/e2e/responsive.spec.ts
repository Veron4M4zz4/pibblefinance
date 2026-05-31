import { expect, test } from "@playwright/test";

import { TEST_IDS } from "../../src/utils/testIds";
import { openE2EApp, seedE2EState } from "../support/setup";
import { createTransactionViaUI, createWalletViaUI } from "../support/commands";

test.describe("Responsividade", () => {
  test("desktop 1440x900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await seedE2EState(page, { authenticated: true, userName: "Verona Mazza" });
    await openE2EApp(page);
    await expect(page.getByTestId(TEST_IDS.dashboardPageDesktop)).toBeVisible();
    const size = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(size.scrollWidth).toBeLessThanOrEqual(size.viewport + 2);
  });

  test("notebook 1366x768", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await seedE2EState(page, { authenticated: true, userName: "Verona Mazza" });
    await openE2EApp(page);
    await expect(page.getByTestId(TEST_IDS.dashboardPageDesktop)).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", /./);
  });

  test("mobile 390x844 permite lançar sem quebrar layout", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedE2EState(page, { authenticated: true, userName: "Verona Mazza" });
    await openE2EApp(page);
    await expect(page.getByTestId(TEST_IDS.dashboardPageMobile)).toBeVisible();

    await createWalletViaUI(page, {
      name: "Carteira Mobile",
      balance: "100,00",
      type: "checking",
      colorIndex: 1,
      variant: "mobile",
    });

    await page.getByRole("button", { name: "Transações" }).click();
    await createTransactionViaUI(page, {
      amount: "23,00",
      walletName: "Carteira Mobile — Conta corrente",
      category: "Alimentação",
      description: "Snack no mobile",
      date: "2026-05-30",
      type: "expense",
    });

    await expect(page.getByTestId(TEST_IDS.transactionItem).first()).toContainText(
      "Snack no mobile"
    );

    const sizes = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));

    expect(sizes.width).toBeLessThanOrEqual(sizes.viewport + 2);
  });
});
