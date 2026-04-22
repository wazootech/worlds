import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './spec/v1/worlds.yaml',
  output: {
    path: './src/api/v1',
    module: {
      extension: '.ts',
    },
  },
  plugins: ['@hey-api/typescript', '@hey-api/sdk'],
});