import { defineConfig, loadEnv, type UserConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

// Plain Vite config — no vendor wrapper. Deploy target is Cloudflare Workers
// via nitro (an independent choice, unrelated to how this project used to be
// hosted); swap `defaultPreset` below if you move hosts later.

export default defineConfig(({ command, mode }) => {
  const isDevBuild = command === "build" && mode === "development";

  // Define import.meta.env.VITE_* as compile-time constants. Vite already
  // exposes these at runtime; this just makes them available in every build
  // target (workers included) the same way.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );

  const config: UserConfig = {
    define: envDefine,
    ...(isDevBuild
      ? {
          environments: {
            client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } },
          },
        }
      : {}),
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: true,
      port: 8080,
      watch: {
        awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
      },
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        // Redirect TanStack Start's bundled server entry to src/server.ts
        // (our SSR error wrapper). nitro/vite builds from this.
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      ...(command === "build"
        ? [nitro({ defaultPreset: "cloudflare-module" })]
        : []),
      viteReact(),
    ],
  };

  return config;
});
