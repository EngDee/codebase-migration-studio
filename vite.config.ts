// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * Public Supabase connection. Inlined into the client bundle at compile time
 * so production JavaScript never boots with empty connection values, even if
 * the host forgets to inject VITE_* variables.
 * Publishable key only — never a service-role secret.
 */
const PUBLIC_SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  "https://c--bf2d016a-4949-4243-a5cc-c9149b8b72cd-prod.lovable.cloud";
const PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_zT3C2IGBadA6zC1Df3XdyQ_9uPbInJy";
const PUBLIC_SUPABASE_PROJECT_ID =
  process.env.VITE_SUPABASE_PROJECT_ID || "tqqapezkdjejvzibswom";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(PUBLIC_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(PUBLIC_SUPABASE_PROJECT_ID),
      __CCAK_SUPABASE_URL__: JSON.stringify(PUBLIC_SUPABASE_URL),
      __CCAK_SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      __CCAK_SUPABASE_PROJECT_ID__: JSON.stringify(PUBLIC_SUPABASE_PROJECT_ID),
    },
  },
});
