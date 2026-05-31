import { expect, type Page } from "@playwright/test";
import { TEST_IDS } from "../../src/utils/testIds";

export async function openWalletsTab(page: Page) {
  await page.getByRole("button", { name: "Carteiras" }).click();
  await expect(page.getByTestId(TEST_IDS.walletForm)).toBeVisible();
}

export async function openTransactionsTab(page: Page) {
  await page.getByRole("button", { name: "Transações" }).click();
  await expect(page.getByTestId(TEST_IDS.transactionForm)).toBeVisible();
}

export async function createWalletViaUI(page: Page, wallet: {
  name: string;
  balance: string;
  type?: string;
  colorIndex?: number;
  variant?: "desktop" | "mobile";
}) {
  const walletVariant = wallet.variant || "desktop";
  await openWalletsTab(page);
  await page.getByTestId(TEST_IDS.walletNameInput).fill(wallet.name);
  await page.getByTestId(TEST_IDS.walletBalanceInput).fill(wallet.balance);

  if (wallet.type) {
    await page.getByTestId(TEST_IDS.walletTypeSelect).selectOption(wallet.type);
  }

  if (typeof wallet.colorIndex === "number") {
    const picker = page.getByTestId(TEST_IDS.walletColorPicker);
    await picker
      .getByRole("button")
      .nth(wallet.colorIndex)
      .click();
  }

  await page.getByTestId(TEST_IDS.walletFormSubmitButton).click();
  await expect(
    page.getByTestId(
      walletVariant === "mobile"
        ? TEST_IDS.walletCardMobile
        : TEST_IDS.walletCardDesktop
    ).first()
  ).toContainText(
    wallet.name
  );
}

export async function createTransactionViaUI(page: Page, transaction: {
  amount: string;
  walletName: string;
  category?: string;
  description?: string;
  date?: string;
  type?: "expense" | "income" | "transfer";
  toWalletName?: string;
}) {
  await openTransactionsTab(page);

  if (transaction.type === "income") {
    await page.getByRole("button", { name: "Entrada" }).click();
  } else if (transaction.type === "transfer") {
    await page.getByRole("button", { name: "Transf." }).click();
  } else {
    await page.getByRole("button", { name: "Saída" }).click();
  }

  await page.getByTestId(TEST_IDS.transactionAmountInput).fill(transaction.amount);
  await page
    .getByTestId(TEST_IDS.transactionWalletSelect)
    .selectOption({ label: transaction.walletName });

  if (transaction.type === "transfer") {
    await page
      .getByTestId(TEST_IDS.transactionCategorySelect)
      .selectOption({ label: transaction.toWalletName || "" });
  } else if (transaction.category) {
    await page
      .getByTestId(TEST_IDS.transactionCategorySelect)
      .selectOption({ label: transaction.category });
  }

  if (transaction.date) {
    await page.getByTestId(TEST_IDS.transactionDateInput).fill(transaction.date);
  }

  if (transaction.description) {
    await page
      .getByTestId(TEST_IDS.transactionDescriptionInput)
      .fill(transaction.description);
  }

  await page.getByTestId(TEST_IDS.transactionSubmitButton).click();
  await expect(page.getByTestId(TEST_IDS.transactionItem).first()).toBeVisible();
}

export async function editFirstTransactionDate(page: Page, newDate: string) {
  await page.getByTestId(TEST_IDS.transactionEditButton).first().click();
  await page.getByTestId(TEST_IDS.transactionEditDateInput).fill(newDate);
  await page.getByRole("button", { name: "Salvar alteração" }).click();
  await expect(page.getByText("Data atualizada com sucesso.")).toBeVisible();
}

export async function editFirstWalletColor(page: Page, colorIndex: number) {
  await page.getByTestId(TEST_IDS.walletEditButtonDesktop).first().click();
  await page
    .getByTestId(TEST_IDS.walletEditColorPicker)
    .getByRole("button")
    .nth(colorIndex)
    .click();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Cor da carteira atualizada com sucesso.")).toBeVisible();
}

export async function toggleTheme(page: Page) {
  await page.getByTestId(TEST_IDS.themeToggle).click();
}
