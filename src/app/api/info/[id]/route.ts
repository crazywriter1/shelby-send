import { downloadBlob, isDemoMode } from "@/lib/shelby";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDemoMode()) {
    return Response.json(
      { error: "Demo API disabled in wallet mode." },
      { status: 404 }
    );
  }

  const { id } = await params;
  const account = new URL(_request.url).searchParams.get("a");

  if (!id || !account) {
    return Response.json(
      { error: "id and account (a) are required." },
      { status: 400 }
    );
  }

  try {
    const metaName = `share/${id}/meta`;
    const buf = await downloadBlob(account, metaName);
    const meta = JSON.parse(buf.toString("utf-8")) as {
      filename: string;
      encrypted: boolean;
    };
    return Response.json({
      filename: meta.filename,
      encrypted: meta.encrypted,
    });
  } catch (err) {
    console.error("Info error:", err);
    return Response.json(
      { error: "File not found or expired." },
      { status: 404 }
    );
  }
}
