const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const connectForm = document.getElementById("connectForm");
const playerNameInput = document.getElementById("playerName");
const serverUrlInput = document.getElementById("serverUrl");
const connectButton = document.getElementById("connectButton");
const disconnectButton = document.getElementById("disconnectButton");
const connectionPanel = document.getElementById("connectionPanel");
const connectionState = document.getElementById("connectionState");
const hudToggle = document.getElementById("hudToggle");
const scoreboard = document.getElementById("scoreboard");
const centerMessage = document.getElementById("centerMessage");
const netInfoPanel = document.getElementById("netInfoPanel");
const netInfoToggle = document.getElementById("netInfoToggle");
const netInfoCopy = document.getElementById("netInfoCopy");
const netInfoGame = document.getElementById("netInfoGame");
const netInfoPage = document.getElementById("netInfoPage");
const netInfoServer = document.getElementById("netInfoServer");
const netInfoShare = document.getElementById("netInfoShare");
const netInfoWarning = document.getElementById("netInfoWarning");

const launchParams = new URLSearchParams(window.location.search);
const isLocalArena = ["solo", "local"].includes(launchParams.get("mode") || "");
const keys = new Set();
const pointer = { x: 0, y: 0, down: false };
const camera = { x: 0, y: 0 };
const localArenaConfig = {
  width: 2600,
  height: 1600,
  playerRadius: 18,
  playerSpeed: 260,
  bulletRadius: 5,
  bulletSpeed: 650,
  bulletTtl: 1.6,
  fireCooldown: 0.22,
  respawnDelay: 1.8,
};
const arenaWeaponSpecs = {
  blaster: {
    damage: 25,
    speed: 650,
    radius: 5,
    ttl: 1.6,
    cooldown: 0.22,
    count: 1,
    spread: 0,
    splash: 0,
    label: "기본",
    icon: "B",
    color: "#f5fbff",
  },
  spread: {
    damage: 14,
    speed: 610,
    radius: 4.6,
    ttl: 1.08,
    cooldown: 0.42,
    count: 5,
    spread: 0.34,
    splash: 0,
    ammo: 12,
    duration: 10,
    label: "샷건",
    icon: "S",
    color: "#ffba5a",
  },
  rail: {
    damage: 42,
    speed: 930,
    radius: 4,
    ttl: 1.22,
    cooldown: 0.62,
    count: 1,
    spread: 0,
    splash: 0,
    ammo: 7,
    duration: 11,
    label: "레일건",
    icon: "R",
    color: "#69dcff",
  },
  rocket: {
    damage: 34,
    speed: 430,
    radius: 8,
    ttl: 1.85,
    cooldown: 0.66,
    count: 1,
    spread: 0,
    splash: 82,
    ammo: 5,
    duration: 12,
    label: "로켓",
    icon: "!",
    color: "#ff5f6d",
  },
};
const arenaControlPointSpecs = [
  { id: "alpha", x: 650, y: 520, radius: 118, label: "A" },
  { id: "bravo", x: 1300, y: 800, radius: 132, label: "B" },
  { id: "charlie", x: 1990, y: 1080, radius: 118, label: "C" },
];
const arenaSpeedLaneSpecs = [
  {
    id: "north-run",
    x: 500,
    y: 345,
    w: 820,
    h: 56,
    label: "북측 레인",
    color: "#42d7ff",
    boost: 1.18,
  },
  {
    id: "center-cut",
    x: 1268,
    y: 490,
    w: 64,
    h: 620,
    label: "중앙 레인",
    color: "#53e2a8",
    boost: 1.16,
  },
  {
    id: "south-run",
    x: 1280,
    y: 1190,
    w: 820,
    h: 58,
    label: "남측 레인",
    color: "#d08cff",
    boost: 1.18,
  },
];
const fallbackObstacles = [
  { x: 320, y: 260, w: 210, h: 76 },
  { x: 760, y: 460, w: 170, h: 92 },
  { x: 1230, y: 245, w: 240, h: 82 },
  { x: 1740, y: 420, w: 210, h: 96 },
  { x: 2160, y: 675, w: 250, h: 86 },
  { x: 410, y: 845, w: 230, h: 82 },
  { x: 990, y: 930, w: 190, h: 105 },
  { x: 1540, y: 1120, w: 255, h: 76 },
  { x: 2020, y: 1180, w: 210, h: 120 },
  { x: 1830, y: 250, w: 118, h: 220 },
  { x: 680, y: 1270, w: 240, h: 90 },
];
const fallbackPickups = [
  { id: "preview-heal", x: 560, y: 385, kind: "heal" },
  { id: "preview-shield", x: 1110, y: 560, kind: "shield" },
  { id: "preview-haste", x: 1510, y: 850, kind: "haste" },
  { id: "preview-rapid", x: 820, y: 1060, kind: "rapid" },
];
let socket = null;
let playerId = "";
let lastFrame = performance.now();
let localArenaIds = { bullet: 1, pickup: 1 };
let latestState = {
  arena: {
    width: 2600,
    height: 1600,
    obstacles: fallbackObstacles,
    speedLanes: arenaSpeedLaneSpecs,
  },
  players: [],
  bullets: [],
  pickups: fallbackPickups,
  controlPoints: createLocalArenaControlPoints(),
  effects: [],
};
let lastInputSent = 0;
let latestShareUrl = "";
let netInfoCopyTimer = 0;

function getDefaultServerUrl() {
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get("ws");
  if (explicit) return explicit;

  const host = params.get("host");
  const port = params.get("port") || "7000";
  const room = params.get("room");
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  if (host) {
    const url = new URL(`${protocol}://${host}:${port}/ws`);
    if (room) url.searchParams.set("room", room);
    return url.toString();
  }
  if (
    window.location.protocol === "http:" ||
    window.location.protocol === "https:"
  ) {
    const url = new URL(`${protocol}://${window.location.host}/ws`);
    if (room) url.searchParams.set("room", room);
    return url.toString();
  }
  const url = new URL("ws://localhost:7000/ws");
  if (room) url.searchParams.set("room", room);
  return url.toString();
}

function cleanName(value) {
  return (value || "Player").trim().slice(0, 18) || "Player";
}

function setStatus(text, isActive = false) {
  connectionState.textContent = text;
  connectButton.disabled = isActive;
}

function setCenterMessage(text) {
  centerMessage.textContent = text;
  centerMessage.classList.toggle("hidden", !text);
}

function setConnectionPanelCollapsed(isCollapsed) {
  connectionPanel.classList.toggle("collapsed", isCollapsed);
  hudToggle.setAttribute("aria-expanded", String(!isCollapsed));
}

function isLoopbackHost(host) {
  const normalized = String(host || "")
    .trim()
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "0.0.0.0" ||
    /^127(?:\.|$)/.test(normalized)
  );
}

function safeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function currentAssetVersion() {
  return new URLSearchParams(window.location.search).get("v") || "20260530au";
}

function nowSeconds() {
  return performance.now() / 1000;
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function renderNetInfoValue(element, label, description, value) {
  if (!element) return;
  const text = String(value || "-");
  element.innerHTML =
    "<strong>" +
    escapeHtml(label) +
    "</strong><small>" +
    escapeHtml(description) +
    "</small><code>" +
    escapeHtml(text) +
    "</code>";
  element.title = text;
}

async function copyText(value) {
  const text = String(value || "");
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // File URLs, embedded shells, or unfocused windows can reject Clipboard API.
    }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  Object.assign(area.style, {
    position: "fixed",
    left: "-9999px",
    top: "0",
  });
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, area.value.length);
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) throw new Error("클립보드 복사 권한을 확인하세요.");
}

