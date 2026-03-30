import { getSignUpUrl } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function GET() {
  const signUpUrl = await getSignUpUrl();
  redirect(signUpUrl);
}
