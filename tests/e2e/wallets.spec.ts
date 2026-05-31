import { expect, test } from "@playwright/test";

import { TEST_IDS } from "../../src/utils/testIds";
import { openE2EApp, seedE2EState } from "../support/setup";
import {
  createWalletViaUI,
  editFirstWalletColor,
  openWalletsTab,
} from "../support/commands";

test.describe("Carteiras", () => {
  test("cria carteira, edita a cor e persiste após refresh", async ({ page }) => {
    await seedE2EState(page, {
      authenticated: true,
      userName: "Verona Mazza",
    });
    await openE2EApp(page);

    await createWalletViaUI(page, {
      name: "MercadoPago",
      balance: "1530,42",
      type: "checking",
      colorIndex: 1,
    });

    const firstCard = page.getByTestId(TEST_IDS.walletCardDesktop).first();
    await expect(firstCard).toContainText("MercadoPago");

    await editFirstWalletColor(page, 4);
    await expect(firstCard).toHaveClass(/from-amber/);

    await page.reload();
    await openWalletsTab(page);
    await expect(page.getByTestId(TEST_IDS.walletCardDesktop).first()).toHaveClass(
      /from-amber/
    );
  });

  test("busca e ordena carteiras", async ({ page }) => {
    await seedE2EState(page, {
      authenticated: true,
      userName: "Verona Mazza",
    });
    await openE2EApp(page);

    await createWalletViaUI(page, {
      name: "Caixa",
      balance: "200,00",
      type: "cash",
      colorIndex: 0,
    });

    await createWalletViaUI(page, {
      name: "Nubank",
      balance: "2500,00",
      type: "checking",
      colorIndex: 1,
    });

    await openWalletsTab(page);
    await page.getByPlaceholder("Nome, tipo, moeda ou saldo").fill("nubank");
    await expect(page.getByTestId(TEST_IDS.walletCardDesktop)).toHaveCount(1);
    await expect(page.getByTestId(TEST_IDS.walletCardDesktop).first()).toContainText(
      "Nubank"
    );

    await page.getByRole("button", { name: "Limpar" }).click();
    await page.getByLabel("Ordenar por").selectOption("balance");
    await expect(page.getByTestId(TEST_IDS.walletCardDesktop).first()).toContainText(
      "Nubank"
    );
  });
});
