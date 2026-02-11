import { WorldsSdk } from "@wazoo/sdk";

export const sdk = new WorldsSdk({
  baseUrl: process.env.WORLDS_API_BASE_URL!,
  apiKey: process.env.WORLDS_API_KEY!,
});
