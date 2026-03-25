import type { AccountInfo } from "@aptos-labs/wallet-adapter-core";

/**
 * Some adapters omit or delay-populate `account.address`; avoid calling
 * `.toString()` on undefined.
 */
export function getWalletAccountAddress(
  account: AccountInfo | null | undefined
): string | null {
  if (!account) return null;

  const ext = account as AccountInfo & {
    accountAddress?: unknown;
  };

  const raw: unknown = ext.address ?? ext.accountAddress;
  if (raw == null) return null;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof (raw as { toString?: () => string }).toString === "function") {
    const s = (raw as { toString: () => string }).toString();
    return s?.trim() || null;
  }
  return null;
}
