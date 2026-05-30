import { expect, test } from "@playwright/test";

import { TEST_IDS } from "../../src/utils/testIds";
import { openE2EApp, seedE2EState } from "../support/setup";

test.describe("Login e onboarding", () => {
  test("abre a tela inicial e permite criar espaço local com persistência", async ({
    page,
  }) => {
    await seedE2EState(page, { authenticated: false, userName: "" });
    await openE2EApp(page);

    await expect(page.getByTestId(TEST_IDS.authPage)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.loginGoogleButton)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.demoModeButton)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.createSpaceButton)).toBeDisabled();

    await page.getByTestId(TEST_IDS.profileNameInput).fill("Verona QA");
    await page.getByTestId(TEST_IDS.currencySelector).selectOption("BRL");
    await expect(page.getByTestId(TEST_IDS.createSpaceButton)).toBeEnabled();

    await page.getByTestId(TEST_IDS.createSpaceButton).click();
    await expect(page.getByTestId(TEST_IDS.dashboardPage)).toBeVisible();
    await expect(page.getByText("Verona QA")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId(TEST_IDS.dashboardPage)).toBeVisible();
    await expect(page.getByText("Verona QA")).toBeVisible();
  });

  test("login com Google mockado leva ao dashboard e mantém sessão no refresh", async ({
    page,
  }) => {
    await seedE2EState(page, { authenticated: false, userName: "" });
    await openE2EApp(page);

    await page.getByTestId(TEST_IDS.loginGoogleButton).click();
    await expect(page.getByTestId(TEST_IDS.dashboardPage)).toBeVisible();
    await expect(page.getByText("Verona Mazza")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId(TEST_IDS.dashboardPage)).toBeVisible();
    await expect(page.getByText("Verona Mazza")).toBeVisible();
  });
});