function flashNetInfoCopy(message, isError = false) {
  if (!netInfoCopy) return;
  window.clearTimeout(netInfoCopyTimer);
  netInfoCopy.textContent = message;
  netInfoCopy.classList.toggle("error", isError);
  netInfoCopyTimer = window.setTimeout(() => {
    netInfoCopy.textContent = "초대 링크 복사";
    netInfoCopy.classList.remove("error");
  }, 1600);
}

function buildArenaShareUrl(serverUrl) {
  const target = safeUrl(serverUrl);
  if (!target) return "";
  const protocol = target.protocol === "wss:" ? "https:" : "http:";
  const port = target.port || (target.protocol === "wss:" ? "443" : "80");
  const share = new URL(`${protocol}//${target.host}/game/index.html`);
  const room =
    target.searchParams.get("room") ||
    new URLSearchParams(window.location.search).get("room");
  share.searchParams.set("host", target.hostname);
  share.searchParams.set("port", port);
  share.searchParams.set("auto", "1");
  if (room) share.searchParams.set("room", room);
  share.searchParams.set("v", currentAssetVersion());
  return share.toString();
}

function connectionWarnings(serverUrl) {
  const warnings = [];
  const pageHost = window.location.hostname;
  const target = safeUrl(serverUrl);
  if (isLoopbackHost(pageHost)) {
    warnings.push(
      "현재 페이지가 localhost/127.x로 열렸습니다. 다른 PC에는 호스트 PC의 LAN IP가 들어간 공유 주소를 전달하세요.",
    );
  }
  if (target && isLoopbackHost(target.hostname)) {
    warnings.push(
      "서버 대상이 localhost/127.x/0.0.0.0입니다. 다른 PC는 예: 192.168.1.154 같은 호스트 PC LAN IP를 사용해야 합니다.",
    );
  }
  return warnings.join(" ");
}

function setNetInfoCollapsed(isCollapsed) {
  if (!netInfoPanel || !netInfoToggle) return;
  netInfoPanel.classList.toggle("collapsed", isCollapsed);
  netInfoToggle.setAttribute("aria-expanded", String(!isCollapsed));
}

function updateNetInfo(
  serverUrl = serverUrlInput.value || getDefaultServerUrl(),
) {
  if (!netInfoPanel) return;
  if (isLocalArena) {
    latestShareUrl = "";
    netInfoGame.textContent = "LAN 아레나 / 훈련장";
    renderNetInfoValue(
      netInfoPage,
      "현재 게임 화면",
      "서버 없이 현재 브라우저 또는 EXE 안에서 실행되는 로컬 훈련장입니다.",
      window.location.href,
    );
    renderNetInfoValue(
      netInfoServer,
      "서버 연결",
      "로컬 훈련장은 WebSocket 서버를 사용하지 않습니다.",
      "혼자하기: 서버 연결 없음",
    );
    renderNetInfoValue(
      netInfoShare,
      "초대 링크",
      "멀티 초대는 통합 입장 센터 또는 호스트/입장하기를 사용하세요.",
      "-",
    );
    netInfoWarning.textContent = "";
    return;
  }
  latestShareUrl = buildArenaShareUrl(serverUrl);
  const room = safeUrl(serverUrl)?.searchParams.get("room") || "-";
  netInfoGame.textContent =
    room === "-" ? "LAN 아레나" : `LAN 아레나 / 방 ${room}`;
  renderNetInfoValue(
    netInfoPage,
    "현재 내 화면 주소",
    "지금 열린 화면입니다. 다른 PC 초대에는 아래 초대 링크를 사용하세요.",
    window.location.href,
  );
  renderNetInfoValue(
    netInfoServer,
    "게임 서버 연결",
    "실시간 조작을 주고받는 WebSocket 대상입니다.",
    serverUrl,
  );
  renderNetInfoValue(
    netInfoShare,
    "참가자 초대 링크",
    "다른 참가자에게 보내면 같은 방으로 바로 들어올 수 있습니다.",
    latestShareUrl || "-",
  );
  netInfoWarning.textContent = connectionWarnings(serverUrl);
}

