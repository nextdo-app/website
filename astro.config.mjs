import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://nextdo-app.157712.xyz",
  output: "static",
  trailingSlash: "always",
  build: { format: "directory" }
});
