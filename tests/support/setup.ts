import { expect, type Page } from "@playwright/test";
import type { Session } from "@supabase/supabase-js";

import { AVATAR_COLORS } from "../../src/utils/constants";
import type { Transaction, UserProfile, Wallet } from "../../src/types";
import { e2eStorageKeyPrefix } from "../../src/services/e2eMock";

export interface E2ESeedState {
  authenticated?: boolean;
  userName?: string;
  currency?: UserProfile["currency"];
  profile?: Partial<UserProfile>;
  wallets?: Wallet[];
  transactions?: Transaction[];
}

const KEY_PREFIX = e2eStorageKeyPrefix();

function buildMockSession(userName: string): Session {
  return {
    access_token: "e2e-access-token",
    refresh_token: "e2e-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: {
      id: "e2e-user",
      app_metadata: {},
      user_metadata: {
        name: userName,
        full_name: userName,
        avatar_url: "",
      },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as Session["user"],
  };
}

export async function seedE2EState(page: Page, seed: E2ESeedState = {}) {
  const hasUser = Boolean(seed.authenticated || seed.userName || seed.profile?.name);
  const userName = seed.userName || seed.profile?.name || "";
  const currency = seed.currency || seed.profile?.currency || "BRL";
  const profile: UserProfile | null = hasUser
    ? {
        name: userName,
        currency,
        avatarColor: seed.profile?.avatarColor || AVATAR_COLORS[0],
        joinedAt: seed.profile?.joinedAt || new Date().toISOString(),
      }
    : null;

  await page.addInitScript(
    ({ authKey, walletsKey, transactionsKey, seedPayload }) => {
      localStorage.clear();

      if (seedPayload.profile) {
        localStorage.setItem(
          "pibblefinance:profile",
          JSON.stringify(seedPayload.profile)
        );
      }

      if (seedPayload.userName) {
        localStorage.setItem("pibblefinance:user", seedPayload.userName);
      }

      if (seedPayload.authenticated) {
        localStorage.setItem(
          authKey,
          JSON.stringify(seedPayload.session)
        );
      }

      if (seedPayload.wallets?.length) {
        localStorage.setItem(walletsKey, JSON.stringify(seedPayload.wallets));
      }

      if (seedPayload.transactions?.length) {
        localStorage.setItem(
          transactionsKey,
          JSON.stringify(seedPayload.transactions)
        );
      }
    },
    {
      authKey: KEY_PREFIX.AUTH_KEY,
      walletsKey: KEY_PREFIX.WALLETS_KEY,
      transactionsKey: KEY_PREFIX.TRANSACTIONS_KEY,
      seedPayload: {
        authenticated: seed.authenticated ?? false,
        userName: hasUser ? userName : "",
        profile,
        session: buildMockSession(userName),
        wallets: seed.wallets || [],
        transactions: seed.transactions || [],
      },
    }
  );
}

export async function openE2EApp(page: Page, path = "/?e2e=1") {
  await page.goto(path);
}

export async function expectVisibleAndStable(page: Page, selector: string) {
  const element = page.getByTestId(selector);
  await expect(element).toBeVisible();
  await expect(element).toBeAttached();
}
