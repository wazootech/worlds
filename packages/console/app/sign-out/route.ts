import * as authkit from "@workos-inc/authkit-nextjs";

export async function GET() {
  await authkit.signOut();
}
