/**
 * Server-only Shelby client (demo uploads / legacy server-side download).
 * Demo mode: in-memory store when NEXT_PUBLIC_DEMO_MODE=true.
 * Real mode (non-demo): uploads use the browser wallet + NEXT_PUBLIC_SHELBY_API_KEY;
 * this module still supports server download if SHELBY_API_KEY + SHELBY_ACCOUNT_PRIVATE_KEY are set.
 */

import { Account, AccountAddress, Ed25519PrivateKey, Network } from "@aptos-labs/ts-sdk";
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";

const DEMO_ACCOUNT = "0xdemo";

const demoStore = new Map<string, Buffer>();

/** Demo = in-memory API only; set NEXT_PUBLIC_DEMO_MODE=true for local testing without wallet. */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/** Public label for UI (must match NEXT_PUBLIC_SHELBY_NETWORK). */
export function getShelbyNetworkLabel(): "SHELBYNET" | "TESTNET" {
  return process.env.NEXT_PUBLIC_SHELBY_NETWORK === "TESTNET"
    ? "TESTNET"
    : "SHELBYNET";
}

const NETWORK =
  process.env.NEXT_PUBLIC_SHELBY_NETWORK === "TESTNET"
    ? Network.TESTNET
    : Network.SHELBYNET;

function getClient(): { client: ShelbyNodeClient; signer: Account } {
  const apiKey = process.env.SHELBY_API_KEY;
  const privateKey = process.env.SHELBY_ACCOUNT_PRIVATE_KEY;
  if (!apiKey || !privateKey) {
    throw new Error("Missing SHELBY_API_KEY or SHELBY_ACCOUNT_PRIVATE_KEY");
  }
  const client = new ShelbyNodeClient({
    network: NETWORK,
    apiKey,
  });
  const signer = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(privateKey),
  });
  return { client, signer };
}

const ONE_MONTH_MICROS = 30 * 24 * 60 * 60 * 1_000_000;

/** Upload raw bytes — demo modda bellekte, gerçek modda Shelby'ye. */
export async function uploadBlob(
  blobName: string,
  blobData: Buffer | Uint8Array
): Promise<void> {
  if (isDemoMode()) {
    const key = `${DEMO_ACCOUNT}/${blobName}`;
    demoStore.set(key, Buffer.isBuffer(blobData) ? blobData : Buffer.from(blobData));
    return;
  }
  const { client, signer } = getClient();
  await client.upload({
    blobData: Buffer.isBuffer(blobData) ? blobData : Buffer.from(blobData),
    signer,
    blobName,
    expirationMicros: Math.floor(Date.now() * 1000) + ONE_MONTH_MICROS,
  });
}

/** Get account address (for download URL). Demo modda 0xdemo. */
export function getAccountAddress(): string {
  if (isDemoMode()) return DEMO_ACCOUNT;
  const { signer } = getClient();
  return signer.accountAddress.toString();
}

/** Download blob — demo modda bellekten, gerçek modda Shelby'den. */
export async function downloadBlob(
  accountAddress: string,
  blobName: string
): Promise<Buffer> {
  if (isDemoMode()) {
    const key = `${accountAddress}/${blobName}`;
    const buf = demoStore.get(key);
    if (!buf) throw new Error("Blob not found");
    return buf;
  }
  const { client } = getClient();
  const account = AccountAddress.fromString(accountAddress);
  const { readable } = await client.download({ account, blobName });
  const chunks: Uint8Array[] = [];
  const reader = (readable as ReadableStream<Uint8Array>).getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return Buffer.from(out);
}
