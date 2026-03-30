import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getWorkOS } from "@/lib/platform";
import { getSdkForOrg } from "@/lib/sdk";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ worldId: string }> },
) {
  const { worldId } = await params;
  const { user } = await withAuth();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve organization from user metadata
  const orgId = user.metadata?.activeOrganizationId as string;
  if (!orgId) {
    return NextResponse.json(
      { error: "No active organization" },
      {
        status: 400,
      },
    );
  }

  const workos = await getWorkOS();
  const organization = await workos.getOrganization(orgId);
  if (!organization) {
    return NextResponse.json(
      { error: "Organization not found" },
      {
        status: 404,
      },
    );
  }
  const sdk = getSdkForOrg(organization);

  const body = await req.text();

  try {
    // Resolve world to ensure we have the actual ID for sub-resource call
    const world = await sdk.worlds.get(worldId);
    if (!world) {
      return NextResponse.json({ error: "World not found" }, { status: 404 });
    }
    const result = await sdk.worlds.sparql(world.id, body);
    console.log("SPARQL Result:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to execute SPARQL:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to execute SPARQL",
      },
      { status: 500 },
    );
  }
}
