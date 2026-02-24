import { WorldsSdk } from "@wazoo/sdk";
import type { AuthOrganization } from "./workos/workos-management";

export function getSdkForOrg(org: AuthOrganization): WorldsSdk {
  const baseUrl = org.metadata?.apiBaseUrl;
  const apiKey = org.metadata?.apiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      `Organization ${org.id} is missing API configuration in metadata`,
    );
  }

  return new WorldsSdk({
    baseUrl,
    apiKey,
  });
}
