import type { Metadata } from "next";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";

export const metadata: Metadata = {
  title: "Shelby Send — Encrypted file sharing",
  description:
    "Decentralized, password-protected file sharing. Send securely with Shelby Protocol.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
