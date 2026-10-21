import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://nextdo.157712.xyz",
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory" }
});
