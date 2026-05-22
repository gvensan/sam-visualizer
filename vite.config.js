import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
// GitHub Pages serves at `username.github.io/<repo>/`, so all asset URLs
// need a sub-path prefix in production. Override with `BASE_PATH=/foo/`
// (must include trailing slash) for a different repo name or root-domain
// deployment. Defaults assume the repo is named `sam-visualizer`.
const BASE_PATH = process.env.BASE_PATH ?? "/sam-visualizer/";
export default defineConfig(({ command }) => ({
    plugins: [preact()],
    // Use `/` in dev so localhost works as-is; only apply the sub-path on build.
    base: command === "build" ? BASE_PATH : "/",
    // Several legacy `.js` files still sit next to their `.ts`/`.tsx` rewrites.
    // Vite's default extension order prefers `.js`, which would silently mask
    // the TypeScript sources. List `.ts`/`.tsx` first so the current code wins
    // until the stale JS artifacts are cleaned up.
    resolve: {
        extensions: [".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx", ".json"],
    },
    test: {
        globals: true,
        environment: "node",
        include: ["src/**/*.test.ts"],
    },
}));
