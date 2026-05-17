import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    cli: "src/cli.ts",
    index: "src/index.ts",
    "read-file-cli": "src/read-file-cli.ts",
    "write-file-cli": "src/write-file-cli.ts",
    "exec-js-edits-cli": "src/exec-js-edits-cli.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
});
