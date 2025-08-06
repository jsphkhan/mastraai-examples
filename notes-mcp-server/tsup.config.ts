import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["run-mcp-server.ts"],
  format: ["cjs", "esm"],
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: true,
  outDir: "dist",
  noExternal: [],
});