// Le premier format distribué est l'installateur Windows NSIS.
import { spawnSync } from "child_process";

if (process.platform !== "win32") {
  console.error(
    "L'installateur MAB Projets v1 doit être généré sur Windows (sortie NSIS .exe).",
  );
  process.exit(1);
}

const result = spawnSync("npx.cmd", ["tauri", "build", "--config", "src-tauri/tauri.windows.conf.json"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);