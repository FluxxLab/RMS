import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

/*
 * Two suites, because they need different things.
 *
 * `lib` holds pure functions and runs in node — no DOM to build, so it stays
 * fast and is what runs most often. `components` renders, so it pays for jsdom
 * and for the cleanup between tests; keeping it separate means the pure tests
 * never wait on a DOM they do not touch.
 */
export default defineConfig({
  resolve: { alias: { "@": root } },
  test: {
    projects: [
      {
        resolve: { alias: { "@": root } },
        test: {
          name: "lib",
          environment: "node",
          include: ["lib/**/*.test.ts"],
        },
      },
      {
        resolve: { alias: { "@": root } },
        test: {
          name: "components",
          environment: "jsdom",
          include: ["components/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
          // jsdom plus a component tree is slower to stand up than a pure
          // function, and a cold worker here should not read as a failure.
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
