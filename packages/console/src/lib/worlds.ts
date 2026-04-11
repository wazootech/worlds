import { Worlds } from "@wazoo/worlds-sdk";
import type { WorkOSOrganization } from "./workos/workos-manager";

export function getWorldsByOrgMetadata(org: WorkOSOrganization): Worlds {
  const baseUrl = org.metadata?.apiBaseUrl;
  const apiKey = org.metadata?.apiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      `Organization ${org.id} is missing API configuration in metadata`,
    );
  }

  return new Worlds({
    baseUrl,
    apiKey,
  });
}
