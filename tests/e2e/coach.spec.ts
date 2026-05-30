import { expect, test } from "@playwright/test";

import { TEST_IDS } from "../../src/utils/testIds";
import { loadFixture } from "../support/fixtures";
import { openE2EApp, seedE2EState } from "../support/setup";

test.describe("Coach Pibble", () => {
  test("exibe leitura financeira, fallback e conversa", async ({ page }) => {
    const wallets = loadFixture<any[]>("wallets.json");
    const transactions = loadFixture<any[]>("transactions.json");

    await seedE2EState(page, {
      authenticated: true,
      userName: "Verona Mazza",
      wallets,
      transactions,
    });
    await openE2EApp(page);

    await page.getByRole("button", { name: "Abrir coach" }).click();
    await expect(page.getByTestId(TEST_IDS.coachCard)).toBeVisible();
    await expect(page.getByText("Leitura financeira instantânea")).toBeVisible();

    await page.getByTestId(TEST_IDS.coachChatButton).click();
    await expect(page.getByText("Coach Pibble")).toBeVisible();
    await expect(page.getByText("Oi! Eu sou o Coach Pibble.")).toBeVisible();

    await page.getByPlaceholder("Pergunte ao Coach Pibble...").fill("Como está meu saldo?");
    await page.getByPlaceholder("Pergunte ao Coach Pibble...").press("Enter");

    await expect(
      page.getByText(
        /Seu saldo disponível está em|Hoje o seu caixa está em|No momento, você tem/
      )
    ).toBeVisible();
  });
});
