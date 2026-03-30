import { redirect } from "next/navigation";
import { enableGuestMode } from "@/lib/auth";
import { getWorkOS, provisionOrganization } from "@/lib/platform";

const ADJECTIVES = [
  "Neon",
  "Solar",
  "Cyber",
  "Lunar",
  "Astro",
  "Quantum",
  "Crystal",
  "Digital",
];
const NOUNS = [
  "Nebula",
  "Flare",
  "Void",
  "Matrix",
  "Nexus",
  "Sphere",
  "Pulse",
  "Nova",
];
const TYPES = ["Lab", "Core", "Node", "Hub", "Base"];

function generateFunName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  return `${adj} ${noun} ${type}`;
}

export async function GET() {
  const name = generateFunName();
  const slug =
    name.toLowerCase().replace(/\s+/g, "-") +
    "-" +
    Math.random().toString(36).slice(2, 6);

  const workos = await getWorkOS();
  const org = await workos.createOrganization({
    name,
    slug,
  });

  // Provision the new org
  await provisionOrganization(org.id);

  // Enable guest mode with this specific org
  await enableGuestMode(org.id);

  // Redirect to the new org's dashboard
  redirect(`/${org.slug}`);
}
