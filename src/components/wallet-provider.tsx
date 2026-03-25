"use client";

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PETRA_WALLET_NAME } from "@aptos-labs/wallet-adapter-core";
import { type ReactNode, useMemo } from "react";
import { Network } from "@aptos-labs/ts-sdk";
import { getPublicShelbyNetwork } from "@/lib/shelby-env";

export function WalletProvider({ children }: { children: ReactNode }) {
  const dappConfig = useMemo(() => {
    const net = getPublicShelbyNetwork();
    const keys: Partial<Record<Network, string>> = {};
    const aptosKey = process.env.NEXT_PUBLIC_APTOS_API_KEY;
    if (aptosKey) keys[net] = aptosKey;
    return {
      network: net,
      ...(Object.keys(keys).length > 0 ? { aptosApiKeys: keys } : {}),
    };
  }, []);

  return (
    <AptosWalletAdapterProvider
      autoConnect
      optInWallets={[PETRA_WALLET_NAME]}
      dappConfig={dappConfig}
      onError={(err) => console.error("Wallet error:", err)}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
