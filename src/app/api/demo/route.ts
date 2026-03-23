import { getShelbyNetworkLabel, isDemoMode } from "@/lib/shelby";

export async function GET() {
  return Response.json({
    demo: isDemoMode(),
    network: getShelbyNetworkLabel(),
  });
}
