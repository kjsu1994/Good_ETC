(() => {
  const shell = document.querySelector(".arena-shell");
  if (!shell) return;

  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") === "multi" ? "multi" : "local";
  const role = params.get("role") === "host" ? "host" : "client";
  const assetVersion = params.get("v") || "20260529c";
  const world = { width: 1400, height: 760 };
  const gravity = 300;
  const moveBudgetMax = 100;
  const moveCost = 10;
  const defaultWeapon = "standard";
  const weaponOrder = ["standard", "impact", "burst", "split", "drill"];
  const weapons = {
    standard: {
      key: "Z",
      name: "표준탄",
      desc: "균형",
      speed: 1,
      radius: 52,
      damage: 34,
      carve: 1,
      color: "#111827",
    },
    impact: {
      key: "X",
      name: "강타탄",
      desc: "직격",
      speed: 0.95,
      radius: 42,
      damage: 50,
      carve: 0.82,
      color: "#ff5f6d",
    },
    burst: {
      key: "C",
      name: "광역탄",
      desc: "범위",
      speed: 0.92,
      radius: 78,
      damage: 26,
      carve: 1.05,
      color: "#69dcff",
    },
    split: {
      key: "V",
      name: "분열탄",
      desc: "3분열",
      speed: 1.02,
      radius: 36,
      damage: 22,
      carve: 0.68,
      color: "#b987ff",
      splitAt: 0.72,
      childRadius: 30,
      childDamage: 17,
      childCarve: 0.56,
    },
    drill: {
      key: "B",
      name: "굴착탄",
      desc: "지형",
      speed: 1.05,
      radius: 48,
      damage: 30,
      carve: 1.55,
      color: "#8b5a2b",
    },
  };
  const vehiclePalettes = [
    {
      body: "#38d6b0",
      bodyDark: "#18866f",
      trim: "#d9fff5",
      tread: "#182a32",
      accent: "#ffe066",
      glow: "rgba(56, 214, 176, 0.36)",
    },
    {
      body: "#ffb84a",
      bodyDark: "#b96a24",
      trim: "#fff1c2",
      tread: "#32242a",
      accent: "#ff6b6b",
      glow: "rgba(255, 184, 74, 0.36)",
    },
  ];

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
        <span>이동<strong id="fortressMove">100</strong></span>
        <span>탄종<strong id="fortressWeapon">표준탄</strong></span>
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
      <div class="fortress-weapons" aria-label="탄종 선택">
        <button type="button" id="weaponStandard" data-weapon="standard">Z 표준탄</button>
        <button type="button" id="weaponImpact" data-weapon="impact">X 강타탄</button>
        <button type="button" id="weaponBurst" data-weapon="burst">C 광역탄</button>
        <button type="button" id="weaponSplit" data-weapon="split">V 분열탄</button>
        <button type="button" id="weaponDrill" data-weapon="drill">B 굴착탄</button>
      </div>
    </section>
    <section class="hud fortress-message" aria-label="플레이어 상태">
      <h2>플레이어</h2>
      <p id="playerOneStatus"></p>
      <p id="playerTwoStatus"></p>
    </section>
    <section class="hud fortress-help" aria-label="조작법">
      ←/→: 이동 · ↑/↓: 포각 · A/D: 파워 · Space: 발사 · Z/X/C/V/B: 탄종 · 1/2/3: 아이템
    </section>
    <section
      class="hud net-info collapsed"
      id="netInfoPanel"
      aria-label="network connection info"
    >
      <button
        id="netInfoToggle"
        class="net-info-toggle"
        type="button"
        aria-label="Toggle network info"
        aria-expanded="false"
        title="Connection info"
      >
        i
      </button>
      <div class="net-info-body">
        <h2>Connection</h2>
        <dl>
          <dt>Game</dt>
          <dd id="netInfoGame">-</dd>
          <dt>Page</dt>
          <dd id="netInfoPage">-</dd>
          <dt>Server</dt>
          <dd id="netInfoServer">-</dd>
          <dt>Share</dt>
          <dd id="netInfoShare">-</dd>
        </dl>
        <p id="netInfoWarning"></p>
        <button id="netInfoCopy" type="button">Copy share URL</button>
      </div>
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
    move: document.getElementById("fortressMove"),
    weapon: document.getElementById("fortressWeapon"),
    panel: document.getElementById("fortressPanel"),
    toggle: document.getElementById("fortressToggle"),
    p1: document.getElementById("playerOneStatus"),
    p2: document.getElementById("playerTwoStatus"),
    moveLeft: document.getElementById("moveLeftButton"),
    moveRight: document.getElementById("moveRightButton"),
    repair: document.getElementById("repairButton"),
    shield: document.getElementById("shieldButton"),
    powerShot: document.getElementById("powerShotButton"),
    weaponButtons: Array.from(document.querySelectorAll("[data-weapon]")),
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
      "weaponStandard",
      "weaponImpact",
      "weaponBurst",
      "weaponSplit",
      "weaponDrill",
    ].map((id) => document.getElementById(id)),
  };
  const netInfo = {
    panel: document.getElementById("netInfoPanel"),
    toggle: document.getElementById("netInfoToggle"),
    copy: document.getElementById("netInfoCopy"),
    game: document.getElementById("netInfoGame"),
    page: document.getElementById("netInfoPage"),
    server: document.getElementById("netInfoServer"),
    share: document.getElementById("netInfoShare"),
    warning: document.getElementById("netInfoWarning"),
  };

  let socket = null;
  let mySlot = mode === "multi" ? -1 : 0;
  let lastFrame = performance.now();
  let state = createInitialState();
  let latestShareUrl = "";

  function weaponConfig(key) {
    return weapons[key] || weapons[defaultWeapon];
  }

  function normalizePlayer(player) {
    player.moveLeft = Number.isFinite(Number(player.moveLeft))
      ? Number(player.moveLeft)
      : moveBudgetMax;
    player.weapon = weapons[player.weapon] ? player.weapon : defaultWeapon;
    player.items = player.items || { repair: 1, shield: 1, power: 1 };
    return player;
  }

  function normalizeState(nextState) {
    nextState.players.forEach(normalizePlayer);
    if (!Array.isArray(nextState.projectiles)) {
      nextState.projectiles = nextState.projectile
        ? [nextState.projectile]
        : [];
    }
    nextState.projectile = nextState.projectiles[0] || null;
    nextState.turnLocked = Boolean(nextState.turnLocked);
    return nextState;
  }

  function hasProjectiles() {
    return (state.projectiles || []).length > 0 || !!state.projectile;
  }

  function createInitialState() {
    const players = [
      createPlayer("P1", "#53e2a8", 170, 45, 8, 82),
      createPlayer("P2", "#ffbc54", 1230, 135, 98, 172),
    ];
    const terrain = buildTerrain();
    placePlayers(players, terrain);
    return normalizeState({
      world,
      terrain,
      players,
      turn: 0,
      wind: randomWind(),
      projectile: null,
      projectiles: [],
      explosion: null,
      gameOver: false,
      ready: true,
      status: "P1 턴. 이동, 포각, 파워를 조절하세요.",
    });
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
      moveLeft: moveBudgetMax,
      weapon: defaultWeapon,
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
      !hasProjectiles() &&
      !state.turnDelayAt &&
      !state.turnLocked &&
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
    if (type === "weapon") selectWeapon(payload.weapon);
    if (type === "fire") fire();
    if (type === "item") useItem(payload.item);
  }

  function movePlayer(delta) {
    const player = currentPlayer();
    const other = state.players[state.turn === 0 ? 1 : 0];
    if ((player.moveLeft || 0) < moveCost) {
      state.status = `${player.name} 이동 게이지가 부족합니다.`;
      return;
    }
    const nextX = clamp(player.x + delta, 50, world.width - 50);
    if (Math.abs(nextX - other.x) < 72) return;
    player.x = nextX;
    player.y = terrainAt(state.terrain, player.x) - 18;
    player.moveLeft = Math.max(0, (player.moveLeft || 0) - moveCost);
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

  function selectWeapon(weapon) {
    if (!weapons[weapon]) return;
    const player = currentPlayer();
    player.weapon = weapon;
    state.status = `${player.name} ${weaponConfig(weapon).name} 선택.`;
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
    const weaponKey = weapons[player.weapon] ? player.weapon : defaultWeapon;
    const weapon = weaponConfig(weaponKey);
    const radians = (player.angle * Math.PI) / 180;
    const speed = (145 + player.power * 5.1) * weapon.speed;
    const powerShot = player.activeItem === "power" && player.items.power > 0;
    if (powerShot) player.items.power -= 1;
    player.activeItem = "";
    state.projectiles = [
      createProjectile({
        owner: state.turn,
        x: player.x + Math.cos(radians) * 31,
        y: player.y - 21 - Math.sin(radians) * 31,
        vx: Math.cos(radians) * speed,
        vy: -Math.sin(radians) * speed,
        weapon: weaponKey,
        powered: powerShot,
      }),
    ];
    state.projectile = state.projectiles[0];
    state.status = `${player.name} ${weapon.name} 발사.`;
  }

  function createProjectile({
    owner,
    x,
    y,
    vx,
    vy,
    weapon,
    powered = false,
    splitDone = false,
    radius,
    damage,
    carve,
    age = 0,
  }) {
    const config = weaponConfig(weapon);
    const boost = powered ? 1.22 : 1;
    return {
      owner,
      x,
      y,
      vx,
      vy,
      weapon,
      color: config.color,
      radius: radius || Math.round(config.radius * boost),
      damage: damage || Math.round(config.damage * boost),
      carve: carve || config.carve * (powered ? 1.14 : 1),
      splitAt: config.splitAt || 0,
      splitDone,
      age,
    };
  }

  function finishTurnSoon() {
    state.turnDelayAt = performance.now() + 650;
  }

  function nextTurn() {
    currentPlayer().activeItem = "";
    state.turn = state.turn === 0 ? 1 : 0;
    currentPlayer().moveLeft = moveBudgetMax;
    state.wind = randomWind();
    state.turnDelayAt = 0;
    state.status = `${currentPlayer().name} 턴. 이동, 포각, 파워를 조절하세요.`;
  }

  function updateLocal(dt) {
    if (mode !== "local") return;
    if (state.turnDelayAt && performance.now() >= state.turnDelayAt) {
      nextTurn();
    }
    updateProjectiles(dt);
    if (state.explosion) {
      state.explosion.age += dt;
      if (state.explosion.age > 0.55) state.explosion = null;
    }
  }

  function updateProjectiles(dt) {
    const active = [];
    let exploded = false;
    for (const shot of state.projectiles || []) {
      shot.age += dt;
      shot.vx += state.wind * 0.22 * dt;
      shot.vy += gravity * dt;
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;

      if (shouldSplitProjectile(shot)) {
        active.push(...splitProjectile(shot));
        continue;
      }

      if (projectileHitPlayer(shot)) {
        exploded = true;
        continue;
      }

      if (shot.x < 0 || shot.x > world.width || shot.y > world.height) {
        explodeProjectile(
          shot,
          clamp(shot.x, 0, world.width),
          clamp(shot.y, 0, world.height),
        );
        exploded = true;
        continue;
      }

      if (shot.y >= terrainAt(state.terrain, shot.x)) {
        explodeProjectile(shot, shot.x, shot.y);
        exploded = true;
        continue;
      }

      active.push(shot);
    }
    state.projectiles = state.gameOver ? [] : active;
    state.projectile = state.projectiles[0] || null;
    if (exploded && !state.gameOver && state.projectiles.length === 0) {
      finishTurnSoon();
    }
  }

  function shouldSplitProjectile(shot) {
    return shot.splitAt && !shot.splitDone && shot.age >= shot.splitAt;
  }

  function splitProjectile(shot) {
    const speed = Math.hypot(shot.vx, shot.vy) * 0.92;
    const angle = Math.atan2(shot.vy, shot.vx);
    const config = weaponConfig("split");
    state.status = "분열탄이 갈라졌습니다.";
    return [-0.18, 0, 0.18].map((offset) =>
      createProjectile({
        owner: shot.owner,
        x: shot.x,
        y: shot.y,
        vx: Math.cos(angle + offset) * speed,
        vy: Math.sin(angle + offset) * speed,
        weapon: "split",
        splitDone: true,
        radius: config.childRadius,
        damage: config.childDamage,
        carve: config.childCarve,
        age: shot.age,
      }),
    );
  }

  function projectileHitPlayer(shot) {
    for (let index = 0; index < state.players.length; index += 1) {
      const player = state.players[index];
      if (index === shot.owner && shot.age < 0.18) continue;
      if (Math.hypot(shot.x - player.x, shot.y - player.y) <= 24) {
        explodeProjectile(shot, shot.x, shot.y);
        return true;
      }
    }
    return false;
  }

  function explodeProjectile(shot, x, y) {
    state.explosion = { x, y, radius: shot.radius, age: 0 };
    carveTerrain(x, y, shot.radius, shot.carve || 1);
    applyExplosionDamage(x, y, shot.radius, shot.damage);
    placePlayers(state.players, state.terrain);
  }

  function carveTerrain(cx, cy, radius, carve = 1) {
    const start = clamp(Math.floor(cx - radius), 0, world.width);
    const end = clamp(Math.ceil(cx + radius), 0, world.width);
    for (let x = start; x <= end; x += 1) {
      const dx = x - cx;
      const depth =
        Math.sqrt(Math.max(0, radius * radius - dx * dx)) * 0.72 * carve;
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

  function buildFortressShareUrl(socketUrl) {
    const target = safeUrl(socketUrl);
    if (!target) return "";
    const protocol = target.protocol === "wss:" ? "https:" : "http:";
    const port = target.port || (target.protocol === "wss:" ? "443" : "80");
    const room =
      target.searchParams.get("room") ||
      new URLSearchParams(window.location.search).get("room");
    const share = new URL(`${protocol}//${target.host}/game/index.html`);
    share.searchParams.set("game", "fortress");
    share.searchParams.set("mode", "multi");
    share.searchParams.set("role", "client");
    share.searchParams.set("host", target.hostname);
    share.searchParams.set("port", port);
    if (room) share.searchParams.set("room", room);
    share.searchParams.set("v", assetVersion);
    return share.toString();
  }

  function connectionWarnings(socketUrl) {
    const warnings = [];
    const pageHost = window.location.hostname;
    const target = safeUrl(socketUrl);
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
    if (!netInfo.panel || !netInfo.toggle) return;
    netInfo.panel.classList.toggle("collapsed", isCollapsed);
    netInfo.toggle.setAttribute("aria-expanded", String(!isCollapsed));
  }

  function updateNetInfo(socketUrl = "") {
    if (!netInfo.panel) return;
    const targetUrl =
      mode === "multi" ? socketUrl || getFortressSocketUrl() : "";
    latestShareUrl = targetUrl ? buildFortressShareUrl(targetUrl) : "";
    netInfo.game.textContent =
      mode === "multi"
        ? `포트리스 멀티 / ${role === "host" ? "호스트" : "입장"}`
        : "포트리스 혼자하기";
    netInfo.page.textContent = window.location.href;
    netInfo.server.textContent = targetUrl || "-";
    netInfo.share.textContent = latestShareUrl || "-";
    netInfo.share.title = latestShareUrl;
    netInfo.warning.textContent = targetUrl
      ? connectionWarnings(targetUrl)
      : "";
  }

  function getFortressSocketUrl() {
    const host = params.get("host");
    const port = params.get("port") || "7000";
    const room = params.get("room");
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const base = host
      ? `${protocol}://${host}:${port}`
      : `${protocol}://${window.location.host || `localhost:${port}`}`;
    const url = new URL(`${base}/fortress`);
    url.searchParams.set("role", role);
    if (room) url.searchParams.set("room", room);
    return url.toString();
  }

  function connectMulti() {
    const url = getFortressSocketUrl();
    updateNetInfo(url);
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
        state = normalizeState(message);
        if (Number.isInteger(message.slot)) mySlot = message.slot;
        syncUi();
      }
    });

    socket.addEventListener("close", () => {
      state.ready = false;
      state.status = "연결이 끊겼습니다. 서버 주소와 방화벽을 확인하세요.";
      setPanelCollapsed(false);
      state.status = isLoopbackHost(safeUrl(url)?.hostname)
        ? "연결이 끊겼습니다. localhost/127.x는 이 PC에서만 유효하므로 호스트 LAN IP와 활성 포트를 사용하세요."
        : "연결이 끊겼습니다. 서버 주소, 활성 포트, 방화벽을 확인하세요.";
      syncUi();
    });

    socket.addEventListener("error", () => {
      state.ready = false;
      state.status = "연결 실패. 서버 주소와 방화벽을 확인하세요.";
      syncUi();
    });
    socket.addEventListener("error", () => {
      state.status = isLoopbackHost(safeUrl(url)?.hostname)
        ? "연결 실패. localhost/127.x는 이 PC에서만 유효하므로 호스트 LAN IP와 활성 포트를 사용하세요."
        : "연결 실패. 서버 주소, 활성 포트, 방화벽을 확인하세요.";
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
    ui.status.textContent =
      mode === "multi" && mySlot < 0
        ? "관전 중입니다. 빈 자리가 생기면 오래된 관전자부터 자동 참여합니다. " +
          (state.status || "")
        : state.status || "";
    ui.turn.textContent = turnName;
    ui.wind.textContent =
      state.wind > 0 ? `+${state.wind}` : String(state.wind);
    ui.angle.textContent = `${Math.round(player?.angle || 0)}도`;
    ui.power.textContent = Math.round(player?.power || 0);
    ui.move.textContent = Math.round(player?.moveLeft || 0);
    ui.weapon.textContent = weaponConfig(player?.weapon).name;
    ui.p1.textContent = statusText(state.players[0]);
    ui.p2.textContent = statusText(state.players[1]);
    ui.repair.textContent = `수리(1) x${player?.items?.repair || 0}`;
    ui.shield.textContent = `보호막(2) x${player?.items?.shield || 0}`;
    ui.powerShot.textContent = `강화탄(3) x${player?.items?.power || 0}`;
    ui.powerShot.classList.toggle("active", player?.activeItem === "power");
    ui.controls.forEach((button) => {
      button.disabled = !canControl();
    });
    ui.moveLeft.disabled = !canControl() || (player?.moveLeft || 0) < moveCost;
    ui.moveRight.disabled = !canControl() || (player?.moveLeft || 0) < moveCost;
    ui.repair.disabled = !canControl() || (player?.items?.repair || 0) <= 0;
    ui.shield.disabled = !canControl() || (player?.items?.shield || 0) <= 0;
    ui.powerShot.disabled = !canControl() || (player?.items?.power || 0) <= 0;
    ui.weaponButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.weapon === player?.weapon,
      );
      button.disabled = !canControl();
    });
    document.getElementById("restartButton").disabled =
      mode === "multi" && mySlot < 0;
  }

  function statusText(player) {
    if (!player) return "-";
    const connected = mode === "multi" && !player.connected ? " 대기" : "";
    const shield = player.shield ? " 보호막" : "";
    return `${player.name}: ${Math.max(0, player.health)} HP · 이동 ${Math.round(player.moveLeft || 0)} · ${weaponConfig(player.weapon).name}${shield}${connected}`;
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
    const sky = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    sky.addColorStop(0, "#5cb8ff");
    sky.addColorStop(0.52, "#bfeeff");
    sky.addColorStop(1, "#eaf8ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    drawMountainLayer(455, "#7aa9a1", [
      [0, 0],
      [120, -58],
      [260, -18],
      [420, -86],
      [600, -28],
      [800, -94],
      [1030, -24],
      [1220, -72],
      [1400, -16],
    ]);
    drawMountainLayer(500, "#4e8376", [
      [0, -18],
      [170, -74],
      [360, -28],
      [540, -98],
      [760, -36],
      [930, -82],
      [1130, -26],
      [1320, -72],
      [1400, -38],
    ]);

    const view = getView();
    const sun = toScreen(1160, 120);
    ctx.fillStyle = "rgba(255, 235, 137, 0.26)";
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 72 * view.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 238, 148, 0.95)";
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 38 * view.scale, 0, Math.PI * 2);
    ctx.fill();
    drawCloud(230, 150, 1.2);
    drawCloud(520, 92, 0.72);
    drawCloud(870, 95, 1);
    drawCloud(1090, 205, 0.86);
    drawWindIndicator();
  }

  function drawMountainLayer(baseY, color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, offset], index) => {
      const point = toScreen(x, baseY + offset);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    const right = toScreen(world.width, world.height);
    const left = toScreen(0, world.height);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(left.x, left.y);
    ctx.closePath();
    ctx.fill();
  }

  function drawCloud(x, y, size) {
    const view = getView();
    const base = toScreen(x, y);
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
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
    ctx.fillStyle = "rgba(129, 181, 204, 0.16)";
    ctx.fillRect(
      base.x - 34 * size * view.scale,
      base.y + 20 * size * view.scale,
      132 * size * view.scale,
      Math.max(1, 3 * view.scale),
    );
  }

  function drawWindIndicator() {
    const view = getView();
    const wind = Number(state.wind || 0);
    const center = toScreen(world.width / 2, 54);
    const width = 146 * view.scale;
    const height = 34 * view.scale;
    const x = center.x - width / 2;
    const y = center.y - height / 2;
    ctx.save();
    ctx.fillStyle = "rgba(12, 37, 54, 0.58)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
    ctx.lineWidth = Math.max(1, 2 * view.scale);
    ctx.beginPath();
    drawRoundRect(x, y, width, height, 8 * view.scale);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f4fbff";
    ctx.font = `${Math.max(11, 13 * view.scale)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`WIND ${wind > 0 ? "+" : ""}${wind}`, center.x, center.y);
    if (wind) {
      const direction = wind > 0 ? 1 : -1;
      const arrowX = center.x + direction * 58 * view.scale;
      ctx.fillStyle = wind > 0 ? "#ffcf5c" : "#69dcff";
      ctx.beginPath();
      ctx.moveTo(arrowX + direction * 9 * view.scale, center.y);
      ctx.lineTo(
        arrowX - direction * 4 * view.scale,
        center.y - 7 * view.scale,
      );
      ctx.lineTo(
        arrowX - direction * 4 * view.scale,
        center.y + 7 * view.scale,
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
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

    ctx.strokeStyle = "#72c84f";
    ctx.lineWidth = Math.max(2, 5 * view.scale);
    ctx.beginPath();
    for (let x = 0; x <= world.width; x += 4) {
      const point = toScreen(x, state.terrain[x]);
      if (x === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();

    [26, 58, 96].forEach((offset, index) => {
      ctx.strokeStyle = [
        "rgba(150, 102, 54, 0.34)",
        "rgba(83, 62, 38, 0.32)",
        "rgba(18, 36, 24, 0.34)",
      ][index];
      ctx.lineWidth = Math.max(1, 2 * view.scale);
      ctx.beginPath();
      for (let x = 0; x <= world.width; x += 12) {
        const point = toScreen(
          x,
          Math.min(world.height, state.terrain[x] + offset),
        );
        if (x === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    });

    ctx.fillStyle = "rgba(255, 232, 142, 0.24)";
    for (let x = 36; x < world.width; x += 78) {
      const seed = Math.sin(x * 12.9898) * 43758.5453;
      if (seed - Math.floor(seed) < 0.36) continue;
      const y = terrainAt(state.terrain, x) + 10 + (x % 4);
      const point = toScreen(x, y);
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(1, 2.6 * view.scale), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawAimGuide() {
    const player = currentPlayer();
    if (!player || !state.ready || hasProjectiles() || state.gameOver) return;
    const radians = (player.angle * Math.PI) / 180;
    const speed =
      (145 + player.power * 5.1) * weaponConfig(player.weapon).speed;
    let x = player.x + Math.cos(radians) * 31;
    let y = player.y - 21 - Math.sin(radians) * 31;
    let vx = Math.cos(radians) * speed;
    let vy = -Math.sin(radians) * speed;
    const view = getView();
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.44)";
    ctx.lineWidth = Math.max(1, 2 * view.scale);
    ctx.setLineDash([6 * view.scale, 9 * view.scale]);
    ctx.beginPath();
    for (let step = 0; step < 34; step += 1) {
      const point = toScreen(x, y);
      if (step === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
      vx += state.wind * 0.22 * 0.075;
      vy += gravity * 0.075;
      x += vx * 0.075;
      y += vy * 0.075;
      if (x < 0 || x > world.width || y > world.height) break;
      if (y >= terrainAt(state.terrain, x)) break;
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawPlayer(player, index) {
    const view = getView();
    const point = toScreen(player.x, player.y);
    const scale = view.scale;
    const palette = vehiclePalettes[index % vehiclePalettes.length];
    const isActive = index === state.turn && !state.gameOver;
    const radians = (player.angle * Math.PI) / 180;
    ctx.save();
    ctx.translate(point.x, point.y);
    const bob =
      isActive && !state.projectile
        ? Math.sin(performance.now() / 170) * scale
        : 0;
    ctx.translate(0, bob);
    ctx.globalAlpha = player.connected === false ? 0.45 : 1;

    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 3 * scale, 38 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isActive) {
      ctx.strokeStyle = palette.glow;
      ctx.lineWidth = 5 * scale;
      ctx.beginPath();
      ctx.arc(0, -20 * scale, 48 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.moveTo(0, -76 * scale);
      ctx.lineTo(-9 * scale, -61 * scale);
      ctx.lineTo(9 * scale, -61 * scale);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = palette.tread;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    drawRoundRect(-34 * scale, -14 * scale, 68 * scale, 18 * scale, 9 * scale);
    ctx.fill();
    ctx.stroke();

    for (let wheel = -22; wheel <= 22; wheel += 22) {
      ctx.fillStyle = "#394955";
      ctx.beginPath();
      ctx.arc(wheel * scale, -5 * scale, 7 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#101820";
      ctx.beginPath();
      ctx.arc(wheel * scale, -5 * scale, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    const bodyGradient = ctx.createLinearGradient(
      -28 * scale,
      -36 * scale,
      28 * scale,
      -10 * scale,
    );
    bodyGradient.addColorStop(0, palette.trim);
    bodyGradient.addColorStop(0.18, palette.body);
    bodyGradient.addColorStop(1, palette.bodyDark);
    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = index === mySlot ? "#ffffff" : "rgba(0, 0, 0, 0.52)";
    ctx.lineWidth = (index === mySlot ? 3 : 2) * scale;
    ctx.beginPath();
    drawRoundRect(-28 * scale, -32 * scale, 56 * scale, 25 * scale, 7 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.bodyDark;
    ctx.beginPath();
    drawRoundRect(-15 * scale, -45 * scale, 30 * scale, 19 * scale, 8 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#17212a";
    ctx.lineWidth = 9 * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(radians) * 4 * scale,
      -36 * scale - Math.sin(radians) * 4 * scale,
    );
    ctx.lineTo(
      Math.cos(radians) * 56 * scale,
      -36 * scale - Math.sin(radians) * 56 * scale,
    );
    ctx.stroke();
    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(radians) * 7 * scale,
      -36 * scale - Math.sin(radians) * 7 * scale,
    );
    ctx.lineTo(
      Math.cos(radians) * 53 * scale,
      -36 * scale - Math.sin(radians) * 53 * scale,
    );
    ctx.stroke();
    ctx.lineCap = "butt";

    const muzzleX = Math.cos(radians) * 59 * scale;
    const muzzleY = -36 * scale - Math.sin(radians) * 59 * scale;
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(muzzleX, muzzleY, 5 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(-10 * scale, -24 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.arc(8 * scale, -24 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();

    if (player.activeItem === "power") {
      ctx.strokeStyle = "rgba(255, 224, 102, 0.86)";
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.arc(0, -22 * scale, 42 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (player.shield) {
      ctx.strokeStyle = "rgba(105, 220, 255, 0.9)";
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.arc(0, -21 * scale, 43 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    drawPlayerHealth(player, scale);

    ctx.fillStyle = "#eef6ff";
    ctx.font = `800 ${Math.max(11, 14 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(player.name, 0, -86 * scale);
    ctx.restore();
  }

  function drawPlayerHealth(player, scale) {
    const width = 58 * scale;
    const height = 7 * scale;
    const x = -width / 2;
    const y = -69 * scale;
    const ratio = clamp(player.health / 100, 0, 1);
    ctx.fillStyle = "rgba(8, 17, 25, 0.84)";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle =
      ratio > 0.55 ? "#55e68f" : ratio > 0.28 ? "#ffd166" : "#ff5f6d";
    ctx.fillRect(
      x + scale,
      y + scale,
      (width - 2 * scale) * ratio,
      height - 2 * scale,
    );
    ctx.strokeStyle = "rgba(255, 255, 255, 0.62)";
    ctx.lineWidth = Math.max(1, scale);
    ctx.strokeRect(x, y, width, height);
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
    (state.projectiles || []).forEach(drawProjectileShot);
  }

  function drawProjectileShot(shot) {
    const point = toScreen(shot.x, shot.y);
    const scale = getView().scale;
    const strong = shot.radius > 52 || shot.weapon === "impact";
    if (Number.isFinite(shot.vx) && Number.isFinite(shot.vy)) {
      ctx.strokeStyle = strong
        ? "rgba(255, 95, 109, 0.36)"
        : "rgba(17, 24, 39, 0.24)";
      ctx.lineWidth = Math.max(2, 4 * scale);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(
        point.x - shot.vx * 0.035 * scale,
        point.y - shot.vy * 0.035 * scale,
      );
      ctx.stroke();
    }
    ctx.fillStyle = shot.color || weaponConfig(shot.weapon).color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, (strong ? 8 : 6) * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.beginPath();
    ctx.arc(
      point.x - 2 * scale,
      point.y - 2 * scale,
      2 * scale,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  function drawExplosion() {
    if (!state.explosion) return;
    const point = toScreen(state.explosion.x, state.explosion.y);
    const scale = getView().scale;
    const alpha = Math.max(0, 1 - state.explosion.age / 0.55);
    ctx.fillStyle = `rgba(255, 95, 109, ${0.24 * alpha})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, state.explosion.radius * scale, 0, Math.PI * 2);
    ctx.fill();
    [0.48, 0.78, 1.04].forEach((size, index) => {
      ctx.strokeStyle = [
        `rgba(255, 245, 156, ${alpha})`,
        `rgba(255, 188, 84, ${0.78 * alpha})`,
        `rgba(255, 95, 109, ${0.58 * alpha})`,
      ][index];
      ctx.lineWidth = Math.max(1, (5 - index) * scale);
      ctx.beginPath();
      ctx.arc(
        point.x,
        point.y,
        state.explosion.radius * size * scale,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    });
    for (let index = 0; index < 16; index += 1) {
      const angle = (Math.PI * 2 * index) / 16 + state.explosion.age * 4;
      const distance =
        state.explosion.radius * (0.22 + state.explosion.age) * scale;
      ctx.fillStyle =
        index % 2
          ? `rgba(255, 214, 102, ${alpha})`
          : `rgba(255, 255, 255, ${0.75 * alpha})`;
      ctx.beginPath();
      ctx.arc(
        point.x + Math.cos(angle) * distance,
        point.y + Math.sin(angle) * distance,
        Math.max(1, 3.2 * scale * alpha),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  function draw() {
    resizeCanvas();
    drawSky();
    const shake = state.explosion
      ? Math.pow(Math.max(0, 1 - state.explosion.age / 0.55), 2) * 5
      : 0;
    ctx.save();
    if (shake) {
      ctx.translate(
        Math.sin(performance.now() / 18) * shake,
        Math.cos(performance.now() / 21) * shake,
      );
    }
    drawTerrain();
    drawAimGuide();
    state.players.forEach(drawPlayer);
    drawProjectile();
    drawExplosion();
    ctx.restore();
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
  netInfo.toggle.onclick = () =>
    setNetInfoCollapsed(!netInfo.panel.classList.contains("collapsed"));
  netInfo.copy.onclick = () => {
    if (!latestShareUrl) return;
    navigator.clipboard?.writeText(latestShareUrl);
  };
  ui.repair.onclick = () => action("item", { item: "repair" });
  ui.shield.onclick = () => action("item", { item: "shield" });
  ui.powerShot.onclick = () => action("item", { item: "power" });
  ui.weaponButtons.forEach((button) => {
    button.onclick = () => action("weapon", { weapon: button.dataset.weapon });
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (
      [
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
        " ",
        "z",
        "x",
        "c",
        "v",
        "b",
      ].includes(key)
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
    const weapon = weaponOrder.find(
      (weaponKey) => weapons[weaponKey].key.toLowerCase() === key,
    );
    if (weapon) action("weapon", { weapon });
    if (key === "1") action("item", { item: "repair" });
    if (key === "2") action("item", { item: "shield" });
    if (key === "3") action("item", { item: "power" });
    if (key === "r") action("reset");
  });

  if (mode === "multi") connectMulti();
  updateNetInfo();
  syncUi();
  requestAnimationFrame(frame);
})();
