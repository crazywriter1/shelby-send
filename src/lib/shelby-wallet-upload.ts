/**
 * Browser-only: register blob on-chain (wallet signs) + putBlob to Shelby RPC.
 * Follows https://docs.shelby.xyz/sdks/typescript/browser/guides/upload
 */

import {
  ShelbyBlobClient,
  ShelbyClient,
  createDefaultErasureCodingProvider,
  expectedTotalChunksets,
  generateCommitments,
} from "@shelby-protocol/sdk/browser";
import { AccountAddress, Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { nanoid } from "nanoid";
import { getPublicShelbyNetwork } from "@/lib/shelby-env";
import type {
  AptosSignAndSubmitTransactionOutput,
  InputTransactionData,
} from "@aptos-labs/wallet-adapter-core";

const TTL_MICROS = 30 * 24 * 60 * 60 * 1_000_000;

function expirationMicros(): number {
  return Math.floor(Date.now() * 1000) + TTL_MICROS;
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
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
  return out;
}

async function registerAndPutBlob(params: {
  shelby: ShelbyClient;
  aptos: Aptos;
  signAndSubmitTransaction: (
    input: InputTransactionData
  ) => Promise<AptosSignAndSubmitTransactionOutput>;
  owner: AccountAddress;
  blobName: string;
  data: Uint8Array;
}): Promise<void> {
  const { shelby, aptos, signAndSubmitTransaction, owner, blobName, data } = params;
  const provider = await createDefaultErasureCodingProvider();
  const commitments = await generateCommitments(provider, data);
  const config = provider.config;
  const chunksetSize = config.chunkSizeBytes * config.erasure_k;
  const numChunksets = expectedTotalChunksets(commitments.raw_data_size, chunksetSize);

  const payload = ShelbyBlobClient.createRegisterBlobPayload({
    account: owner,
    blobName,
    blobSize: commitments.raw_data_size,
    blobMerkleRoot: commitments.blob_merkle_root,
    expirationMicros: expirationMicros(),
    numChunksets,
    encoding: config.enumIndex,
  });

  const submitted = await signAndSubmitTransaction({
    sender: owner,
    data: payload,
  });

  await aptos.waitForTransaction({ transactionHash: submitted.hash });

  await shelby.rpc.putBlob({
    account: owner,
    blobName,
    blobData: data,
  });
}

export type WalletUploadParams = {
  /** Encrypted or raw file bytes */
  fileBytes: Uint8Array;
  encrypted: boolean;
  filename: string;
  shelbyApiKey: string;
  accountAddress: string;
  signAndSubmitTransaction: (
    input: InputTransactionData
  ) => Promise<AptosSignAndSubmitTransactionOutput>;
};

export type WalletUploadResult = {
  id: string;
  link: string;
  account: string;
  filename: string;
  encrypted: boolean;
};

export async function uploadShareViaWallet(
  params: WalletUploadParams
): Promise<WalletUploadResult> {
  const {
    fileBytes,
    encrypted,
    filename,
    shelbyApiKey,
    accountAddress,
    signAndSubmitTransaction,
  } = params;

  const id = nanoid(12);
  const metaName = `share/${id}/meta`;
  const dataName = `share/${id}/data`;

  const owner = AccountAddress.fromString(accountAddress);
  const network = getPublicShelbyNetwork();

  const shelby = new ShelbyClient({
    network,
    apiKey: shelbyApiKey,
  });

  const aptos = new Aptos(
    new AptosConfig({
      network,
    })
  );

  const metaJson = JSON.stringify({
    filename: filename || "file",
    encrypted,
  });
  const metaBytes = new TextEncoder().encode(metaJson);

  await registerAndPutBlob({
    shelby,
    aptos,
    signAndSubmitTransaction,
    owner,
    blobName: metaName,
    data: metaBytes,
  });

  await registerAndPutBlob({
    shelby,
    aptos,
    signAndSubmitTransaction,
    owner,
    blobName: dataName,
    data: fileBytes,
  });

  const base =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";
  const link = `${base}/d/${id}?a=${encodeURIComponent(accountAddress)}`;

  return {
    id,
    link,
    account: accountAddress,
    filename: filename || "file",
    encrypted,
  };
}

export async function downloadBlobBytes(params: {
  shelbyApiKey: string;
  accountAddress: string;
  blobName: string;
}): Promise<Uint8Array> {
  const shelby = new ShelbyClient({
    network: getPublicShelbyNetwork(),
    apiKey: params.shelbyApiKey,
  });
  const account = AccountAddress.fromString(params.accountAddress);
  const blob = await shelby.download({
    account,
    blobName: params.blobName,
  });
  return streamToBuffer(blob.readable as ReadableStream<Uint8Array>);
}
