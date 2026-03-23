import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["got", "@aptos-labs/ts-sdk", "@aptos-labs/aptos-client", "@shelby-protocol/sdk"],
};

export default nextConfig;
