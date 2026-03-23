# Shelby Send

Encrypted file sharing — decentralized, optionally password-protected links powered by [Shelby Protocol](https://shelby.xyz).

## Features

- Upload a file (max 100 MB)
- Optional password (AES-256-GCM, PBKDF2)
- Shareable link; recipient downloads (enters password if encrypted)
- **Demo mode:** no wallet — stored in server memory only (`NEXT_PUBLIC_DEMO_MODE=true`)
- **Default (production):** connect an **Aptos wallet** on **Shelbynet**, sign blob registration on-chain, pay gas / fees; encryption happens in the browser before upload

## Setup

1. Install dependencies:

   ```bash
   npm install --legacy-peer-deps
   ```

2. Create `.env.local` from `.env.example`.

### Production / wallet mode (Shelbynet)

1. Get a **Shelby API key** (e.g. [Shelby Discord](https://discord.gg/shelbyprotocol)).
2. Add **Shelbynet** to your wallet (e.g. Petra) if needed, per [Shelby docs](https://docs.shelby.xyz).
3. Fund the wallet with **ShelbyUSD** (storage) and **APT** (gas) on Shelbynet.
4. Set in `.env.local`:

   ```env
   NEXT_PUBLIC_SHELBY_NETWORK=SHELBYNET
   NEXT_PUBLIC_SHELBY_API_KEY=your_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Do not** set `NEXT_PUBLIC_DEMO_MODE=true` (omit it or set to `false`).

Optional: `NEXT_PUBLIC_APTOS_API_KEY` if your Aptos RPC requires a key.

### Demo mode (no early access)

```env
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Files are not uploaded to Shelby; they live in server memory until the process restarts. Links use account `0xdemo`.

### Aptos testnet instead of Shelbynet

Only if you intentionally point the app at testnet:

```env
NEXT_PUBLIC_SHELBY_NETWORK=TESTNET
```

(Default when unset is **SHELBYNET**.)

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

## Usage

- **Home:** Connect wallet (production), choose a file, optionally add a password, click “Upload and get link”. Copy the link.
- **Download:** Open the shared link (`.../d/<id>?a=<account>`). Enter the password if the file was encrypted, then download.

In production, recipients need `NEXT_PUBLIC_SHELBY_API_KEY` on the same deployment so the app can read blobs from Shelby RPC (same as typical public RPC key usage).
