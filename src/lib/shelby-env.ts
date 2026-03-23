/**
 * Client-safe: network from NEXT_PUBLIC_SHELBY_NETWORK (no server-only imports).
 */
import { Network } from "@aptos-labs/ts-sdk";

/** Shelby SDK supports Shelbynet or Aptos testnet for this app. */
export function getPublicShelbyNetwork(): Network.TESTNET | Network.SHELBYNET {
  return process.env.NEXT_PUBLIC_SHELBY_NETWORK === "TESTNET"
    ? Network.TESTNET
    : Network.SHELBYNET;
}
