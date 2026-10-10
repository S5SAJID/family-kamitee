import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    // Dates in tests are local calendar dates; pin the zone the app is used in.
    env: {TZ: 'Asia/Karachi'},
  },
});
