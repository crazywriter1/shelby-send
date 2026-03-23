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
    const dataName = `share/${id}/data`;
    const buf = await downloadBlob(account, dataName);

    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Download error:", err);
    return Response.json(
      { error: "Download failed." },
      { status: 404 }
    );
  }
}
