import { expect, test } from "@playwright/test";

import { TEST_IDS } from "../../src/utils/testIds";
import { loadFixture } from "../support/fixtures";
import { openE2EApp, seedE2EState } from "../support/setup";

test.describe("Histórico de transações", () => {
  test("busca e filtra sem esconder lançamento recém-criado", async ({ page }) => {
    const wallets = loadFixture<any[]>("wallets.json");
    const transactions = loadFixture<any[]>("transactions.json");

    await seedE2EState(page, {
      authenticated: true,
      userName: "Verona Mazza",
      wallets,
      transactions,
    });
    await openE2EApp(page);

    await page.getByRole("button", { name: "Transações" }).click();
    await expect(page.getByTestId(TEST_IDS.transactionList)).toBeVisible();

    await page
      .getByPlaceholder("Buscar por título, categoria, carteira ou descrição")
      .fill("delivery");
    await expect(page.getByTestId(TEST_IDS.transactionItem)).toHaveCount(1);
    await expect(page.getByTestId(TEST_IDS.transactionItem).first()).toContainText(
      "Delivery"
    );

    await page.getByRole("button", { name: "Filtros" }).click();
    await page.getByLabel("Tipo").selectOption("expense");
    await expect(page.getByTestId(TEST_IDS.transactionItem)).toHaveCount(1);
  });

  test("copia resumo e exporta CSV", async ({ page, context }) => {
    const wallets = loadFixture<any[]>("wallets.json");
    const transactions = loadFixture<any[]>("transactions.json");

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await seedE2EState(page, {
      authenticated: true,
      userName: "Verona Mazza",
      wallets,
      transactions,
    });
    await openE2EApp(page);
    await page.getByRole("button", { name: "Transações" }).click();

    await page.getByRole("button", { name: "Copiar resumo" }).click();
    await expect(page.getByRole("button", { name: "Copiado" })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".csv");
  });
});
