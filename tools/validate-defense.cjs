const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const defense = fs.readFileSync(path.join(rootDir, "game", "defense.js"), "utf8");
const server = fs.readFileSync(path.join(rootDir, "game", "server.py"), "utf8");
const style = fs.readFileSync(path.join(rootDir, "game", "style.css"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireMarkers(source, markers, label) {
  markers.forEach((marker) =>
    assert(source.includes(marker), `${label} missing marker: ${marker}`),
  );
}

requireMarkers(
  defense,
  [
    'const toolbarStorageKey = "defense_toolbar_collapsed";',
    'id="defenseToolbar"',
    'id="defenseToolbarToggle"',
    "function applyToolbarState()",
    "function queueResize()",
    "toolbarReserve",
    "function towerOwnerColor(tower)",
    "function towerOwnerLabel(tower)",
    "function drawTowerOwnerRing(tower, center, selected)",
    "function drawTowerOwnerBadge(tower, center, selected)",
    "function drawTowerBody(tower, center, config, aim, target)",
    "ownerColor: player.color",
    "T${towerCounts[player.id] || 0}",
  ],
  "Defense client ownership/UI",
);

requireMarkers(
  server,
  ['"ownerColor":', '"cooldownLeft": round(max(0.0, tower.cooldown_left), 2)'],
  "Defense server state",
);

requireMarkers(
  style,
  [
    ".defense-toolbar-body",
    ".defense-toolbar.is-collapsed",
    "@media (max-height: 620px) and (min-width: 760px)",
    ".defense-towers small,\n  .defense-skills small",
  ],
  "Defense responsive CSS",
);

console.log("defense validation passed");
