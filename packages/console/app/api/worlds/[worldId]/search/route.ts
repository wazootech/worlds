import { type NextRequest, NextResponse } from "next/server";
import { sdk } from "@/lib/sdk";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ worldId: string }> },
) {
  try {
    const { worldId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get("account");

    if (!accountId) {
      return new NextResponse("Missing account ID", { status: 400 });
    }

    const body = await request.text();
    const query = body;
    const results = await sdk.worlds.search(query, {
      worldIds: [worldId],
      accountId,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 },
    );
  }
}
