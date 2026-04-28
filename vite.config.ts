import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execSync } from "child_process";

function getGitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

const SECURITY_VERIFIED_AT = new Date().toISOString();
const SECURITY_VERIFIED_COMMIT = getGitCommit();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __SECURITY_VERIFIED_AT__: JSON.stringify(SECURITY_VERIFIED_AT),
    __SECURITY_VERIFIED_COMMIT__: JSON.stringify(SECURITY_VERIFIED_COMMIT),
  },
  build: {
    sourcemap: true,
  },
}));
