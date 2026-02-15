import * as authkit from "@/lib/auth";

export async function GET() {
  await authkit.signOut();
}
