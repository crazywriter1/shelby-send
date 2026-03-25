"use client";

import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import { type ReactNode } from "react";
import { WalletProvider } from "@/components/wallet-provider";

/** Force Ant Design (wallet modal, etc.) to English regardless of browser locale. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={enUS}>
      <WalletProvider>{children}</WalletProvider>
    </ConfigProvider>
  );
}
