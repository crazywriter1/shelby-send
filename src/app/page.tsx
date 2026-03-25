"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { encryptToBytes } from "@/lib/crypto";
import { uploadShareViaWallet } from "@/lib/shelby-wallet-upload";
import { getWalletAccountAddress } from "@/lib/wallet-address";
import { formatError } from "@/lib/format-error";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

type Result = {
  link: string;
  filename: string;
  encrypted: boolean;
};

export default function Home() {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [networkLabel, setNetworkLabel] = useState<string | null>(null);
  const [filePickLoading, setFilePickLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickFocusHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetch("/api/demo")
      .then((r) => r.json())
      .then((data) => {
        setDemoMode(data.demo === true);
        setNetworkLabel(
          typeof data.network === "string" ? data.network : "SHELBYNET"
        );
      })
      .catch(() => {});
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (pickFocusHandlerRef.current) {
      window.removeEventListener("focus", pickFocusHandlerRef.current);
      pickFocusHandlerRef.current = null;
    }
    setFilePickLoading(false);
    const f = e.target.files?.[0];
    setFile(f || null);
    setError("");
    setResult(null);
  }, []);

  const openFilePicker = useCallback(() => {
    setFilePickLoading(true);
    const onWindowFocus = () => {
      window.removeEventListener("focus", onWindowFocus);
      pickFocusHandlerRef.current = null;
      window.setTimeout(() => setFilePickLoading(false), 150);
    };
    pickFocusHandlerRef.current = onWindowFocus;
    window.addEventListener("focus", onWindowFocus);
    fileInputRef.current?.click();
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file) {
        setError("Please choose a file.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("File must be 100 MB or smaller.");
        return;
      }

      setLoading(true);
      setError("");
      setResult(null);

      try {
        if (demoMode) {
          const form = new FormData();
          form.set("file", file);
          if (password) form.set("password", password);
          const res = await fetch("/api/upload", {
            method: "POST",
            body: form,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Upload failed.");
          setResult({
            link: data.link,
            filename: data.filename,
            encrypted: data.encrypted,
          });
        } else {
          const shelbyKey = process.env.NEXT_PUBLIC_SHELBY_API_KEY;
          if (!shelbyKey?.trim()) {
            throw new Error(
              "Missing NEXT_PUBLIC_SHELBY_API_KEY (set in .env.local for production)."
            );
          }
          const walletAddr = getWalletAccountAddress(account);
          if (!connected || !walletAddr) {
            throw new Error(
              "Connect the Petra wallet on Shelbynet and try again. If the address does not appear, disconnect and reconnect."
            );
          }

          const raw = await file.arrayBuffer();
          let bytes: Uint8Array = new Uint8Array(raw);
          const encrypted = password.length > 0;
          if (encrypted) {
            bytes = new Uint8Array(await encryptToBytes(password, bytes));
          }

          const out = await uploadShareViaWallet({
            fileBytes: bytes,
            encrypted,
            filename: file.name || "file",
            shelbyApiKey: shelbyKey,
            accountAddress: walletAddr,
            signAndSubmitTransaction,
          });

          setResult({
            link: out.link,
            filename: out.filename,
            encrypted: out.encrypted,
          });
        }

        setFile(null);
        setPassword("");
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        console.error("Upload error:", err);
        setError(formatError(err));
      } finally {
        setLoading(false);
      }
    },
    [file, password, demoMode, connected, account, signAndSubmitTransaction]
  );

  const walletAddr = getWalletAccountAddress(account);

  const copyLink = useCallback(() => {
    if (result?.link) {
      navigator.clipboard.writeText(result.link);
    }
  }, [result?.link]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">Shelby Send</h1>
        <p className="text-center text-[var(--muted)] text-sm mb-4">
          Upload a file, share a link. Optionally protect it with a password.
        </p>
        {demoMode && (
          <p className="text-center text-amber-500/90 text-xs mb-6 px-3 py-2 rounded bg-amber-500/10 border border-amber-500/30">
            Demo mode — files are kept in server memory.
          </p>
        )}
        {!demoMode && networkLabel && (
          <p className="text-center text-emerald-500/90 text-xs mb-6 px-3 py-2 rounded bg-emerald-500/10 border border-emerald-500/30">
            Storage: Shelby {networkLabel} — connect your wallet; you sign
            on-chain registration and pay gas / fees.
          </p>
        )}

        {!demoMode && (
          <div className="flex justify-center mb-3">
            <WalletSelector />
          </div>
        )}

        {!result ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="block">
              <span className="text-sm text-[var(--muted)]">File</span>
              <input
                ref={fileInputRef}
                id="upload-file-input"
                type="file"
                className="sr-only"
                onChange={onFileChange}
                tabIndex={-1}
              />
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={filePickLoading || loading}
                  aria-controls="upload-file-input"
                  aria-label="Choose file to upload"
                  className="shrink-0 rounded px-4 py-2 text-sm font-medium bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)] disabled:opacity-50"
                >
                  {filePickLoading ? "Opening…" : "Choose file"}
                </button>
                <span className="text-sm text-[var(--muted)] truncate min-w-0 max-w-[12rem] sm:max-w-none">
                  {file ? file.name : "No file chosen"}
                </span>
              </div>
            </div>
            <label className="block">
              <span className="text-sm text-[var(--muted)]">
                Password (optional)
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty to allow anyone with the link"
                className="mt-1 w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </label>
            {error && (
              <p className="text-sm text-[var(--error)]">{error}</p>
            )}
            <button
              type="submit"
              disabled={
                loading ||
                (!demoMode && (!connected || !walletAddr))
              }
              className="w-full py-3 rounded bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {loading ? "Uploading…" : "Upload and get link"}
            </button>
          </form>
        ) : (
          <div className="space-y-4 p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <p className="text-sm text-[var(--success)]">
              Uploaded.
              {result.encrypted && " Password-protected."}
            </p>
            <p className="text-sm text-[var(--muted)] break-all">
              {result.filename}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={result.link}
                className="flex-1 px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
              />
              <button
                type="button"
                onClick={copyLink}
                className="px-4 py-2 rounded bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)]"
              >
                Copy
              </button>
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
            >
              Upload another file
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
