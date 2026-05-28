(() => {
  const shell = document.querySelector(".arena-shell");
  if (!shell) return;

  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") === "multi" ? "multi" : "local";
  const role = params.get("role") === "host" ? "host" : "client";
  const world = { width: 1400, height: 760 };
  const gravity = 300;

  document.title = mode === "multi" ? "포트리스 멀티" : "포트리스 혼자하기";
  shell.className = "fortress-shell";
  shell.innerHTML = `
    <canvas id="fortressCanvas" class="fortress-canvas" aria-label="포트리스 전장"></canvas>
    <section class="hud fortress-panel" id="fortressPanel" aria-label="포트리스 조작">
      <div class="fortress-brand">
        <div>
          <h1>${mode === "multi" ? "포트리스 멀티" : "포트리스 혼자하기"}</h1>
          <p id="fortressStatus">준비 중</p>
        </div>
        <button
          id="fortressToggle"
          class="hud-toggle"
          type="button"
          aria-label="조작 패널 접기"
          aria-expanded="true"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      <div class="fortress-readout">
        <span>내 역할<strong id="fortressRole">-</strong></span>
        <span>턴<strong id="fortressTurn">P1</strong></span>
        <span>바람<strong id="fortressWind">0</strong></span>
        <span>포각<strong id="fortressAngle">45도</strong></span>
        <span>파워<strong id="fortressPower">60</strong></span>
      </div>
      <div class="fortress-buttons">
        <button type="button" id="moveLeftButton">이동(←)</button>
        <button type="button" id="angleUp">포각(↑)</button>
        <button type="button" id="moveRightButton">이동(→)</button>
        <button type="button" id="powerDown">파워-(A)</button>
        <button type="button" id="fireButton">발사(Space)</button>
        <button type="button" id="powerUp">파워+(D)</button>
        <button type="button" id="angleDown">포각(↓)</button>
        <button type="button" id="restartButton">재시작(R)</button>
      </div>
      <div class="fortress-items">
        <button type="button" id="repairButton">수리(1)</button>
        <button type="button" id="shieldButton">보호막(2)</button>
        <button type="button" id="powerShotButton">강화탄(3)</button>
      </div>
    </section>
    <section class="hud fortress-message" aria-label="플레이어 상태">
      <h2>플레이어</h2>
      <p id="playerOneStatus"></p>
      <p id="playerTwoStatus"></p>
    </section>
    <section class="hud fortress-help" aria-label="조작법">
      ←/→: 이동 · ↑/↓: 포각 · A/D: 파워 · Space: 발사 · 1/2/3: 아이템 · R: 재시작
    </section>
  `;

  const canvas = document.getElementById("fortressCanvas");
  const ctx = canvas.getContext("2d");
  const ui = {
    status: document.getElementById("fortressStatus"),
    role: document.getElementById("fortressRole"),
    turn: document.getElementById("fortressTurn"),
    wind: document.getElementById("fortressWind"),
    angle: document.getElementById("fortressAngle"),
    power: document.getElementById("fortressPower"),
    panel: document.getElementById("fortressPanel"),
    toggle: document.getElementById("fortressToggle"),
    p1: document.getElementById("playerOneStatus"),
    p2: document.getElementById("playerTwoStatus"),
    repair: document.getElementById("repairButton"),
    shield: document.getElementById("shieldButton"),
    powerShot: document.getElementById("powerShotButton"),
    controls: [
      "moveLeftButton",
      "moveRightButton",
      "angleDown",
      "angleUp",
      "powerDown",
      "powerUp",
      "fireButton",
      "repairButton",
      "shieldButton",
      "powerShotButton",
    ].map((id) => document.getElementById(id)),
  };

  let socket = null;
  let mySlot = mode === "multi" ? -1 : 0;
  let lastFrame = performance.now();
  let state = createInitialState();

  function createInitialState() {
    const players = [
      createPlayer("P1", "#53e2a8", 170, 45, 8, 82),
      createPlayer("P2", "#ffbc54", 1230, 135, 98, 172),
    ];
    const terrain = buildTerrain();
    placePlayers(players, terrain);
    return {
      world,
      terrain,
      players,
      turn: 0,
      wind: randomWind(),
      projectile: null,
      explosion: null,
      gameOver: false,
      ready: true,
      status: "P1 턴. 이동, 포각, 파워를 조절하세요.",
    };
  }

  function createPlayer(name, color, x, angle, minAngle, maxAngle) {
    return {
      name,
      color,
      x,
      y: 0,
      angle,
      minAngle,
      maxAngle,
      power: 60,
      health: 100,
      shield: false,
      activeItem: "",
      items: { repair: 1, shield: 1, power: 1 },
      connected: true,
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomWind() {
    return Math.round((Math.random() * 2 - 1) * 70);
  }

  function buildTerrain() {
    const terrain = [];
    for (let x = 0; x <= world.width; x += 1) {
      const y =
        535 +
        Math.sin(x / 105) * 48 +
        Math.sin(x / 47) * 21 +
        Math.sin(x / 230) * 34;
      terrain.push(clamp(Math.round(y), 390, 660));
    }
    for (let pass = 0; pass < 4; pass += 1) {
      for (let x = 1; x < terrain.length - 1; x += 1) {
        terrain[x] = Math.round(
          (terrain[x - 1] + terrain[x] * 2 + terrain[x + 1]) / 4,
        );
      }
    }
    return terrain;
  }

  function terrainAt(terrain, x) {
    return terrain[clamp(Math.round(x), 0, world.width)] || world.height;
  }

  function placePlayers(players, terrain) {
    players.forEach((player) => {
      player.y = terrainAt(terrain, player.x) - 18;
    });
  }

  function currentPlayer() {
    return state.players[state.turn];
  }

  function canControl() {
    return (
      state.ready &&
      !state.gameOver &&
      !state.projectile &&
      (mode === "local" || mySlot === state.turn)
    );
  }

  function resetLocalGame() {
    state = createInitialState();
  }

  function action(type, payload = {}) {
    if (type === "reset") {
      if (mode === "multi") sendAction({ action: "reset" });
      else resetLocalGame();
      syncUi();
      return;
    }
    if (!canControl()) return;
    if (mode === "multi") {
      sendAction({ action: type, ...payload });
      return;
    }
    runLocalAction(type, payload);
    syncUi();
  }

  function runLocalAction(type, payload) {
    if (type === "move") movePlayer(payload.delta);
    if (type === "angle") adjustAngle(payload.delta);
    if (type === "power") adjustPower(payload.delta);
    if (type === "fire") fire();
    if (type === "item") useItem(payload.item);
  }

  function movePlayer(delta) {
    const player = currentPlayer();
    const other = state.players[state.turn === 0 ? 1 : 0];
    const nextX = clamp(player.x + delta, 50, world.width - 50);
    if (Math.abs(nextX - other.x) < 72) return;
    player.x = nextX;
    player.y = terrainAt(state.terrain, player.x) - 18;
  }

  function adjustAngle(delta) {
    const player = currentPlayer();
    player.angle = clamp(
      player.angle + delta,
      player.minAngle,
      player.maxAngle,
    );
  }

  function adjustPower(delta) {
    const player = currentPlayer();
    player.power = clamp(player.power + delta, 20, 100);
  }

  function useItem(item) {
    const player = currentPlayer();
    if (!player.items[item]) return;

    if (item === "repair") {
      player.items.repair -= 1;
      player.health = Math.min(100, player.health + 25);
      state.status = `${player.name} 체력 25 회복.`;
      finishTurnSoon();
      return;
    }

    if (item === "shield") {
      player.items.shield -= 1;
      player.shield = true;
      state.status = `${player.name} 보호막 사용.`;
      finishTurnSoon();
      return;
    }

    player.activeItem = player.activeItem === "power" ? "" : "power";
    state.status = player.activeItem
      ? `${player.name} 강화탄 장전.`
      : `${player.name} 강화탄 취소.`;
  }

  function fire() {
    const player = currentPlayer();
    const radians = (player.angle * Math.PI) / 180;
    const speed = 145 + player.power * 5.1;
    const powerShot = player.activeItem === "power" && player.items.power > 0;
    if (powerShot) player.items.power -= 1;
    player.activeItem = "";
    state.projectile = {
      owner: state.turn,
      x: player.x + Math.cos(radians) * 31,
      y: player.y - 21 - Math.sin(radians) * 31,
      vx: Math.cos(radians) * speed,
      vy: -Math.sin(radians) * speed,
      radius: powerShot ? 72 : 52,
      damage: powerShot ? 48 : 34,
      age: 0,
    };
    state.status = `${player.name} 발사.`;
  }

  function finishTurnSoon() {
    state.turnDelayAt = performance.now() + 650;
  }

  function nextTurn() {
    currentPlayer().activeItem = "";
    state.turn = state.turn === 0 ? 1 : 0;
    state.wind = randomWind();
    state.turnDelayAt = 0;
    state.status = `${currentPlayer().name} 턴. 이동, 포각, 파워를 조절하세요.`;
  }

  function updateLocal(dt) {
    if (mode !== "local") return;
    if (state.turnDelayAt && performance.now() >= state.turnDelayAt) {
      nextTurn();
    }
    updateProjectile(dt);
    if (state.explosion) {
      state.explosion.age += dt;
      if (state.explosion.age > 0.55) state.explosion = null;
    }
  }

  function updateProjectile(dt) {
    const shot = state.projectile;
    if (!shot) return;
    shot.age += dt;
    shot.vx += state.wind * 0.22 * dt;
    shot.vy += gravity * dt;
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;

    for (let index = 0; index < state.players.length; index += 1) {
      const player = state.players[index];
      if (index === shot.owner && shot.age < 0.18) continue;
      if (Math.hypot(shot.x - player.x, shot.y - player.y) <= 24) {
        explode(shot.x, shot.y);
        return;
      }
    }

    if (shot.x < 0 || shot.x > world.width || shot.y > world.height) {
      explode(clamp(shot.x, 0, world.width), clamp(shot.y, 0, world.height));
      return;
    }

    if (shot.y >= terrainAt(state.terrain, shot.x)) explode(shot.x, shot.y);
  }

  function explode(x, y) {
    const shot = state.projectile;
    state.projectile = null;
    state.explosion = { x, y, radius: shot.radius, age: 0 };
    carveTerrain(x, y, shot.radius);
    applyExplosionDamage(x, y, shot.radius, shot.damage);
    placePlayers(state.players, state.terrain);
    if (!state.gameOver) finishTurnSoon();
  }

  function carveTerrain(cx, cy, radius) {
    const start = clamp(Math.floor(cx - radius), 0, world.width);
    const end = clamp(Math.ceil(cx + radius), 0, world.width);
    for (let x = start; x <= end; x += 1) {
      const dx = x - cx;
      const depth = Math.sqrt(Math.max(0, radius * radius - dx * dx)) * 0.72;
      state.terrain[x] = clamp(
        Math.max(state.terrain[x], Math.round(cy + depth)),
        0,
        world.height - 30,
      );
    }
  }

  function applyExplosionDamage(cx, cy, radius, maxDamage) {
    const hits = [];
    state.players.forEach((player) => {
      const distance = Math.hypot(player.x - cx, player.y - cy);
      if (distance > radius + 24) return;
      let damage = Math.round(
        maxDamage * (1 - Math.min(distance, radius) / radius),
      );
      damage = Math.max(8, damage);
      if (player.shield) {
        damage = Math.ceil(damage * 0.45);
        player.shield = false;
      }
      player.health = Math.max(0, player.health - damage);
      hits.push(`${player.name} -${damage}`);
    });
    state.status = hits.length ? hits.join(", ") : "빗나감.";

    const loser = state.players.find((player) => player.health <= 0);
    if (loser) {
      state.gameOver = true;
      const winner = state.players.find((player) => player !== loser);
      state.status = `${winner.name} 승리. R 키로 다시 시작.`;
    }
  }

  function getFortressSocketUrl() {
    const host = params.get("host");
    const port = params.get("port") || "7000";
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const base = host
      ? `${protocol}://${host}:${port}`
      : `${protocol}://${window.location.host || `localhost:${port}`}`;
    return `${base}/fortress?role=${encodeURIComponent(role)}`;
  }

  function connectMulti() {
    const url = getFortressSocketUrl();
    socket = new WebSocket(url);
    state.ready = false;
    state.status =
      role === "host"
        ? "포트리스 방을 여는 중입니다."
        : "포트리스 방에 입장 중입니다.";

    socket.addEventListener("open", () => {
      setPanelCollapsed(true);
      state.status =
        role === "host"
          ? "상대를 기다리는 중입니다."
          : "서버에 연결되었습니다.";
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "fortress_welcome") {
        mySlot = Number(message.slot);
        return;
      }
      if (message.type === "fortress_state") {
        state = message;
        if (Number.isInteger(message.slot)) mySlot = message.slot;
        syncUi();
      }
    });

    socket.addEventListener("close", () => {
      state.ready = false;
      state.status = "연결이 끊겼습니다. 서버 주소와 방화벽을 확인하세요.";
      setPanelCollapsed(false);
      syncUi();
    });

    socket.addEventListener("error", () => {
      state.ready = false;
      state.status = "연결 실패. 서버 주소와 방화벽을 확인하세요.";
      syncUi();
    });
  }

  function sendAction(payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "fortress_action", ...payload }));
  }

  function syncUi() {
    const player = currentPlayer();
    const turnName = player?.name || "-";
    ui.role.textContent =
      mode === "local"
        ? "로컬"
        : mySlot === 0
          ? "P1"
          : mySlot === 1
            ? "P2"
            : "관전";
    ui.status.textContent = state.status || "";
    ui.turn.textContent = turnName;
    ui.wind.textContent =
      state.wind > 0 ? `+${state.wind}` : String(state.wind);
    ui.angle.textContent = `${Math.round(player?.angle || 0)}도`;
    ui.power.textContent = Math.round(player?.power || 0);
    ui.p1.textContent = statusText(state.players[0]);
    ui.p2.textContent = statusText(state.players[1]);
    ui.repair.textContent = `수리(1) x${player?.items?.repair || 0}`;
    ui.shield.textContent = `보호막(2) x${player?.items?.shield || 0}`;
    ui.powerShot.textContent = `강화탄(3) x${player?.items?.power || 0}`;
    ui.powerShot.classList.toggle("active", player?.activeItem === "power");
    ui.controls.forEach((button) => {
      button.disabled = !canControl();
    });
    ui.repair.disabled = !canControl() || (player?.items?.repair || 0) <= 0;
    ui.shield.disabled = !canControl() || (player?.items?.shield || 0) <= 0;
    ui.powerShot.disabled = !canControl() || (player?.items?.power || 0) <= 0;
    document.getElementById("restartButton").disabled =
      mode === "multi" && mySlot < 0;
  }

  function statusText(player) {
    if (!player) return "-";
    const connected = mode === "multi" && !player.connected ? " 대기" : "";
    const shield = player.shield ? " 보호막" : "";
    return `${player.name}: ${Math.max(0, player.health)} HP${shield}${connected}`;
  }

  function setPanelCollapsed(isCollapsed) {
    ui.panel.classList.toggle("collapsed", isCollapsed);
    ui.toggle.setAttribute("aria-expanded", String(!isCollapsed));
    ui.toggle.setAttribute(
      "aria-label",
      isCollapsed ? "조작 패널 펼치기" : "조작 패널 접기",
    );
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

  function getView() {
    const scale = Math.min(
      window.innerWidth / world.width,
      window.innerHeight / world.height,
    );
    return {
      scale,
      x: (window.innerWidth - world.width * scale) / 2,
      y: (window.innerHeight - world.height * scale) / 2,
    };
  }

  function toScreen(x, y) {
    const view = getView();
    return { x: view.x + x * view.scale, y: view.y + y * view.scale };
  }

  function drawSky() {
    const view = getView();
    ctx.fillStyle = "#72c9ff";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    const sun = toScreen(1160, 120);
    ctx.fillStyle = "rgba(255, 236, 146, 0.9)";
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 38 * view.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    drawCloud(230, 150, 1.2);
    drawCloud(870, 95, 1);
  }

  function drawCloud(x, y, size) {
    const view = getView();
    const base = toScreen(x, y);
    ctx.beginPath();
    ctx.arc(base.x, base.y, 24 * size * view.scale, 0, Math.PI * 2);
    ctx.arc(
      base.x + 32 * size * view.scale,
      base.y - 8 * size * view.scale,
      30 * size * view.scale,
      0,
      Math.PI * 2,
    );
    ctx.arc(
      base.x + 67 * size * view.scale,
      base.y,
      22 * size * view.scale,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  function drawTerrain() {
    const view = getView();
    ctx.beginPath();
    const first = toScreen(0, state.terrain[0]);
    ctx.moveTo(first.x, first.y);
    for (let x = 0; x <= world.width; x += 3) {
      const point = toScreen(x, state.terrain[x]);
      ctx.lineTo(point.x, point.y);
    }
    const bottomRight = toScreen(world.width, world.height);
    const bottomLeft = toScreen(0, world.height);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(
      0,
      view.y + 360 * view.scale,
      0,
      view.y + world.height * view.scale,
    );
    gradient.addColorStop(0, "#4f8f3a");
    gradient.addColorStop(0.45, "#315f2b");
    gradient.addColorStop(1, "#18341d");
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function drawPlayer(player, index) {
    const view = getView();
    const point = toScreen(player.x, player.y);
    const scale = view.scale;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.globalAlpha = player.connected === false ? 0.45 : 1;
    ctx.fillStyle = player.color;
    ctx.strokeStyle = index === mySlot ? "#ffffff" : "rgba(0,0,0,0.45)";
    ctx.lineWidth = (index === mySlot ? 4 : 2) * scale;
    ctx.beginPath();
    drawRoundRect(-24 * scale, -17 * scale, 48 * scale, 22 * scale, 6 * scale);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(14, 22, 28, 0.9)";
    ctx.beginPath();
    ctx.arc(0, -17 * scale, 13 * scale, 0, Math.PI * 2);
    ctx.fill();
    const radians = (player.angle * Math.PI) / 180;
    ctx.strokeStyle = "#1d2630";
    ctx.lineWidth = 6 * scale;
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(radians) * 5 * scale,
      -17 * scale - Math.sin(radians) * 5 * scale,
    );
    ctx.lineTo(
      Math.cos(radians) * 42 * scale,
      -17 * scale - Math.sin(radians) * 42 * scale,
    );
    ctx.stroke();
    if (player.shield) {
      ctx.strokeStyle = "rgba(83, 226, 168, 0.85)";
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.arc(0, -10 * scale, 34 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#eef6ff";
    ctx.font = `${Math.max(11, 14 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(player.name, 0, -42 * scale);
    ctx.restore();
  }

  function drawRoundRect(x, y, width, height, radius) {
    if (ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
      return;
    }
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  function drawProjectile() {
    if (!state.projectile) return;
    const point = toScreen(state.projectile.x, state.projectile.y);
    const scale = getView().scale;
    ctx.fillStyle = state.projectile.radius > 52 ? "#ff5f6d" : "#111827";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawExplosion() {
    if (!state.explosion) return;
    const point = toScreen(state.explosion.x, state.explosion.y);
    const scale = getView().scale;
    const alpha = Math.max(0, 1 - state.explosion.age / 0.55);
    ctx.fillStyle = `rgba(255, 95, 109, ${0.28 * alpha})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, state.explosion.radius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 188, 84, ${alpha})`;
    ctx.lineWidth = 3 * scale;
    ctx.stroke();
  }

  function draw() {
    resizeCanvas();
    drawSky();
    drawTerrain();
    state.players.forEach(drawPlayer);
    drawProjectile();
    drawExplosion();
  }

  function frame(now) {
    const dt = Math.min(0.04, (now - lastFrame) / 1000);
    lastFrame = now;
    updateLocal(dt);
    if (mode === "local") syncUi();
    draw();
    requestAnimationFrame(frame);
  }

  document.getElementById("moveLeftButton").onclick = () =>
    action("move", { delta: -14 });
  document.getElementById("moveRightButton").onclick = () =>
    action("move", { delta: 14 });
  document.getElementById("angleDown").onclick = () =>
    action("angle", { delta: -2 });
  document.getElementById("angleUp").onclick = () =>
    action("angle", { delta: 2 });
  document.getElementById("powerDown").onclick = () =>
    action("power", { delta: -4 });
  document.getElementById("powerUp").onclick = () =>
    action("power", { delta: 4 });
  document.getElementById("fireButton").onclick = () => action("fire");
  document.getElementById("restartButton").onclick = () => action("reset");
  ui.toggle.onclick = () =>
    setPanelCollapsed(!ui.panel.classList.contains("collapsed"));
  ui.repair.onclick = () => action("item", { item: "repair" });
  ui.shield.onclick = () => action("item", { item: "shield" });
  ui.powerShot.onclick = () => action("item", { item: "power" });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (
      ["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(key)
    ) {
      event.preventDefault();
    }
    if (key === "arrowleft") action("move", { delta: -14 });
    if (key === "arrowright") action("move", { delta: 14 });
    if (key === "arrowup") action("angle", { delta: 2 });
    if (key === "arrowdown") action("angle", { delta: -2 });
    if (key === "a") action("power", { delta: -4 });
    if (key === "d") action("power", { delta: 4 });
    if (key === " ") action("fire");
    if (key === "1") action("item", { item: "repair" });
    if (key === "2") action("item", { item: "shield" });
    if (key === "3") action("item", { item: "power" });
    if (key === "r") action("reset");
  });

  if (mode === "multi") connectMulti();
  syncUi();
  requestAnimationFrame(frame);
})();
