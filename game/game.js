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

const keys = new Set();
const pointer = { x: 0, y: 0, down: false };
const camera = { x: 0, y: 0 };
let socket = null;
let playerId = "";
let latestState = {
  arena: { width: 1600, height: 1000 },
  players: [],
  bullets: [],
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
  return new URLSearchParams(window.location.search).get("v") || "20260530a";
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
    aimX: aim.x,
    aimY: aim.y,
  };
}

function sendInput(now) {
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
          )}</span><span class="score-value">${player.score}</span></li>`,
      )
      .join("") || "<li>No players</li>";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function drawGrid() {
  const arena = latestState.arena || { width: 1600, height: 1000 };
  ctx.fillStyle = "rgba(3, 8, 16, 0.72)";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  const grid = 80;
  const startX = -((camera.x % grid) + grid);
  const startY = -((camera.y % grid) + grid);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
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

  ctx.strokeStyle = "rgba(83, 226, 168, 0.48)";
  ctx.lineWidth = 4;
  ctx.strokeRect(-camera.x, -camera.y, arena.width, arena.height);
}

function drawBullet(bullet) {
  const x = bullet.x - camera.x;
  const y = bullet.y - camera.y;
  ctx.save();
  ctx.shadowColor = bullet.color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = bullet.color;
  ctx.beginPath();
  ctx.arc(x, y, bullet.radius || 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(player) {
  const x = player.x - camera.x;
  const y = player.y - camera.y;
  const radius = player.radius || 18;

  if (!player.alive) {
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.angle || 0);
  ctx.fillStyle = player.color;
  ctx.shadowColor = player.color;
  ctx.shadowBlur = player.id === playerId ? 22 : 10;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  ctx.fillRect(5, -4, radius + 16, 8);
  ctx.restore();

  ctx.fillStyle = "rgba(0, 0, 0, 0.54)";
  ctx.fillRect(x - 28, y - radius - 19, 56, 6);
  ctx.fillStyle = player.health > 35 ? "#53e2a8" : "#ff5f6d";
  ctx.fillRect(x - 28, y - radius - 19, 56 * (player.health / 100), 6);
  ctx.fillStyle = "#eef6ff";
  ctx.font = "700 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(player.name, x, y + radius + 19);
}

function draw() {
  resizeCanvas();
  updateCamera();
  drawGrid();
  latestState.bullets.forEach(drawBullet);
  latestState.players.forEach(drawPlayer);
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
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
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

const launchParams = new URLSearchParams(window.location.search);

playerNameInput.value = localStorage.getItem("lan_arena_name") || "Player";
serverUrlInput.value = launchParams.has("host")
  ? getDefaultServerUrl()
  : localStorage.getItem("lan_arena_url") || getDefaultServerUrl();
serverUrlInput.addEventListener("input", () => updateNetInfo());
setStatus("연결 끊김");
updateNetInfo();
renderScoreboard();
draw();

if (launchParams.get("auto") === "1") {
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
