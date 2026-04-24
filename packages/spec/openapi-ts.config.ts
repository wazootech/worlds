import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './spec.yaml',
  output: {
    path: '.',
    index: false,
    clean: false,
  },
  plugins: [
    '@hey-api/typescript',
    'zod',
  ],
});