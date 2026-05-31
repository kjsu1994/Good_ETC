const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const rpgPath = path.join(rootDir, "game", "rpg.js");
const homePath = path.join(rootDir, "home.html");
const readmePath = path.join(rootDir, "README.md");
const gameReadmePath = path.join(rootDir, "game", "README.md");

const rpg = fs.readFileSync(rpgPath, "utf8");
const home = fs.readFileSync(homePath, "utf8");
const readme = fs.readFileSync(readmePath, "utf8");
const gameReadme = fs.readFileSync(gameReadmePath, "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  assert(startIndex >= 0, `Missing section start: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(endIndex > startIndex, `Missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

function countMatches(source, pattern) {
  return Array.from(source.matchAll(pattern)).length;
}

function requireMarkers(source, markers, label) {
  markers.forEach((marker) =>
    assert(source.includes(marker), `${label} missing marker: ${marker}`),
  );
}

const rpgVersion = rpg.match(/assetVersion = params\.get\("v"\) \|\| "([^"]+)"/)?.[1];
const homeVersion = home.match(/GAME_ASSET_VERSION = "([^"]+)"/)?.[1];
assert(rpgVersion, "RPG asset version is missing.");
assert(homeVersion, "Home game asset version is missing.");
assert(
  rpgVersion === homeVersion,
  `RPG asset version mismatch: game=${rpgVersion}, home=${homeVersion}`,
);

const actsSection = between(rpg, "const ACTS = [", "const QUESTS = ACTS");
const questSection = between(rpg, "const QUESTS = ACTS.flatMap", "const ECHO_TRIALS");
const itemsSection = between(rpg, "const ITEMS = {", "const EQUIPMENT_SETS");
const monsterEquipmentSection = between(
  rpg,
  "const MONSTER_EQUIPMENT_DROPS = {",
  "const MONSTER_RUNE_DROPS",
);

const actCount = countMatches(actsSection, /^\s+title: /gm);
assert(actCount >= 20, `Expected at least 20 RPG acts, found ${actCount}.`);
["talk", "hunt", "collect", "boss"].forEach((suffix) =>
  assert(
    questSection.includes(`id: \`act\${rank}_${suffix}\``),
    `QUESTS generator missing ${suffix} quest stage.`,
  ),
);
assert(
  rpg.includes("const MIN_FINAL_PLAY_SECONDS = 30 * 60 * 60;"),
  "30-hour final-play gate is missing.",
);
assert(
  rpg.includes("minPlaySeconds: act.final ? MIN_FINAL_PLAY_SECONDS : 0"),
  "Final act does not reference MIN_FINAL_PLAY_SECONDS.",
);
assert(
  rpg.includes("state.playSeconds >= MIN_FINAL_PLAY_SECONDS && state.questIndex >= 79"),
  "Final title/condition gate does not require 30 hours and main progress.",
);

requireMarkers(
  rpg,
  [
    "const PLAYER_ENEMY_BODY_PADDING",
    "function pushEnemyOutOfPlayer(enemy, extra = 0, showCue = false)",
    "Array.from({ length: 8 }",
    "function markEnemySeparated(enemy)",
    "const bodyContact = gap <= playerEnemySeparation(enemy) + 10",
    "drawEnemySeparationCue(enemy)",
  ],
  "Monster-player overlap handling",
);

const gearItemCount = countMatches(itemsSection, /type: "(weapon|armor|charm)"/g);
const monsterGearDropTypes = countMatches(monsterEquipmentSection, /^\s+\w+:\s*\[/gm);
assert(gearItemCount >= 35, `Expected broad gear catalog, found ${gearItemCount}.`);
assert(
  monsterGearDropTypes >= 12,
  `Expected monster-specific gear drop pools, found ${monsterGearDropTypes}.`,
);
requireMarkers(
  rpg,
  [
    "const SHOPS = {",
    "function openShop(npc)",
    "function equipItem(id)",
    "function enhanceItem(id)",
    "function salvageGearItem(id)",
    "function gearComparison(id)",
    "function setBonus(field)",
    "function gearCollectionBonus(field)",
  ],
  "Equipment/shop systems",
);

[
  "const SIDE_STORIES =",
  "const REGION_TRIALS =",
  "const REGIONAL_CHRONICLES =",
  "const REGION_RELICS =",
  "const ECHO_TRIALS =",
  "const REGIONAL_ARMORY_RECORDS =",
  "const TACTIC_MANUALS =",
  "const OATH_CAMPAIGNS =",
  "const REGION_COMMENDATIONS =",
  "const REGION_SECRETS =",
  "const REGION_TREASURE_SITES =",
  "const REGIONAL_NAMED_HUNTS =",
  "const REGIONAL_CAMPSITES =",
  "const REGIONAL_PATROL_OPERATIONS =",
].forEach((marker) => assert(rpg.includes(marker), `Missing content system: ${marker}`));

requireMarkers(
  rpg,
  [
    "id=\"rpgQuickGuide\"",
    "id=\"rpgJourney\"",
    "id=\"rpgGoalAudit\"",
    "function openGoalAudit()",
    "function longPlayRouteCardsHtml()",
    "추천 장기 루트",
    "장별 서사 연표",
    "다음 행동",
    "여정 현황",
  ],
  "RPG UI guidance",
);

requireMarkers(
  rpg,
  [
    "function drawPlayerMotionAfterimage",
    "function drawPlayerAttackTrail",
    "function drawPlayerEquipmentCrest",
    "function drawNpcStatusBanner",
    "function drawNpcAmbientGesture",
    "function drawNpcFace",
    "function drawEnemyLimbMotion",
    "function drawEnemyBodyDepth",
    "function drawEnemyResearchWeakpoint",
    "function drawDropGlyph",
  ],
  "RPG visual systems",
);

requireMarkers(
  rpg,
  [
    'const SAVE_API = "/api/rpg/save";',
    "fetch(SAVE_API",
    "localStorage.getItem(SAVE_KEY)",
    "localStorage.setItem(SAVE_KEY",
  ],
  "Browser/EXE save fallback",
);

requireMarkers(
  readme + gameReadme,
  [
    "30시간",
    "몬스터별 낮은 확률 고유 장비",
    "장별 서사 연표",
    "RPG 목표 진단",
  ],
  "RPG documentation",
);

console.log(
  `rpg validation passed: version=${rpgVersion}, acts=${actCount}, gear=${gearItemCount}, monsterGearPools=${monsterGearDropTypes}`,
);
