# Shelby Send

[![Live on Vercel](https://img.shields.io/badge/Live-Vercel-000000?style=flat&logo=vercel)](https://shelby-send.vercel.app)

**Production:** [shelby-send.vercel.app](https://shelby-send.vercel.app)  
*(If your Vercel project uses another domain, update this link and `homepage` in `package.json`, and set **Settings → General → Website** on GitHub to the same URL.)*

Encrypted file sharing on [Shelby Protocol](https://shelby.xyz): optional password, shareable links, downloads in the browser.

## Features

- Upload a file (max **100 MB**)
- Optional password (**AES-256-GCM**, **PBKDF2**)
- Shareable link; recipient downloads (enters password if encrypted)

---

## Purpose

Shelby Send is a small, practical **privacy-first file transfer** demo: upload a file, optionally protect it with a password, and share one link. **Encryption runs in the browser** before any upload, so the plain file is never sent to the app server or exposed to storage as cleartext.

[Shelby](https://shelby.xyz) is the decentralized storage layer (persistent, censorship-resistant). This app targets **Shelbynet** via the official TypeScript SDK and RPC. The point is to show how Shelby can back real workflows—client deliverables, team docs, one-off secure transfers—without heavy setup.

**Ideas later:** expiring links, one-time downloads.

---

## How it works (technical)

| Mode | Wallet | Storage | Notes |
|------|--------|---------|--------|
| **Production** | **Petra** on Shelbynet only (`optInWallets`) | Shelby RPC after on-chain blob registration | User signs txs and pays gas / fees; `NEXT_PUBLIC_SHELBY_API_KEY` is used from the **browser** for `putBlob` / reads. |
| **Demo** | None | Server memory | `NEXT_PUBLIC_DEMO_MODE=true` — ephemeral, for local/testing. |

- **Stack:** Next.js 15 (App Router), Aptos wallet adapter (Ant Design `WalletSelector`), `@shelby-protocol/sdk`.
- **Dependency note:** `@telegram-apps/bridge` (^1.x) is listed explicitly because `@aptos-connect/web-transport` (pulled in by the wallet adapter) declares it as a **peer**; without it, **Vercel/webpack builds fail** with “Can't resolve `@telegram-apps/bridge`”. It does not re-enable extra wallets in the UI—connection is still **Petra-only**.
- **Share links:** `NEXT_PUBLIC_APP_URL` must match your deployed origin (e.g. Vercel) so generated links are correct.
- **Download page:** Fetches blob via Shelby using the same public API key pattern; recipients use the link + optional password.

---

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` → `.env.local` and fill values (see comments inside `.env.example`).

### Production / wallet mode (Shelbynet)

1. Shelby **client API key** (e.g. Geomi — see [Shelby TS SDK / API keys](https://docs.shelby.xyz/sdks/typescript/acquire-api-keys)).
2. Add **Shelbynet** in **Petra** if needed ([Shelby docs](https://docs.shelby.xyz)).
3. Fund wallet with **ShelbyUSD** (storage) and **APT** (gas) on Shelbynet.
4. In `.env.local` (and **Vercel → Environment Variables**):

   ```env
   NEXT_PUBLIC_SHELBY_NETWORK=SHELBYNET
   NEXT_PUBLIC_SHELBY_API_KEY=your_key
   NEXT_PUBLIC_APP_URL=https://your-deployment.vercel.app
   ```

5. Do **not** set `NEXT_PUBLIC_DEMO_MODE=true` for real uploads.

Optional: `NEXT_PUBLIC_APTOS_API_KEY` only if your Aptos fullnode requires a key (do **not** use the Shelby Geomi key here — wrong routing can break uploads).

### Demo mode (no wallet, no Shelby)

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Links use a demo account id; data is lost on restart.

### Aptos testnet instead of Shelbynet

```env
NEXT_PUBLIC_SHELBY_NETWORK=TESTNET
```

Default when unset is **SHELBYNET**.

---

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

- **Upload:** Connect Petra (production), choose file (max **100 MB**), optional password → **Upload and get link**.
- **Download:** Open `/d/<id>?a=<account>` from the link; enter password if the file was encrypted, then download.

In production, the **same** `NEXT_PUBLIC_SHELBY_API_KEY` must be configured on the deployment so clients can read blobs from Shelby RPC (typical public key usage).

---

## Deploy (Vercel)

Set the same env vars as production (especially `NEXT_PUBLIC_SHELBY_API_KEY`, `NEXT_PUBLIC_APP_URL`, and network). Build command: `npm run build` (see `package.json`; Node memory flag is already set for Next).
