(() => {
  const params = new URLSearchParams(window.location.search);
  const isSolo = ["solo", "local"].includes(params.get("mode") || "");
  const assetVersion = params.get("v") || "20260530h";
  const world = { width: 1280, height: 832, cell: 32, columns: 40, rows: 26 };
  let defenseMaps = {
    classic: {
      name: "기본 우회로",
      baseHealth: 20,
      startResources: 180,
      pathPoints: [
        [0, 12],
        [8, 12],
        [8, 5],
        [18, 5],
        [18, 18],
        [30, 18],
        [30, 10],
        [39, 10],
      ],
    },
    harbor: {
      name: "항구 지그재그",
      baseHealth: 22,
      startResources: 170,
      pathPoints: [
        [0, 6],
        [7, 6],
        [7, 20],
        [15, 20],
        [15, 8],
        [25, 8],
        [25, 17],
        [39, 17],
      ],
    },
    lava: {
      name: "용암 협곡",
      baseHealth: 18,
      startResources: 200,
      pathPoints: [
        [0, 18],
        [5, 18],
        [5, 4],
        [13, 4],
        [13, 22],
        [23, 22],
        [23, 10],
        [32, 10],
        [32, 15],
        [39, 15],
      ],
    },
  };
  let pathPoints = defenseMaps.classic.pathPoints;
  let towerTypes = {
    basic: {
      name: "기본탄",
      cost: 60,
      range: 140,
      damage: 17,
      cooldown: 0.48,
      color: "#62e6ff",
      desc: "빠른 단일 공격",
    },
    slow: {
      name: "감속",
      cost: 85,
      range: 130,
      damage: 8,
      cooldown: 0.72,
      slow: 1.4,
      color: "#8be66f",
      desc: "적 이동 속도 감소",
    },
    blast: {
      name: "폭발",
      cost: 110,
      range: 125,
      damage: 13,
      cooldown: 1.15,
      splash: 58,
      color: "#ffba5a",
      desc: "범위 피해",
    },
    sniper: {
      name: "저격",
      cost: 135,
      range: 230,
      damage: 55,
      cooldown: 1.7,
      color: "#c8f7ff",
      desc: "긴 사거리 고화력",
    },
    boost: {
      name: "증폭기",
      cost: 95,
      range: 115,
      damage: 0,
      cooldown: 9.9,
      boost: 1.18,
      color: "#d08cff",
      desc: "주변 타워 강화",
    },
  };
  let enemyTypes = {
    normal: { name: "일반", color: "#ff5f6d" },
    runner: { name: "질주", color: "#ff8b52" },
    tank: { name: "중장갑", color: "#b58cff" },
    shield: { name: "보호막", color: "#6fe8ff" },
    boss: { name: "보스", color: "#ffd166" },
  };

  const shell = document.querySelector(".arena-shell");
  shell.className = "defense-shell";
  shell.innerHTML = `
    <canvas id="defenseCanvas" class="defense-canvas" aria-label="웨이브 디펜스 전장"></canvas>
    <section class="hud defense-panel" id="defensePanel" aria-label="웨이브 디펜스 조작">
      <div class="brand">
        <span class="brand-mark defense-mark"></span>
        <div>
          <h1>웨이브 디펜스</h1>
          <p id="defenseStatus">준비 중</p>
        </div>
        <button id="defenseHelpToggle" class="hud-toggle defense-help-toggle" type="button" title="사용 방법" aria-label="사용 방법">?</button>
        <button id="defensePanelToggle" class="hud-toggle" type="button" aria-label="패널 접기" aria-expanded="true"><span></span><span></span><span></span></button>
      </div>
      <form id="defenseConnectForm" class="connect-form">
        <label>
          이름
          <input id="defenseName" maxlength="18" autocomplete="nickname" placeholder="플레이어" />
        </label>
        <label>
          서버 주소
          <input id="defenseServerUrl" placeholder="ws://host:7000/defense" />
        </label>
        <div class="button-row">
          <button id="defenseConnect" type="submit">연결</button>
          <button id="defenseDisconnect" type="button">해제</button>
        </div>
      </form>
      <div class="defense-config">
        <label>
          맵
          <select id="defenseMapSelect"></select>
        </label>
        <p id="defenseMapHint">1웨이브 시작 전, 타워 배치 전에만 변경할 수 있습니다.</p>
      </div>
      <div class="defense-help hidden" id="defenseHelp">
        <p>타워를 선택한 뒤 경로가 아닌 칸을 클릭해 배치합니다. 방장은 첫 웨이브를 시작하고, 이후에는 준비 시간이 끝나면 자동으로 다음 웨이브가 시작됩니다.</p>
        <p>자원은 개인별로 관리되며 자신의 타워만 업그레이드하거나 판매할 수 있습니다. 증폭기는 주변 타워의 공격 효율을 높입니다.</p>
        <p>맵은 1웨이브 시작 전, 타워 배치 전에만 변경할 수 있습니다. 멀티는 같은 방 참가자와 동기화되고, 혼자하기는 서버 없이 현재 브라우저 또는 EXE 안에서 실행됩니다.</p>
      </div>
    </section>
    <section class="hud defense-stats" aria-label="게임 상태">
      <h2>상태</h2>
      <div class="defense-readout">
        <span>모드<strong id="defenseMode">-</strong></span>
        <span>웨이브<strong id="defenseWave">0/10</strong></span>
        <span>기지<strong id="defenseBase">20</strong></span>
        <span>자원<strong id="defenseResources">0</strong></span>
        <span>자동<strong id="defenseAutoStart">-</strong></span>
      </div>
      <p id="defenseWavePreview" class="defense-wave-preview">다음 웨이브 정보 없음</p>
      <ol id="defensePlayers" class="defense-players"></ol>
    </section>
    <section class="hud defense-toolbar" aria-label="타워 조작">
      <div class="defense-towers" id="defenseTowerButtons"></div>
      <div class="defense-actions">
        <button id="defenseStartWave" type="button">웨이브 시작</button>
        <button id="defenseUpgrade" type="button">업그레이드</button>
        <button id="defenseSell" type="button">판매</button>
      </div>
      <p id="defenseSelection">타워를 선택하세요.</p>
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
    <div id="centerMessage" class="center-message">타워를 배치하고 웨이브를 시작하세요.</div>
  `;
  document.title = "웨이브 디펜스";

  const canvas = document.getElementById("defenseCanvas");
  const ctx = canvas.getContext("2d");
  const ui = {
    panel: document.getElementById("defensePanel"),
    panelToggle: document.getElementById("defensePanelToggle"),
    helpToggle: document.getElementById("defenseHelpToggle"),
    help: document.getElementById("defenseHelp"),
    form: document.getElementById("defenseConnectForm"),
    name: document.getElementById("defenseName"),
    serverUrl: document.getElementById("defenseServerUrl"),
    mapSelect: document.getElementById("defenseMapSelect"),
    mapHint: document.getElementById("defenseMapHint"),
    connect: document.getElementById("defenseConnect"),
    disconnect: document.getElementById("defenseDisconnect"),
    status: document.getElementById("defenseStatus"),
    mode: document.getElementById("defenseMode"),
    wave: document.getElementById("defenseWave"),
    base: document.getElementById("defenseBase"),
    resources: document.getElementById("defenseResources"),
    autoStart: document.getElementById("defenseAutoStart"),
    wavePreview: document.getElementById("defenseWavePreview"),
    players: document.getElementById("defensePlayers"),
    towers: document.getElementById("defenseTowerButtons"),
    startWave: document.getElementById("defenseStartWave"),
    upgrade: document.getElementById("defenseUpgrade"),
    sell: document.getElementById("defenseSell"),
    selection: document.getElementById("defenseSelection"),
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

  let pathCells = buildPathCells(pathPoints);
  let pathPixels = pathPoints.map(([x, y]) => cellCenter(x, y));
  let socket = null;
  let clientId = isSolo ? "local" : "";
  let selectedTowerType = "basic";
  let selectedTowerId = null;
  let hoverCell = null;
  let lastFrame = performance.now();
  let latestShareUrl = "";
  let centerTimer = 0;
  let lastPingKey = "";
  let lastPingSeenAt = 0;
  let camera = { scale: 1, offsetX: 0, offsetY: 0 };
  let localIds = { tower: 1, enemy: 1, shot: 1 };

  let state = createInitialState();

  function createInitialState() {
    return {
      type: "defense_state",
      roomId: params.get("room") || "LOCAL",
      width: world.width,
      height: world.height,
      cell: world.cell,
      columns: world.columns,
      rows: world.rows,
      phase: "build",
      wave: 0,
      maxWave: 15,
      mapId: "classic",
      mapName: defenseMaps.classic.name,
      maps: defenseMaps,
      towerTypes,
      enemyTypes,
      wavePreview: buildWavePreview(1),
      autoStartSeconds: 0,
      baseHealth: defenseMaps.classic.baseHealth,
      baseHealthMax: defenseMaps.classic.baseHealth,
      status: "타워를 배치하고 웨이브를 시작하세요.",
      hostId: "local",
      clientId: "local",
      isHost: true,
      spawnRemaining: 0,
      spawnTotal: 0,
      spawnTimer: 0,
      pathPoints,
      pathCells: Array.from(pathCells).map((key) => key.split(",").map(Number)),
      players: [
        {
          id: "local",
          name: localStorage.getItem("defense_name") || "Player",
          color: "#62e6ff",
          resources: defenseMaps.classic.startResources,
          kills: 0,
          score: 0,
          isHost: true,
        },
      ],
      towers: [],
      enemies: [],
      shots: [],
      scores: [],
      lastPing: null,
    };
  }

  function buildPathCells(points) {
    const cells = new Set();
    for (let index = 0; index < points.length - 1; index += 1) {
      const [x1, y1] = points[index];
      const [x2, y2] = points[index + 1];
      const stepX = x1 === x2 ? 0 : x2 > x1 ? 1 : -1;
      const stepY = y1 === y2 ? 0 : y2 > y1 ? 1 : -1;
      let x = x1;
      let y = y1;
      cells.add(`${x},${y}`);
      while (x !== x2 || y !== y2) {
        x += stepX;
        y += stepY;
        cells.add(`${x},${y}`);
      }
    }
    return cells;
  }

  function setPath(points) {
    pathPoints = Array.isArray(points) && points.length ? points : pathPoints;
    pathCells = buildPathCells(pathPoints);
    pathPixels = pathPoints.map(([x, y]) => cellCenter(x, y));
  }

  function mapPathCells() {
    return Array.from(pathCells).map((key) => key.split(",").map(Number));
  }

  function currentMap() {
    return defenseMaps[state.mapId] || defenseMaps.classic;
  }

  function buildWavePreview(wave) {
    const nextWave = Math.min(Math.max(1, wave), 15);
    const total = 7 + nextWave * 3;
    const enemies = [
      { type: "normal", name: "일반", count: total, color: "#ff5f6d" },
    ];
    if (nextWave >= 4)
      enemies.push({
        type: "runner",
        name: "질주",
        count: Math.max(1, Math.floor(total / 5)),
        color: "#ff8b52",
      });
    if (nextWave >= 6)
      enemies.push({
        type: "tank",
        name: "중장갑",
        count: Math.max(1, Math.floor(total / 7)),
        color: "#b58cff",
      });
    if (nextWave >= 8)
      enemies.push({
        type: "shield",
        name: "보호막",
        count: Math.max(1, Math.floor(total / 8)),
        color: "#6fe8ff",
      });
    if ([5, 10, 15].includes(nextWave))
      enemies.push({ type: "boss", name: "보스", count: 1, color: "#ffd166" });
    return { wave: nextWave, boss: [5, 10, 15].includes(nextWave), enemies };
  }

  function applyLocalMap(mapId) {
    const nextMap = defenseMaps[mapId] || defenseMaps.classic;
    setPath(nextMap.pathPoints);
    state.mapId = mapId in defenseMaps ? mapId : "classic";
    state.mapName = nextMap.name;
    state.pathPoints = pathPoints;
    state.pathCells = mapPathCells();
    state.baseHealth = nextMap.baseHealth || 20;
    state.baseHealthMax = nextMap.baseHealth || 20;
    state.players.forEach((player) => {
      player.resources = nextMap.startResources || 180;
      player.kills = 0;
      player.score = 0;
    });
    state.status = `${state.mapName} 맵이 선택되었습니다.`;
  }

  function syncConfigFromState(nextState) {
    if (nextState.maps) defenseMaps = nextState.maps;
    if (nextState.towerTypes) towerTypes = nextState.towerTypes;
    if (nextState.enemyTypes) enemyTypes = nextState.enemyTypes;
    if (nextState.pathPoints) setPath(nextState.pathPoints);
    if (nextState.lastPing) {
      const key = `${nextState.lastPing.x}:${nextState.lastPing.y}:${nextState.lastPing.time || ""}`;
      if (key !== lastPingKey) {
        lastPingKey = key;
        lastPingSeenAt = Date.now() / 1000;
      }
      nextState.lastPing = { ...nextState.lastPing, seenAt: lastPingSeenAt };
    }
    state.pathPoints = pathPoints;
    state.pathCells = nextState.pathCells || mapPathCells();
  }

  function cellCenter(cellX, cellY) {
    return {
      x: (cellX + 0.5) * world.cell,
      y: (cellY + 0.5) * world.cell,
    };
  }

  function cleanName(value) {
    return (
      String(value || "Player")
        .trim()
        .slice(0, 18) || "Player"
    );
  }

  function isLoopbackHost(host) {
    const clean = String(host || "")
      .toLowerCase()
      .replace(/^\[/, "")
      .replace(/\]$/, "");
    return (
      clean === "localhost" ||
      clean === "::1" ||
      clean === "0.0.0.0" ||
      /^127(?:\.|$)/.test(clean)
    );
  }

  function safeUrl(value) {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  }

  function defaultServerUrl() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = params.get("host") || window.location.hostname || "localhost";
    const port = params.get("port") || window.location.port || "7000";
    const url = new URL(`${protocol}://${host}:${port}/defense`);
    const room = params.get("room");
    if (room) url.searchParams.set("room", room);
    return url.toString();
  }

  function shareUrl(serverUrl) {
    const target = safeUrl(
      serverUrl || ui.serverUrl.value || defaultServerUrl(),
    );
    if (!target) return "";
    const protocol = target.protocol === "wss:" ? "https:" : "http:";
    const share = new URL(`${protocol}//${target.host}/game/index.html`);
    share.searchParams.set("game", "defense");
    share.searchParams.set("mode", "multi");
    share.searchParams.set("host", target.hostname);
    share.searchParams.set("port", target.port || "7000");
    share.searchParams.set("auto", "1");
    share.searchParams.set("v", assetVersion);
    const room = target.searchParams.get("room") || params.get("room");
    if (room) share.searchParams.set("room", room);
    return share.toString();
  }

  function updateNetInfo(serverUrl = ui.serverUrl.value) {
    const warnings = [];
    const target = safeUrl(serverUrl || defaultServerUrl());
    latestShareUrl = target ? shareUrl(target.toString()) : "";
    ui.netGame.textContent = isSolo
      ? "웨이브 디펜스 / 혼자하기"
      : `웨이브 디펜스 / 방 ${target?.searchParams.get("room") || "-"}`;
    ui.netPage.textContent = window.location.href;
    ui.netServer.textContent = isSolo
      ? "혼자하기 모드: 서버 연결 없음"
      : target?.toString() || "-";
    ui.netShare.textContent = isSolo
      ? "멀티 초대는 통합 입장 센터에서 방을 만든 뒤 사용하세요."
      : latestShareUrl || "-";
    if (target && isLoopbackHost(target.hostname))
      warnings.push(
        "localhost/127.x 주소는 현재 PC에서만 유효합니다. 다른 PC에는 호스트 PC의 LAN IP를 전달하세요.",
      );
    if (isLoopbackHost(window.location.hostname))
      warnings.push(
        "현재 화면이 localhost/127.x로 열려 있으면 다른 PC는 이 주소를 그대로 사용할 수 없습니다.",
      );
    ui.netWarning.textContent = warnings.join(" ");
  }

  function copyText(text) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard
        .writeText(text)
        .catch(() => fallbackCopy(text));
    }
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

  function setStatus(text, ok = true) {
    ui.status.textContent = text;
    ui.status.classList.toggle("offline", !ok);
  }

  function setCenter(text, options = {}) {
    const duration =
      typeof options === "number" ? options : Number(options.duration || 0);
    if (centerTimer) {
      window.clearTimeout(centerTimer);
      centerTimer = 0;
    }
    ui.center.textContent = text || "";
    ui.center.classList.toggle("hidden", !text);
    if (!text || duration <= 0) return;
    const visibleText = String(text);
    centerTimer = window.setTimeout(() => {
      centerTimer = 0;
      if (ui.center.textContent === visibleText) setCenter("");
    }, duration);
  }

  function setCenterToast(text) {
    setCenter(text, { duration: 1600 });
  }

  function isCenterToast(text) {
    return (
      String(text || "").includes("웨이브 사이 건설 시간에만") ||
      String(text || "").includes("서버 연결 후 사용할 수 있습니다.")
    );
  }

  function selfPlayer() {
    return (
      state.players.find((player) => player.id === clientId) || state.players[0]
    );
  }

  function isHost() {
    return (
      isSolo ||
      state.isHost ||
      state.hostId === clientId ||
      selfPlayer()?.isHost
    );
  }

  function send(payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setCenterToast("서버 연결 후 사용할 수 있습니다.");
      return;
    }
    socket.send(JSON.stringify(payload));
  }

  function connect() {
    if (isSolo) {
      startSolo();
      return;
    }
    const name = cleanName(ui.name.value);
    const url = ui.serverUrl.value.trim() || defaultServerUrl();
    localStorage.setItem("defense_name", name);
    localStorage.setItem("defense_url", url);
    updateNetInfo(url);
    if (socket) socket.close();
    const activeSocket = new WebSocket(url);
    socket = activeSocket;
    let handshakeOk = false;
    let expectedCloseMessage = "";
    let connectTimer = window.setTimeout(() => {
      if (socket !== activeSocket || handshakeOk) return;
      expectedCloseMessage =
        "웨이브 디펜스 서버 응답이 없습니다. 실행 중인 서버/EXE/Docker를 최신 코드로 재시작하고 포트와 방화벽을 확인하세요.";
      setStatus("연결 시간 초과", false);
      setCenter(expectedCloseMessage);
      try {
        activeSocket.close();
      } catch {}
    }, 5000);
    const clearConnectTimer = () => {
      if (!connectTimer) return;
      window.clearTimeout(connectTimer);
      connectTimer = 0;
    };
    const failConnect = (message, status = "연결 실패") => {
      if (socket !== activeSocket) return;
      clearConnectTimer();
      expectedCloseMessage = message;
      setStatus(status, false);
      ui.panel.classList.remove("collapsed");
      setCenter(message);
      try {
        activeSocket.close();
      } catch {}
    };
    setStatus("연결 중...", true);
    setCenter("웨이브 디펜스 방에 연결 중입니다.");
    activeSocket.addEventListener("open", () => {
      if (socket !== activeSocket) return;
      setStatus("연결됨", true);
      ui.panel.classList.add("collapsed");
      activeSocket.send(JSON.stringify({ type: "defense_join", name }));
    });
    activeSocket.addEventListener("message", (event) => {
      if (socket !== activeSocket) return;
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        failConnect(
          "서버 응답을 읽지 못했습니다. 게임 서버가 최신 웨이브 디펜스 프로토콜로 실행 중인지 확인하세요.",
        );
        return;
      }
      if (message.type === "defense_welcome") {
        handshakeOk = true;
        clearConnectTimer();
        clientId = message.id;
        setCenter("");
        return;
      }
      if (message.type === "defense_state") {
        handshakeOk = true;
        clearConnectTimer();
        setCenter("");
        state = { ...message, pathCells: message.pathCells || state.pathCells };
        syncConfigFromState(state);
        clientId = message.clientId || clientId;
        selectedTowerId = state.towers.some(
          (tower) => tower.id === selectedTowerId,
        )
          ? selectedTowerId
          : null;
        renderMapOptions();
        renderTowerButtons();
        renderHud();
        return;
      }
      if (message.type === "welcome") {
        failConnect(
          "실행 중인 게임 서버가 웨이브 디펜스를 지원하지 않습니다. 7000 서버/EXE/Docker를 최신 코드로 재시작한 뒤 다시 시도하세요.",
          "서버 호환 오류",
        );
        return;
      }
      if (!handshakeOk) {
        failConnect(
          "웨이브 디펜스가 아닌 서버 응답을 받았습니다. 서버 주소와 포트가 웨이브 디펜스 서버를 가리키는지 확인하세요.",
        );
        return;
      }
      if (message.type === "defense_error") {
        const errorMessage = message.message || "요청을 처리하지 못했습니다.";
        if (isCenterToast(errorMessage)) setCenterToast(errorMessage);
        else setCenter(errorMessage);
      }
    });
    activeSocket.addEventListener("close", () => {
      if (socket !== activeSocket) return;
      clearConnectTimer();
      socket = null;
      setStatus("연결 끊김", false);
      ui.panel.classList.remove("collapsed");
      if (expectedCloseMessage) return;
      setCenter("연결이 끊겼습니다. 서버 주소, 포트, 방화벽을 확인하세요.");
    });
    activeSocket.addEventListener("error", () => {
      if (socket !== activeSocket) return;
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
    localStorage.setItem("defense_name", state.players[0].name);
    setStatus("혼자하기", true);
    setCenter("타워를 배치하고 웨이브를 시작하세요.");
    renderHud();
  }

  function actionStartWave() {
    if (isSolo) {
      localStartWave();
      return;
    }
    send({ type: "defense_start_wave" });
  }

  function actionBuild(cellX, cellY) {
    if (isSolo) {
      localBuild(selectedTowerType, cellX, cellY);
      return;
    }
    send({ type: "defense_build", towerType: selectedTowerType, cellX, cellY });
  }

  function actionUpgrade() {
    if (!selectedTowerId) return;
    if (isSolo) {
      localUpgrade(selectedTowerId);
      return;
    }
    send({ type: "defense_upgrade", towerId: selectedTowerId });
  }

  function actionSell() {
    if (!selectedTowerId) return;
    if (isSolo) {
      localSell(selectedTowerId);
      return;
    }
    send({ type: "defense_sell", towerId: selectedTowerId });
  }

  function actionConfigureMap(mapId) {
    if (state.wave > 0 || state.towers.length) {
      setCenterToast(
        "맵은 1웨이브 시작 전, 타워 배치 전에만 변경할 수 있습니다.",
      );
      ui.mapSelect.value = state.mapId || "classic";
      return;
    }
    if (isSolo) {
      applyLocalMap(mapId);
      renderHud();
      return;
    }
    send({ type: "defense_configure", mapId });
  }

  function actionPing(cellX, cellY) {
    if (isSolo) {
      state.lastPing = {
        x: cellX,
        y: cellY,
        name: selfPlayer()?.name || "Player",
        time: Date.now() / 1000,
      };
      setCenterToast("전장에 핑을 표시했습니다.");
      return;
    }
    send({ type: "defense_ping", cellX, cellY });
  }

  function canPlace(cellX, cellY) {
    if (cellX < 0 || cellX >= world.columns || cellY < 0 || cellY >= world.rows)
      return false;
    if (pathCells.has(`${cellX},${cellY}`)) return false;
    return !state.towers.some(
      (tower) => tower.cellX === cellX && tower.cellY === cellY,
    );
  }

  function localWaveSpawnCount(wave) {
    return 7 + wave * 3 + ([5, 10, 15].includes(wave) ? 1 : 0);
  }

  function localStartWave() {
    if (state.phase === "wave") {
      setCenterToast("이미 웨이브가 진행 중입니다.");
      return;
    }
    if (["win", "defeat"].includes(state.phase)) {
      setCenter("게임이 끝났습니다. 새로고침으로 다시 시작하세요.");
      return;
    }
    if (state.wave >= state.maxWave) return;
    state.wave += 1;
    state.phase = "wave";
    state.autoStartAt = 0;
    state.autoStartSeconds = 0;
    state.spawnRemaining = localWaveSpawnCount(state.wave);
    state.spawnTotal = state.spawnRemaining;
    state.spawnTimer = 0;
    state.status = `${state.wave} 웨이브 시작.`;
    setCenter("");
    renderHud();
  }

  function localBuild(type, cellX, cellY) {
    const config = towerTypes[type];
    const player = selfPlayer();
    if (state.phase !== "build") {
      setCenterToast("웨이브 사이 건설 시간에만 타워를 지을 수 있습니다.");
      return;
    }
    if (!config || !canPlace(cellX, cellY)) {
      setCenterToast("이 위치에는 타워를 지을 수 없습니다.");
      return;
    }
    if (player.resources < config.cost) {
      setCenterToast("자원이 부족합니다.");
      return;
    }
    player.resources -= config.cost;
    state.towers.push({
      id: localIds.tower++,
      ownerId: "local",
      ownerName: player.name,
      type,
      cellX,
      cellY,
      level: 1,
      range: config.range,
      cooldownLeft: 0,
    });
    state.status = `${config.name} 타워를 배치했습니다.`;
    renderHud();
  }

  function localUpgrade(towerId) {
    const tower = state.towers.find((item) => item.id === towerId);
    const player = selfPlayer();
    if (!tower || tower.ownerId !== "local") return;
    if (state.phase !== "build") {
      setCenterToast("웨이브 사이 건설 시간에만 업그레이드할 수 있습니다.");
      return;
    }
    if (tower.level >= 3) {
      setCenterToast("이미 최대 단계입니다.");
      return;
    }
    const cost = Math.round(
      towerTypes[tower.type].cost * (0.75 + tower.level * 0.5),
    );
    if (player.resources < cost) {
      setCenterToast("자원이 부족합니다.");
      return;
    }
    player.resources -= cost;
    tower.level += 1;
    tower.range = towerTypes[tower.type].range + (tower.level - 1) * 14;
    state.status = `타워를 ${tower.level}단계로 업그레이드했습니다.`;
    renderHud();
  }

  function localSell(towerId) {
    const index = state.towers.findIndex((item) => item.id === towerId);
    if (index < 0 || state.towers[index].ownerId !== "local") return;
    if (state.phase !== "build") {
      setCenterToast("웨이브 사이 건설 시간에만 판매할 수 있습니다.");
      return;
    }
    const tower = state.towers[index];
    const base = towerTypes[tower.type].cost;
    let total = base;
    for (let level = 1; level < tower.level; level += 1)
      total += Math.round(base * (0.75 + level * 0.5));
    selfPlayer().resources += Math.round(total * 0.6);
    state.towers.splice(index, 1);
    selectedTowerId = null;
    state.status = "타워를 판매했습니다.";
    renderHud();
  }

  function localUpdate(dt) {
    state.shots.forEach((shot) => (shot.ttl -= dt));
    state.shots = state.shots.filter((shot) => shot.ttl > 0);
    if (state.phase === "build" && state.autoStartAt) {
      state.autoStartSeconds = Math.max(
        0,
        Math.ceil((state.autoStartAt - Date.now()) / 1000),
      );
      if (Date.now() >= state.autoStartAt) localStartWave();
    }
    if (state.phase !== "wave") return;
    state.spawnTimer -= dt;
    while (state.spawnRemaining > 0 && state.spawnTimer <= 0) {
      spawnLocalEnemy();
      state.spawnRemaining -= 1;
      state.spawnTimer += Math.max(0.26, 0.74 - state.wave * 0.035);
    }
    updateLocalEnemies(dt);
    updateLocalTowers(dt);
    if (state.baseHealth <= 0) {
      state.phase = "defeat";
      state.enemies = [];
      state.status = "기지가 파괴되었습니다.";
      setCenter(state.status);
    } else if (state.spawnRemaining <= 0 && !state.enemies.length) {
      if (state.wave >= state.maxWave) {
        state.phase = "win";
        state.status = "모든 웨이브를 막아냈습니다.";
        setCenter(state.status);
      } else {
        const bonus = 35 + state.wave * 9;
        state.phase = "build";
        selfPlayer().resources += bonus;
        state.status = `${state.wave} 웨이브 완료. +${bonus}`;
        state.autoStartAt = Date.now() + 25000;
        state.autoStartSeconds = 25;
        state.wavePreview = buildWavePreview(state.wave + 1);
        setCenter(state.status);
      }
    }
  }

  function spawnLocalEnemy() {
    const start = pathPixels[0];
    let enemyType = "normal";
    if ([5, 10, 15].includes(state.wave) && state.spawnRemaining === 1)
      enemyType = "boss";
    else if (state.wave >= 8 && localIds.enemy % 8 === 0) enemyType = "shield";
    else if (state.wave >= 6 && localIds.enemy % 7 === 0) enemyType = "tank";
    else if (state.wave >= 4 && localIds.enemy % 5 === 0) enemyType = "runner";
    let health = 48 + state.wave * 17;
    let speed = 42 + state.wave * 2.8;
    let reward = 11 + state.wave * 2;
    let baseDamage = 1;
    let shield = 0;
    if (enemyType === "runner") {
      health *= 0.72;
      speed *= 1.42;
      reward += 2;
    }
    if (enemyType === "tank") {
      health *= 1.75;
      speed *= 0.72;
      reward += 7;
    }
    if (enemyType === "shield") {
      health *= 1.12;
      speed *= 0.94;
      shield = health * 0.55;
      reward += 9;
    }
    if (enemyType === "boss") {
      health = 620 + state.wave * 86;
      speed = 28;
      reward = 95 + state.wave * 5;
      baseDamage = 4;
    }
    state.enemies.push({
      id: localIds.enemy++,
      x: start.x,
      y: start.y,
      segment: 0,
      health,
      maxHealth: health,
      speed,
      reward,
      type: enemyType,
      shield,
      maxShield: shield,
      baseDamage,
      slowUntil: 0,
    });
  }

  function updateLocalEnemies(dt) {
    const reached = [];
    state.enemies.forEach((enemy) => {
      enemy.slowUntil = Math.max(0, (enemy.slowUntil || 0) - dt);
      let remaining = enemy.speed * (enemy.slowUntil > 0 ? 0.55 : 1) * dt;
      while (remaining > 0 && enemy.segment < pathPixels.length - 1) {
        const target = pathPixels[enemy.segment + 1];
        const distance = Math.hypot(target.x - enemy.x, target.y - enemy.y);
        if (distance <= 0.001) {
          enemy.segment += 1;
        } else if (distance <= remaining) {
          enemy.x = target.x;
          enemy.y = target.y;
          enemy.segment += 1;
          remaining -= distance;
        } else {
          enemy.x += ((target.x - enemy.x) / distance) * remaining;
          enemy.y += ((target.y - enemy.y) / distance) * remaining;
          remaining = 0;
        }
      }
      if (enemy.segment >= pathPixels.length - 1) reached.push(enemy);
    });
    reached.forEach((enemy) => {
      state.enemies = state.enemies.filter((item) => item !== enemy);
      state.baseHealth = Math.max(
        0,
        state.baseHealth - (enemy.baseDamage || 1),
      );
    });
  }

  function updateLocalTowers(dt) {
    state.towers.forEach((tower) => {
      tower.cooldownLeft = Math.max(0, (tower.cooldownLeft || 0) - dt);
      if (tower.cooldownLeft > 0) return;
      const config = towerTypes[tower.type];
      if (!config || config.boost) return;
      const center = cellCenter(tower.cellX, tower.cellY);
      const range = config.range + (tower.level - 1) * 14;
      const target = state.enemies
        .filter(
          (enemy) =>
            Math.hypot(enemy.x - center.x, enemy.y - center.y) <= range,
        )
        .sort((a, b) => b.segment - a.segment)[0];
      if (!target) return;
      const boost = localTowerBoostMultiplier(tower);
      tower.cooldownLeft =
        (config.cooldown * Math.max(0.74, 1 - (tower.level - 1) * 0.1)) / boost;
      state.shots.push({
        id: localIds.shot++,
        x: center.x,
        y: center.y,
        targetX: target.x,
        targetY: target.y,
        color: config.color,
        ttl: 0.18,
      });
      if (config.slow)
        target.slowUntil = Math.max(target.slowUntil || 0, config.slow);
      const damage = config.damage * (1 + (tower.level - 1) * 0.45) * boost;
      const targets = config.splash
        ? state.enemies.filter(
            (enemy) =>
              Math.hypot(enemy.x - target.x, enemy.y - target.y) <=
              config.splash,
          )
        : [target];
      targets.forEach((enemy) => damageLocalEnemy(enemy, damage));
    });
  }

  function localTowerBoostMultiplier(tower) {
    const center = cellCenter(tower.cellX, tower.cellY);
    return state.towers.reduce((best, other) => {
      if (other.id === tower.id) return best;
      const config = towerTypes[other.type];
      if (!config?.boost) return best;
      const otherCenter = cellCenter(other.cellX, other.cellY);
      const range = config.range + (other.level - 1) * 14;
      if (
        Math.hypot(center.x - otherCenter.x, center.y - otherCenter.y) > range
      )
        return best;
      return Math.max(best, 1 + (config.boost - 1) * other.level);
    }, 1);
  }

  function damageLocalEnemy(enemy, damage) {
    if (!state.enemies.includes(enemy)) return;
    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, damage);
      enemy.shield -= absorbed;
      damage -= absorbed;
      if (damage <= 0) return;
    }
    enemy.health -= damage;
    if (enemy.health > 0) return;
    state.enemies = state.enemies.filter((item) => item !== enemy);
    const player = selfPlayer();
    player.resources += enemy.reward || 0;
    player.kills = (player.kills || 0) + 1;
    player.score = (player.score || 0) + (enemy.reward || 0) * 10;
  }

  function renderMapOptions() {
    const selected = state.mapId || "classic";
    const html = Object.entries(defenseMaps)
      .map(
        ([id, map]) =>
          `<option value="${escapeHtml(id)}"${id === selected ? " selected" : ""}>${escapeHtml(map.name || id)}</option>`,
      )
      .join("");
    if (ui.mapSelect.innerHTML !== html) ui.mapSelect.innerHTML = html;
    ui.mapSelect.value = selected;
  }

  function renderWavePreview() {
    const preview =
      state.wavePreview || buildWavePreview((state.wave || 0) + 1);
    const names = (preview.enemies || [])
      .map((enemy) => `${enemy.name || enemy.type} ${enemy.count}`)
      .join(" · ");
    ui.wavePreview.textContent =
      state.wave >= state.maxWave
        ? "모든 웨이브 완료"
        : `${preview.wave || (state.wave || 0) + 1}웨이브 예고${preview.boss ? " · 보스" : ""}: ${names || "정보 없음"}`;
  }

  function renderHud() {
    const player = selfPlayer();
    const selected = state.towers.find((tower) => tower.id === selectedTowerId);
    ui.mode.textContent = isSolo ? "혼자" : isHost() ? "방장" : "참가";
    ui.wave.textContent = `${state.wave || 0}/${state.maxWave || 15}`;
    ui.base.textContent = `${state.baseHealth ?? 0}/${state.baseHealthMax ?? 20}`;
    ui.resources.textContent = player?.resources ?? 0;
    ui.autoStart.textContent =
      state.phase === "build" && state.autoStartSeconds
        ? `${state.autoStartSeconds}s`
        : "-";
    ui.status.textContent = state.status || "-";
    ui.startWave.disabled = state.phase !== "build" || !isHost();
    ui.startWave.textContent =
      state.phase === "build" && state.autoStartSeconds
        ? `즉시 시작 (${state.autoStartSeconds}s)`
        : "웨이브 시작";
    ui.upgrade.disabled =
      !selected ||
      selected.ownerId !== clientId ||
      state.phase !== "build" ||
      selected.level >= 3;
    ui.sell.disabled =
      !selected || selected.ownerId !== clientId || state.phase !== "build";
    ui.selection.textContent = selected
      ? `${towerTypes[selected.type]?.name || "타워"} ${selected.level}단계 · ${selected.ownerName || "소유자"}${selected.boost && selected.boost > 1 ? ` · 증폭 x${selected.boost}` : ""}`
      : `${towerTypes[selectedTowerType]?.name || "타워"} 선택됨 · 비용 ${towerTypes[selectedTowerType]?.cost || 0}`;
    const mapLocked = state.wave > 0 || state.towers.length > 0 || !isHost();
    ui.mapSelect.disabled = Boolean(mapLocked);
    ui.mapHint.textContent = `${state.mapName || currentMap().name} · ${
      mapLocked
        ? "현재 방에서는 맵 변경이 잠겼습니다."
        : "1웨이브 시작 전, 타워 배치 전에만 변경할 수 있습니다."
    }`;
    renderWavePreview();
    ui.players.innerHTML =
      state.players
        .map(
          (player) =>
            `<li><span><i style="background:${player.color}"></i>${escapeHtml(player.name)}${player.isHost ? " · 방장" : ""}</span><strong>${player.resources} · K${player.kills || 0}</strong></li>`,
        )
        .join("") || "<li>참가자 없음</li>";
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

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    camera.scale = Math.min(width / world.width, height / world.height) * 0.94;
    camera.offsetX = (width - world.width * camera.scale) / 2;
    camera.offsetY = (height - world.height * camera.scale) / 2;
  }

  function toWorld(clientX, clientY) {
    return {
      x: (clientX - camera.offsetX) / camera.scale,
      y: (clientY - camera.offsetY) / camera.scale,
    };
  }

  function toScreen(x, y) {
    return {
      x: camera.offsetX + x * camera.scale,
      y: camera.offsetY + y * camera.scale,
    };
  }

  function draw() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (isSolo) {
      localUpdate(dt);
      renderHud();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    requestAnimationFrame(draw);
  }

  function drawBoard() {
    const backdrop = ctx.createLinearGradient(
      0,
      0,
      window.innerWidth,
      window.innerHeight,
    );
    backdrop.addColorStop(0, "#101827");
    backdrop.addColorStop(0.55, "#142139");
    backdrop.addColorStop(1, "#21172e");
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    const topLeft = toScreen(0, 0);
    ctx.save();
    ctx.translate(topLeft.x, topLeft.y);
    ctx.scale(camera.scale, camera.scale);
    const ground = ctx.createLinearGradient(0, 0, world.width, world.height);
    ground.addColorStop(0, "#21344b");
    ground.addColorStop(1, "#1b273d");
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, world.width, world.height);
    drawMapDecor();
    drawGrid();
    drawPath();
    drawPlacementPreview();
    state.towers.forEach(drawTower);
    state.enemies.forEach(drawEnemy);
    state.shots.forEach(drawShot);
    drawPing();
    drawBase();
    ctx.restore();
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(255,255,255,.055)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= world.columns; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * world.cell, 0);
      ctx.lineTo(x * world.cell, world.height);
      ctx.stroke();
    }
    for (let y = 0; y <= world.rows; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * world.cell);
      ctx.lineTo(world.width, y * world.cell);
      ctx.stroke();
    }
  }

  function drawMapDecor() {
    for (let index = 0; index < 52; index += 1) {
      const x = 36 + ((index * 151) % (world.width - 72));
      const y = 36 + ((index * 97) % (world.height - 72));
      if (
        pathCells.has(
          `${Math.floor(x / world.cell)},${Math.floor(y / world.cell)}`,
        )
      ) {
        continue;
      }
      ctx.fillStyle =
        index % 4 === 0 ? "rgba(98,230,255,.08)" : "rgba(255,255,255,.045)";
      ctx.fillRect(x - 12, y - 9, 24, 18);
      ctx.strokeStyle = "rgba(0,0,0,.18)";
      ctx.strokeRect(x - 12, y - 9, 24, 18);
    }
  }

  function drawPath() {
    ctx.strokeStyle = "rgba(50,31,16,.62)";
    ctx.lineWidth = world.cell * 1.12;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    pathPixels.forEach((point, index) =>
      index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y),
    );
    ctx.stroke();
    ctx.strokeStyle = "#d0a85c";
    ctx.lineWidth = world.cell * 0.82;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,238,184,.35)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawBase() {
    const end = pathPixels[pathPixels.length - 1];
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fillRect(end.x - 27, end.y - 16, 54, 36);
    ctx.fillStyle = "#f6f3c8";
    ctx.fillRect(end.x - 24, end.y - 34, 48, 58);
    ctx.fillStyle = "#8be66f";
    ctx.fillRect(end.x - 13, end.y - 48, 26, 16);
    ctx.fillStyle = "#ff6a6a";
    ctx.fillRect(
      end.x - 16,
      end.y - 58,
      32 * ((state.baseHealth || 0) / (state.baseHealthMax || 20)),
      6,
    );
  }

  function drawPlacementPreview() {
    if (!hoverCell) return;
    const valid = canPlace(hoverCell.x, hoverCell.y) && state.phase === "build";
    ctx.fillStyle = valid ? "rgba(98,230,255,.18)" : "rgba(255,95,109,.22)";
    ctx.fillRect(
      hoverCell.x * world.cell,
      hoverCell.y * world.cell,
      world.cell,
      world.cell,
    );
  }

  function drawTower(tower) {
    const config = towerTypes[tower.type] || towerTypes.basic;
    const center = cellCenter(tower.cellX, tower.cellY);
    const selected = tower.id === selectedTowerId;
    ctx.fillStyle = selected ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.12)";
    ctx.beginPath();
    ctx.arc(center.x, center.y, tower.range || config.range, 0, Math.PI * 2);
    if (selected) ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + 13, 19, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#101827";
    ctx.fillRect(center.x - 15, center.y - 15, 30, 30);
    ctx.fillStyle = config.color;
    if (config.boost) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, 12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(center.x - 10, center.y - 10, 20, 20);
      ctx.fillStyle = "rgba(255,255,255,.28)";
      ctx.fillRect(center.x - 5, center.y - 15, 10, 8);
    }
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(tower.level), center.x, center.y);
  }

  function drawEnemy(enemy) {
    const config = enemyTypes[enemy.type] || enemyTypes.normal;
    const size = enemy.type === "boss" ? 34 : 22;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.beginPath();
    ctx.ellipse(
      enemy.x,
      enemy.y + size * 0.46,
      size * 0.62,
      size * 0.25,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle =
      enemy.slowed || enemy.slowUntil > 0 ? "#88e66f" : config.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.25)";
    ctx.beginPath();
    ctx.arc(
      enemy.x - size * 0.18,
      enemy.y - size * 0.2,
      size * 0.2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
    if (enemy.shield > 0) {
      ctx.strokeStyle = "#6fe8ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, size / 2 + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(enemy.x - 16, enemy.y - 22, 32, 5);
    ctx.fillStyle = "#f8f871";
    ctx.fillRect(
      enemy.x - 16,
      enemy.y - 22,
      32 * Math.max(0, enemy.health / enemy.maxHealth),
      5,
    );
  }

  function drawPing() {
    const ping = state.lastPing;
    if (!ping || typeof ping.x !== "number" || typeof ping.y !== "number")
      return;
    const age = Date.now() / 1000 - (ping.seenAt || ping.time || 0);
    if (age > 4) return;
    const center = cellCenter(ping.x, ping.y);
    ctx.strokeStyle = "rgba(255, 239, 102, .9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 24 + age * 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawShot(shot) {
    ctx.strokeStyle = shot.color || "#fff";
    ctx.lineWidth = 3;
    ctx.globalAlpha = Math.max(0.2, Math.min(1, (shot.ttl || 0.1) / 0.18));
    ctx.beginPath();
    ctx.moveTo(shot.x, shot.y);
    ctx.lineTo(shot.targetX, shot.targetY);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function cellFromEvent(event) {
    const point = toWorld(event.clientX, event.clientY);
    return {
      x: Math.floor(point.x / world.cell),
      y: Math.floor(point.y / world.cell),
    };
  }

  function selectOrBuild(cell) {
    const tower = state.towers.find(
      (item) => item.cellX === cell.x && item.cellY === cell.y,
    );
    if (tower) {
      selectedTowerId = tower.id;
      renderHud();
      return;
    }
    selectedTowerId = null;
    actionBuild(cell.x, cell.y);
  }

  function renderTowerButtons() {
    if (!towerTypes[selectedTowerType])
      selectedTowerType = Object.keys(towerTypes)[0] || "basic";
    ui.towers.innerHTML = Object.entries(towerTypes)
      .map(
        ([key, tower]) =>
          `<button type="button" data-tower="${escapeHtml(key)}" class="${selectedTowerType === key ? "active" : ""}"><span style="background:${tower.color}"></span><strong>${escapeHtml(tower.name)}</strong><small>${tower.cost} · ${escapeHtml(tower.desc || (tower.boost ? "주변 타워 강화" : "공격"))}</small></button>`,
      )
      .join("");
    ui.towers.querySelectorAll("[data-tower]").forEach((button) => {
      button.onclick = () => {
        selectedTowerType = button.dataset.tower || "basic";
        selectedTowerId = null;
        renderTowerButtons();
        renderHud();
      };
    });
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
  ui.startWave.onclick = actionStartWave;
  ui.upgrade.onclick = actionUpgrade;
  ui.sell.onclick = actionSell;
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
      .catch((error) => {
        ui.netCopy.textContent = "복사 실패";
        setCenter("복사 실패: " + error.message);
        setTimeout(() => (ui.netCopy.textContent = "초대 링크 복사"), 1400);
      });
  };
  ui.serverUrl.addEventListener("input", () => updateNetInfo());
  ui.mapSelect.addEventListener("change", () =>
    actionConfigureMap(ui.mapSelect.value),
  );
  canvas.addEventListener("pointermove", (event) => {
    hoverCell = cellFromEvent(event);
  });
  canvas.addEventListener("pointerleave", () => {
    hoverCell = null;
  });
  canvas.addEventListener("click", (event) => {
    const cell = cellFromEvent(event);
    if (event.shiftKey || event.altKey) {
      actionPing(cell.x, cell.y);
      return;
    }
    selectOrBuild(cell);
  });
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (event) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement
    )
      return;
    if (/^[1-9]$/.test(event.key)) {
      selectedTowerType =
        Object.keys(towerTypes)[Number(event.key) - 1] || selectedTowerType;
      selectedTowerId = null;
      renderTowerButtons();
      renderHud();
    }
    if (event.key.toLowerCase() === "u") actionUpgrade();
    if (event.key === "Delete" || event.key === "Backspace") actionSell();
    if (event.key === " ") {
      event.preventDefault();
      actionStartWave();
    }
  });

  ui.name.value = localStorage.getItem("defense_name") || "Player";
  ui.serverUrl.value = params.has("host")
    ? defaultServerUrl()
    : localStorage.getItem("defense_url") || defaultServerUrl();
  renderMapOptions();
  if (isSolo) {
    ui.serverUrl.disabled = true;
    ui.connect.textContent = "혼자 시작";
    ui.disconnect.style.display = "none";
    startSolo();
  } else {
    setStatus("연결 대기", false);
    setCenter("연결하면 웨이브 디펜스가 시작됩니다.");
  }
  renderMapOptions();
  renderTowerButtons();
  renderHud();
  updateNetInfo();
  resize();
  draw();
  if (!isSolo && params.get("auto") === "1") connect();
})();
