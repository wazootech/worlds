import { NextRequest, NextResponse } from "next/server";
import * as authkit from "@workos-inc/authkit-nextjs";
import { sdk } from "@/lib/sdk";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ worldId: string }> },
) {
  const { worldId } = await params;
  const { user } = await authkit.withAuth();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = req.nextUrl.searchParams.get("account");
  if (!accountId) {
    return NextResponse.json({ error: "Account ID required" }, { status: 400 });
  }

  const body = await req.text();

  try {
    const result = await sdk.worlds.sparql(worldId, body, {
      accountId,
    });
    console.log("SPARQL Result:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to execute SPARQL:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Failed to execute SPARQL",
      },
      { status: 500 },
    );
  }
}
