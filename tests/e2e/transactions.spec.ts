import { expect, test } from "@playwright/test";

import { formatLocalDateInputValue, formatLocalDateLabel } from "../../src/utils/date";
import { TEST_IDS } from "../../src/utils/testIds";
import { loadFixture } from "../support/fixtures";
import { openE2EApp, seedE2EState } from "../support/setup";
import {
  createTransactionViaUI,
  createWalletViaUI,
  editFirstTransactionDate,
  openWalletsTab,
  openTransactionsTab,
} from "../support/commands";

test.describe("Lançamentos", () => {
  test("registra saída, mostra no histórico e atualiza saldo", async ({ page }) => {
    await seedE2EState(page, {
      authenticated: true,
      userName: "Verona Mazza",
    });
    await openE2EApp(page);

    await createWalletViaUI(page, {
      name: "MercadoPago",
      balance: "1000,00",
      type: "checking",
      colorIndex: 1,
    });

    await createTransactionViaUI(page, {
      amount: "23,02",
      walletName: "MercadoPago — Conta corrente",
      category: "Alimentação",
      description: "Ifood Açaí",
      date: formatLocalDateInputValue(),
      type: "expense",
    });

    await openTransactionsTab(page);

    await expect(page.getByTestId(TEST_IDS.transactionItem).first()).toContainText(
      "Ifood Açaí"
    );
    await expect(page.getByTestId(TEST_IDS.transactionItem).first()).toContainText(
      formatLocalDateLabel(formatLocalDateInputValue())
    );
    await expect(page.getByText("-R$ 23,02")).toBeVisible();

    await openWalletsTab(page);
    await expect(page.getByTestId(TEST_IDS.walletCardDesktop).first()).toContainText(
      "R$ 976,98"
    );

    await page.reload();
    await openTransactionsTab(page);
    await expect(page.getByTestId(TEST_IDS.transactionItem).first()).toContainText(
      "Ifood Açaí"
    );
  });

  test("edita a data de um lançamento e marca como editado", async ({ page }) => {
    const wallets = loadFixture<any[]>("wallets.json");
    const transactions = loadFixture<any[]>("transactions.json");

    await seedE2EState(page, {
      authenticated: true,
      userName: "Verona Mazza",
      wallets,
      transactions,
    });
    await openE2EApp(page);
    await openTransactionsTab(page);

    const newDate = formatLocalDateInputValue(new Date(2026, 4, 29));
    await editFirstTransactionDate(page, newDate);

    await expect(page.getByText("Data editada")).toBeVisible();
    await expect(page.getByText("Originalmente em")).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.transactionItem).first()).toContainText(
      formatLocalDateLabel(newDate)
    );

    await page.reload();
    await openTransactionsTab(page);
    await expect(page.getByText("Data editada")).toBeVisible();
  });

  test("registra entrada e recalcula dashboard e score", async ({ page }) => {
    await seedE2EState(page, {
      authenticated: true,
      userName: "Verona Mazza",
    });
    await openE2EApp(page);

    await createWalletViaUI(page, {
      name: "Conta corrente",
      balance: "1000,00",
      type: "checking",
      colorIndex: 1,
    });

    await openTransactionsTab(page);

    await createTransactionViaUI(page, {
      amount: "5000,00",
      walletName: "Conta corrente — Conta corrente",
      category: "Salário",
      description: "Salário",
      date: formatLocalDateInputValue(),
      type: "income",
    });

    await openWalletsTab(page);
    await expect(page.getByTestId(TEST_IDS.walletCardDesktop).first()).toContainText(
      "R$ 6.000,00"
    );

    await page.getByRole("button", { name: "Dashboard" }).click();
    await page.getByRole("button", { name: "Abrir coach" }).click();
    await expect(page.getByTestId(TEST_IDS.coachCard)).toBeVisible();
    await expect(page.getByText("Leitura financeira instantânea")).toBeVisible();
  });
});
