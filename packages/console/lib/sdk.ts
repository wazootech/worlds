import { InternalWorldsSdk } from "@fartlabs/worlds/internal";

export const sdk = new InternalWorldsSdk({
  baseUrl: process.env.WORLDS_API_BASE_URL!,
  apiKey: process.env.WORLDS_API_KEY!,
});
