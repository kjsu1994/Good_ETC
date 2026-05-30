(() => {
  const params = new URLSearchParams(window.location.search);
  const gameKey = params.get("game") || "kart";
  const isSolo = ["solo", "local"].includes(params.get("mode") || "");
  const assetVersion = params.get("v") || "20260530am";
  const world = { width: 2600, height: 1600 };
  const gameTypes = {
    kart: {
      name: "카트 랠리",
      goal: "체크포인트 3바퀴를 돌며 드리프트, 니트로, 드래프트로 추월하세요.",
      action: "Space: 드리프트 · 앞차 뒤에서 드래프트 충전",
      accent: "#42d7ff",
      track: [
        [320, 820],
        [560, 380],
        [1140, 220],
        [1980, 360],
        [2320, 830],
        [1840, 1320],
        [930, 1410],
        [390, 1140],
      ],
    },
    bomb: {
      name: "폭탄 그리드",
      goal: "블록을 부수고 킥 파워업으로 폭탄을 밀어 연쇄폭발을 만들어 보세요.",
      action: "Space: 폭탄 설치 · 화력/폭탄수/속도/킥 파워업",
      accent: "#ffba5a",
    },
    snake: {
      name: "스네이크 배틀",
      goal: "먹이를 모아 길어지고 질주로 상대 꼬리를 잘라 흐름을 뒤집으세요.",
      action:
        "방향키/WASD: 방향 전환 · Space: 질주/꼬리 절단 · 실드: 충돌 1회 방어",
      accent: "#8be66f",
    },
    coin: {
      name: "코인 러시",
      goal: "위험 구역을 피해 콤보를 쌓고 은행 존에서 큰 보너스로 현금화하세요.",
      action: "Space: 짧은 대시 · 자석/피버/실드 아이템 활용",
      accent: "#d08cff",
    },
  };
  const game = gameTypes[gameKey] ? gameKey : "kart";
  const config = gameTypes[game];

  const shell = document.querySelector(".arena-shell");
  shell.className = "party-shell";
  shell.innerHTML = `
    <canvas id="partyCanvas" class="party-canvas" aria-label="${config.name} 전장"></canvas>
    <section class="hud party-panel" id="partyPanel" aria-label="${config.name} 조작">
      <div class="brand">
        <span class="brand-mark party-mark"></span>
        <div>
          <h1>${config.name}</h1>
          <p id="partyStatus">준비 중</p>
        </div>
        <button id="partyHelpToggle" class="hud-toggle party-help-toggle" type="button" title="사용 방법" aria-label="사용 방법">?</button>
        <button id="partyPanelToggle" class="hud-toggle" type="button" aria-label="패널 접기" aria-expanded="true"><span></span><span></span><span></span></button>
      </div>
      <form id="partyConnectForm" class="connect-form">
        <label>
          이름
          <input id="partyName" maxlength="18" autocomplete="nickname" placeholder="플레이어" />
        </label>
        <label>
          서버 주소
          <input id="partyServerUrl" placeholder="ws://host:7000/party" />
        </label>
        <div class="button-row">
          <button id="partyConnect" type="submit">연결</button>
          <button id="partyDisconnect" type="button">해제</button>
        </div>
      </form>
      <div class="party-help hidden" id="partyHelp">
        <p><strong>${config.name}</strong>: ${config.goal}</p>
        <p>이동은 WASD, 방향키, 또는 화면 터치 패드를 사용합니다. ${config.action}. R은 방장 라운드 재시작입니다.</p>
        <p>멀티는 통합 입장 센터에서 만든 방으로 접속하고, 혼자하기는 서버 없이 현재 브라우저 또는 EXE 안에서 실행됩니다.</p>
      </div>
    </section>
    <section class="hud party-score" aria-label="점수">
      <h2>순위</h2>
      <div class="party-readout">
        <span>모드<strong id="partyMode">-</strong></span>
        <span>남은 시간<strong id="partyTime">-</strong></span>
      </div>
      <ol id="partyPlayers"></ol>
    </section>
    <section class="hud party-toolbar" aria-label="게임 조작">
      <button id="partyRestart" type="button">라운드 재시작</button>
        <button id="partyActionButton" class="party-action-button" type="button" data-control="action">${game === "kart" ? "드리프트" : game === "bomb" ? "폭탄" : "액션"}</button>
      <span id="partyActionHint">${config.action}</span>
    </section>
    <section class="party-touch" id="partyTouch" aria-label="터치 조작">
      <div class="party-touch-pad">
        <button type="button" data-control="up" aria-label="위">▲</button>
        <button type="button" data-control="left" aria-label="왼쪽">◀</button>
        <button type="button" data-control="down" aria-label="아래">▼</button>
        <button type="button" data-control="right" aria-label="오른쪽">▶</button>
      </div>
    </section>
    <section class="hud net-info collapsed" id="netInfoPanel" aria-label="접속 정보">
      <button id="netInfoToggle" class="net-info-toggle" type="button" aria-label="접속 정보 열기" aria-expanded="false" title="접속 정보">i</button>
      <div class="net-info-body">
        <h2>접속 정보</h2>
        <dl>
          <dt>게임</dt><dd id="netInfoGame">-</dd>
          <dt>현재 화면</dt><dd id="netInfoPage">-</dd>
          <dt>서버 연결</dt><dd id="netInfoServer">-</dd>
          <dt>초대 링크</dt><dd id="netInfoShare">-</dd>
        </dl>
        <p id="netInfoWarning"></p>
        <button id="netInfoCopy" type="button">초대 링크 복사</button>
      </div>
    </section>
    <div id="centerMessage" class="center-message">연결하면 ${config.name}이 시작됩니다.</div>
  `;
  document.title = config.name;

  const canvas = document.getElementById("partyCanvas");
  const ctx = canvas.getContext("2d");
  const ui = {
    panel: document.getElementById("partyPanel"),
    panelToggle: document.getElementById("partyPanelToggle"),
    helpToggle: document.getElementById("partyHelpToggle"),
    help: document.getElementById("partyHelp"),
    form: document.getElementById("partyConnectForm"),
    name: document.getElementById("partyName"),
    serverUrl: document.getElementById("partyServerUrl"),
    connect: document.getElementById("partyConnect"),
    disconnect: document.getElementById("partyDisconnect"),
    status: document.getElementById("partyStatus"),
    mode: document.getElementById("partyMode"),
    time: document.getElementById("partyTime"),
    players: document.getElementById("partyPlayers"),
    restart: document.getElementById("partyRestart"),
    touch: document.getElementById("partyTouch"),
    center: document.getElementById("centerMessage"),
    netPanel: document.getElementById("netInfoPanel"),
    netToggle: document.getElementById("netInfoToggle"),
    netGame: document.getElementById("netInfoGame"),
    netPage: document.getElementById("netInfoPage"),
    netServer: document.getElementById("netInfoServer"),
    netShare: document.getElementById("netInfoShare"),
    netWarning: document.getElementById("netInfoWarning"),
    netCopy: document.getElementById("netInfoCopy"),
  };

  let socket = null;
  let clientId = isSolo ? "local" : "";
  let lastFrame = performance.now();
  let latestShareUrl = "";
  let centerTimer = 0;
  let finishNoticeKey = "";
  let camera = { scale: 1, offsetX: 0, offsetY: 0 };
  let localIds = { pickup: 1, bomb: 1, block: 1 };
  const botColors = ["#ffba5a", "#8be66f", "#d08cff"];
  const botNames = ["AI 루나", "AI 제트", "AI 모카"];
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
  };
  let state = createInitialState();

  function createInitialState() {
    const player = {
      id: "local",
      name: localStorage.getItem("party_name") || "Player",
      color: config.accent,
      x: 250,
      y: 720,
      vx: 0,
      vy: 0,
      angle: 0,
      score: 0,
      lap: 0,
      checkpoint: 0,
      alive: true,
      trail: [],
      boosted: false,
      biting: false,
      biteCooldown: 0,
      drifting: false,
      driftCharge: 0,
      drafting: false,
      draftCharge: 0,
      padCooldowns: {},
      shield: 0,
      bombPower: 0,
      bombLimit: 1,
      bombKick: 0,
      combo: 0,
      comboTimer: 0,
      magnet: 0,
      frenzy: 0,
      bankCooldown: 0,
      cooldown: 0,
      isHost: true,
    };
    placeLocalPlayer(player, 0);
    const bots = isSolo ? [0, 1, 2].map(createLocalBot) : [];
    return {
      type: "party_state",
      roomId: params.get("room") || "LOCAL",
      game,
      config,
      width: world.width,
      height: world.height,
      status: `${config.name} 혼자하기`,
      remaining: game === "coin" ? 150 : game === "kart" ? 240 : 180,
      duration: game === "coin" ? 150 : game === "kart" ? 240 : 180,
      startedAtMs: Date.now(),
      finished: false,
      winnerId: "",
      winnerName: "",
      scores: [],
      players: [player, ...bots],
      pickups: seedLocalPickups(),
      boostPads: game === "kart" ? kartBoostPads(config.track || []) : [],
      bombs: [],
      blocks: seedLocalBlocks(),
      hazards: [],
      banks: [],
      effects: [],
      clientId: "local",
      isHost: true,
    };
  }

  function seedLocalPickups() {
    const count =
      game === "snake" ? 34 : game === "coin" ? 30 : game === "bomb" ? 12 : 9;
    return Array.from({ length: count }, createLocalPickup);
  }

  function createLocalPickup() {
    let kind = "coin";
    let value = 1;
    if (game === "kart") {
      ({ kind, value } = randomKartPickup());
    } else if (game === "snake") {
      const roll = Math.random();
      if (roll < 0.12) {
        kind = "boost";
        value = 2;
      } else if (roll < 0.22) {
        kind = "gem";
        value = 3;
      } else if (roll < 0.29) {
        kind = "shield";
      } else if (roll < 0.34) {
        kind = "feast";
        value = 8;
      }
    } else if (game === "coin") {
      ({ kind, value } = randomCoinPickup());
    } else if (game === "bomb") {
      ({ kind, value } = randomBombPickup());
    }
    return {
      id: localIds.pickup++,
      x: 80 + Math.random() * (world.width - 160),
      y: 80 + Math.random() * (world.height - 160),
      kind,
      value,
    };
  }

  function randomBombPickup() {
    const roll = Math.random();
    if (roll < 0.18) return { kind: "flame", value: 1 };
    if (roll < 0.34) return { kind: "bombup", value: 1 };
    if (roll < 0.5) return { kind: "speed", value: 1 };
    if (roll < 0.62) return { kind: "kick", value: 1 };
    return { kind: "coin", value: Math.random() < 0.35 ? 2 : 1 };
  }

  function randomKartPickup() {
    const roll = Math.random();
    if (roll < 0.18) return { kind: "nitro", value: 1 };
    if (roll < 0.5) return { kind: "boost", value: 1 };
    return { kind: "coin", value: Math.random() < 0.25 ? 2 : 1 };
  }

  function randomCoinPickup() {
    const roll = Math.random();
    if (roll < 0.1) return { kind: "shield", value: 1 };
    if (roll < 0.2) return { kind: "magnet", value: 1 };
    if (roll < 0.28) return { kind: "frenzy", value: 1 };
    if (roll < 0.44) return { kind: "gem", value: 5 };
    return { kind: "coin", value: Math.random() < 0.2 ? 3 : 1 };
  }

  function seedLocalBlocks() {
    if (game !== "bomb") return [];
    const blocks = [];
    const safeSpots = [
      [420, 420],
      [world.width - 420, 420],
      [420, world.height - 420],
      [world.width - 420, world.height - 420],
    ];
    for (let x = 320; x < world.width - 260; x += 160) {
      for (let y = 280; y < world.height - 220; y += 160) {
        if ((Math.floor(x / 160) + Math.floor(y / 160)) % 5 === 0) continue;
        if (safeSpots.some(([sx, sy]) => distance(x, y, sx, sy) < 260))
          continue;
        blocks.push({ id: localIds.block++, x, y, size: 46 });
      }
    }
    return blocks;
  }

  function createLocalBot(index) {
    const bot = {
      id: `bot${index + 1}`,
      name: botNames[index] || `AI ${index + 1}`,
      color: botColors[index % botColors.length],
      x: 250,
      y: 720,
      vx: 0,
      vy: 0,
      angle: index * 0.45,
      score: 0,
      lap: 0,
      checkpoint: 0,
      alive: true,
      trail: [],
      boosted: false,
      biting: false,
      biteCooldown: 0,
      drifting: false,
      driftCharge: 0,
      drafting: false,
      draftCharge: 0,
      padCooldowns: {},
      shield: 0,
      bombPower: 0,
      bombLimit: 1,
      bombKick: 0,
      combo: 0,
      comboTimer: 0,
      magnet: 0,
      frenzy: 0,
      bankCooldown: 0,
      cooldown: 0,
      isHost: false,
      isBot: true,
      botIndex: index,
    };
    placeLocalPlayer(bot, index + 1);
    return bot;
  }

  function placeLocalPlayer(player, slot = 0) {
    if (game === "kart") {
      player.x = 290 + (slot % 4) * 46;
      player.y = 795 + Math.floor(slot / 4) * 48;
      player.angle = 0;
    } else {
      const spots = [
        [420, 420],
        [world.width - 420, 420],
        [420, world.height - 420],
        [world.width - 420, world.height - 420],
      ];
      const [x, y] = spots[slot % spots.length];
      player.x = x;
      player.y = y;
      player.angle = slot * 0.72;
    }
    player.vx = 0;
    player.vy = 0;
    player.alive = true;
    player.respawn = 0;
    player.shield = 0;
    player.combo = 0;
    player.comboTimer = 0;
    player.magnet = 0;
    player.frenzy = 0;
    player.bankCooldown = 0;
    player.drifting = false;
    player.driftCharge = 0;
    player.drafting = false;
    player.draftCharge = 0;
    player.padCooldowns = {};
    player.actionLatch = false;
    player.trail = [[player.x, player.y]];
  }

  function defaultServerUrl() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const { host, port } = defaultServerEndpoint();
    const url = new URL(`${protocol}://${host}${port ? `:${port}` : ""}/party`);
    url.searchParams.set("game", game);
    const room = params.get("room");
    if (room) url.searchParams.set("room", room);
    return url.toString();
  }

  function defaultServerEndpoint() {
    const fallbackHost = window.location.hostname || "localhost";
    let host = String(params.get("host") || fallbackHost).trim();
    let port = String(params.get("port") || "7000").trim();
    const urlLike = /^[a-z][a-z\d+.-]*:\/\//i.test(host);
    if (urlLike) {
      try {
        const parsed = new URL(host);
        host = parsed.hostname || fallbackHost;
        if (!params.has("port") && parsed.port) port = parsed.port;
      } catch {
        host = fallbackHost;
      }
    } else if (!host.startsWith("[") && host.split(":").length === 2) {
      const [hostPart, portPart] = host.split(":");
      host = hostPart || fallbackHost;
      if (!params.has("port") && portPart) port = portPart;
    }
    return { host: host || fallbackHost, port: port || "7000" };
  }

  function partyUrlStorageKey() {
    return `party_url_${game}`;
  }

  function savedServerUrl() {
    const saved =
      localStorage.getItem(partyUrlStorageKey()) ||
      localStorage.getItem("party_url");
    const target = safeUrl(saved);
    if (!target) return "";
    target.searchParams.set("game", game);
    const room = params.get("room");
    if (room) target.searchParams.set("room", room);
    return target.toString();
  }

  function shareUrl(serverUrl) {
    const target = safeUrl(
      serverUrl || ui.serverUrl.value || defaultServerUrl(),
    );
    if (!target) return "";
    const protocol = target.protocol === "wss:" ? "https:" : "http:";
    const share = new URL(`${protocol}//${target.host}/game/index.html`);
    share.searchParams.set("game", game);
    share.searchParams.set("mode", "multi");
    share.searchParams.set("host", target.hostname);
    share.searchParams.set("port", target.port || "7000");
    share.searchParams.set("auto", "1");
    share.searchParams.set("v", assetVersion);
    const room = target.searchParams.get("room") || params.get("room");
    if (room) share.searchParams.set("room", room);
    return share.toString();
  }

  function safeUrl(value) {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  }

  function isLoopbackHost(host) {
    const clean = String(host || "").toLowerCase();
    return (
      clean === "localhost" || clean === "127.0.0.1" || clean.startsWith("127.")
    );
  }

  function updateNetInfo(serverUrl = ui.serverUrl.value) {
    const target = safeUrl(serverUrl || defaultServerUrl());
    latestShareUrl = target ? shareUrl(target.toString()) : "";
    ui.netGame.textContent = isSolo
      ? `${config.name} / 혼자하기`
      : `${config.name} / 방 ${target?.searchParams.get("room") || "-"}`;
    ui.netPage.textContent = window.location.href;
    ui.netServer.textContent = isSolo
      ? "혼자하기 모드: 서버 연결 없음"
      : target?.toString() || "-";
    ui.netShare.textContent = isSolo
      ? "멀티 초대는 통합 입장 센터에서 방을 만든 뒤 사용하세요."
      : latestShareUrl || "-";
    const warnings = [];
    if (!isSolo && target && isLoopbackHost(target.hostname))
      warnings.push(
        "localhost/127.x 주소는 현재 PC에서만 유효합니다. 다른 PC에는 호스트 PC의 LAN IP를 전달하세요.",
      );
    if (!isSolo && isLoopbackHost(window.location.hostname))
      warnings.push(
        "현재 화면이 localhost/127.x로 열려 있으면 다른 PC는 이 주소를 그대로 사용할 수 없습니다.",
      );
    ui.netWarning.textContent = warnings.join(" ");
  }

  function setStatus(text, ok = true) {
    ui.status.textContent = text;
    ui.status.classList.toggle("offline", !ok);
  }

  function setCenter(text, duration = 0) {
    if (centerTimer) {
      clearTimeout(centerTimer);
      centerTimer = 0;
    }
    ui.center.textContent = text || "";
    ui.center.classList.toggle("hidden", !text);
    if (!text || !duration) return;
    const visibleText = String(text);
    centerTimer = setTimeout(() => {
      centerTimer = 0;
      if (ui.center.textContent === visibleText) setCenter("");
    }, duration);
  }

  function connect() {
    if (isSolo) {
      startSolo();
      return;
    }
    const name = cleanName(ui.name.value);
    const url = ui.serverUrl.value.trim() || defaultServerUrl();
    localStorage.setItem("party_name", name);
    localStorage.setItem("party_url", url);
    localStorage.setItem(partyUrlStorageKey(), url);
    updateNetInfo(url);
    if (socket) socket.close();
    let activeSocket;
    try {
      activeSocket = new WebSocket(url);
    } catch {
      setStatus("서버 주소 오류", false);
      ui.panel.classList.remove("collapsed");
      setCenter(
        "서버 주소 형식이 올바르지 않습니다. ws://호스트:7000/party 형태로 입력하세요.",
      );
      return;
    }
    socket = activeSocket;
    let handshakeOk = false;
    let expectedCloseMessage = "";
    const connectTimer = setTimeout(() => {
      if (socket !== activeSocket || handshakeOk) return;
      expectedCloseMessage =
        "게임 서버 응답이 없습니다. 서버/EXE/Docker를 최신 코드로 재시작하고 포트와 방화벽을 확인하세요.";
      setStatus("연결 시간 초과", false);
      setCenter(expectedCloseMessage);
      activeSocket.close();
    }, 5000);
    const failConnect = (message, status = "연결 실패") => {
      if (socket !== activeSocket) return;
      clearTimeout(connectTimer);
      expectedCloseMessage = message;
      setStatus(status, false);
      ui.panel.classList.remove("collapsed");
      setCenter(message);
      try {
        activeSocket.close();
      } catch {}
    };
    setStatus("연결 중...", true);
    setCenter(`${config.name} 방에 연결 중입니다.`);
    activeSocket.addEventListener("open", () => {
      if (socket !== activeSocket) return;
      setStatus("연결됨", true);
      ui.panel.classList.add("collapsed");
      activeSocket.send(JSON.stringify({ type: "party_join", name }));
    });
    activeSocket.addEventListener("message", (event) => {
      if (socket !== activeSocket) return;
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        failConnect(
          "서버 응답을 읽지 못했습니다. 게임 서버가 최신 Party 프로토콜인지 확인하세요.",
        );
        return;
      }
      if (message.type === "party_welcome") {
        handshakeOk = true;
        clearTimeout(connectTimer);
        clientId = message.id;
        setCenter("");
        return;
      }
      if (message.type === "party_state") {
        handshakeOk = true;
        clearTimeout(connectTimer);
        clientId = message.clientId || clientId;
        state = message;
        state.effects = state.effects || [];
        state.pickups = state.pickups || [];
        state.bombs = state.bombs || [];
        state.blocks = state.blocks || [];
        state.hazards = state.hazards || [];
        state.banks = state.banks || [];
        state.players = state.players || [];
        setCenter("");
        renderHud();
        return;
      }
      if (message.type === "party_error") {
        setCenter(message.message || "요청을 처리하지 못했습니다.", 1800);
        return;
      }
      if (
        !handshakeOk ||
        ["welcome", "state", "defense_state", "fortress_state"].includes(
          message.type,
        )
      ) {
        failConnect(
          "실행 중인 서버가 새 Party 게임을 지원하지 않습니다. 서버/EXE/Docker를 최신 코드로 재시작하세요.",
          "서버 호환 오류",
        );
      }
    });
    activeSocket.addEventListener("close", () => {
      if (socket !== activeSocket) return;
      clearTimeout(connectTimer);
      socket = null;
      setStatus("연결 끊김", false);
      ui.panel.classList.remove("collapsed");
      if (!expectedCloseMessage)
        setCenter("연결이 끊겼습니다. 서버 주소, 포트, 방화벽을 확인하세요.");
    });
    activeSocket.addEventListener("error", () => {
      failConnect(
        "연결 실패. 호스트 IP, 포트, 방화벽을 확인하세요.",
        "연결 오류",
      );
    });
  }

  function disconnect() {
    if (socket) socket.close();
    socket = null;
    setStatus(isSolo ? "혼자하기" : "연결 끊김", isSolo);
  }

  function startSolo() {
    clientId = "local";
    state = createInitialState();
    state.players[0].name = cleanName(ui.name.value);
    localStorage.setItem("party_name", state.players[0].name);
    setStatus("혼자하기", true);
    setCenter(`${config.name} 혼자하기`, 1200);
    renderHud();
  }

  function sendInput() {
    if (isSolo) return;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "party_input", ...input }));
  }

  function restartRound() {
    if (isSolo) {
      startSolo();
      return;
    }
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setCenter("서버 연결 후 사용할 수 있습니다.", 1600);
      return;
    }
    socket.send(JSON.stringify({ type: "party_restart" }));
  }

  function updateLocal(dt) {
    if (!isSolo) return;
    state.remaining = Math.max(
      0,
      Math.ceil(state.duration - (Date.now() - state.startedAtMs) / 1000),
    );
    if (state.finished) return;
    if (state.remaining <= 0) {
      finishLocalRound("시간 종료");
      return;
    }
    updateLocalSquad(dt);
  }

  function updateLocalSquad(dt) {
    state.effects = (state.effects || [])
      .map((effect) => ({ ...effect, ttl: effect.ttl - dt }))
      .filter((effect) => effect.ttl > 0);
    const players = state.players || [];
    players.forEach((player, index) => {
      if (!updateLocalRespawn(player, dt, index)) return;
      const controls = player.isBot ? localBotControls(player) : input;
      updateLocalPlayer(player, dt, controls);
      collectLocalPickups(player);
      if (game === "snake" && player.alive) checkLocalSnakeCollision(player);
    });
    updateLocalBombsForAll(dt);
    if (game === "coin") updateLocalCoinPickups(dt);
    if (game === "coin") updateLocalCoinHazardsForAll();
    if (game === "coin") updateLocalCoinBanksForAll();
    if (
      state.pickups.length <
      (game === "snake" ? 30 : game === "coin" ? 24 : game === "bomb" ? 10 : 7)
    )
      state.pickups.push(...seedLocalPickups().slice(0, 2));
    return true;
  }

  function addPartyEffect(effect) {
    state.effects = [...(state.effects || []), effect].slice(-48);
  }

  function kartBoostPads(track = config.track || []) {
    if (game !== "kart" || track.length < 2) return [];
    const pads = [];
    for (let index = 0; index < track.length; index += 2) {
      const start = track[index];
      const end = track[(index + 1) % track.length];
      pads.push({
        id: `pad${pads.length + 1}`,
        x: start[0] * 0.48 + end[0] * 0.52,
        y: start[1] * 0.48 + end[1] * 0.52,
        angle: Math.atan2(end[1] - start[1], end[0] - start[0]),
      });
    }
    return pads;
  }

  function tickKartPadCooldowns(player, dt) {
    player.padCooldowns = player.padCooldowns || {};
    Object.keys(player.padCooldowns).forEach((id) => {
      player.padCooldowns[id] = Math.max(0, player.padCooldowns[id] - dt);
    });
  }

  function applyLocalKartBoostPad(player) {
    const pads = state.boostPads?.length
      ? state.boostPads
      : kartBoostPads(state.config?.track || config.track || []);
    player.padCooldowns = player.padCooldowns || {};
    pads.forEach((pad) => {
      if ((player.padCooldowns[pad.id] || 0) > 0) return;
      if (distance(player.x, player.y, pad.x, pad.y) > 58) return;
      player.boost = Math.max(player.boost || 0, 1.15);
      player.padCooldowns[pad.id] = 3;
      player.score += 2;
      addPartyEffect({
        x: player.x,
        y: player.y,
        kind: "pad",
        color: player.color,
        ttl: 0.65,
        text: "PAD",
      });
    });
  }

  function updateLocalRespawn(player, dt, index) {
    if (player.alive) return true;
    player.respawn = Math.max(0, (player.respawn || 0) - dt);
    if (player.respawn > 0) return false;
    placeLocalPlayer(player, index);
    addPartyEffect({
      x: player.x,
      y: player.y,
      kind: "respawn",
      color: player.color,
      ttl: 0.9,
      text: "READY",
    });
    return true;
  }

  function updateLocalPlayer(player, dt, controls) {
    const previous = { ...input };
    Object.assign(input, controls);
    player.shield = Math.max(0, (player.shield || 0) - dt);
    if (game === "bomb")
      player.bombKick = Math.max(0, (player.bombKick || 0) - dt);
    if (game === "snake")
      player.biteCooldown = Math.max(0, (player.biteCooldown || 0) - dt);
    if (game === "coin") {
      player.comboTimer = Math.max(0, (player.comboTimer || 0) - dt);
      if (player.comboTimer <= 0) player.combo = 0;
      player.magnet = Math.max(0, (player.magnet || 0) - dt);
      player.frenzy = Math.max(0, (player.frenzy || 0) - dt);
      player.bankCooldown = Math.max(0, (player.bankCooldown || 0) - dt);
    }
    if (game === "kart") updateLocalKart(player, dt);
    else if (game === "snake") updateLocalSnake(player, dt);
    else updateLocalWalker(player, dt);
    Object.assign(input, previous);
  }

  function localBotControls(player) {
    if (game === "kart") return localBotKartControls(player);
    const avoid = localBotAvoidTarget(player);
    const target = avoid ||
      (game === "bomb" ? localBotBombTarget(player) : null) ||
      localClosestPickup(player) || {
        x: world.width / 2,
        y: world.height / 2,
      };
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const action =
      game === "coin"
        ? Boolean(avoid) && (player.cooldown || 0) <= 0
        : game === "snake"
          ? Boolean(avoid) && (player.cooldown || 0) <= 0
          : game === "bomb" && localClosestOpponentDistance(player) < 124;
    return {
      up: dy < -18,
      down: dy > 18,
      left: dx < -18,
      right: dx > 18,
      action,
    };
  }

  function localBotKartControls(player) {
    const track = state.config?.track || config.track || [];
    const target = track[player.checkpoint % track.length] || [
      world.width / 2,
      world.height / 2,
    ];
    const desired = Math.atan2(target[1] - player.y, target[0] - player.x);
    const turn = normalizeAngle(desired - (player.angle || 0));
    const trackDistance = distanceToTrack(player.x, player.y, track);
    const speed = Math.hypot(player.vx || 0, player.vy || 0);
    return {
      up: true,
      down: trackDistance > 150 && Math.abs(turn) > 1.9,
      left: turn < -0.12,
      right: turn > 0.12,
      action:
        Math.abs(turn) > 0.22 &&
        Math.abs(turn) < 1.25 &&
        trackDistance < 118 &&
        speed > 95 &&
        (player.cooldown || 0) <= 0,
    };
  }

  function localBotAvoidTarget(player) {
    let vx = 0;
    let vy = 0;
    const margin = 120;
    if (player.x < margin) vx += margin - player.x;
    if (player.x > world.width - margin)
      vx -= player.x - (world.width - margin);
    if (player.y < margin) vy += margin - player.y;
    if (player.y > world.height - margin)
      vy -= player.y - (world.height - margin);
    state.hazards?.forEach((hazard) => {
      const dx = player.x - hazard.x;
      const dy = player.y - hazard.y;
      const gap = Math.hypot(dx, dy);
      const danger = hazard.radius + 120;
      if (gap && gap < danger) {
        const force = (danger - gap) / danger;
        vx += (dx / gap) * force * 260;
        vy += (dy / gap) * force * 260;
      }
    });
    state.bombs?.forEach((bomb) => {
      const hot = bomb.blastTtl > 0 || bomb.ttl < 0.85;
      if (
        !hot ||
        !inBombBlast(player.x, player.y, bomb.x, bomb.y, bomb.radius + 36)
      )
        return;
      const dx = player.x - bomb.x || 1;
      const dy = player.y - bomb.y || 1;
      const gap = Math.hypot(dx, dy);
      vx += (dx / gap) * 320;
      vy += (dy / gap) * 320;
    });
    if (game === "snake") {
      state.players.forEach((other) => {
        other.trail?.slice(-70).forEach(([x, y]) => {
          const dx = player.x - x;
          const dy = player.y - y;
          const gap = Math.hypot(dx, dy);
          if (gap && gap < 70) {
            vx += (dx / gap) * (70 - gap);
            vy += (dy / gap) * (70 - gap);
          }
        });
      });
    }
    if (Math.hypot(vx, vy) < 12) return null;
    return {
      x: clamp(player.x + vx, 40, world.width - 40),
      y: clamp(player.y + vy, 40, world.height - 40),
    };
  }

  function localBotBombTarget(player) {
    const opponents = state.players.filter(
      (item) => item.id !== player.id && item.alive,
    );
    const closest = opponents.sort(
      (a, b) =>
        distance(player.x, player.y, a.x, a.y) -
        distance(player.x, player.y, b.x, b.y),
    )[0];
    if (closest && distance(player.x, player.y, closest.x, closest.y) < 240)
      return closest;
    return null;
  }

  function localClosestOpponentDistance(player) {
    return state.players
      .filter((item) => item.id !== player.id && item.alive)
      .reduce(
        (closest, item) =>
          Math.min(closest, distance(player.x, player.y, item.x, item.y)),
        Infinity,
      );
  }

  function localClosestPickup(player) {
    return [...state.pickups].sort(
      (a, b) =>
        distance(player.x, player.y, a.x, a.y) -
        distance(player.x, player.y, b.x, b.y),
    )[0];
  }

  function updateLocalBombsForAll(dt) {
    const exploded = [];
    state.bombs.forEach((bomb) => {
      if (bomb.blastTtl > 0) {
        bomb.blastTtl -= dt;
        return;
      }
      updateLocalMovingBomb(bomb, dt);
      bomb.ttl -= dt;
      if (bomb.ttl <= 0) {
        bomb.blastTtl = 0.35;
        exploded.push(bomb);
        triggerLocalBombChain(bomb);
        addPartyEffect({
          x: bomb.x,
          y: bomb.y,
          kind: "blast",
          color: "#ffba5a",
          ttl: 0.5,
          text: "BOOM",
        });
      }
    });
    exploded.forEach((bomb) => {
      const owner = state.players.find((player) => player.id === bomb.ownerId);
      destroyLocalBlocks(bomb);
      state.players.forEach((player) => {
        if (!player.alive) return;
        if (!inBombBlast(player.x, player.y, bomb.x, bomb.y, bomb.radius))
          return;
        knockLocal(player, "폭발에 맞았습니다.");
        addPartyEffect({
          x: player.x,
          y: player.y,
          kind: "down",
          color: owner?.color || "#ff5f6d",
          ttl: 0.8,
          text: "HIT",
        });
        if (owner && owner.id !== player.id) owner.score += 5;
      });
    });
    state.bombs = state.bombs.filter(
      (bomb) => bomb.ttl > 0 || bomb.blastTtl > 0,
    );
  }

  function triggerLocalBombChain(source) {
    state.bombs.forEach((bomb) => {
      if (
        bomb.id === source.id ||
        bomb.blastTtl > 0 ||
        bomb.ttl <= 0 ||
        !inBombBlast(bomb.x, bomb.y, source.x, source.y, source.radius)
      )
        return;
      bomb.ttl = 0;
      addPartyEffect({
        x: bomb.x,
        y: bomb.y,
        kind: "chain",
        color: "#ff5f6d",
        ttl: 0.45,
        text: "CHAIN",
      });
    });
  }

  function destroyLocalBlocks(bomb) {
    if (game !== "bomb" || !state.blocks?.length) return;
    const remaining = [];
    state.blocks.forEach((block) => {
      if (inBombBlast(block.x, block.y, bomb.x, bomb.y, bomb.radius)) {
        addPartyEffect({
          x: block.x,
          y: block.y,
          kind: "block",
          color: "#ffba5a",
          ttl: 0.65,
          text: "BREAK",
        });
        if (Math.random() < 0.36) {
          const drop = randomBombPickup();
          state.pickups.push({
            id: localIds.pickup++,
            x: block.x,
            y: block.y,
            kind: drop.kind,
            value: drop.value,
          });
        }
        return;
      }
      remaining.push(block);
    });
    state.blocks = remaining;
  }

  function updateLocalMovingBomb(bomb, dt) {
    const speed = Math.hypot(bomb.vx || 0, bomb.vy || 0);
    if (speed < 8) {
      bomb.vx = 0;
      bomb.vy = 0;
      return;
    }
    const nextX = bomb.x + (bomb.vx || 0) * dt;
    const nextY = bomb.y + (bomb.vy || 0) * dt;
    if (localBombBlocked(bomb, nextX, nextY)) {
      bomb.vx = 0;
      bomb.vy = 0;
      return;
    }
    bomb.x = nextX;
    bomb.y = nextY;
  }

  function tryKickLocalBomb(player, dirX, dirY) {
    if (game !== "bomb" || (player.bombKick || 0) <= 0) return;
    const horizontal = Math.abs(dirX) >= Math.abs(dirY);
    const kickX = horizontal
      ? Math.sign(dirX || Math.cos(player.angle) || 1)
      : 0;
    const kickY = horizontal
      ? 0
      : Math.sign(dirY || Math.sin(player.angle) || 1);
    const bomb = (state.bombs || []).find(
      (item) =>
        item.ttl > 0 &&
        item.blastTtl <= 0 &&
        distance(player.x, player.y, item.x, item.y) < 46,
    );
    if (!bomb) return;
    const currentSpeed = Math.hypot(bomb.vx || 0, bomb.vy || 0);
    if (
      currentSpeed > 24 &&
      Math.sign(bomb.vx || 0) === kickX &&
      Math.sign(bomb.vy || 0) === kickY
    )
      return;
    const previewX = bomb.x + kickX * 20;
    const previewY = bomb.y + kickY * 20;
    if (localBombBlocked(bomb, previewX, previewY)) return;
    bomb.vx = kickX * 380;
    bomb.vy = kickY * 380;
    addPartyEffect({
      x: bomb.x,
      y: bomb.y,
      kind: "kick",
      color: player.color,
      ttl: 0.5,
      text: "KICK",
    });
  }

  function localBombBlocked(bomb, x, y) {
    if (x < 34 || x > world.width - 34 || y < 34 || y > world.height - 34)
      return true;
    if (
      (state.blocks || []).some((block) => {
        const size = block.size || 46;
        return (
          Math.abs(x - block.x) < size / 2 + 22 &&
          Math.abs(y - block.y) < size / 2 + 22
        );
      })
    )
      return true;
    return (state.bombs || []).some(
      (other) =>
        other.id !== bomb.id &&
        other.ttl > 0 &&
        other.blastTtl <= 0 &&
        distance(x, y, other.x, other.y) < 34,
    );
  }

  function updateLocalCoinHazardsForAll() {
    refreshLocalCoinHazards();
    state.players.forEach((player) => {
      if (!player.alive) return;
      state.hazards.forEach((hazard) => {
        if (
          distance(player.x, player.y, hazard.x, hazard.y) <
          hazard.radius + 8
        )
          knockLocal(player, "위험 구역에 닿았습니다.");
      });
    });
  }

  function checkLocalSnakeCollision(player) {
    for (const other of state.players) {
      if (!other.alive) continue;
      const trail =
        other.id === player.id ? other.trail.slice(0, -10) : other.trail;
      const hitIndex = trail?.findIndex(
        ([x, y]) => distance(player.x, player.y, x, y) < 13,
      );
      if (!Number.isInteger(hitIndex) || hitIndex < 0) continue;
      if (other.id !== player.id && tryLocalSnakeBite(player, other, hitIndex))
        return;
      if (guardLocalSnake(player, "꼬리")) return;
      knockLocal(player, "꼬리에 부딪혔습니다.");
      addPartyEffect({
        x: player.x,
        y: player.y,
        kind: "down",
        color: player.color,
        ttl: 0.8,
        text: "CRASH",
      });
      return;
    }
  }

  function tryLocalSnakeBite(player, other, hitIndex) {
    if (
      game !== "snake" ||
      !player.boosted ||
      (player.biteCooldown || 0) > 0 ||
      !other.trail?.length
    )
      return false;
    const cutCount = Math.min(
      hitIndex + 1,
      Math.max(0, other.trail.length - 14),
    );
    if (cutCount < 5) return false;
    const cutTrail = other.trail.slice(0, cutCount);
    other.trail = other.trail.slice(cutCount);
    const reward = Math.min(14, Math.max(3, Math.floor(cutCount / 6)));
    player.score += reward;
    other.score = Math.max(
      0,
      (other.score || 0) - Math.max(1, Math.floor(reward / 2)),
    );
    player.biteCooldown = 0.75;
    player.biting = true;
    for (let index = 0; index < cutTrail.length; index += 10) {
      const [x, y] = cutTrail[index];
      state.pickups.push({
        id: localIds.pickup++,
        x,
        y,
        kind: index % 20 === 0 ? "gem" : "coin",
        value: index % 20 === 0 ? 3 : 1,
      });
    }
    state.pickups = state.pickups.slice(-48);
    addPartyEffect({
      x: player.x,
      y: player.y,
      kind: "bite",
      color: player.color,
      ttl: 0.75,
      text: `CUT +${reward}`,
    });
    addPartyEffect({
      x: other.x,
      y: other.y,
      kind: "cut",
      color: other.color,
      ttl: 0.65,
      text: "TAIL CUT",
    });
    return true;
  }

  function guardLocalSnake(player, label) {
    if (game !== "snake" || (player.shield || 0) <= 0) return false;
    player.shield = 0;
    player.x = clamp(player.x, 26, world.width - 26);
    player.y = clamp(player.y, 26, world.height - 26);
    player.angle = Math.atan2(
      world.height / 2 - player.y,
      world.width / 2 - player.x,
    );
    player.trail = player.trail.slice(-14);
    addPartyEffect({
      x: player.x,
      y: player.y,
      kind: "shield",
      color: "#69dcff",
      ttl: 0.85,
      text: `${label} 방어`,
    });
    return true;
  }

  function normalizeAngle(angle) {
    let next = angle;
    while (next > Math.PI) next -= Math.PI * 2;
    while (next < -Math.PI) next += Math.PI * 2;
    return next;
  }

  function rankPlayers(players) {
    return [...players].sort((a, b) =>
      game === "kart"
        ? (b.lap || 0) - (a.lap || 0) ||
          (b.checkpoint || 0) - (a.checkpoint || 0) ||
          (b.score || 0) - (a.score || 0)
        : (b.score || 0) - (a.score || 0),
    );
  }

  function finishLocalRound(reason) {
    const winner = rankPlayers(state.players)[0];
    state.finished = true;
    state.winnerId = winner?.id || "";
    state.winnerName = winner?.name || "";
    state.remaining = 0;
    state.status = winner
      ? `${reason}. ${winner.name}님 승리. 라운드를 다시 시작할 수 있습니다.`
      : `${reason}. 라운드를 다시 시작하세요.`;
    setCenter(state.status);
  }

  function updateLocalKart(player, dt) {
    const turn = Number(input.right) - Number(input.left);
    if (turn) player.angle += turn * 3.2 * dt;
    const currentSpeed = Math.hypot(player.vx || 0, player.vy || 0);
    const throttle = Number(input.up) - Number(input.down) * 0.5;
    const action = Boolean(input.action);
    const canDrift =
      action &&
      Math.abs(turn) > 0 &&
      throttle > 0 &&
      currentSpeed > 90 &&
      (player.cooldown || 0) <= 0;
    if (canDrift) {
      player.drifting = true;
      player.driftCharge = Math.min(
        1.65,
        (player.driftCharge || 0) + dt * (0.75 + currentSpeed / 440),
      );
      player.angle += turn * 0.85 * dt;
    } else if (player.actionLatch && !action) {
      if ((player.driftCharge || 0) >= 0.42) {
        player.boost = Math.min(1.6, 0.45 + player.driftCharge * 0.78);
        player.cooldown = 1.15;
        addPartyEffect({
          x: player.x,
          y: player.y,
          kind: "boost",
          color: player.color,
          ttl: 0.7,
          text: "MINI",
        });
      }
      player.driftCharge = 0;
      player.drifting = false;
    } else {
      player.drifting = false;
      if (!action)
        player.driftCharge = Math.max(0, (player.driftCharge || 0) - dt * 1.8);
    }
    player.actionLatch = action;
    player.boost = Math.max(0, (player.boost || 0) - dt);
    player.cooldown = Math.max(0, (player.cooldown || 0) - dt);
    tickKartPadCooldowns(player, dt);
    player.boosted = player.boost > 0;
    const track = state.config?.track || config.track;
    const onTrack = distanceToTrack(player.x, player.y, track) <= 62;
    const grip = player.drifting ? (onTrack ? 0.82 : 0.48) : onTrack ? 1 : 0.58;
    const boost = player.boosted ? 1.45 : 1;
    player.vx += Math.cos(player.angle) * 520 * throttle * boost * grip * dt;
    player.vy += Math.sin(player.angle) * 520 * throttle * boost * grip * dt;
    const speed = Math.hypot(player.vx, player.vy);
    const driftLimit = player.drifting ? 0.92 : 1;
    const maxSpeed = 360 * boost * driftLimit * (onTrack ? 1 : 0.68);
    if (speed > maxSpeed) {
      player.vx = (player.vx / speed) * maxSpeed;
      player.vy = (player.vy / speed) * maxSpeed;
    }
    const drag = onTrack ? 0.988 : 0.965;
    player.vx *= drag;
    player.vy *= drag;
    moveLocal(player, player.vx * dt, player.vy * dt, true);
    applyLocalKartBoostPad(player);
    updateLocalKartDraft(player, dt, onTrack);
    const target = track[player.checkpoint % track.length];
    if (distance(player.x, player.y, target[0], target[1]) < 72) {
      player.checkpoint += 1;
      player.score += 8;
      addPartyEffect({
        x: player.x,
        y: player.y,
        kind: "checkpoint",
        color: player.color,
        ttl: 0.55,
        text: "CHECK",
      });
      if (player.checkpoint >= config.track.length) {
        player.checkpoint = 0;
        player.lap += 1;
        player.score += 100;
        addPartyEffect({
          x: player.x,
          y: player.y,
          kind: "lap",
          color: player.color,
          ttl: 0.9,
          text: `${player.lap} LAP`,
        });
        state.status = `${player.lap}바퀴 완료`;
        if (player.lap >= 3) finishLocalRound("완주");
      }
    }
  }

  function updateLocalKartDraft(player, dt, onTrack) {
    if (game !== "kart" || !player.alive) return;
    const speed = Math.hypot(player.vx || 0, player.vy || 0);
    const forwardX = Math.cos(player.angle || 0);
    const forwardY = Math.sin(player.angle || 0);
    const target = (state.players || [])
      .filter((other) => other.id !== player.id && other.alive)
      .map((other) => {
        const dx = other.x - player.x;
        const dy = other.y - player.y;
        const ahead = dx * forwardX + dy * forwardY;
        const lateral = Math.abs(dx * -forwardY + dy * forwardX);
        const gap = Math.hypot(dx, dy);
        const sameDirection = Math.cos(
          (other.angle || 0) - (player.angle || 0),
        );
        return { other, ahead, lateral, gap, sameDirection };
      })
      .filter(
        (item) =>
          item.ahead > 42 &&
          item.ahead < 230 &&
          item.lateral < 74 &&
          item.gap < 240 &&
          item.sameDirection > 0.55,
      )
      .sort((a, b) => a.gap - b.gap)[0];
    const canDraft = Boolean(
      target && onTrack && speed > 118 && !player.drifting,
    );
    if (!canDraft) {
      player.drafting = false;
      player.draftCharge = Math.max(0, (player.draftCharge || 0) - dt * 0.75);
      return;
    }
    player.drafting = true;
    player.draftCharge = Math.min(1.35, (player.draftCharge || 0) + dt);
    if (player.draftCharge < 1.18) return;
    player.boost = Math.max(player.boost || 0, 1.05);
    player.draftCharge = 0;
    player.drafting = false;
    player.score += 3;
    addPartyEffect({
      x: player.x,
      y: player.y,
      kind: "draft",
      color: player.color,
      ttl: 0.72,
      text: "DRAFT",
    });
  }

  function updateLocalWalker(player, dt) {
    const dx = Number(input.right) - Number(input.left);
    const dy = Number(input.down) - Number(input.up);
    const length = Math.hypot(dx, dy) || 1;
    if (dx || dy) player.angle = Math.atan2(dy, dx);
    if (
      game === "coin" &&
      input.action &&
      (dx || dy) &&
      (player.cooldown || 0) <= 0
    ) {
      player.dash = 0.32;
      player.cooldown = 3;
      addPartyEffect({
        x: player.x,
        y: player.y,
        kind: "dash",
        color: player.color,
        ttl: 0.45,
        text: "DASH",
      });
    }
    player.dash = Math.max(0, (player.dash || 0) - dt);
    if (game === "bomb") player.boost = Math.max(0, (player.boost || 0) - dt);
    const speedBoost =
      game === "coin" && player.dash > 0
        ? 2.15
        : game === "bomb" && (player.boost || 0) > 0
          ? 1.28
          : 1;
    const speed = (game === "coin" ? 270 : 245) * speedBoost;
    const previousX = player.x;
    const previousY = player.y;
    moveLocal(
      player,
      (dx / length) * speed * dt,
      (dy / length) * speed * dt,
      false,
    );
    if (game === "bomb" && localPlayerHitsBlock(player.x, player.y)) {
      player.x = previousX;
      player.y = previousY;
    }
    const action = Boolean(input.action);
    if (game === "bomb" && !action) player.actionLatch = false;
    if (
      game === "bomb" &&
      action &&
      !player.actionLatch &&
      (player.cooldown || 0) <= 0
    ) {
      const activeBombs = state.bombs.filter(
        (bomb) =>
          bomb.ownerId === player.id && bomb.ttl > 0 && bomb.blastTtl <= 0,
      ).length;
      if (activeBombs >= (player.bombLimit || 1)) {
        player.actionLatch = true;
        player.cooldown = 0.12;
        player.cooldown = Math.max(0, (player.cooldown || 0) - dt);
        player.boosted = (player.boost || 0) > 0;
        return;
      }
      player.actionLatch = true;
      player.cooldown = 1;
      const bombX = Math.round(player.x / 40) * 40;
      const bombY = Math.round(player.y / 40) * 40;
      state.bombs.push({
        id: localIds.bomb++,
        ownerId: player.id,
        x: bombX,
        y: bombY,
        vx: 0,
        vy: 0,
        ttl: 1.9,
        blastTtl: 0,
        radius: 96 + Math.min(5, player.bombPower || 0) * 24,
      });
      addPartyEffect({
        x: bombX,
        y: bombY,
        kind: "bomb",
        color: player.color,
        ttl: 0.5,
        text: "BOMB",
      });
    }
    if (game === "bomb" && (dx || dy))
      tryKickLocalBomb(player, dx / length, dy / length);
    player.cooldown = Math.max(0, (player.cooldown || 0) - dt);
    player.boosted =
      game === "bomb" ? (player.boost || 0) > 0 : player.dash > 0;
  }

  function updateLocalSnake(player, dt) {
    const dx = Number(input.right) - Number(input.left);
    const dy = Number(input.down) - Number(input.up);
    if (dx || dy) {
      const nextAngle = Math.atan2(dy, dx);
      if (Math.cos(nextAngle - player.angle) > -0.35) player.angle = nextAngle;
    }
    if (input.action && (player.cooldown || 0) <= 0) {
      player.boost = 0.75;
      player.cooldown = 3.2;
      addPartyEffect({
        x: player.x,
        y: player.y,
        kind: "boost",
        color: player.color,
        ttl: 0.55,
        text: "SPRINT",
      });
    }
    player.boost = Math.max(0, (player.boost || 0) - dt);
    player.cooldown = Math.max(0, (player.cooldown || 0) - dt);
    player.boosted = player.boost > 0;
    player.biting = (player.biteCooldown || 0) > 0;
    const speed = 205 * (player.boosted ? 1.5 : 1);
    moveLocal(
      player,
      Math.cos(player.angle) * speed * dt,
      Math.sin(player.angle) * speed * dt,
      false,
    );
    if (
      player.x <= 18 ||
      player.x >= world.width - 18 ||
      player.y <= 18 ||
      player.y >= world.height - 18
    ) {
      if (guardLocalSnake(player, "벽")) return;
      knockLocal(player, "벽에 닿았습니다.");
    }
    player.trail.push([player.x, player.y]);
    player.trail = player.trail.slice(-(22 + Math.min(90, player.score * 2)));
    if (
      player.trail
        .slice(0, -8)
        .some(([x, y]) => distance(player.x, player.y, x, y) < 13)
    ) {
      if (guardLocalSnake(player, "꼬리")) return;
      knockLocal(player, "꼬리에 부딪혔습니다.");
    }
  }

  function refreshLocalCoinHazards() {
    updateLocalCoinHazards();
  }

  function updateLocalCoinHazards(player) {
    const t = performance.now() / 1000;
    state.hazards = [
      {
        x: world.width * 0.28 + Math.sin(t * 0.72) * 320,
        y: world.height * 0.28 + Math.cos(t * 0.5) * 210,
        radius: 64,
      },
      {
        x: world.width * 0.72 + Math.cos(t * 0.55) * 360,
        y: world.height * 0.68 + Math.sin(t * 0.68) * 260,
        radius: 76,
      },
      {
        x: world.width * 0.5 + Math.sin(t * 0.42) * 430,
        y: world.height * 0.52 + Math.cos(t * 0.61) * 300,
        radius: 58,
      },
    ];
    if (!player) return;
    for (const hazard of state.hazards) {
      if (distance(player.x, player.y, hazard.x, hazard.y) >= hazard.radius + 8)
        continue;
      if ((player.shield || 0) > 0) {
        player.shield = 0;
        addPartyEffect({
          x: player.x,
          y: player.y,
          kind: "shield",
          color: "#69dcff",
          ttl: 0.75,
          text: "SAFE",
        });
        continue;
      }
      knockLocal(player, "위험 구역에 닿았습니다.");
    }
  }

  function localCoinBanks() {
    const t = performance.now() / 1000;
    const phase = Math.floor(t / 7);
    return [
      {
        id: "bank-a",
        x: world.width * 0.24 + Math.sin(t * 0.28) * 150,
        y: world.height * 0.38 + Math.cos(t * 0.33) * 120,
        radius: 62,
        active: phase % 3 !== 1,
      },
      {
        id: "bank-b",
        x: world.width * 0.7 + Math.cos(t * 0.24) * 170,
        y: world.height * 0.32 + Math.sin(t * 0.31) * 125,
        radius: 58,
        active: phase % 3 !== 2,
      },
      {
        id: "bank-c",
        x: world.width * 0.52 + Math.sin(t * 0.2) * 210,
        y: world.height * 0.73 + Math.cos(t * 0.27) * 105,
        radius: 64,
        active: phase % 3 !== 0,
      },
    ];
  }

  function updateLocalCoinBanksForAll() {
    state.banks = localCoinBanks();
    state.players.forEach((player) => {
      if (!player.alive) return;
      tryLocalCoinBank(player);
    });
  }

  function tryLocalCoinBank(player) {
    if (game !== "coin" || (player.bankCooldown || 0) > 0) return;
    const bank = state.banks.find(
      (item) =>
        item.active &&
        distance(player.x, player.y, item.x, item.y) < item.radius,
    );
    if (!bank) return;
    const combo = player.combo || 0;
    if (combo < 3 && (player.frenzy || 0) <= 0) return;
    const cashCombo = Math.max(3, combo);
    const multiplier = (player.frenzy || 0) > 0 ? 2 : 1;
    const bonus = Math.min(70, 8 + cashCombo * 3) * multiplier;
    player.score += bonus;
    player.combo = 0;
    player.comboTimer = 0;
    player.bankCooldown = 5.5;
    addPartyEffect({
      x: bank.x,
      y: bank.y,
      kind: "bank",
      color: "#ffd166",
      ttl: 0.9,
      text: `BANK +${bonus}`,
    });
  }

  function updateLocalCoinPickups(dt) {
    const magnetPlayers = state.players.filter(
      (player) => player.alive && (player.magnet || player.magneted || 0) > 0,
    );
    if (!magnetPlayers.length) return;
    state.pickups.forEach((pickup) => {
      if (!["coin", "gem"].includes(pickup.kind)) return;
      const target = magnetPlayers
        .map((player) => ({
          player,
          gap: distance(player.x, player.y, pickup.x, pickup.y),
        }))
        .sort((a, b) => a.gap - b.gap)[0];
      if (!target || target.gap <= 1 || target.gap > 260) return;
      const pull = Math.min(
        target.gap,
        (310 + Math.max(0, 260 - target.gap) * 2.4) * dt,
      );
      pickup.x += ((target.player.x - pickup.x) / target.gap) * pull;
      pickup.y += ((target.player.y - pickup.y) / target.gap) * pull;
    });
  }

  function coinPickupScore(player, pickup) {
    player.combo = (player.comboTimer || 0) > 0 ? (player.combo || 0) + 1 : 1;
    player.comboTimer = 2.6;
    const comboBonus = Math.min(6, Math.floor((player.combo || 1) / 4));
    const multiplier = (player.frenzy || 0) > 0 ? 2 : 1;
    return Math.max(1, ((pickup.value || 1) + comboBonus) * multiplier);
  }

  function collectLocalPickups(player) {
    const coinMode = game === "coin";
    let gained = 0;
    state.pickups = state.pickups.filter((pickup) => {
      if (distance(player.x, player.y, pickup.x, pickup.y) >= 28) return true;
      if (pickup.kind === "boost") {
        player.score += 3;
        player.boosted = true;
        player.boost = 1.6;
      } else if (pickup.kind === "nitro") {
        player.score += 5;
        player.boosted = true;
        player.boost = Math.max(player.boost || 0, 2.6);
      } else if (pickup.kind === "shield") {
        player.score += 1;
        player.shield = Math.max(player.shield || 0, 5);
      } else if (pickup.kind === "magnet") {
        player.score += 2;
        player.magnet = Math.max(player.magnet || 0, 6);
      } else if (pickup.kind === "frenzy") {
        player.score += 3;
        player.frenzy = Math.max(player.frenzy || 0, 5);
        player.combo = Math.max(player.combo || 0, 3);
        player.comboTimer = 2.6;
      } else if (pickup.kind === "feast") {
        player.score += pickup.value || 8;
        player.boosted = true;
        player.boost = Math.max(player.boost || 0, 0.9);
      } else if (pickup.kind === "flame") {
        player.score += 2;
        player.bombPower = Math.min(5, (player.bombPower || 0) + 1);
      } else if (pickup.kind === "bombup") {
        player.score += 2;
        player.bombLimit = Math.min(4, (player.bombLimit || 1) + 1);
      } else if (pickup.kind === "speed") {
        player.score += 2;
        player.boosted = true;
        player.boost = Math.max(player.boost || 0, 3.2);
      } else if (pickup.kind === "kick") {
        player.score += 2;
        player.bombKick = Math.max(player.bombKick || 0, 12);
      } else {
        gained = coinMode ? coinPickupScore(player, pickup) : pickup.value || 1;
        player.score += gained;
      }
      addPartyEffect({
        x: pickup.x,
        y: pickup.y,
        kind:
          pickup.kind === "boost" ||
          pickup.kind === "nitro" ||
          pickup.kind === "shield" ||
          pickup.kind === "gem" ||
          pickup.kind === "flame" ||
          pickup.kind === "bombup" ||
          pickup.kind === "speed" ||
          pickup.kind === "kick" ||
          pickup.kind === "magnet" ||
          pickup.kind === "frenzy" ||
          pickup.kind === "feast"
            ? pickup.kind
            : "pickup",
        color:
          pickup.kind === "shield"
            ? "#69dcff"
            : pickup.kind === "flame"
              ? "#ff5f6d"
              : pickup.kind === "speed"
                ? "#42d7ff"
                : pickup.kind === "kick"
                  ? "#8be66f"
                  : pickup.kind === "magnet"
                    ? "#42d7ff"
                    : pickup.kind === "frenzy"
                      ? "#ffd166"
                      : pickup.kind === "feast"
                        ? "#ffd166"
                        : player.color,
        ttl: 0.65,
        text:
          pickup.kind === "boost"
            ? "BOOST"
            : pickup.kind === "nitro"
              ? "NITRO"
              : pickup.kind === "shield"
                ? "SHIELD"
                : pickup.kind === "flame"
                  ? `화력 ${(player.bombPower || 0) + 1}`
                  : pickup.kind === "bombup"
                    ? `폭탄 ${player.bombLimit || 1}`
                    : pickup.kind === "speed"
                      ? "SPEED"
                      : pickup.kind === "kick"
                        ? "KICK"
                        : pickup.kind === "magnet"
                          ? "MAGNET"
                          : pickup.kind === "frenzy"
                            ? "FEVER"
                            : pickup.kind === "feast"
                              ? `+${pickup.value || 8}`
                              : coinMode && (player.combo || 0) >= 4
                                ? `+${gained} x${Math.min(7, player.combo || 1)}`
                                : `+${gained || pickup.value || 1}`,
      });
      return false;
    });
  }

  function moveLocal(player, dx, dy, bounce) {
    player.x += dx;
    player.y += dy;
    if (bounce) {
      if (player.x < 18 || player.x > world.width - 18) player.vx *= -0.35;
      if (player.y < 18 || player.y > world.height - 18) player.vy *= -0.35;
    }
    player.x = clamp(player.x, 18, world.width - 18);
    player.y = clamp(player.y, 18, world.height - 18);
  }

  function knockLocal(player, reason) {
    player.alive = false;
    player.respawn = 1.7;
    player.trail = [];
    player.score = Math.max(0, player.score - 2);
    state.status = reason;
    addPartyEffect({
      x: player.x,
      y: player.y,
      kind: "down",
      color: player.color,
      ttl: 0.85,
      text: "-2",
    });
  }

  function draw() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    updateLocal(dt);
    updateCamera();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawWorld();
    renderHud();
    requestAnimationFrame(draw);
  }

  function cameraFocus() {
    return (
      state.players?.find((player) => player.id === clientId) ||
      state.players?.[0] || { x: world.width / 2, y: world.height / 2 }
    );
  }

  function updateCamera() {
    const focus = cameraFocus();
    const viewWidth = window.innerWidth / camera.scale;
    const viewHeight = window.innerHeight / camera.scale;
    const maxX = Math.max(0, world.width - viewWidth);
    const maxY = Math.max(0, world.height - viewHeight);
    const targetX = clamp(
      (focus.x || world.width / 2) - viewWidth / 2,
      0,
      maxX,
    );
    const targetY = clamp(
      (focus.y || world.height / 2) - viewHeight / 2,
      0,
      maxY,
    );
    const nextOffsetX = -targetX * camera.scale;
    const nextOffsetY = -targetY * camera.scale;
    camera.offsetX += (nextOffsetX - camera.offsetX) * 0.16;
    camera.offsetY += (nextOffsetY - camera.offsetY) * 0.16;
    if (world.width * camera.scale < window.innerWidth) {
      camera.offsetX = (window.innerWidth - world.width * camera.scale) / 2;
    }
    if (world.height * camera.scale < window.innerHeight) {
      camera.offsetY = (window.innerHeight - world.height * camera.scale) / 2;
    }
  }

  function drawWorld() {
    ctx.fillStyle =
      game === "kart"
        ? "#172231"
        : game === "bomb"
          ? "#211b2a"
          : game === "snake"
            ? "#12251d"
            : "#1c2035";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.save();
    ctx.translate(camera.offsetX, camera.offsetY);
    ctx.scale(camera.scale, camera.scale);
    drawArena();
    state.banks?.forEach(drawBank);
    state.pickups.forEach(drawPickup);
    state.hazards?.forEach(drawHazard);
    state.blocks?.forEach(drawBlock);
    state.bombs?.forEach(drawBomb);
    state.players.forEach(drawTrail);
    state.players.forEach(drawPlayer);
    (state.effects || []).forEach(drawPartyEffect);
    drawWorldAtmosphere();
    ctx.restore();
    drawMiniMap();
  }

  function drawArena() {
    const theme =
      game === "kart"
        ? ["#1c2a3b", "#26394e"]
        : game === "bomb"
          ? ["#241c2f", "#332243"]
          : game === "snake"
            ? ["#11261d", "#1d3c2a"]
            : ["#1b2138", "#2a2e51"];
    const ground = ctx.createLinearGradient(0, 0, world.width, world.height);
    ground.addColorStop(0, theme[0]);
    ground.addColorStop(1, theme[1]);
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, world.width, world.height);

    const gridSize = game === "bomb" ? 40 : game === "snake" ? 48 : 32;
    ctx.strokeStyle =
      game === "coin" ? "rgba(208,140,255,.07)" : "rgba(255,255,255,.045)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= world.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, world.height);
      ctx.stroke();
    }
    for (let y = 0; y <= world.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(world.width, y);
      ctx.stroke();
    }
    drawWorldDecorations();
    drawGameTerrain();
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, world.width - 10, world.height - 10);
    if (game !== "kart") return;
    drawKartTrack();
  }

  function drawWorldAtmosphere() {
    const pulse = 0.5 + Math.sin(performance.now() / 900) * 0.5;
    const color =
      game === "kart"
        ? "rgba(66,215,255,.08)"
        : game === "bomb"
          ? "rgba(255,186,90,.07)"
          : game === "snake"
            ? "rgba(139,230,111,.07)"
            : "rgba(208,140,255,.08)";
    for (let index = 0; index < 8; index += 1) {
      const x = 180 + ((index * 631) % (world.width - 360));
      const y = 160 + ((index * 463) % (world.height - 320));
      const radius = 150 + (index % 3) * 42 + pulse * 18;
      const gradient = ctx.createRadialGradient(x, y, 20, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWorldDecorations() {
    for (let index = 0; index < 68; index += 1) {
      const x = 100 + ((index * 317) % (world.width - 200));
      const y = 100 + ((index * 211) % (world.height - 200));
      if (game === "kart") {
        ctx.fillStyle =
          index % 2 ? "rgba(66,215,255,.18)" : "rgba(255,186,90,.16)";
        ctx.fillRect(x - 22, y - 18, 44, 36);
        ctx.strokeStyle = "rgba(255,255,255,.16)";
        ctx.strokeRect(x - 22, y - 18, 44, 36);
        ctx.fillStyle = "rgba(5,12,22,.28)";
        ctx.fillRect(x - 13, y - 8, 26, 16);
      } else if (game === "snake") {
        ctx.fillStyle = "rgba(139,230,111,.16)";
        ctx.beginPath();
        ctx.ellipse(x, y, 34, 16, (index % 5) * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(245,251,255,.10)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 24, y);
        ctx.lineTo(x + 24, y + Math.sin(index) * 8);
        ctx.stroke();
      } else if (game === "bomb") {
        ctx.fillStyle = "rgba(255,186,90,.13)";
        ctx.fillRect(x - 30, y - 20, 60, 40);
        ctx.fillStyle = "rgba(0,0,0,.18)";
        ctx.fillRect(x - 22, y - 13, 44, 26);
        ctx.strokeStyle = "rgba(255,220,150,.18)";
        ctx.strokeRect(x - 30, y - 20, 60, 40);
      } else {
        ctx.fillStyle = "rgba(208,140,255,.12)";
        ctx.fillRect(x - 28, y - 18, 56, 36);
        ctx.strokeStyle = "rgba(66,215,255,.18)";
        ctx.strokeRect(x - 28, y - 18, 56, 36);
        ctx.fillStyle = "rgba(245,251,255,.10)";
        ctx.fillRect(x - 18, y - 8, 36, 16);
      }
    }
  }

  function drawGameTerrain() {
    if (game === "bomb") {
      for (let x = 180; x < world.width - 140; x += 150) {
        for (let y = 180; y < world.height - 140; y += 150) {
          ctx.fillStyle = "rgba(5,8,16,.28)";
          ctx.fillRect(x - 30, y - 30, 60, 60);
          ctx.fillStyle = "#3f344d";
          ctx.fillRect(x - 26, y - 26, 52, 52);
          ctx.fillStyle = "rgba(255,255,255,.11)";
          ctx.fillRect(x - 26, y - 26, 52, 8);
        }
      }
      for (let index = 0; index < 62; index += 1) {
        const x = 100 + ((index * 233) % (world.width - 200));
        const y = 120 + ((index * 149) % (world.height - 240));
        ctx.fillStyle = "rgba(255,186,90,.16)";
        ctx.fillRect(x - 22, y - 18, 44, 36);
        ctx.strokeStyle = "rgba(255,220,150,.22)";
        ctx.strokeRect(x - 22, y - 18, 44, 36);
      }
      return;
    }
    if (game === "snake") {
      ctx.strokeStyle = "rgba(139,230,111,.14)";
      ctx.lineWidth = 10;
      for (let y = 120; y < world.height; y += 170) {
        ctx.beginPath();
        ctx.moveTo(70, y);
        for (let x = 70; x < world.width - 70; x += 120) {
          ctx.lineTo(x, y + Math.sin((x + y) * 0.01) * 26);
        }
        ctx.stroke();
      }
      return;
    }
    if (game === "coin") {
      for (let index = 0; index < 28; index += 1) {
        const x = 130 + ((index * 421) % (world.width - 260));
        const y = 150 + ((index * 277) % (world.height - 300));
        const gradient = ctx.createRadialGradient(x, y, 12, x, y, 78);
        gradient.addColorStop(0, "rgba(208,140,255,.20)");
        gradient.addColorStop(1, "rgba(66,215,255,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 78, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(208,140,255,.24)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 48, y - 34, 96, 68);
      }
    }
  }

  function drawKartTrack() {
    const track = state.config?.track || config.track;
    ctx.shadowColor = "rgba(0,0,0,.55)";
    ctx.shadowBlur = 24;
    ctx.strokeStyle = "rgba(12,18,28,.74)";
    ctx.lineWidth = 136;
    ctx.lineJoin = "round";
    ctx.beginPath();
    track.forEach(([x, y], index) =>
      index ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
    );
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#536072";
    ctx.lineWidth = 100;
    ctx.stroke();
    ctx.setLineDash([28, 28]);
    ctx.lineDashOffset = 0;
    ctx.strokeStyle = "rgba(255,255,255,.78)";
    ctx.lineWidth = 112;
    ctx.stroke();
    ctx.lineDashOffset = 28;
    ctx.strokeStyle = "rgba(255,95,109,.78)";
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#263244";
    ctx.lineWidth = 74;
    ctx.stroke();
    ctx.setLineDash([34, 28]);
    ctx.strokeStyle = "rgba(245,251,255,.42)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.setLineDash([]);
    track.forEach(([x, y], index) => {
      ctx.fillStyle = index === 0 ? "#f8f871" : config.accent;
      ctx.fillRect(x - 15, y - 15, 30, 30);
      ctx.strokeStyle = "rgba(0,0,0,.45)";
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 15, y - 15, 30, 30);
    });
    drawKartBoostPads(track);
    drawKartStartLine(track);
  }

  function drawKartBoostPads(track) {
    const pads = state.boostPads?.length
      ? state.boostPads
      : kartBoostPads(track);
    const pulse = 0.5 + Math.sin(performance.now() / 170) * 0.5;
    pads.forEach((pad) => {
      ctx.save();
      ctx.translate(pad.x, pad.y);
      ctx.rotate((pad.angle || 0) + Math.PI / 2);
      ctx.shadowColor = "rgba(66,215,255,.8)";
      ctx.shadowBlur = 18 + pulse * 8;
      const gradient = ctx.createLinearGradient(-46, -18, 46, 18);
      gradient.addColorStop(0, "rgba(66,215,255,.32)");
      gradient.addColorStop(0.5, "rgba(248,248,113,.82)");
      gradient.addColorStop(1, "rgba(66,215,255,.32)");
      ctx.fillStyle = gradient;
      ctx.fillRect(-46, -18, 92, 36);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(245,251,255,.72)";
      ctx.lineWidth = 3;
      ctx.strokeRect(-46, -18, 92, 36);
      ctx.fillStyle = "rgba(7,17,31,.68)";
      for (let index = -1; index <= 1; index += 1) {
        ctx.beginPath();
        ctx.moveTo(index * 24 - 8, -10);
        ctx.lineTo(index * 24 + 10, 0);
        ctx.lineTo(index * 24 - 8, 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawKartStartLine(track) {
    if (!track?.length) return;
    const start = track[0];
    const next = track[1] || [start[0] + 1, start[1]];
    const angle = Math.atan2(next[1] - start[1], next[0] - start[0]);
    ctx.save();
    ctx.translate(start[0], start[1]);
    ctx.rotate(angle + Math.PI / 2);
    const tile = 12;
    for (let row = -4; row < 4; row += 1) {
      for (let column = -1; column <= 1; column += 1) {
        ctx.fillStyle =
          (row + column) % 2 ? "rgba(7,17,31,.92)" : "rgba(245,251,255,.92)";
        ctx.fillRect(row * tile, column * tile, tile, tile);
      }
    }
    ctx.strokeStyle = "rgba(245,251,255,.65)";
    ctx.lineWidth = 3;
    ctx.strokeRect(-4 * tile, -tile, 8 * tile, 3 * tile);
    ctx.restore();
  }

  function pickupColor(pickup) {
    if (pickup.kind === "shield") return "#69dcff";
    if (pickup.kind === "nitro") return "#ffba5a";
    if (
      pickup.kind === "boost" ||
      pickup.kind === "speed" ||
      pickup.kind === "magnet"
    )
      return "#42d7ff";
    if (pickup.kind === "frenzy") return "#ffd166";
    if (pickup.kind === "flame") return "#ff5f6d";
    if (pickup.kind === "bombup") return "#f5fbff";
    if (pickup.kind === "kick") return "#8be66f";
    if (pickup.kind === "feast") return "#ffd166";
    if (pickup.kind === "gem" || pickup.value > 1) return "#ffd166";
    return "#f8f871";
  }

  function drawPickup(pickup) {
    const color = pickupColor(pickup);
    const radius =
      pickup.kind === "boost" || pickup.kind === "speed"
        ? 13
        : pickup.kind === "nitro"
          ? 14
          : pickup.kind === "flame" ||
              pickup.kind === "bombup" ||
              pickup.kind === "kick" ||
              pickup.kind === "magnet" ||
              pickup.kind === "frenzy" ||
              pickup.kind === "feast"
            ? 12
            : 10;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur =
      pickup.kind === "boost" ||
      pickup.kind === "nitro" ||
      pickup.kind === "shield" ||
      pickup.kind === "speed" ||
      pickup.kind === "flame" ||
      pickup.kind === "kick" ||
      pickup.kind === "magnet" ||
      pickup.kind === "frenzy" ||
      pickup.kind === "feast"
        ? 18
        : 10;
    ctx.fillStyle = color;
    if (pickup.kind === "gem") {
      ctx.beginPath();
      ctx.moveTo(pickup.x, pickup.y - 15);
      ctx.lineTo(pickup.x + 15, pickup.y);
      ctx.lineTo(pickup.x, pickup.y + 15);
      ctx.lineTo(pickup.x - 15, pickup.y);
      ctx.closePath();
      ctx.fill();
    } else if (pickup.kind === "shield") {
      ctx.beginPath();
      ctx.moveTo(pickup.x, pickup.y - 17);
      ctx.quadraticCurveTo(
        pickup.x + 17,
        pickup.y - 10,
        pickup.x + 13,
        pickup.y + 6,
      );
      ctx.quadraticCurveTo(
        pickup.x,
        pickup.y + 20,
        pickup.x - 13,
        pickup.y + 6,
      );
      ctx.quadraticCurveTo(
        pickup.x - 17,
        pickup.y - 10,
        pickup.x,
        pickup.y - 17,
      );
      ctx.fill();
    } else if (pickup.kind === "magnet") {
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(pickup.x - 1, pickup.y - 1, 13, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
      ctx.fillStyle = "#ff5f6d";
      ctx.fillRect(pickup.x - 15, pickup.y - 5, 7, 10);
      ctx.fillStyle = "#f5fbff";
      ctx.fillRect(pickup.x + 8, pickup.y - 5, 7, 10);
    } else if (pickup.kind === "nitro") {
      const bottle = ctx.createLinearGradient(
        pickup.x - 9,
        pickup.y - 16,
        pickup.x + 9,
        pickup.y + 16,
      );
      bottle.addColorStop(0, "#f8f871");
      bottle.addColorStop(0.45, "#ffba5a");
      bottle.addColorStop(1, "#ff5f6d");
      ctx.fillStyle = bottle;
      ctx.beginPath();
      ctx.roundRect?.(pickup.x - 9, pickup.y - 15, 18, 30, 5);
      if (!ctx.roundRect) ctx.rect(pickup.x - 9, pickup.y - 15, 18, 30);
      ctx.fill();
      ctx.fillStyle = "#f5fbff";
      ctx.fillRect(pickup.x - 5, pickup.y - 20, 10, 6);
      ctx.strokeStyle = "rgba(7,17,31,.68)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pickup.x - 4, pickup.y + 8);
      ctx.lineTo(pickup.x + 7, pickup.y - 2);
      ctx.lineTo(pickup.x + 1, pickup.y - 2);
      ctx.lineTo(pickup.x + 5, pickup.y - 10);
      ctx.stroke();
    } else if (pickup.kind === "frenzy") {
      ctx.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const angle = -Math.PI / 2 + (point * Math.PI * 2) / 10;
        const distanceFromCenter = point % 2 ? 7 : 17;
        const px = pickup.x + Math.cos(angle) * distanceFromCenter;
        const py = pickup.y + Math.sin(angle) * distanceFromCenter;
        if (point) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ff5f6d";
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (pickup.kind === "feast") {
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8be66f";
      ctx.beginPath();
      ctx.arc(pickup.x - 5, pickup.y - 4, 5, 0, Math.PI * 2);
      ctx.arc(pickup.x + 6, pickup.y + 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(7,17,31,.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 9, 0.35, Math.PI * 1.6);
      ctx.stroke();
    } else if (pickup.kind === "flame") {
      ctx.beginPath();
      ctx.moveTo(pickup.x, pickup.y - 18);
      ctx.bezierCurveTo(
        pickup.x + 18,
        pickup.y - 4,
        pickup.x + 10,
        pickup.y + 15,
        pickup.x,
        pickup.y + 18,
      );
      ctx.bezierCurveTo(
        pickup.x - 12,
        pickup.y + 12,
        pickup.x - 16,
        pickup.y - 3,
        pickup.x,
        pickup.y - 18,
      );
      ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.ellipse(pickup.x, pickup.y + 5, 6, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (pickup.kind === "bombup") {
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = "900 15px Malgun Gothic, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", pickup.x, pickup.y + 1);
    } else if (pickup.kind === "kick") {
      ctx.fillStyle = "#12251d";
      ctx.beginPath();
      ctx.roundRect?.(pickup.x - 15, pickup.y - 14, 30, 28, 7);
      if (!ctx.roundRect) ctx.rect(pickup.x - 15, pickup.y - 14, 30, 28);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(pickup.x - 9, pickup.y + 3);
      ctx.lineTo(pickup.x + 2, pickup.y + 3);
      ctx.lineTo(pickup.x + 2, pickup.y - 8);
      ctx.lineTo(pickup.x + 12, pickup.y + 1);
      ctx.lineTo(pickup.x + 2, pickup.y + 10);
      ctx.lineTo(pickup.x + 2, pickup.y + 5);
      ctx.lineTo(pickup.x - 9, pickup.y + 5);
      ctx.closePath();
      ctx.fill();
    } else if (pickup.kind === "speed") {
      ctx.beginPath();
      ctx.moveTo(pickup.x - 13, pickup.y - 12);
      ctx.lineTo(pickup.x + 2, pickup.y);
      ctx.lineTo(pickup.x - 13, pickup.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pickup.x + 2, pickup.y - 12);
      ctx.lineTo(pickup.x + 17, pickup.y);
      ctx.lineTo(pickup.x + 2, pickup.y + 12);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    if (pickup.kind === "boost" || pickup.kind === "speed") {
      ctx.fillStyle = "rgba(5,12,22,.72)";
      ctx.beginPath();
      ctx.moveTo(pickup.x - 5, pickup.y - 8);
      ctx.lineTo(pickup.x + 9, pickup.y);
      ctx.lineTo(pickup.x - 5, pickup.y + 8);
      ctx.fill();
    } else if (pickup.kind === "shield") {
      ctx.strokeStyle = "rgba(5,12,22,.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y - 2, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHazard(hazard) {
    const pulse = 0.5 + Math.sin(performance.now() / 180) * 0.5;
    ctx.save();
    ctx.shadowColor = "rgba(255,95,109,.8)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = `rgba(255,95,109,${0.18 + pulse * 0.08})`;
    ctx.strokeStyle = "#ff5f6d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.24)";
    ctx.lineWidth = 2;
    for (let index = 0; index < 8; index += 1) {
      const angle = index * (Math.PI / 4) + performance.now() / 900;
      ctx.beginPath();
      ctx.moveTo(
        hazard.x + Math.cos(angle) * hazard.radius * 0.32,
        hazard.y + Math.sin(angle) * hazard.radius * 0.32,
      );
      ctx.lineTo(
        hazard.x + Math.cos(angle) * hazard.radius,
        hazard.y + Math.sin(angle) * hazard.radius,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBank(bank) {
    if (game !== "coin") return;
    const pulse = 0.5 + Math.sin(performance.now() / 240) * 0.5;
    const alpha = bank.active ? 0.2 + pulse * 0.1 : 0.08;
    ctx.save();
    ctx.shadowColor = bank.active
      ? "rgba(255,209,102,.8)"
      : "rgba(105,220,255,.28)";
    ctx.shadowBlur = bank.active ? 24 : 8;
    ctx.fillStyle = bank.active
      ? `rgba(255,209,102,${alpha})`
      : "rgba(105,220,255,.08)";
    ctx.strokeStyle = bank.active ? "#ffd166" : "rgba(245,251,255,.3)";
    ctx.lineWidth = bank.active ? 4 : 2;
    ctx.beginPath();
    ctx.arc(bank.x, bank.y, bank.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = bank.active ? "#ffd166" : "rgba(245,251,255,.45)";
    ctx.font = "900 15px Malgun Gothic, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(bank.active ? "BANK" : "휴식", bank.x, bank.y);
    ctx.strokeStyle = "rgba(245,251,255,.28)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(bank.x, bank.y, bank.radius + 12 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawBlock(block) {
    const size = block.size || 46;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.46)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(6,8,16,.36)";
    ctx.fillRect(block.x - size / 2 + 5, block.y - size / 2 + 8, size, size);
    const gradient = ctx.createLinearGradient(
      block.x - size / 2,
      block.y - size / 2,
      block.x + size / 2,
      block.y + size / 2,
    );
    gradient.addColorStop(0, "#7a5a3b");
    gradient.addColorStop(0.48, "#5d3d2b");
    gradient.addColorStop(1, "#2d2230");
    ctx.fillStyle = gradient;
    ctx.fillRect(block.x - size / 2, block.y - size / 2, size, size);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,220,150,.32)";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      block.x - size / 2 + 3,
      block.y - size / 2 + 3,
      size - 6,
      size - 6,
    );
    ctx.strokeStyle = "rgba(0,0,0,.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(block.x - size / 2 + 8, block.y);
    ctx.lineTo(block.x + size / 2 - 8, block.y);
    ctx.moveTo(block.x, block.y - size / 2 + 8);
    ctx.lineTo(block.x, block.y + size / 2 - 8);
    ctx.stroke();
    ctx.restore();
  }

  function drawBomb(bomb) {
    if (bomb.blastTtl > 0) {
      const alpha = Math.max(0.18, Math.min(0.48, bomb.blastTtl / 0.35));
      ctx.save();
      ctx.shadowColor = "rgba(255,186,90,.9)";
      ctx.shadowBlur = 24;
      ctx.fillStyle = `rgba(255,186,90,${alpha})`;
      ctx.fillRect(bomb.x - bomb.radius, bomb.y - 24, bomb.radius * 2, 48);
      ctx.fillRect(bomb.x - 24, bomb.y - bomb.radius, 48, bomb.radius * 2);
      ctx.fillStyle = `rgba(255,95,109,${alpha + 0.12})`;
      ctx.beginPath();
      ctx.arc(bomb.x, bomb.y, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    const moveSpeed = Math.hypot(bomb.vx || 0, bomb.vy || 0);
    if (moveSpeed > 24) {
      ctx.strokeStyle = "rgba(139,230,111,.62)";
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bomb.x, bomb.y);
      ctx.lineTo(
        bomb.x - ((bomb.vx || 0) / moveSpeed) * 30,
        bomb.y - ((bomb.vy || 0) / moveSpeed) * 30,
      );
      ctx.stroke();
    }
    ctx.shadowColor = "rgba(0,0,0,.65)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,.28)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bomb.x - 4, bomb.y - 5, 6, Math.PI, Math.PI * 1.7);
    ctx.stroke();
    ctx.fillStyle = "#ffba5a";
    ctx.fillRect(bomb.x - 8, bomb.y - 25, 16 * Math.max(0, bomb.ttl / 1.9), 4);
    ctx.restore();
  }

  function drawTrail(player) {
    if (!player.trail?.length) return;
    ctx.save();
    ctx.strokeStyle = player.color;
    ctx.globalAlpha = game === "snake" ? 0.78 : 0.34;
    ctx.lineWidth = game === "snake" ? 18 : 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    player.trail.forEach(([x, y], index) =>
      index ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
    );
    ctx.stroke();
    if (game === "snake") {
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = "#f5fbff";
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlayer(player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle || 0);
    ctx.globalAlpha = player.alive ? 1 : 0.38;
    const speed = Math.hypot(player.vx || 0, player.vy || 0);
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath();
    ctx.ellipse(0, 16, 30, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (game === "kart") {
      if (speed > 130 || player.boosted) {
        ctx.fillStyle = player.boosted
          ? "rgba(255,186,90,.42)"
          : "rgba(245,251,255,.18)";
        for (let streak = 0; streak < 3; streak += 1) {
          ctx.fillRect(-46 - streak * 18, -10 + streak * 8, 26, 3);
        }
      }
      if (player.drifting) {
        const charge = clamp(player.driftCharge || 0, 0, 1.65);
        ctx.fillStyle =
          charge > 1 ? "rgba(255,210,90,.78)" : "rgba(66,215,255,.58)";
        for (let puff = 0; puff < 4; puff += 1) {
          const side = puff % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.arc(
            -34 - puff * 7,
            side * (15 + charge * 3),
            5 + charge * 3,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      if (player.drafting || (player.draftCharge || 0) > 0.08) {
        const charge = clamp(player.draftCharge || 0, 0, 1.18);
        ctx.strokeStyle = `rgba(66,215,255,${0.35 + charge * 0.38})`;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        for (let line = 0; line < 4; line += 1) {
          const offset = -18 + line * 12;
          ctx.beginPath();
          ctx.moveTo(-62, offset);
          ctx.lineTo(-34 - charge * 12, offset * 0.35);
          ctx.stroke();
        }
      }
      const body = ctx.createLinearGradient(-28, -18, 28, 18);
      body.addColorStop(0, "#07111f");
      body.addColorStop(0.45, player.color);
      body.addColorStop(1, "#0b1220");
      ctx.fillStyle = "#07111f";
      ctx.fillRect(-30, -17, 60, 34);
      ctx.fillStyle = body;
      ctx.fillRect(-18, -13, 35, 26);
      ctx.fillStyle = "rgba(255,255,255,.20)";
      ctx.fillRect(-20, -23, 27, 11);
      ctx.fillStyle = "rgba(7,17,31,.72)";
      ctx.fillRect(-6, -19, 14, 8);
      ctx.strokeStyle = "rgba(245,251,255,.24)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-30, -17, 60, 34);
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(-25, -20, 10, 7);
      ctx.fillRect(-25, 13, 10, 7);
      ctx.fillRect(15, -20, 10, 7);
      ctx.fillRect(15, 13, 10, 7);
      ctx.fillStyle = player.boosted ? "#f8f871" : "#f5fbff";
      ctx.fillRect(14, -5, 13, 10);
      ctx.fillStyle = "#ff5f6d";
      ctx.fillRect(-31, -8, 5, 5);
      ctx.fillRect(-31, 3, 5, 5);
      if (player.boosted) {
        ctx.fillStyle = "rgba(255,186,90,.75)";
        ctx.beginPath();
        ctx.moveTo(-30, -8);
        ctx.lineTo(-55, 0);
        ctx.lineTo(-30, 8);
        ctx.fill();
      }
    } else if (game === "snake") {
      if (player.boosted) {
        ctx.strokeStyle = "rgba(248,248,113,.86)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 34, -0.8, 0.8);
        ctx.stroke();
      }
      if (player.biting) {
        ctx.strokeStyle = "rgba(255,95,109,.92)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(16, 0, 18, -0.75, 0.75);
        ctx.stroke();
      }
      if (player.shielded || (player.shield || 0) > 0) {
        ctx.strokeStyle = "rgba(105,220,255,.92)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 35, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(7,17,31,.55)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(-2, 0, 29, -0.5, 0.5);
      ctx.stroke();
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.34)";
      ctx.beginPath();
      ctx.ellipse(4, -7, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#07111f";
      ctx.beginPath();
      ctx.arc(12, -6, 3, 0, Math.PI * 2);
      ctx.arc(12, 6, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255,255,255,.18)";
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      if (game === "coin" && player.boosted) {
        ctx.strokeStyle = "rgba(208,140,255,.82)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 29, -0.9, 0.9);
        ctx.stroke();
      }
      if (game === "coin" && (player.magnet || 0) > 0) {
        ctx.strokeStyle = "rgba(66,215,255,.74)";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 43, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (game === "coin" && (player.frenzy || 0) > 0) {
        ctx.strokeStyle = "rgba(255,209,102,.9)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 38, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (game === "coin" && (player.shielded || player.shield > 0)) {
        ctx.strokeStyle = "rgba(105,220,255,.9)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 34, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(5, -4, 13, 8);
      if (game === "bomb") {
        ctx.fillStyle = "rgba(7,17,31,.55)";
        ctx.fillRect(-22, -22, 12, 44);
        ctx.strokeStyle = "#ffba5a";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(-2, 0, 25, -0.7, 0.7);
        ctx.stroke();
        ctx.fillStyle = "#f8f871";
        ctx.fillRect(-13, -17, 11, 8);
        ctx.fillRect(-13, 9, 11, 8);
        if ((player.bombPower || 0) > 0) {
          ctx.strokeStyle = "#ff5f6d";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, 30 + Math.min(5, player.bombPower) * 2, -0.8, 0.8);
          ctx.stroke();
        }
        if ((player.bombLimit || 1) > 1) {
          ctx.fillStyle = "#f5fbff";
          for (
            let index = 0;
            index < Math.min(4, player.bombLimit);
            index += 1
          ) {
            ctx.beginPath();
            ctx.arc(-14 + index * 8, 28, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (player.boosted) {
          ctx.strokeStyle = "rgba(66,215,255,.85)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, 34, -0.95, 0.95);
          ctx.stroke();
        }
        if ((player.bombKick || 0) > 0) {
          ctx.strokeStyle = "rgba(139,230,111,.9)";
          ctx.lineWidth = 4;
          ctx.setLineDash([9, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, 39, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        ctx.fillStyle = "rgba(245,251,255,.22)";
        ctx.beginPath();
        ctx.arc(-7, -8, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.fillStyle = "#f5fbff";
    ctx.font = "12px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(player.name || "Player", player.x, player.y - 28);
  }

  function drawPartyEffect(effect) {
    const alpha = clamp((effect.ttl || 0) / 0.9, 0.08, 1);
    const color = effect.color || config.accent;
    const lift = (1 - alpha) * 32;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    if (["blast", "down"].includes(effect.kind)) {
      ctx.strokeStyle = effect.kind === "blast" ? "#ffba5a" : "#ff5f6d";
      ctx.lineWidth = effect.kind === "blast" ? 8 : 5;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 46 + (1 - alpha) * 42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,95,109,${0.2 * alpha})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 24 + (1 - alpha) * 20, 0, Math.PI * 2);
      ctx.fill();
    } else if (
      [
        "boost",
        "nitro",
        "pad",
        "dash",
        "lap",
        "checkpoint",
        "draft",
        "respawn",
        "shield",
        "gem",
        "flame",
        "bombup",
        "speed",
        "magnet",
        "frenzy",
        "feast",
        "chain",
      ].includes(effect.kind)
    ) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 26 + (1 - alpha) * 28, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 12 + (1 - alpha) * 18, 0, Math.PI * 2);
      ctx.fill();
    }
    if (effect.text) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#f5fbff";
      ctx.font = `900 ${effect.kind === "lap" ? 22 : 16}px Malgun Gothic, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(7,17,31,.78)";
      ctx.strokeText(effect.text, effect.x, effect.y - 28 - lift);
      ctx.fillText(effect.text, effect.x, effect.y - 28 - lift);
    }
    ctx.restore();
  }

  function drawMiniMap() {
    const mapScale = Math.min(210 / world.width, 132 / world.height);
    const width = world.width * mapScale;
    const height = world.height * mapScale;
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
    const theme =
      game === "kart"
        ? "rgba(66,215,255,.08)"
        : game === "bomb"
          ? "rgba(255,186,90,.08)"
          : game === "snake"
            ? "rgba(139,230,111,.08)"
            : "rgba(208,140,255,.08)";
    ctx.fillStyle = theme;
    ctx.fillRect(x + 3, y + 3, width - 6, height - 6);
    if (game === "kart") {
      drawMiniMapTrack(x, y, mapScale);
      const pads = state.boostPads?.length ? state.boostPads : kartBoostPads();
      pads.forEach((pad) => {
        ctx.fillStyle = "#f8f871";
        ctx.fillRect(x + pad.x * mapScale - 2, y + pad.y * mapScale - 2, 4, 4);
      });
    }
    state.banks?.forEach((bank) => {
      ctx.strokeStyle = bank.active
        ? "rgba(255,209,102,.9)"
        : "rgba(245,251,255,.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(
        x + bank.x * mapScale,
        y + bank.y * mapScale,
        Math.max(3, bank.radius * mapScale),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    });
    state.hazards?.forEach((hazard) => {
      ctx.strokeStyle = "rgba(255,95,109,.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(
        x + hazard.x * mapScale,
        y + hazard.y * mapScale,
        Math.max(3, hazard.radius * mapScale),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    });
    state.blocks?.slice(0, 60).forEach((block) => {
      ctx.fillStyle = "rgba(255,186,90,.62)";
      const size = Math.max(2, (block.size || 46) * mapScale);
      ctx.fillRect(
        x + block.x * mapScale - size / 2,
        y + block.y * mapScale - size / 2,
        size,
        size,
      );
    });
    state.bombs?.forEach((bomb) => {
      ctx.fillStyle = bomb.blastTtl > 0 ? "#ff5f6d" : "#ffba5a";
      ctx.fillRect(x + bomb.x * mapScale - 2, y + bomb.y * mapScale - 2, 4, 4);
    });
    state.pickups.slice(0, 36).forEach((pickup) => {
      ctx.fillStyle = pickupColor(pickup);
      ctx.beginPath();
      ctx.arc(
        x + pickup.x * mapScale,
        y + pickup.y * mapScale,
        2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
    state.players.forEach((player) => {
      ctx.fillStyle = player.alive ? player.color : "rgba(255,255,255,.32)";
      ctx.beginPath();
      ctx.arc(
        x + player.x * mapScale,
        y + player.y * mapScale,
        player.id === clientId ? 4 : 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
    const viewLeft = Math.max(0, -camera.offsetX / camera.scale);
    const viewTop = Math.max(0, -camera.offsetY / camera.scale);
    ctx.strokeStyle = "rgba(255,255,255,.82)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      x + viewLeft * mapScale,
      y + viewTop * mapScale,
      Math.min(width, (window.innerWidth / camera.scale) * mapScale),
      Math.min(height, (window.innerHeight / camera.scale) * mapScale),
    );
    ctx.fillStyle = "#eef6ff";
    ctx.font = "700 11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("미니맵", x + 8, y + 15);
    ctx.restore();
  }

  function drawMiniMapTrack(x, y, mapScale) {
    const track = state.config?.track || config.track;
    if (!track?.length) return;
    ctx.strokeStyle = "rgba(245,251,255,.46)";
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    track.forEach(([pointX, pointY], index) =>
      index
        ? ctx.lineTo(x + pointX * mapScale, y + pointY * mapScale)
        : ctx.moveTo(x + pointX * mapScale, y + pointY * mapScale),
    );
    ctx.closePath();
    ctx.stroke();
  }

  function playerScoreLabel(player) {
    const score = player.score || 0;
    if (game === "kart") {
      const draft =
        (player.draftCharge || 0) > 0
          ? ` · 드래프트 ${Math.round(clamp(player.draftCharge || 0, 0, 1.18) * 85)}%`
          : "";
      return `${player.lap || 0}L · ${score}${draft}`;
    }
    if (game === "bomb") {
      const kick =
        (player.bombKick || 0) > 0 ? ` · 킥 ${Math.ceil(player.bombKick)}` : "";
      return `${score} · 화력 ${(player.bombPower || 0) + 1} · 폭탄 ${player.bombLimit || 1}${kick}`;
    }
    if (game === "coin") {
      const combo = player.combo || 0;
      const badges = [];
      if (combo >= 2) badges.push(`${combo}콤보`);
      if ((player.magnet || 0) > 0) badges.push("자석");
      if ((player.frenzy || 0) > 0) badges.push("피버");
      if ((player.bankCooldown || 0) > 0)
        badges.push(`은행 ${Math.ceil(player.bankCooldown)}`);
      return badges.length ? `${score} · ${badges.join(" · ")}` : `${score}`;
    }
    return `${score}`;
  }

  function renderHud() {
    const players = rankPlayers(state.players || []);
    const me = state.players?.find((player) => player.id === clientId);
    ui.mode.textContent = isSolo ? "혼자" : state.isHost ? "방장" : "참가";
    ui.time.textContent = Number.isFinite(Number(state.remaining))
      ? `${state.remaining}s`
      : "-";
    ui.status.textContent = state.status || config.goal;
    ui.restart.disabled = !isSolo && !state.isHost;
    if (state.finished) {
      const key = `${state.startedAt || state.startedAtMs || ""}:${state.winnerId || ""}`;
      if (key !== finishNoticeKey) {
        finishNoticeKey = key;
        setCenter(state.status || "라운드가 종료되었습니다.");
      }
    } else {
      finishNoticeKey = "";
    }
    ui.players.innerHTML =
      players
        .map(
          (player, index) =>
            `<li class="${player.id === me?.id ? "me" : ""}"><span><i style="background:${player.color}"></i>${index + 1}. ${escapeHtml(player.name)}${player.isHost ? " · 방장" : ""}</span><strong>${playerScoreLabel(player)}</strong></li>`,
        )
        .join("") || "<li>참가자 없음</li>";
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    camera.scale =
      window.innerWidth <= 560 ? 0.46 : window.innerWidth <= 900 ? 0.6 : 0.78;
    updateCamera();
  }

  function cleanName(value) {
    return (
      String(value || "Player")
        .trim()
        .slice(0, 18) || "Player"
    );
  }

  function distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function distanceToSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lengthSq = abx * abx + aby * aby;
    if (!lengthSq) return distance(px, py, ax, ay);
    const ratio = clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1);
    return distance(px, py, ax + abx * ratio, ay + aby * ratio);
  }

  function distanceToTrack(px, py, points) {
    if (!points?.length) return 0;
    let closest = Infinity;
    for (let index = 0; index < points.length; index += 1) {
      const start = points[index];
      const end = points[(index + 1) % points.length];
      closest = Math.min(
        closest,
        distanceToSegment(px, py, start[0], start[1], end[0], end[1]),
      );
    }
    return closest;
  }

  function inBombBlast(px, py, bx, by, radius) {
    const lane = 26;
    if (distance(px, py, bx, by) <= 34) return true;
    return (
      (Math.abs(py - by) <= lane && Math.abs(px - bx) <= radius) ||
      (Math.abs(px - bx) <= lane && Math.abs(py - by) <= radius)
    );
  }

  function localPlayerHitsBlock(x, y) {
    if (game !== "bomb") return false;
    return (state.blocks || []).some((block) => {
      const size = block.size || 46;
      return (
        Math.abs(x - block.x) < size / 2 + 18 &&
        Math.abs(y - block.y) < size / 2 + 18
      );
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value || "").replace(
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

  function copyText(text) {
    if (navigator.clipboard?.writeText)
      return navigator.clipboard
        .writeText(text)
        .catch(() => fallbackCopy(text));
    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok
      ? Promise.resolve()
      : Promise.reject(new Error("클립보드 권한을 확인하세요."));
  }

  function setKey(event, pressed) {
    if (event.target instanceof HTMLInputElement) return;
    const key = event.key.toLowerCase();
    if (["arrowup", "w"].includes(key)) input.up = pressed;
    if (["arrowdown", "s"].includes(key)) input.down = pressed;
    if (["arrowleft", "a"].includes(key)) input.left = pressed;
    if (["arrowright", "d"].includes(key)) input.right = pressed;
    if (key === " ") {
      input.action = pressed;
      event.preventDefault();
    }
    if (pressed && key === "r") restartRound();
    if (!isSolo) sendInput();
  }

  function setControl(control, pressed) {
    if (!["up", "down", "left", "right", "action"].includes(control)) return;
    input[control] = pressed;
    if (!isSolo) sendInput();
  }

  ui.panelToggle.onclick = () => {
    const collapsed = ui.panel.classList.toggle("collapsed");
    ui.panelToggle.setAttribute("aria-expanded", String(!collapsed));
  };
  ui.helpToggle.onclick = () => ui.help.classList.toggle("hidden");
  ui.form.addEventListener("submit", (event) => {
    event.preventDefault();
    connect();
  });
  ui.disconnect.onclick = disconnect;
  ui.restart.onclick = restartRound;
  ui.netToggle.onclick = () => {
    const collapsed = ui.netPanel.classList.toggle("collapsed");
    ui.netToggle.setAttribute("aria-expanded", String(!collapsed));
  };
  ui.netCopy.onclick = () => {
    if (!latestShareUrl) return;
    copyText(latestShareUrl)
      .then(() => {
        ui.netCopy.textContent = "복사되었습니다";
        setTimeout(() => (ui.netCopy.textContent = "초대 링크 복사"), 1400);
      })
      .catch((error) => setCenter("복사 실패: " + error.message, 1800));
  };
  document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control || "";
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      setControl(control, true);
      button.classList.add("active");
    });
    const release = (event) => {
      event.preventDefault();
      setControl(control, false);
      button.classList.remove("active");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
  });
  ui.serverUrl.addEventListener("input", () => updateNetInfo());
  window.addEventListener("keydown", (event) => setKey(event, true));
  window.addEventListener("keyup", (event) => setKey(event, false));
  window.addEventListener("resize", resize);
  setInterval(sendInput, 80);

  ui.name.value = localStorage.getItem("party_name") || "Player";
  ui.serverUrl.value =
    params.has("host") || params.has("port") || params.has("room")
      ? defaultServerUrl()
      : savedServerUrl() || defaultServerUrl();
  if (isSolo) {
    ui.serverUrl.disabled = true;
    ui.serverUrl.value = "혼자하기: 서버 연결 없음";
    ui.connect.textContent = "혼자 시작";
    ui.disconnect.style.display = "none";
    startSolo();
  } else {
    setStatus("연결 대기", false);
    setCenter(`연결하면 ${config.name}이 시작됩니다.`);
  }
  updateNetInfo();
  resize();
  draw();
  if (!isSolo && params.get("auto") === "1") connect();
})();