function resizeCanvas() {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const width = Math.floor(window.innerWidth * dpr);
  const height = Math.floor(window.innerHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function selfPlayer() {
  return latestState.players.find((player) => player.id === playerId);
}

function updateCamera() {
  const player = selfPlayer();
  const arena = latestState.arena || { width: 1600, height: 1000 };
  const targetX = (player?.x || arena.width / 2) - window.innerWidth / 2;
  const targetY = (player?.y || arena.height / 2) - window.innerHeight / 2;
  camera.x += (targetX - camera.x) * 0.12;
  camera.y += (targetY - camera.y) * 0.12;
  camera.x = Math.max(
    -120,
    Math.min(arena.width - window.innerWidth + 120, camera.x),
  );
  camera.y = Math.max(
    -120,
    Math.min(arena.height - window.innerHeight + 120, camera.y),
  );
}

function screenToWorld(x, y) {
  return { x: x + camera.x, y: y + camera.y };
}

function buildInput() {
  const aim = screenToWorld(pointer.x, pointer.y);
  return {
    type: "input",
    up: keys.has("w") || keys.has("arrowup"),
    down: keys.has("s") || keys.has("arrowdown"),
    left: keys.has("a") || keys.has("arrowleft"),
    right: keys.has("d") || keys.has("arrowright"),
    fire: pointer.down || keys.has(" "),
    dash: keys.has("shift"),
    aimX: aim.x,
    aimY: aim.y,
  };
}

function sendInput(now) {
  if (isLocalArena) return;
  if (
    !socket ||
    socket.readyState !== WebSocket.OPEN ||
    now - lastInputSent < 33
  ) {
    return;
  }
  socket.send(JSON.stringify(buildInput()));
  lastInputSent = now;
}

function connect() {
  if (isLocalArena) {
    startLocalArena();
    return;
  }
  const name = cleanName(playerNameInput.value);
  const url = serverUrlInput.value.trim() || getDefaultServerUrl();
  localStorage.setItem("lan_arena_name", name);
  localStorage.setItem("lan_arena_url", url);
  updateNetInfo(url);

  if (socket) socket.close();
  const activeSocket = new WebSocket(url);
  socket = activeSocket;
  setStatus("연결 중...", true);
  setCenterMessage("LAN 아레나에 연결 중입니다...");

  activeSocket.addEventListener("open", () => {
    if (socket !== activeSocket) return;
    setStatus("연결됨", true);
    setConnectionPanelCollapsed(true);
    activeSocket.send(JSON.stringify({ type: "join", name }));
  });

  activeSocket.addEventListener("message", (event) => {
    if (socket !== activeSocket) return;
    const message = JSON.parse(event.data);
    if (message.type === "welcome") {
      playerId = message.id;
      setCenterMessage("");
      return;
    }
    if (message.type === "state") {
      latestState = message;
      latestState.effects = latestState.effects || [];
      latestState.bullets = latestState.bullets || [];
      latestState.pickups = latestState.pickups || [];
      latestState.controlPoints = latestState.controlPoints || [];
      latestState.players = latestState.players || [];
      renderScoreboard();
      return;
    }
    if (message.type === "error") {
      setCenterMessage(message.message || "Server error");
    }
  });

  activeSocket.addEventListener("close", () => {
    if (socket !== activeSocket) return;
    socket = null;
    setStatus("연결 끊김", false);
    setConnectionPanelCollapsed(false);
    playerId = "";
    setCenterMessage(
      isLoopbackHost(safeUrl(url)?.hostname)
        ? "연결이 끊겼습니다. localhost/127.x는 이 PC에서만 유효하므로 호스트 LAN IP와 활성 포트를 사용하세요."
        : "연결이 끊겼습니다. 서버 주소, 활성 포트, 방화벽을 확인하세요.",
    );
  });

  activeSocket.addEventListener("error", () => {
    if (socket !== activeSocket) return;
    setStatus("연결 오류", false);
    setConnectionPanelCollapsed(false);
    setCenterMessage(
      isLoopbackHost(safeUrl(url)?.hostname)
        ? "연결 실패. localhost/127.x는 이 PC에서만 유효하므로 호스트 LAN IP와 활성 포트를 사용하세요."
        : "연결 실패. 서버 주소, 활성 포트, 방화벽을 확인하세요.",
    );
  });
}

function disconnect() {
  if (isLocalArena) {
    startLocalArena();
    return;
  }
  if (socket) socket.close();
  socket = null;
}

function renderScoreboard() {
  const players = [...latestState.players].sort((a, b) => b.score - a.score);
  scoreboard.innerHTML =
    players
      .map(
        (player) =>
          `<li><span class="score-name"><span class="score-dot" style="background:${player.color}"></span>${escapeHtml(
            player.name,
          )}</span><span class="score-value">${player.score}${escapeHtml(
            arenaPlayerWeaponText(player),
          )}</span></li>`,
      )
      .join("") || "<li>No players</li>";
}

function arenaPlayerWeaponText(player) {
  const key = player.weapon || "blaster";
  if (key === "blaster") return "";
  const spec = arenaWeaponSpecs[key];
  if (!spec) return "";
  const ammo = Number(player.weaponAmmo || 0);
  return ` · ${spec.label} ${ammo}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function startLocalArena() {
  if (socket) socket.close();
  socket = null;
  playerId = "local";
  localArenaIds = { bullet: 1, pickup: 1 };
  const name = cleanName(playerNameInput.value);
  localStorage.setItem("lan_arena_name", name);
  latestState = {
    type: "state",
    roomId: "LOCAL",
    arena: {
      width: localArenaConfig.width,
      height: localArenaConfig.height,
      obstacles: fallbackObstacles,
      speedLanes: arenaSpeedLaneSpecs,
    },
    players: [
      createLocalArenaPlayer("local", name, "#53e2a8", 420, 420, false),
      createLocalArenaPlayer("bot-1", "훈련 봇 A", "#48a5ff", 2040, 380, true),
      createLocalArenaPlayer("bot-2", "훈련 봇 B", "#ffbc54", 2140, 1260, true),
      createLocalArenaPlayer("bot-3", "훈련 봇 C", "#b987ff", 720, 1300, true),
    ],
    bullets: [],
    pickups: seedLocalArenaPickups(),
    controlPoints: createLocalArenaControlPoints(),
    effects: [],
    local: true,
  };
  setStatus("훈련장", false);
  setConnectionPanelCollapsed(true);
  setCenterMessage(
    "LAN 아레나 훈련장입니다. Shift 회피 대시, 엄폐물, 파워업, 거점을 활용하세요.",
  );
  window.setTimeout(() => {
    if (isLocalArena) setCenterMessage("");
  }, 1800);
  updateNetInfo();
  renderScoreboard();
}

function createLocalArenaPlayer(id, name, color, x, y, bot) {
  return {
    id,
    name,
    color,
    x,
    y,
    angle: 0,
    radius: localArenaConfig.playerRadius,
    health: 100,
    score: 0,
    alive: true,
    respawnAt: 0,
    lastFire: 0,
    shieldUntil: 0,
    hasteUntil: 0,
    rapidUntil: 0,
    weapon: "blaster",
    weaponUntil: 0,
    weaponAmmo: 0,
    stamina: 100,
    dashUntil: 0,
    dashCooldownUntil: 0,
    dashAngle: 0,
    dashLatch: false,
    shielded: false,
    hasted: false,
    rapid: false,
    dashing: false,
    laneBoosted: false,
    respawnIn: 0,
    bot,
    targetX: x,
    targetY: y,
    thinkAt: 0,
  };
}

function seedLocalArenaPickups() {
  return Array.from({ length: 12 }, () => createLocalArenaPickup());
}

function createLocalArenaControlPoints() {
  return arenaControlPointSpecs.map((spec) => ({
    ...spec,
    ownerId: "",
    ownerName: "",
    ownerColor: "",
    capture: 0,
    nextScoreAt: 0,
  }));
}

function createLocalArenaPickup() {
  const kinds = [
    "heal",
    "shield",
    "haste",
    "rapid",
    "spread",
    "rail",
    "rocket",
  ];
  const point = randomArenaPoint();
  return {
    id: localArenaIds.pickup++,
    x: point.x,
    y: point.y,
    kind: kinds[Math.floor(Math.random() * kinds.length)],
  };
}

function randomArenaPoint() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const x =
      localArenaConfig.playerRadius +
      80 +
      Math.random() *
        (localArenaConfig.width - localArenaConfig.playerRadius * 2 - 160);
    const y =
      localArenaConfig.playerRadius +
      80 +
      Math.random() *
        (localArenaConfig.height - localArenaConfig.playerRadius * 2 - 160);
    if (!arenaCircleHitsObstacle(x, y, localArenaConfig.playerRadius + 12)) {
      return { x, y };
    }
  }
  return { x: localArenaConfig.width / 2, y: localArenaConfig.height / 2 };
}

function circleRectIntersects(x, y, radius, rect) {
  const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return Math.hypot(x - closestX, y - closestY) <= radius;
}

function arenaCircleHitsObstacle(x, y, radius) {
  return fallbackObstacles.some((obstacle) =>
    circleRectIntersects(x, y, radius, obstacle),
  );
}

function moveLocalArenaPlayer(player, dx, dy) {
  const radius = localArenaConfig.playerRadius;
  const nextX = Math.max(
    radius,
    Math.min(localArenaConfig.width - radius, player.x + dx),
  );
  if (!arenaCircleHitsObstacle(nextX, player.y, radius)) player.x = nextX;
  const nextY = Math.max(
    radius,
    Math.min(localArenaConfig.height - radius, player.y + dy),
  );
  if (!arenaCircleHitsObstacle(player.x, nextY, radius)) player.y = nextY;
}

function respawnLocalArenaPlayer(player, now) {
  const point = randomArenaPoint();
  player.x = point.x;
  player.y = point.y;
  player.health = 100;
  player.alive = true;
  player.respawnAt = 0;
  player.respawnIn = 0;
  player.shieldUntil = 0;
  player.hasteUntil = 0;
  player.rapidUntil = 0;
  player.weapon = "blaster";
  player.weaponUntil = 0;
  player.weaponAmmo = 0;
  player.stamina = 100;
  player.dashUntil = 0;
  player.dashCooldownUntil = 0;
  player.dashAngle = 0;
  player.dashLatch = false;
  player.dashing = false;
  player.laneBoosted = false;
  addLocalArenaEffect({
    x: player.x,
    y: player.y,
    kind: "respawn",
    color: player.color,
    ttl: 0.9,
    text: "READY",
  });
}

function updateLocalArena(dt, now) {
  if (!isLocalArena) return;
  latestState.effects = (latestState.effects || [])
    .map((effect) => ({ ...effect, ttl: effect.ttl - dt }))
    .filter((effect) => effect.ttl > 0);
  const input = buildInput();
  const player = latestState.players.find((item) => item.id === playerId);
  if (!player) return;
  updateLocalArenaActor(player, input, dt, now);
  latestState.players
    .filter((item) => item.bot)
    .forEach((bot) => updateLocalArenaBot(bot, dt, now));
  updateLocalArenaBullets(dt, now);
  ensureLocalArenaPickups();
  updateLocalArenaControlPoints(dt, now);
  latestState.players.forEach((item) => {
    expireLocalArenaWeapon(item, now);
    item.shielded = now < item.shieldUntil;
    item.hasted = now < item.hasteUntil;
    item.rapid = now < item.rapidUntil;
    item.dashing = now < (item.dashUntil || 0);
    item.weaponTtl = Math.max(0, (item.weaponUntil || 0) - now);
    item.respawnIn = item.alive ? 0 : Math.max(0, item.respawnAt - now);
  });
  renderScoreboard();
}

function addLocalArenaEffect(effect) {
  latestState.effects = [...(latestState.effects || []), effect].slice(-36);
}

function expireLocalArenaWeapon(player, now) {
  if (!player || player.weapon === "blaster") return;
  if ((player.weaponAmmo || 0) > 0 && now < (player.weaponUntil || 0)) return;
  player.weapon = "blaster";
  player.weaponUntil = 0;
  player.weaponAmmo = 0;
}

function arenaSpeedLaneAt(x, y) {
  return (latestState.arena?.speedLanes || arenaSpeedLaneSpecs).find(
    (lane) =>
      x >= lane.x &&
      x <= lane.x + lane.w &&
      y >= lane.y &&
      y <= lane.y + lane.h,
  );
}

function updateLocalArenaControlPoints(dt, now) {
  (latestState.controlPoints || []).forEach((point) => {
    const occupants = latestState.players.filter(
      (player) =>
        player.alive &&
        Math.hypot(player.x - point.x, player.y - point.y) <= point.radius,
    );
    if (occupants.length !== 1) {
      if (!point.ownerId)
        point.capture = Math.max(0, (point.capture || 0) - dt * 0.32);
      return;
    }

    const player = occupants[0];
    if (point.ownerId === player.id) {
      point.capture = 1;
      if (now >= (point.nextScoreAt || 0)) {
        player.score += 1;
        player.health = Math.min(100, player.health + 4);
        point.nextScoreAt = now + 2.6;
        addLocalArenaEffect({
          x: point.x,
          y: point.y,
          kind: "control",
          color: player.color,
          ttl: 0.55,
          text: "+1",
        });
      }
      return;
    }

    if (point.ownerId && (point.capture || 0) > 0) {
      point.capture = Math.max(0, (point.capture || 0) - dt * 0.78);
      if (point.capture > 0) return;
      point.ownerId = "";
      point.ownerName = "";
      point.ownerColor = "";
    }

    point.capture = Math.min(1, (point.capture || 0) + dt * 0.52);
    if (point.capture >= 1) {
      point.ownerId = player.id;
      point.ownerName = player.name;
      point.ownerColor = player.color;
      point.nextScoreAt = now + 1;
      player.score += 2;
      addLocalArenaEffect({
        x: point.x,
        y: point.y,
        kind: "control",
        color: player.color,
        ttl: 0.9,
        text: `${point.label} 점령`,
      });
    }
  });
}

function updateLocalArenaActor(player, input, dt, now) {
  if (!player.alive) {
    if (now >= player.respawnAt) respawnLocalArenaPlayer(player, now);
    return;
  }
  const dx = Number(input.right) - Number(input.left);
  const dy = Number(input.down) - Number(input.up);
  const length = Math.hypot(dx, dy) || 1;
  const speedLane = arenaSpeedLaneAt(player.x, player.y);
  player.laneBoosted = Boolean(speedLane);
  player.stamina = Math.min(
    100,
    (player.stamina ?? 100) + dt * (speedLane ? 38 : 24),
  );
  if (!input.dash) player.dashLatch = false;
  if (
    input.dash &&
    !player.dashLatch &&
    now >= (player.dashCooldownUntil || 0) &&
    (player.stamina ?? 100) >= 36
  ) {
    player.dashLatch = true;
    player.stamina = Math.max(0, (player.stamina ?? 100) - 36);
    player.dashUntil = now + 0.18;
    player.dashCooldownUntil = now + 0.65;
    player.dashAngle =
      dx || dy
        ? Math.atan2(dy, dx)
        : Math.atan2(input.aimY - player.y, input.aimX - player.x);
    addLocalArenaEffect({
      x: player.x,
      y: player.y,
      kind: "dash",
      color: player.color,
      ttl: 0.42,
      text: "DASH",
    });
  }
  const dashing = now < (player.dashUntil || 0);
  player.dashing = dashing;
  const moveX = dashing
    ? Math.cos(player.dashAngle || player.angle || 0)
    : dx / length;
  const moveY = dashing
    ? Math.sin(player.dashAngle || player.angle || 0)
    : dy / length;
  const speed =
    localArenaConfig.playerSpeed *
    (now < player.hasteUntil ? 1.32 : 1) *
    (dashing ? 2.65 : 1) *
    (speedLane ? Number(speedLane.boost || 1.18) : 1);
  moveLocalArenaPlayer(player, moveX * speed * dt, moveY * speed * dt);
  player.angle = Math.atan2(input.aimY - player.y, input.aimX - player.x);
  if (input.fire) spawnLocalArenaBullet(player, now);
  collectLocalArenaPickups(player, now);
}

function updateLocalArenaBot(bot, dt, now) {
  if (!bot.alive) {
    if (now >= bot.respawnAt) respawnLocalArenaPlayer(bot, now);
    return;
  }
  const target = nearestLocalArenaEnemy(bot);
  if (
    now >= bot.thinkAt ||
    Math.hypot(bot.targetX - bot.x, bot.targetY - bot.y) < 80
  ) {
    bot.thinkAt = now + 0.55 + Math.random() * 0.65;
    const pickup = nearestLocalArenaPickup(bot);
    const controlPoint = nearestLocalArenaControlPoint(bot);
    if (pickup && (bot.health < 65 || Math.random() < 0.45)) {
      bot.targetX = pickup.x;
      bot.targetY = pickup.y;
    } else if (controlPoint && Math.random() < 0.42) {
      bot.targetX = controlPoint.x;
      bot.targetY = controlPoint.y;
    } else if (target) {
      const angle =
        Math.atan2(bot.y - target.y, bot.x - target.x) + (Math.random() - 0.5);
      const distance = 220 + Math.random() * 260;
      bot.targetX = clamp(
        target.x + Math.cos(angle) * distance,
        80,
        localArenaConfig.width - 80,
      );
      bot.targetY = clamp(
        target.y + Math.sin(angle) * distance,
        80,
        localArenaConfig.height - 80,
      );
    } else {
      const point = randomArenaPoint();
      bot.targetX = point.x;
      bot.targetY = point.y;
    }
  }
  const moveX = bot.targetX - bot.x;
  const moveY = bot.targetY - bot.y;
  const length = Math.hypot(moveX, moveY) || 1;
  const speedLane = arenaSpeedLaneAt(bot.x, bot.y);
  bot.laneBoosted = Boolean(speedLane);
  const speed =
    localArenaConfig.playerSpeed *
    0.86 *
    (speedLane ? Number(speedLane.boost || 1.18) : 1);
  moveLocalArenaPlayer(
    bot,
    (moveX / length) * speed * dt,
    (moveY / length) * speed * dt,
  );
  if (target) {
    bot.angle = Math.atan2(target.y - bot.y, target.x - bot.x);
    if (
      Math.hypot(target.x - bot.x, target.y - bot.y) < 760 &&
      Math.random() < 0.72
    ) {
      spawnLocalArenaBullet(bot, now);
    }
  }
  collectLocalArenaPickups(bot, now);
}

function nearestLocalArenaEnemy(player) {
  return latestState.players
    .filter((item) => item.alive && item.id !== player.id)
    .sort(
      (a, b) =>
        Math.hypot(a.x - player.x, a.y - player.y) -
        Math.hypot(b.x - player.x, b.y - player.y),
    )[0];
}

function nearestLocalArenaPickup(player) {
  return [...(latestState.pickups || [])].sort(
    (a, b) =>
      Math.hypot(a.x - player.x, a.y - player.y) -
      Math.hypot(b.x - player.x, b.y - player.y),
  )[0];
}

function nearestLocalArenaControlPoint(player) {
  return [...(latestState.controlPoints || [])]
    .filter((point) => point.ownerId !== player.id || point.capture < 1)
    .sort(
      (a, b) =>
        Math.hypot(a.x - player.x, a.y - player.y) -
        Math.hypot(b.x - player.x, b.y - player.y),
    )[0];
}

function spawnLocalArenaBullet(player, now) {
  expireLocalArenaWeapon(player, now);
  const weaponKey = arenaWeaponSpecs[player.weapon] ? player.weapon : "blaster";
  const weapon = arenaWeaponSpecs[weaponKey];
  const cooldown = weapon.cooldown * (now < player.rapidUntil ? 0.55 : 1);
  if (now - player.lastFire < cooldown) return;
  player.lastFire = now;
  const count = weapon.count || 1;
  const spread = weapon.spread || 0;
  const start = count > 1 ? -spread / 2 : 0;
  const step = count > 1 ? spread / Math.max(1, count - 1) : 0;
  for (let index = 0; index < count; index += 1) {
    const angle = player.angle + start + step * index;
    const muzzleX =
      player.x + Math.cos(angle) * (localArenaConfig.playerRadius + 10);
    const muzzleY =
      player.y + Math.sin(angle) * (localArenaConfig.playerRadius + 10);
    latestState.bullets.push({
      id: localArenaIds.bullet++,
      ownerId: player.id,
      x: muzzleX,
      y: muzzleY,
      vx: Math.cos(angle) * weapon.speed,
      vy: Math.sin(angle) * weapon.speed,
      radius: weapon.radius,
      ttl: weapon.ttl,
      color: player.color,
      kind: weaponKey,
      damage: weapon.damage,
      splash: weapon.splash || 0,
    });
  }
  const muzzleX =
    player.x + Math.cos(player.angle) * (localArenaConfig.playerRadius + 18);
  const muzzleY =
    player.y + Math.sin(player.angle) * (localArenaConfig.playerRadius + 18);
  addLocalArenaEffect({
    x: muzzleX,
    y: muzzleY,
    kind: "muzzle",
    color: player.color,
    ttl: 0.16,
  });
  if (weaponKey !== "blaster") {
    player.weaponAmmo = Math.max(0, (player.weaponAmmo || 0) - 1);
    if (player.weaponAmmo <= 0) {
      player.weapon = "blaster";
      player.weaponUntil = 0;
    }
  }
}

function updateLocalArenaBullets(dt, now) {
  const alive = [];
  for (const bullet of latestState.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.ttl -= dt;
    if (
      bullet.ttl <= 0 ||
      bullet.x < 0 ||
      bullet.x > localArenaConfig.width ||
      bullet.y < 0 ||
      bullet.y > localArenaConfig.height ||
      arenaCircleHitsObstacle(
        bullet.x,
        bullet.y,
        bullet.radius || localArenaConfig.bulletRadius,
      )
    ) {
      resolveLocalArenaBulletImpact(bullet, now);
      continue;
    }
    const hit = latestState.players.find(
      (player) =>
        player.alive &&
        player.id !== bullet.ownerId &&
        Math.hypot(player.x - bullet.x, player.y - bullet.y) <=
          localArenaConfig.playerRadius +
            (bullet.radius || localArenaConfig.bulletRadius),
    );
    if (hit) {
      if ((bullet.splash || 0) > 0) {
        resolveLocalArenaBulletImpact(bullet, now);
      } else {
        damageLocalArenaPlayer(
          hit,
          bullet.ownerId,
          now,
          bullet.color,
          bullet.damage || 25,
        );
      }
      continue;
    }
    alive.push(bullet);
  }
  latestState.bullets = alive;
}

function resolveLocalArenaBulletImpact(bullet, now) {
  const splash = bullet.splash || 0;
  if (splash <= 0) {
    addLocalArenaEffect({
      x: bullet.x,
      y: bullet.y,
      kind: "impact",
      color: bullet.color,
      ttl: 0.45,
    });
    return;
  }
  addLocalArenaEffect({
    x: bullet.x,
    y: bullet.y,
    kind: "rocket",
    color: bullet.color,
    ttl: 0.72,
    text: "BOOM",
  });
  latestState.players.forEach((player) => {
    if (!player.alive || player.id === bullet.ownerId) return;
    const gap = Math.hypot(player.x - bullet.x, player.y - bullet.y);
    if (gap > splash + localArenaConfig.playerRadius) return;
    const ratio = Math.max(0.25, 1 - gap / Math.max(1, splash));
    const damage = Math.max(10, Math.round((bullet.damage || 34) * ratio));
    damageLocalArenaPlayer(player, bullet.ownerId, now, bullet.color, damage);
  });
}

function damageLocalArenaPlayer(victim, attackerId, now, color, amount = 25) {
  const damage =
    now < victim.shieldUntil ? Math.max(6, Math.round(amount * 0.4)) : amount;
  victim.health = Math.max(0, victim.health - damage);
  addLocalArenaEffect({
    x: victim.x,
    y: victim.y,
    kind: victim.health > 0 ? "hit" : "down",
    color,
    ttl: 0.75,
    text: `-${damage}`,
  });
  if (victim.health > 0) return;
  victim.alive = false;
  victim.respawnAt = now + localArenaConfig.respawnDelay;
  victim.respawnIn = localArenaConfig.respawnDelay;
  const attacker = latestState.players.find(
    (player) => player.id === attackerId,
  );
  if (attacker && attacker.id !== victim.id) attacker.score += 1;
}

function collectLocalArenaPickups(player, now) {
  latestState.pickups = (latestState.pickups || []).filter((pickup) => {
    if (
      Math.hypot(player.x - pickup.x, player.y - pickup.y) >
      localArenaConfig.playerRadius + 16
    ) {
      return true;
    }
    if (pickup.kind === "heal")
      player.health = Math.min(100, player.health + 34);
    if (pickup.kind === "shield") player.shieldUntil = now + 5;
    if (pickup.kind === "haste") player.hasteUntil = now + 5;
    if (pickup.kind === "rapid") player.rapidUntil = now + 5;
    if (arenaWeaponSpecs[pickup.kind] && pickup.kind !== "blaster") {
      const weapon = arenaWeaponSpecs[pickup.kind];
      player.weapon = pickup.kind;
      player.weaponUntil = now + (weapon.duration || 10);
      player.weaponAmmo = weapon.ammo || 6;
    }
    addLocalArenaEffect({
      x: pickup.x,
      y: pickup.y,
      kind: "pickup",
      color: player.color,
      ttl: 0.65,
      text: pickup.kind.toUpperCase(),
    });
    return false;
  });
}

function ensureLocalArenaPickups() {
  while ((latestState.pickups || []).length < 12) {
    latestState.pickups.push(createLocalArenaPickup());
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawGrid() {
  const arena = latestState.arena || { width: 2600, height: 1600 };
  const bg = ctx.createLinearGradient(
    0,
    0,
    window.innerWidth,
    window.innerHeight,
  );
  bg.addColorStop(0, "#07111f");
  bg.addColorStop(0.55, "#101a2f");
  bg.addColorStop(1, "#171129");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  drawArenaFloorPanels(arena);

  const grid = 64;
  const startX = -((camera.x % grid) + grid);
  const startY = -((camera.y % grid) + grid);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
  for (let x = startX; x < window.innerWidth + grid; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, window.innerHeight);
    ctx.stroke();
  }
  for (let y = startY; y < window.innerHeight + grid; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(window.innerWidth, y);
    ctx.stroke();
  }

  drawArenaScenery(arena);
  drawArenaSpeedLanes(arena.speedLanes || arenaSpeedLaneSpecs);
  drawArenaControlPoints();
  drawArenaObstacles(arena.obstacles || []);
  drawArenaLightPools(arena);

  ctx.strokeStyle = "rgba(83, 226, 168, 0.56)";
  ctx.lineWidth = 5;
  ctx.strokeRect(-camera.x, -camera.y, arena.width, arena.height);
}

function drawArenaFloorPanels(arena) {
  const panel = 192;
  const startWorldX = Math.floor(camera.x / panel) * panel;
  const startWorldY = Math.floor(camera.y / panel) * panel;
  for (
    let worldX = startWorldX;
    worldX < camera.x + window.innerWidth + panel;
    worldX += panel
  ) {
    for (
      let worldY = startWorldY;
      worldY < camera.y + window.innerHeight + panel;
      worldY += panel
    ) {
      if (
        worldX < 0 ||
        worldY < 0 ||
        worldX > arena.width ||
        worldY > arena.height
      )
        continue;
      const x = worldX - camera.x;
      const y = worldY - camera.y;
      ctx.fillStyle =
        (Math.floor(worldX / panel) + Math.floor(worldY / panel)) % 2
          ? "rgba(255,255,255,.018)"
          : "rgba(83,226,168,.018)";
      ctx.fillRect(x, y, panel, panel);
      ctx.strokeStyle = "rgba(245,251,255,.035)";
      ctx.strokeRect(x + 4, y + 4, panel - 8, panel - 8);
      ctx.fillStyle = "rgba(245,251,255,.045)";
      ctx.fillRect(x + 22, y + 22, 4, 4);
      ctx.fillRect(x + panel - 26, y + panel - 26, 4, 4);
    }
  }
}

function drawArenaScenery(arena) {
  for (let index = 0; index < 72; index += 1) {
    const worldX = 140 + ((index * 389) % (arena.width - 280));
    const worldY = 140 + ((index * 257) % (arena.height - 280));
    const x = worldX - camera.x;
    const y = worldY - camera.y;
    if (
      x < -120 ||
      y < -120 ||
      x > window.innerWidth + 120 ||
      y > window.innerHeight + 120
    ) {
      continue;
    }
    const type = index % 4;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath();
    ctx.ellipse(x, y + 18, 42, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    if (type === 0) {
      ctx.fillStyle = "rgba(83,226,168,.14)";
      ctx.fillRect(x - 38, y - 24, 76, 48);
      ctx.strokeStyle = "rgba(245,251,255,.14)";
      ctx.strokeRect(x - 38, y - 24, 76, 48);
      ctx.fillStyle = "rgba(7,17,31,.45)";
      ctx.fillRect(x - 25, y - 10, 50, 20);
      ctx.fillStyle = "rgba(83,226,168,.42)";
      ctx.fillRect(x - 28, y - 21, 56, 5);
    } else if (type === 1) {
      ctx.fillStyle = "rgba(72,165,255,.16)";
      ctx.fillRect(x - 30, y - 34, 60, 68);
      ctx.fillStyle = "rgba(245,251,255,.10)";
      ctx.fillRect(x - 18, y - 22, 36, 10);
      ctx.fillRect(x - 18, y + 8, 36, 10);
      ctx.strokeStyle = "rgba(72,165,255,.28)";
      ctx.strokeRect(x - 30, y - 34, 60, 68);
    } else if (type === 2) {
      ctx.fillStyle = "rgba(255,207,92,.14)";
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,207,92,.32)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 31, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(255,143,212,.16)";
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 44, y - 26, 88, 52);
      ctx.fillStyle = "rgba(255,143,212,.08)";
      ctx.fillRect(x - 33, y - 15, 66, 30);
    }
    ctx.restore();
  }
}

function drawArenaSpeedLanes(lanes) {
  lanes.forEach((lane) => {
    const x = lane.x - camera.x;
    const y = lane.y - camera.y;
    if (
      x + lane.w < -90 ||
      y + lane.h < -90 ||
      x > window.innerWidth + 90 ||
      y > window.innerHeight + 90
    )
      return;
    const color = lane.color || "#42d7ff";
    const horizontal = lane.w >= lane.h;
    const pulse = 0.5 + Math.sin(performance.now() / 260) * 0.5;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = `${color}${lane.id === "center-cut" ? "22" : "1c"}`;
    ctx.strokeStyle = `${color}${Math.round(120 + pulse * 88)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect?.(x, y, lane.w, lane.h, 14);
    if (!ctx.roundRect) ctx.rect(x, y, lane.w, lane.h);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(245,251,255,.26)";
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(x + 24, y + lane.h / 2);
      ctx.lineTo(x + lane.w - 24, y + lane.h / 2);
    } else {
      ctx.moveTo(x + lane.w / 2, y + 24);
      ctx.lineTo(x + lane.w / 2, y + lane.h - 24);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    const arrowCount = Math.max(
      3,
      Math.floor((horizontal ? lane.w : lane.h) / 170),
    );
    for (let index = 0; index < arrowCount; index += 1) {
      const t = (index + 0.5) / arrowCount;
      const ax = horizontal ? x + lane.w * t : x + lane.w / 2;
      const ay = horizontal ? y + lane.h / 2 : y + lane.h * t;
      ctx.beginPath();
      if (horizontal) {
        ctx.moveTo(ax + 14, ay);
        ctx.lineTo(ax - 8, ay - 11);
        ctx.lineTo(ax - 8, ay + 11);
      } else {
        ctx.moveTo(ax, ay + 14);
        ctx.lineTo(ax - 11, ay - 8);
        ctx.lineTo(ax + 11, ay - 8);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawArenaLightPools(arena) {
  for (let index = 0; index < 12; index += 1) {
    const worldX = 260 + ((index * 547) % (arena.width - 520));
    const worldY = 220 + ((index * 431) % (arena.height - 440));
    const x = worldX - camera.x;
    const y = worldY - camera.y;
    if (
      x < -260 ||
      y < -260 ||
      x > window.innerWidth + 260 ||
      y > window.innerHeight + 260
    )
      continue;
    const gradient = ctx.createRadialGradient(x, y, 20, x, y, 190);
    gradient.addColorStop(0, "rgba(83,226,168,.10)");
    gradient.addColorStop(0.45, "rgba(72,165,255,.045)");
    gradient.addColorStop(1, "rgba(72,165,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 190, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawArenaControlPoints() {
  (latestState.controlPoints || []).forEach((point) => {
    const x = point.x - camera.x;
    const y = point.y - camera.y;
    if (
      x < -point.radius - 80 ||
      y < -point.radius - 80 ||
      x > window.innerWidth + point.radius + 80 ||
      y > window.innerHeight + point.radius + 80
    )
      return;
    const ownerColor = point.ownerColor || "rgba(245,251,255,.65)";
    const capture = clamp(Number(point.capture || 0), 0, 1);
    ctx.save();
    ctx.shadowColor = ownerColor;
    ctx.shadowBlur = point.ownerId ? 28 : 14;
    ctx.fillStyle = point.ownerId
      ? `${ownerColor}2e`
      : "rgba(245,251,255,.045)";
    ctx.strokeStyle = point.ownerId ? ownerColor : "rgba(245,251,255,.24)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, point.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = ownerColor;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      point.radius - 10,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * capture,
    );
    ctx.stroke();
    ctx.fillStyle = "rgba(7,17,31,.72)";
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ownerColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#f5fbff";
    ctx.font = "900 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(point.label || "?", x, y);
    if (point.ownerName) {
      ctx.font = "800 12px system-ui, sans-serif";
      ctx.fillText(point.ownerName, x, y + point.radius + 18);
    }
    ctx.restore();
  });
}

function drawArenaObstacles(obstacles) {
  obstacles.forEach((obstacle, index) => {
    const x = obstacle.x - camera.x;
    const y = obstacle.y - camera.y;
    if (
      x + obstacle.w < -80 ||
      y + obstacle.h < -80 ||
      x > window.innerWidth + 80 ||
      y > window.innerHeight + 80
    ) {
      return;
    }
    const gradient = ctx.createLinearGradient(x, y, x, y + obstacle.h);
    gradient.addColorStop(0, index % 2 ? "#304562" : "#344958");
    gradient.addColorStop(1, "#111827");
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.48)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, obstacle.w, obstacle.h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(245,251,255,.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, obstacle.w - 6, obstacle.h - 6);
    ctx.fillStyle = "rgba(83,226,168,.16)";
    ctx.fillRect(x + 12, y + 12, obstacle.w - 24, 7);
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.fillRect(x + 18, y + obstacle.h - 18, obstacle.w - 36, 8);
    ctx.restore();
  });
}

function pickupColor(kind) {
  return (
    {
      heal: "#53e2a8",
      shield: "#69dcff",
      haste: "#ffcf5c",
      rapid: "#ff8fd4",
      spread: arenaWeaponSpecs.spread.color,
      rail: arenaWeaponSpecs.rail.color,
      rocket: arenaWeaponSpecs.rocket.color,
    }[kind] || "#f8f871"
  );
}

function pickupLabel(kind) {
  return (
    {
      heal: "+",
      shield: "S",
      haste: ">",
      rapid: "R",
      spread: arenaWeaponSpecs.spread.icon,
      rail: arenaWeaponSpecs.rail.icon,
      rocket: arenaWeaponSpecs.rocket.icon,
    }[kind] || "?"
  );
}

function drawPickup(pickup) {
  const x = pickup.x - camera.x;
  const y = pickup.y - camera.y;
  const color = pickupColor(pickup.kind);
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#07111f";
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pickupLabel(pickup.kind), x, y);
  ctx.restore();
}

function drawBullet(bullet) {
  const x = bullet.x - camera.x;
  const y = bullet.y - camera.y;
  const kind = bullet.kind || "blaster";
  const spec = arenaWeaponSpecs[kind] || arenaWeaponSpecs.blaster;
  ctx.save();
  ctx.shadowColor = spec.color || bullet.color;
  ctx.shadowBlur = kind === "rocket" ? 22 : kind === "rail" ? 20 : 16;
  ctx.strokeStyle = spec.color || bullet.color;
  ctx.globalAlpha = 0.38;
  ctx.lineWidth = kind === "rail" ? 11 : 8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x -
      Math.cos(Math.atan2(bullet.vy || 0, bullet.vx || 1)) *
        (kind === "rail" ? 42 : 18),
    y -
      Math.sin(Math.atan2(bullet.vy || 0, bullet.vx || 1)) *
        (kind === "rail" ? 42 : 18),
  );
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = kind === "rocket" ? "#111827" : spec.color || bullet.color;
  ctx.beginPath();
  ctx.arc(x, y, bullet.radius || 5, 0, Math.PI * 2);
  ctx.fill();
  if (kind === "rocket") {
    ctx.strokeStyle = spec.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.arc(
      x - Math.cos(Math.atan2(bullet.vy || 0, bullet.vx || 1)) * 10,
      y - Math.sin(Math.atan2(bullet.vy || 0, bullet.vx || 1)) * 10,
      4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawArenaEffect(effect) {
  const x = effect.x - camera.x;
  const y = effect.y - camera.y;
  if (
    x < -80 ||
    y < -80 ||
    x > window.innerWidth + 80 ||
    y > window.innerHeight + 80
  ) {
    return;
  }
  const ttl = Number(effect.ttl || 0);
  const alpha = clamp(ttl / 0.75, 0.08, 1);
  const lift = (1 - alpha) * 28;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (effect.kind === "rocket") {
    const radius = 68 * (1.08 - alpha * 0.42);
    ctx.fillStyle = "rgba(255,95,109,.18)";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = effect.color || "#ff5f6d";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.72, 0, Math.PI * 2);
    ctx.stroke();
  } else if (effect.kind === "impact" || effect.kind === "muzzle") {
    const radius = effect.kind === "muzzle" ? 20 : 30;
    ctx.strokeStyle = effect.color || "#f8f871";
    ctx.lineWidth = effect.kind === "muzzle" ? 3 : 4;
    ctx.beginPath();
    ctx.arc(x, y, radius * (1.08 - alpha * 0.36), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = effect.color || "#f8f871";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, 8 * alpha), 0, Math.PI * 2);
    ctx.fill();
  } else if (effect.kind === "pickup" || effect.kind === "respawn") {
    ctx.shadowColor = effect.color || "#53e2a8";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = effect.color || "#53e2a8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 22 + (1 - alpha) * 18, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = effect.color || "#ff5f6d";
    ctx.lineWidth = effect.kind === "down" ? 6 : 4;
    ctx.beginPath();
    ctx.arc(x, y, 28 + (1 - alpha) * 16, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (effect.text) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f5fbff";
    ctx.font = `800 ${effect.kind === "down" ? 18 : 14}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(effect.text, x, y - 28 - lift);
  }
  ctx.restore();
}

function drawPlayer(player) {
  const x = player.x - camera.x;
  const y = player.y - camera.y;
  const radius = player.radius || 18;
  const weaponSpec =
    arenaWeaponSpecs[player.weapon || "blaster"] || arenaWeaponSpecs.blaster;

  if (!player.alive) {
    const respawnIn =
      Number(player.respawnIn) ||
      Math.max(0, (player.respawnAt || 0) - performance.now() / 1000);
    const progress = clamp(1 - respawnIn / localArenaConfig.respawnDelay, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = "#f5fbff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      radius + 14,
      -Math.PI / 2,
      -Math.PI / 2 + progress * Math.PI * 2,
    );
    ctx.stroke();
    ctx.fillStyle = "#f5fbff";
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RESPAWN", x, y - radius - 18);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.angle || 0);
  const pulse = 0.5 + Math.sin(performance.now() / 180) * 0.5;
  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.beginPath();
  ctx.ellipse(
    0,
    radius * 0.85,
    radius * 1.25,
    radius * 0.45,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.fillStyle = "rgba(7,17,31,.86)";
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.25, radius * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.color;
  ctx.shadowColor = player.color;
  ctx.shadowBlur = player.id === playerId ? 22 : 10;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,.24)";
  ctx.beginPath();
  ctx.ellipse(-5, -7, radius * 0.5, radius * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.5, radius * 0.58);
  ctx.lineTo(radius * 0.52, radius * 0.58);
  ctx.stroke();
  ctx.fillStyle = "rgba(5,12,22,.88)";
  ctx.fillRect(2, -5, radius + 18, 10);
  ctx.fillStyle = player.rapid ? "#ff8fd4" : weaponSpec.color || "#f5fbff";
  ctx.fillRect(radius + 11, -3, 11 + pulse * 4, 6);
  ctx.fillStyle = "rgba(5,12,22,.72)";
  ctx.beginPath();
  ctx.moveTo(-radius * 0.9, -radius * 0.24);
  ctx.lineTo(-radius * 1.55, -radius * 0.52);
  ctx.lineTo(-radius * 1.2, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-radius * 0.9, radius * 0.24);
  ctx.lineTo(-radius * 1.55, radius * 0.52);
  ctx.lineTo(-radius * 1.2, 0);
  ctx.fill();
  if (player.hasted || player.rapid) {
    ctx.strokeStyle = player.hasted ? "#ffcf5c" : "#ff8fd4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 5, -0.8, 0.8);
    ctx.stroke();
  }
  if (player.laneBoosted) {
    ctx.strokeStyle = "rgba(66,215,255,.78)";
    ctx.lineWidth = 4;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (player.dashing) {
    ctx.strokeStyle = "rgba(66,215,255,.88)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (let streak = 0; streak < 3; streak += 1) {
      ctx.beginPath();
      ctx.moveTo(-radius - 24 - streak * 8, -9 + streak * 9);
      ctx.lineTo(-radius - 7, -5 + streak * 5);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "rgba(255,255,255,.2)";
  ctx.beginPath();
  ctx.arc(-5, -6, radius * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  ctx.fillRect(5, -4, radius + 16, 8);
  if (player.shielded) {
    ctx.strokeStyle = "rgba(105,220,255,.86)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(0, 0, 0, 0.54)";
  ctx.fillRect(x - 28, y - radius - 19, 56, 6);
  ctx.fillStyle = player.health > 35 ? "#53e2a8" : "#ff5f6d";
  ctx.fillRect(x - 28, y - radius - 19, 56 * (player.health / 100), 6);
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.fillRect(x - 28, y - radius - 11, 56, 4);
  ctx.fillStyle = "#42d7ff";
  ctx.fillRect(
    x - 28,
    y - radius - 11,
    56 * clamp(Number(player.stamina ?? 100) / 100, 0, 1),
    4,
  );
  ctx.fillStyle = "#eef6ff";
  ctx.font = "700 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(player.name, x, y + radius + 19);
  if ((player.weapon || "blaster") !== "blaster") {
    ctx.fillStyle = weaponSpec.color || "#f5fbff";
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.fillText(
      `${weaponSpec.label} ${Number(player.weaponAmmo || 0)}`,
      x,
      y + radius + 34,
    );
  }
}

function drawMinimap() {
  const arena = latestState.arena || { width: 2600, height: 1600 };
  const mapScale = Math.min(210 / arena.width, 132 / arena.height);
  const width = arena.width * mapScale;
  const height = arena.height * mapScale;
  const x = 18;
  const y = Math.max(86, window.innerHeight - height - 18);
  ctx.save();
  ctx.fillStyle = "rgba(7,17,31,.82)";
  ctx.strokeStyle = "rgba(245,251,255,.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect?.(x, y, width, height, 8);
  if (!ctx.roundRect) ctx.rect(x, y, width, height);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(83,226,168,.08)";
  ctx.fillRect(x + 3, y + 3, width - 6, height - 6);
  (arena.obstacles || []).forEach((obstacle) => {
    ctx.fillStyle = "rgba(148,163,184,.58)";
    ctx.fillRect(
      x + obstacle.x * mapScale,
      y + obstacle.y * mapScale,
      Math.max(2, obstacle.w * mapScale),
      Math.max(2, obstacle.h * mapScale),
    );
  });
  (arena.speedLanes || arenaSpeedLaneSpecs).forEach((lane) => {
    ctx.fillStyle = `${lane.color || "#42d7ff"}88`;
    ctx.fillRect(
      x + lane.x * mapScale,
      y + lane.y * mapScale,
      Math.max(2, lane.w * mapScale),
      Math.max(2, lane.h * mapScale),
    );
  });
  (latestState.pickups || []).forEach((pickup) => {
    ctx.fillStyle = pickupColor(pickup.kind);
    ctx.beginPath();
    ctx.arc(
      x + pickup.x * mapScale,
      y + pickup.y * mapScale,
      2.8,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
  (latestState.controlPoints || []).forEach((point) => {
    ctx.strokeStyle = point.ownerColor || "rgba(245,251,255,.58)";
    ctx.fillStyle = point.ownerColor || "rgba(245,251,255,.24)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(
      x + point.x * mapScale,
      y + point.y * mapScale,
      Math.max(4, point.radius * mapScale),
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(
      x + point.x * mapScale,
      y + point.y * mapScale,
      2.6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
  latestState.players.forEach((player) => {
    ctx.fillStyle = player.alive ? player.color : "rgba(255,255,255,.32)";
    ctx.beginPath();
    ctx.arc(
      x + player.x * mapScale,
      y + player.y * mapScale,
      player.id === playerId ? 4 : 3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
  const viewX = x + Math.max(0, camera.x) * mapScale;
  const viewY = y + Math.max(0, camera.y) * mapScale;
  ctx.strokeStyle = "rgba(255,255,255,.82)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    viewX,
    viewY,
    Math.min(width, window.innerWidth * mapScale),
    Math.min(height, window.innerHeight * mapScale),
  );
  ctx.fillStyle = "#eef6ff";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("전황", x + 8, y + 15);
  ctx.restore();
}

function draw() {
  const frameNow = performance.now();
  const dt = Math.min(0.05, (frameNow - lastFrame) / 1000);
  lastFrame = frameNow;
  updateLocalArena(dt, frameNow / 1000);
  resizeCanvas();
  updateCamera();
  drawGrid();
  (latestState.pickups || []).forEach(drawPickup);
  latestState.bullets.forEach(drawBullet);
  latestState.players.forEach(drawPlayer);
  (latestState.effects || []).forEach(drawArenaEffect);
  drawMinimap();
  sendInput(performance.now());
  requestAnimationFrame(draw);
}

connectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  connect();
});

disconnectButton.addEventListener("click", disconnect);

hudToggle.addEventListener("click", () => {
  setConnectionPanelCollapsed(!connectionPanel.classList.contains("collapsed"));
});

netInfoToggle?.addEventListener("click", () => {
  setNetInfoCollapsed(!netInfoPanel.classList.contains("collapsed"));
});

netInfoCopy?.addEventListener("click", () => {
  if (!latestShareUrl) return;
  copyText(latestShareUrl)
    .then(() => flashNetInfoCopy("초대 링크가 복사되었습니다."))
    .catch((error) => flashNetInfoCopy("복사 실패: " + error.message, true));
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (
    [" ", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(
      key,
    )
  ) {
    event.preventDefault();
  }
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

canvas.addEventListener("pointerdown", (event) => {
  pointer.down = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

window.addEventListener("pointerup", () => {
  pointer.down = false;
});

playerNameInput.value = localStorage.getItem("lan_arena_name") || "Player";
if (isLocalArena) {
  serverUrlInput.value = "혼자하기: 서버 연결 없음";
  serverUrlInput.disabled = true;
  connectButton.textContent = "훈련 재시작";
  disconnectButton.style.display = "none";
} else {
  serverUrlInput.value = launchParams.has("host")
    ? getDefaultServerUrl()
    : localStorage.getItem("lan_arena_url") || getDefaultServerUrl();
}
serverUrlInput.addEventListener("input", () => updateNetInfo());
setStatus("연결 끊김");
updateNetInfo();
renderScoreboard();
if (isLocalArena) startLocalArena();
draw();

if (!isLocalArena && launchParams.get("auto") === "1") {
  startAutoConnect();
}

function startAutoConnect() {
  const maxAttempts = 4;
  let attempts = 0;
  let retryTimer = 0;

  function hasPendingConnection() {
    return (
      socket &&
      (socket.readyState === WebSocket.CONNECTING ||
        socket.readyState === WebSocket.OPEN)
    );
  }

  function schedule(delay) {
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(run, delay);
  }

  function run() {
    if (playerId || attempts >= maxAttempts) return;
    if (hasPendingConnection()) {
      schedule(400);
      return;
    }
    attempts += 1;
    connect();
    if (attempts < maxAttempts) schedule(900);
  }

  if (document.readyState === "complete") schedule(250);
  else window.addEventListener("load", () => schedule(250), { once: true });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedule(150);
  });
}
