// Deno has native fetch, so this polyfill is unnecessary and currently causes resolution issues in Deno 2.7.
// This local file redirects the legacy require("cross-fetch/polyfill") call to a no-op.
export {};
