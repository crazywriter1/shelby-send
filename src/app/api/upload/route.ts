import { nanoid } from "nanoid";
import { uploadBlob, getAccountAddress, isDemoMode } from "@/lib/shelby";
import { encryptBytesServer } from "@/lib/crypto-server";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export async function POST(request: Request) {
  try {
    if (!isDemoMode()) {
      return Response.json(
        {
          error:
            "Server upload is disabled. Use the app with a connected wallet (NEXT_PUBLIC_DEMO_MODE is not true).",
        },
        { status: 501 }
      );
    }
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const password = (formData.get("password") as string) || "";

    if (!file || file.size === 0) {
      return Response.json(
        { error: "File is required." },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File must be 100 MB or smaller." },
        { status: 400 }
      );
    }

    const id = nanoid(12);
    const metaName = `share/${id}/meta`;
    const dataName = `share/${id}/data`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const filename = file.name || "file";

    let dataToUpload: Buffer;
    const encrypted = password.length > 0;

    if (encrypted) {
      const encoded = encryptBytesServer(password, Buffer.from(bytes));
      dataToUpload = Buffer.from(encoded, "base64");
    } else {
      dataToUpload = Buffer.from(bytes);
    }

    const meta = JSON.stringify({
      filename,
      encrypted,
    });

    await uploadBlob(metaName, Buffer.from(meta, "utf-8"));
    await uploadBlob(dataName, dataToUpload);

    const account = getAccountAddress();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const link = `${baseUrl}/d/${id}?a=${encodeURIComponent(account)}`;

    return Response.json({
      id,
      link,
      account,
      filename,
      encrypted,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 500 }
    );
  }
}
