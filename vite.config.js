import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  // En prod, le jeu est servi par Express sous /games/gow-game/.
  base: command === "serve" ? "/" : "/games/gow-game/",
  build: {
    outDir: "dist"
  }
}));
