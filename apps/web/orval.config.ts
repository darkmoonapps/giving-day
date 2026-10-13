import { defineConfig } from 'orval';

export default defineConfig({
  givingDay: {
    input: {
      target: '../api/openapi.json',
    },
    output: {
      mode: 'single',
      target: './src/api/generated/api.ts',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: {
          path: './src/api/mutator.ts',
          name: 'apiFetch',
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
        query: {
          useQuery: true,
        },
      },
    },
  },
});
