"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { decryptFromBytes, isLikelyWrongPasswordError } from "@/lib/crypto";
import { formatError } from "@/lib/format-error";
import { downloadBlobBytes } from "@/lib/shelby-wallet-upload";

type Info = {
  filename: string;
  encrypted: boolean;
};

export default function DownloadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const account = searchParams.get("a");
  const [demoMode, setDemoMode] = useState<boolean | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [decrypting, setDecrypting] = useState(false);

  useEffect(() => {
    fetch("/api/demo")
      .then((r) => r.json())
      .then((d) => setDemoMode(d.demo === true))
      .catch(() => setDemoMode(false));
  }, []);

  useEffect(() => {
    if (!id) return;
    if (!account) {
      setLoading(false);
      setError("Link is missing or invalid (no account query parameter).");
      return;
    }
    if (demoMode === null) return;

    const owner = account as string;

    let cancelled = false;
    setLoading(true);
    setError("");
    setInfo(null);

    async function load() {
      try {
        if (demoMode) {
          const r = await fetch(
            `/api/info/${id}?a=${encodeURIComponent(owner)}`
          );
          if (!r.ok) throw new Error("File not found.");
          const data = (await r.json()) as Info;
          if (!cancelled) setInfo(data);
        } else {
          const shelbyKey = process.env.NEXT_PUBLIC_SHELBY_API_KEY;
          if (!shelbyKey?.trim()) {
            throw new Error(
              "This deployment is missing NEXT_PUBLIC_SHELBY_API_KEY for downloads."
            );
          }
          const metaBytes = await downloadBlobBytes({
            shelbyApiKey: shelbyKey,
            accountAddress: owner,
            blobName: `share/${id}/meta`,
          });
          const meta = JSON.parse(
            new TextDecoder().decode(metaBytes)
          ) as Info;
          if (!cancelled) setInfo(meta);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Something went wrong."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, account, demoMode]);

  const download = useCallback(async () => {
    if (!id || !account || !info) return;
    if (info.encrypted && !password.trim()) {
      setError("Enter the password.");
      return;
    }
    setDecrypting(true);
    setError("");
    try {
      let data: Uint8Array;
      const filename = info.filename;

      if (demoMode) {
        const res = await fetch(
          `/api/download/${id}?a=${encodeURIComponent(account)}`
        );
        if (!res.ok) throw new Error("Download failed.");
        const buf = await res.arrayBuffer();
        data = new Uint8Array(buf);
      } else {
        const shelbyKey = process.env.NEXT_PUBLIC_SHELBY_API_KEY;
        if (!shelbyKey?.trim()) {
          throw new Error("Missing NEXT_PUBLIC_SHELBY_API_KEY.");
        }
        data = await downloadBlobBytes({
          shelbyApiKey: shelbyKey,
          accountAddress: account,
          blobName: `share/${id}/data`,
        });
      }

      if (info.encrypted) {
        data = await decryptFromBytes(password, data);
      }

      const blob = new Blob([new Uint8Array(data)]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (info.encrypted && isLikelyWrongPasswordError(err)) {
        setError("Incorrect password. Check spelling and caps lock, then try again.");
      } else {
        setError(formatError(err) || "Download or decryption failed.");
      }
    } finally {
      setDecrypting(false);
    }
  }, [id, account, info, password, demoMode]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold text-center mb-6">
          Shelby Send — Download
        </h1>

        {loading && (
          <p className="text-center text-[var(--muted)]">Loading…</p>
        )}

        {error && !loading && !info && (
          <p className="text-center text-[var(--error)] mb-4" role="alert">
            {error}
          </p>
        )}

        {info && !loading && (
          <div className="space-y-4 p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <p className="text-xs text-[var(--muted)] leading-relaxed border-b border-[var(--border)] pb-3">
              You don&apos;t need a wallet or gas to download. This page loads
              the file from Shelby using the app&apos;s key. The sender already
              paid fees when they uploaded.
            </p>
            <p className="text-sm text-[var(--muted)] break-all">
              {info.filename}
            </p>
            {info.encrypted && (
              <label className="block">
                <span className="text-sm text-[var(--muted)]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="File password"
                  className="mt-1 w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </label>
            )}
            {error && (
              <p className="text-sm text-[var(--error)]" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={download}
              disabled={decrypting}
              className="w-full py-3 rounded bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {decrypting ? "Downloading…" : "Download"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
