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

function getDefaultServerUrl() {
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get("ws");
  if (explicit) return explicit;

  const host = params.get("host");
  const port = params.get("port") || "7000";
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  if (host) return `${protocol}://${host}:${port}/ws`;
  if (
    window.location.protocol === "http:" ||
    window.location.protocol === "https:"
  )
    return `${protocol}://${window.location.host}/ws`;
  return "ws://localhost:7000/ws";
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

  if (socket) socket.close();
  const activeSocket = new WebSocket(url);
  socket = activeSocket;
  setStatus("Connecting...", true);
  setCenterMessage("Connecting to LAN arena...");

  activeSocket.addEventListener("open", () => {
    if (socket !== activeSocket) return;
    setStatus("Connected", true);
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
    setStatus("Disconnected", false);
    setConnectionPanelCollapsed(false);
    playerId = "";
    setCenterMessage("Disconnected. Check server address and firewall.");
  });

  activeSocket.addEventListener("error", () => {
    if (socket !== activeSocket) return;
    setStatus("Connection error", false);
    setConnectionPanelCollapsed(false);
    setCenterMessage("Connection failed. Check server address and firewall.");
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
setStatus("Disconnected");
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
