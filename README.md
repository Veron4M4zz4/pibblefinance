# PibbleFinance

## E2E Tests

This project uses Playwright for end-to-end coverage.

### Run locally

```bash
npm install
npm run test:e2e:install
npm run test:e2e
```

### Open the Playwright UI

```bash
npm run test:e2e:open
```

### CI mode

```bash
npm run test:e2e:ci
```

### E2E runtime mode

The app understands `?e2e=1` in the URL.

That mode switches auth, wallets, and transactions to a localStorage-backed store so tests can:

- create spaces
- log in with the mock Google flow
- create wallets and transactions
- refresh the page without losing state

Useful selectors are centralized in `src/utils/testIds.ts`.

If Playwright reports that the Chromium executable is missing, run:

```bash
npm run test:e2e:install
```
