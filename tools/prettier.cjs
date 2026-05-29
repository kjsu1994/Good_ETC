const { spawnSync } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const spawnCwd =
  process.platform === "win32"
    ? process.env.SystemRoot || process.env.TEMP || process.cwd()
    : rootDir;
const mode = process.argv[2] || "--check";
const files = [
  "home.html",
  "README.md",
  "tools/validate-home.cjs",
  "tools/prettier.cjs",
  "package.json",
  "game/README.md",
  "game/index.html",
  "game/style.css",
  "game/game.js",
  "game/fortress.js",
  "game/defense.js",
  "pyluncher/README.md",
].map((file) => path.join(rootDir, file));

const result = spawnSync("npx", ["--yes", "prettier@3.6.2", mode, ...files], {
  cwd: spawnCwd,
  shell: process.platform === "win32",
  stdio: "inherit",
});

process.exit(result.status ?? 1);
