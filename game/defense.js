(() => {
  const params = new URLSearchParams(window.location.search);
  const isSolo = ["solo", "local"].includes(params.get("mode") || "");
  const assetVersion = params.get("v") || "20260601storage";
  const storage = window.goodEtcStorage || localStorage;
  const world = { width: 1536, height: 960, cell: 24, columns: 64, rows: 40 };
  const speedOptions = [1, 2, 3];
  const speedStorageKey = "defense_game_speed";
  const toolbarStorageKey = "defense_toolbar_collapsed";
  let defenseMaps = {
    classic: {
      name: "기본 우회로",
      baseHealth: 24,
      startResources: 230,
      pathPoints: [
        [0, 19],
        [10, 19],
        [10, 8],
        [25, 8],
        [25, 30],
        [43, 30],
        [43, 14],
        [63, 14],
      ],
    },
    harbor: {
      name: "항구 지그재그",
      baseHealth: 26,
      startResources: 220,
      pathPoints: [
        [0, 9],
        [11, 9],
        [11, 32],
        [24, 32],
        [24, 12],
        [40, 12],
        [40, 27],
        [63, 27],
      ],
    },
    lava: {
      name: "용암 협곡",
      baseHealth: 22,
      startResources: 250,
      pathPoints: [
        [0, 29],
        [8, 29],
        [8, 6],
        [21, 6],
        [21, 35],
        [36, 35],
        [36, 16],
        [51, 16],
        [51, 24],
        [63, 24],
      ],
    },
  };
  let pathPoints = defenseMaps.classic.pathPoints;
  let towerTypes = {
    basic: {
      name: "기본탄",
      cost: 55,
      range: 150,
      damage: 20,
      cooldown: 0.46,
      color: "#62e6ff",
      desc: "빠른 단일 공격",
    },
    slow: {
      name: "감속",
      cost: 75,
      range: 145,
      damage: 10,
      cooldown: 0.7,
      slow: 1.8,
      color: "#8be66f",
      desc: "적 이동 속도 감소",
    },
    blast: {
      name: "폭발",
      cost: 100,
      range: 138,
      damage: 16,
      cooldown: 1.08,
      splash: 64,
      burn: 2.4,
      burnDps: 10,
      color: "#ffba5a",
      desc: "범위 피해와 화상",
    },
    sniper: {
      name: "저격",
      cost: 125,
      range: 250,
      damage: 62,
      cooldown: 1.55,
      mark: 2.6,
      markBonus: 0.3,
      color: "#c8f7ff",
      desc: "긴 사거리와 취약 표식",
    },
    boost: {
      name: "증폭기",
      cost: 85,
      range: 130,
      damage: 0,
      cooldown: 9.9,
      boost: 1.24,
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
  let skillTypes = {
    airstrike: {
      name: "포격 지원",
      cost: 70,
      cooldown: 14,
      radius: 120,
      damage: 185,
      color: "#ffba5a",
      desc: "전방 적 범위 피해",
    },
    freeze: {
      name: "빙결장",
      cost: 55,
      cooldown: 13,
      radius: 130,
      duration: 4.3,
      color: "#69dcff",
      desc: "전방 적 감속",
    },
    repair: {
      name: "긴급 수리",
      cost: 45,
      cooldown: 16,
      heal: 5,
      color: "#8be66f",
      desc: "기지 체력 회복",
    },
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
        <div class="defense-speed" aria-label="게임 속도">
          <span>속도</span>
          <button type="button" data-defense-speed="1">1배</button>
          <button type="button" data-defense-speed="2">2배</button>
          <button type="button" data-defense-speed="3">3배</button>
        </div>
      </div>
      <div class="defense-help hidden" id="defenseHelp">
        <p>타워를 선택한 뒤 경로가 아닌 칸을 클릭해 배치합니다. 마우스를 올리면 사거리, 경로 커버 칸, 배치 가능 여부가 미리 표시됩니다.</p>
        <p>타워를 선택하면 실제 사거리, 현재 목표, 재장전 진행, 증폭기가 영향을 주는 타워가 표시됩니다. 방장은 첫 웨이브를 시작하고, 이후에는 준비 시간이 끝나면 자동으로 다음 웨이브가 시작됩니다.</p>
        <p>자원은 개인별로 관리되며 자신의 타워만 업그레이드하거나 판매할 수 있습니다. 폭발 타워는 화상, 저격 타워는 취약 표식을 남기고, 증폭기는 주변 타워의 공격 효율을 높입니다.</p>
        <p>멀티에서는 타워 주변 색상 링과 이름표로 소유자를 구분합니다. 내 타워는 노란 나 표식으로 표시되고, 다른 참가자의 타워는 참가자 이름 머리글자로 표시됩니다.</p>
        <p>하단 타워/전술 패널은 패널 접기로 줄일 수 있습니다. 화면이 낮거나 좁으면 버튼 설명을 압축하고 전장을 패널 위쪽에 맞춰 배치합니다.</p>
        <p>보스는 체력이 낮아지면 격노해 더 빠르게 이동하고 기지 피해가 커집니다. 화상, 표식, 보호막, 격노 링을 보고 우선순위를 조정하세요.</p>
        <p>전술 스킬은 자원을 사용합니다. Q 포격 지원은 전방 적 주변에 범위 피해를 주고, E 빙결장은 적 무리를 감속하며, F 긴급 수리는 기지를 회복합니다.</p>
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
        <span>속도<strong id="defenseSpeed">1배</strong></span>
      </div>
      <p id="defenseWavePreview" class="defense-wave-preview">다음 웨이브 정보 없음</p>
      <ol id="defensePlayers" class="defense-players"></ol>
    </section>
    <section class="hud defense-toolbar" id="defenseToolbar" aria-label="타워 조작">
      <div class="defense-toolbar-head">
        <strong>타워/전술</strong>
        <span id="defenseToolbarSummary">타워를 선택하세요.</span>
        <button id="defenseToolbarToggle" class="defense-toolbar-toggle" type="button" aria-controls="defenseToolbarBody" aria-expanded="true">패널 접기</button>
      </div>
      <div class="defense-toolbar-body" id="defenseToolbarBody">
        <div class="defense-towers" id="defenseTowerButtons"></div>
        <div class="defense-actions">
          <button id="defenseStartWave" type="button">웨이브 시작</button>
          <button id="defenseUpgrade" type="button">업그레이드</button>
          <button id="defenseSell" type="button">판매</button>
        </div>
        <div class="defense-skills" id="defenseSkillButtons" aria-label="전술 스킬"></div>
        <p id="defenseSelection">타워를 선택하세요.</p>
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
    speed: document.getElementById("defenseSpeed"),
    speedButtons: Array.from(document.querySelectorAll("[data-defense-speed]")),
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
    toolbar: document.getElementById("defenseToolbar"),
    toolbarBody: document.getElementById("defenseToolbarBody"),
    toolbarToggle: document.getElementById("defenseToolbarToggle"),
    toolbarSummary: document.getElementById("defenseToolbarSummary"),
    towers: document.getElementById("defenseTowerButtons"),
    startWave: document.getElementById("defenseStartWave"),
    upgrade: document.getElementById("defenseUpgrade"),
    sell: document.getElementById("defenseSell"),
    skills: document.getElementById("defenseSkillButtons"),
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
  let gameSpeed = normalizeGameSpeed(storage.getItem(speedStorageKey));
  let toolbarCollapsed = storage.getItem(toolbarStorageKey) === "1";
  let resizeQueued = false;

  let state = createInitialState();

  function normalizeGameSpeed(value) {
    const speed = Number(value);
    return speedOptions.includes(speed) ? speed : 1;
  }

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
      skillTypes,
      gameSpeed,
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
          name: storage.getItem("defense_name") || "Player",
          color: "#62e6ff",
          resources: defenseMaps.classic.startResources,
          kills: 0,
          score: 0,
          skillCooldowns: {},
          isHost: true,
        },
      ],
      towers: [],
      enemies: [],
      shots: [],
      effects: [],
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
    const total = 6 + nextWave * 2;
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
      player.skillCooldowns = {};
    });
    state.status = `${state.mapName} 맵이 선택되었습니다.`;
  }

  function syncConfigFromState(nextState) {
    if (nextState.maps) defenseMaps = nextState.maps;
    if (nextState.towerTypes) towerTypes = nextState.towerTypes;
    if (nextState.enemyTypes) enemyTypes = nextState.enemyTypes;
    if (nextState.skillTypes) skillTypes = nextState.skillTypes;
    if (nextState.gameSpeed) {
      gameSpeed = normalizeGameSpeed(nextState.gameSpeed);
      storage.setItem(speedStorageKey, String(gameSpeed));
    }
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
    state.gameSpeed = gameSpeed;
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

  function queueResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      resize();
    });
  }

  function applyToolbarState() {
    ui.toolbar.classList.toggle("is-collapsed", toolbarCollapsed);
    ui.toolbarToggle.textContent = toolbarCollapsed
      ? "패널 펼치기"
      : "패널 접기";
    ui.toolbarToggle.setAttribute("aria-expanded", String(!toolbarCollapsed));
    storage.setItem(toolbarStorageKey, toolbarCollapsed ? "1" : "0");
    queueResize();
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
    storage.setItem("defense_name", name);
    storage.setItem("defense_url", url);
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
        state.effects = state.effects || [];
        state.shots = state.shots || [];
        state.enemies = state.enemies || [];
        state.towers = state.towers || [];
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
    storage.setItem("defense_name", state.players[0].name);
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

  function actionSkill(skillType) {
    if (isSolo) {
      localUseSkill(skillType);
      return;
    }
    send({ type: "defense_skill", skillType });
  }

  function actionGameSpeed(value) {
    const nextSpeed = normalizeGameSpeed(value);
    storage.setItem(speedStorageKey, String(nextSpeed));
    if (isSolo) {
      gameSpeed = nextSpeed;
      state.gameSpeed = nextSpeed;
      state.status = `게임 속도 ${nextSpeed}배`;
      setCenterToast(`게임 속도 ${nextSpeed}배`);
      renderHud();
      return;
    }
    if (!isHost()) {
      setCenterToast("방장만 게임 속도를 변경할 수 있습니다.");
      return;
    }
    send({ type: "defense_speed", speed: nextSpeed });
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

  function placementBlockReason(cellX, cellY) {
    if (state.phase !== "build") return "건설 시간 아님";
    if (cellX < 0 || cellX >= world.columns || cellY < 0 || cellY >= world.rows)
      return "맵 밖";
    if (pathCells.has(`${cellX},${cellY}`)) return "경로 위";
    if (
      state.towers.some(
        (tower) => tower.cellX === cellX && tower.cellY === cellY,
      )
    ) {
      return "타워 있음";
    }
    return "";
  }

  function towerRangeFor(tower, config = towerTypes[tower?.type]) {
    if (Number.isFinite(Number(tower?.range))) return Number(tower.range);
    return (
      Number(config?.range || 0) +
      Math.max(0, Number(tower?.level || 1) - 1) * 14
    );
  }

  function colorWithAlpha(color, alpha) {
    const match = /^#?([0-9a-f]{6})$/i.exec(color || "");
    if (!match) return color || `rgba(255,255,255,${alpha})`;
    const value = match[1];
    return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${alpha})`;
  }

  function ownerForTower(tower) {
    return (
      state.players.find((player) => player.id === tower.ownerId) ||
      (tower.ownerId === "local" ? selfPlayer() : null)
    );
  }

  function towerOwnerColor(tower) {
    return tower.ownerColor || ownerForTower(tower)?.color || "#f5fbff";
  }

  function towerOwnerName(tower) {
    return tower.ownerName || ownerForTower(tower)?.name || "알 수 없음";
  }

  function isMyTower(tower) {
    return tower?.ownerId === clientId;
  }

  function towerOwnerLabel(tower) {
    return isMyTower(tower) ? "내 타워" : `${towerOwnerName(tower)} 타워`;
  }

  function nameInitials(name) {
    const parts = String(name || "?")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "?";
    const text =
      parts.length > 1
        ? parts
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
        : parts[0].slice(0, 2);
    return text.toUpperCase();
  }

  function pathCoverageFor(center, range) {
    let count = 0;
    let closest = Infinity;
    pathCells.forEach((key) => {
      const [cellX, cellY] = key.split(",").map(Number);
      const point = cellCenter(cellX, cellY);
      const distance = Math.hypot(point.x - center.x, point.y - center.y);
      closest = Math.min(closest, distance);
      if (distance <= range + world.cell * 0.45) count += 1;
    });
    return { count, closest };
  }

  function localWaveSpawnCount(wave) {
    return 6 + wave * 2 + ([5, 10, 15].includes(wave) ? 1 : 0);
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
    const start = pathPixels[0];
    if (start) {
      addDefenseEffect({
        x: start.x,
        y: start.y,
        kind: "wave",
        color: "#ffd166",
        ttl: 1,
        text: `W${state.wave}`,
      });
    }
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
      ownerColor: player.color,
      type,
      cellX,
      cellY,
      level: 1,
      range: config.range,
      cooldownLeft: 0,
    });
    const center = cellCenter(cellX, cellY);
    addDefenseEffect({
      x: center.x,
      y: center.y,
      kind: "build",
      color: config.color,
      ttl: 0.7,
      text: "BUILD",
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
    const center = cellCenter(tower.cellX, tower.cellY);
    addDefenseEffect({
      x: center.x,
      y: center.y,
      kind: "upgrade",
      color: "#f8f871",
      ttl: 0.7,
      text: `Lv${tower.level}`,
    });
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
    const center = cellCenter(tower.cellX, tower.cellY);
    addDefenseEffect({
      x: center.x,
      y: center.y,
      kind: "sell",
      color: "#c8f7ff",
      ttl: 0.65,
      text: `+${Math.round(total * 0.6)}`,
    });
    state.status = "타워를 판매했습니다.";
    renderHud();
  }

  function localUseSkill(skillType) {
    const config = skillTypes[skillType];
    const player = selfPlayer();
    if (!config || !player) return;
    player.skillCooldowns = player.skillCooldowns || {};
    const cooldown = Number(player.skillCooldowns[skillType] || 0);
    if (cooldown > 0) {
      setCenterToast(
        `${config.name} 재사용 대기 중입니다. ${Math.ceil(cooldown)}초`,
      );
      return;
    }
    if (player.resources < config.cost) {
      setCenterToast("자원이 부족합니다.");
      return;
    }
    if (["win", "defeat"].includes(state.phase)) {
      setCenterToast("게임이 끝난 뒤에는 전술 스킬을 사용할 수 없습니다.");
      return;
    }
    if (["airstrike", "freeze"].includes(skillType) && !state.enemies.length) {
      setCenterToast("대상 적이 없습니다.");
      return;
    }
    if (skillType === "repair" && state.baseHealth >= state.baseHealthMax) {
      setCenterToast("기지가 이미 최대 체력입니다.");
      return;
    }

    player.resources -= config.cost;
    player.skillCooldowns[skillType] = config.cooldown || 0;
    if (skillType === "airstrike") localAirstrike(player, config);
    if (skillType === "freeze") localFreeze(player, config);
    if (skillType === "repair") localRepair(player, config);
    renderHud();
  }

  function frontLocalEnemy() {
    return [...state.enemies].sort(
      (a, b) => (b.segment || 0) - (a.segment || 0) || b.x + b.y - (a.x + a.y),
    )[0];
  }

  function localAirstrike(player, config) {
    const target = frontLocalEnemy();
    if (!target) return;
    const affected = state.enemies.filter(
      (enemy) =>
        Math.hypot(enemy.x - target.x, enemy.y - target.y) <= config.radius,
    );
    addDefenseEffect({
      x: target.x,
      y: target.y,
      kind: "airstrike",
      color: config.color,
      ttl: 1.05,
      text: "포격",
    });
    affected.forEach((enemy) => damageLocalEnemy(enemy, config.damage));
    state.status = `${player.name} 포격 지원 호출.`;
  }

  function localFreeze(player, config) {
    const target = frontLocalEnemy();
    if (!target) return;
    let count = 0;
    state.enemies.forEach((enemy) => {
      if (Math.hypot(enemy.x - target.x, enemy.y - target.y) > config.radius)
        return;
      enemy.slowUntil = Math.max(enemy.slowUntil || 0, config.duration || 0);
      count += 1;
    });
    addDefenseEffect({
      x: target.x,
      y: target.y,
      kind: "freeze",
      color: config.color,
      ttl: 1.05,
      text: "빙결",
    });
    state.status = `${player.name} 빙결장으로 적 ${count}기를 묶었습니다.`;
  }

  function localRepair(player, config) {
    const before = state.baseHealth;
    state.baseHealth = Math.min(
      state.baseHealthMax,
      state.baseHealth + (config.heal || 0),
    );
    const end = pathPixels[pathPixels.length - 1];
    addDefenseEffect({
      x: end.x,
      y: end.y,
      kind: "repair",
      color: config.color,
      ttl: 1.05,
      text: `+${state.baseHealth - before}`,
    });
    state.status = `${player.name} 기지 긴급 수리. +${state.baseHealth - before}`;
  }

  function addDefenseEffect(effect) {
    state.effects = [...(state.effects || []), effect].slice(-64);
  }

  function localUpdate(dt) {
    const simDt =
      state.phase === "wave"
        ? dt * normalizeGameSpeed(state.gameSpeed || gameSpeed)
        : dt;
    state.effects = (state.effects || [])
      .map((effect) => ({ ...effect, ttl: effect.ttl - simDt }))
      .filter((effect) => effect.ttl > 0);
    state.shots.forEach((shot) => (shot.ttl -= simDt));
    state.shots = state.shots.filter((shot) => shot.ttl > 0);
    const player = selfPlayer();
    if (player?.skillCooldowns) {
      Object.keys(player.skillCooldowns).forEach((key) => {
        player.skillCooldowns[key] = Math.max(
          0,
          Number(player.skillCooldowns[key] || 0) - dt,
        );
      });
    }
    if (state.phase === "build" && state.autoStartAt) {
      state.autoStartSeconds = Math.max(
        0,
        Math.ceil((state.autoStartAt - Date.now()) / 1000),
      );
      if (Date.now() >= state.autoStartAt) localStartWave();
    }
    if (state.phase !== "wave") return;
    state.spawnTimer -= simDt;
    while (state.spawnRemaining > 0 && state.spawnTimer <= 0) {
      spawnLocalEnemy();
      state.spawnRemaining -= 1;
      state.spawnTimer += Math.max(0.32, 0.84 - state.wave * 0.03);
    }
    updateLocalEnemies(simDt);
    updateLocalTowers(simDt);
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
        const bonus = 45 + state.wave * 12;
        state.phase = "build";
        selfPlayer().resources += bonus;
        state.status = `${state.wave} 웨이브 완료. +${bonus}`;
        state.autoStartAt = Date.now() + 25000;
        state.autoStartSeconds = 25;
        state.wavePreview = buildWavePreview(state.wave + 1);
        addDefenseEffect({
          x: world.width / 2,
          y: world.height / 2,
          kind: "reward",
          color: "#8be66f",
          ttl: 1,
          text: `+${bonus}`,
        });
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
    let health = 44 + state.wave * 14;
    let speed = 40 + state.wave * 2.3;
    let reward = 13 + state.wave * 3;
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
      shield = health * 0.45;
      reward += 9;
    }
    if (enemyType === "boss") {
      health = 520 + state.wave * 70;
      speed = 27;
      reward = 110 + state.wave * 7;
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
      burnUntil: 0,
      burnDps: 0,
      markedUntil: 0,
      markBonus: 0,
      enraged: false,
    });
  }

  function updateLocalEnemies(dt) {
    const reached = [];
    state.enemies.forEach((enemy) => {
      enemy.slowUntil = Math.max(0, (enemy.slowUntil || 0) - dt);
      enemy.markedUntil = Math.max(0, (enemy.markedUntil || 0) - dt);
      if ((enemy.burnUntil || 0) > 0) {
        enemy.burnUntil = Math.max(0, (enemy.burnUntil || 0) - dt);
        damageLocalEnemy(enemy, (enemy.burnDps || 0) * dt, { showHit: false });
        if (!state.enemies.includes(enemy)) return;
      }
      if (
        enemy.type === "boss" &&
        !enemy.enraged &&
        enemy.health / Math.max(1, enemy.maxHealth) <= 0.45
      ) {
        enemy.enraged = true;
        addDefenseEffect({
          x: enemy.x,
          y: enemy.y,
          kind: "rage",
          color: "#ff5f6d",
          ttl: 1,
          text: "격노",
        });
      }
      let speed = enemy.speed * (enemy.slowUntil > 0 ? 0.55 : 1);
      if (enemy.enraged) speed *= 1.22;
      let remaining = speed * dt;
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
      const damage = (enemy.baseDamage || 1) + (enemy.enraged ? 1 : 0);
      state.baseHealth = Math.max(0, state.baseHealth - damage);
      addDefenseEffect({
        x: enemy.x,
        y: enemy.y,
        kind: "base_hit",
        color: "#ff5f6d",
        ttl: 0.9,
        text: `-${damage}`,
      });
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
      targets.forEach((enemy) => {
        applyLocalDefenseStatus(enemy, config);
        damageLocalEnemy(enemy, damage);
      });
    });
  }

  function applyLocalDefenseStatus(enemy, config) {
    if (!state.enemies.includes(enemy)) return;
    if (config.burn) {
      enemy.burnUntil = Math.max(enemy.burnUntil || 0, config.burn);
      enemy.burnDps = Math.max(enemy.burnDps || 0, config.burnDps || 0);
    }
    if (config.mark) {
      enemy.markedUntil = Math.max(enemy.markedUntil || 0, config.mark);
      enemy.markBonus = Math.max(enemy.markBonus || 0, config.markBonus || 0);
    }
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

  function damageLocalEnemy(enemy, damage, options = {}) {
    if (!state.enemies.includes(enemy)) return;
    if ((enemy.markedUntil || 0) > 0) damage *= 1 + (enemy.markBonus || 0);
    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, damage);
      enemy.shield -= absorbed;
      damage -= absorbed;
      if (damage <= 0) {
        if (options.showHit !== false)
          addDefenseEffect({
            x: enemy.x,
            y: enemy.y,
            kind: "shield",
            color: "#6fe8ff",
            ttl: 0.45,
            text: "SHIELD",
          });
        return;
      }
    }
    enemy.health -= damage;
    if (enemy.health > 0) {
      if (options.showHit !== false)
        addDefenseEffect({
          x: enemy.x,
          y: enemy.y,
          kind: "hit",
          color: "#f8f871",
          ttl: 0.35,
          text: `-${Math.round(damage)}`,
        });
      return;
    }
    state.enemies = state.enemies.filter((item) => item !== enemy);
    const player = selfPlayer();
    player.resources += enemy.reward || 0;
    player.kills = (player.kills || 0) + 1;
    player.score = (player.score || 0) + (enemy.reward || 0) * 10;
    addDefenseEffect({
      x: enemy.x,
      y: enemy.y,
      kind: "kill",
      color: "#ffd166",
      ttl: 0.8,
      text: `+${enemy.reward || 0}`,
    });
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

  function renderSpeedButtons() {
    const activeSpeed = normalizeGameSpeed(state.gameSpeed || gameSpeed);
    ui.speedButtons.forEach((button) => {
      const speed = normalizeGameSpeed(button.dataset.defenseSpeed);
      button.classList.toggle("active", speed === activeSpeed);
      button.disabled = !isSolo && !isHost();
      button.setAttribute("aria-pressed", String(speed === activeSpeed));
    });
  }

  function renderHud() {
    const player = selfPlayer();
    const selected = state.towers.find((tower) => tower.id === selectedTowerId);
    const activeSpeed = normalizeGameSpeed(state.gameSpeed || gameSpeed);
    ui.mode.textContent = isSolo ? "혼자" : isHost() ? "방장" : "참가";
    ui.wave.textContent = `${state.wave || 0}/${state.maxWave || 15}`;
    ui.base.textContent = `${state.baseHealth ?? 0}/${state.baseHealthMax ?? 20}`;
    ui.resources.textContent = player?.resources ?? 0;
    ui.speed.textContent = `${activeSpeed}배`;
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
    if (selected) {
      const config = towerTypes[selected.type] || towerTypes.basic;
      const range = towerRangeFor(selected, config);
      const ownerText = towerOwnerLabel(selected);
      const boostText =
        selected.boost && selected.boost > 1
          ? ` · 증폭 x${selected.boost}`
          : "";
      const cooldown =
        selected.cooldownLeft && selected.cooldownLeft > 0
          ? ` · 재장전 ${selected.cooldownLeft.toFixed(1)}s`
          : "";
      const selectedText = `${config.name || "타워"} ${selected.level}단계 · ${ownerText} · 사거리 ${Math.round(range)}${boostText}${cooldown}`;
      ui.selection.textContent = selectedText;
      ui.toolbarSummary.textContent = selectedText;
    } else {
      const config = towerTypes[selectedTowerType] || towerTypes.basic;
      const hover =
        hoverCell && canPlace(hoverCell.x, hoverCell.y)
          ? ` · 경로 ${pathCoverageFor(cellCenter(hoverCell.x, hoverCell.y), config.range).count}칸`
          : "";
      const selectionText = `${config.name || "타워"} 선택됨 · 비용 ${config.cost || 0} · 사거리 ${Math.round(config.range || 0)}${hover}`;
      ui.selection.textContent = selectionText;
      ui.toolbarSummary.textContent = selectionText;
    }
    const mapLocked = state.wave > 0 || state.towers.length > 0 || !isHost();
    ui.mapSelect.disabled = Boolean(mapLocked);
    ui.mapHint.textContent = `${state.mapName || currentMap().name} · ${
      mapLocked
        ? "현재 방에서는 맵 변경이 잠겼습니다."
        : "1웨이브 시작 전, 타워 배치 전에만 변경할 수 있습니다."
    }`;
    renderWavePreview();
    renderSpeedButtons();
    renderSkillButtons();
    const towerCounts = state.towers.reduce((counts, tower) => {
      counts[tower.ownerId] = (counts[tower.ownerId] || 0) + 1;
      return counts;
    }, {});
    ui.players.innerHTML =
      state.players
        .map(
          (player) =>
            `<li><span><i style="background:${player.color}"></i>${escapeHtml(player.name)}${player.isHost ? " · 방장" : ""}</span><strong>${player.resources} · T${towerCounts[player.id] || 0} · K${player.kills || 0}</strong></li>`,
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
    const toolbarRect = ui.toolbar?.getBoundingClientRect();
    const sideDocked =
      toolbarRect &&
      toolbarRect.left > width * 0.45 &&
      toolbarRect.width < width * 0.5;
    const toolbarReserve =
      toolbarRect && toolbarRect.height > 0 && !sideDocked
        ? Math.min(
            height * (toolbarCollapsed ? 0.12 : 0.36),
            toolbarRect.height + 28,
          )
        : 0;
    const availableHeight = Math.max(320, height - toolbarReserve);
    camera.scale =
      Math.min(width / world.width, availableHeight / world.height) * 0.94;
    camera.offsetX = (width - world.width * camera.scale) / 2;
    camera.offsetY =
      Math.max(8, (availableHeight - world.height * camera.scale) / 2) + 6;
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
    const theme = defenseMapTheme(state.mapId);
    const backdrop = ctx.createLinearGradient(
      0,
      0,
      window.innerWidth,
      window.innerHeight,
    );
    backdrop.addColorStop(0, theme.backdrop[0]);
    backdrop.addColorStop(0.55, theme.backdrop[1]);
    backdrop.addColorStop(1, theme.backdrop[2]);
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    const topLeft = toScreen(0, 0);
    ctx.save();
    ctx.translate(topLeft.x, topLeft.y);
    ctx.scale(camera.scale, camera.scale);
    const ground = ctx.createLinearGradient(0, 0, world.width, world.height);
    ground.addColorStop(0, theme.ground[0]);
    ground.addColorStop(1, theme.ground[1]);
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, world.width, world.height);
    drawMapDecor();
    drawGrid();
    drawPath();
    drawPathThreatOverlay();
    drawSpawnPortal();
    drawPlacementPreview();
    state.towers.forEach(drawTower);
    state.enemies.forEach(drawEnemy);
    state.shots.forEach(drawShot);
    (state.effects || []).forEach(drawDefenseEffect);
    drawPing();
    drawBase();
    ctx.restore();
  }

  function defenseMapTheme(mapId) {
    const themes = {
      classic: {
        backdrop: ["#101827", "#142139", "#21172e"],
        ground: ["#21344b", "#1b273d"],
        panel: "rgba(98,230,255,.10)",
        trim: "rgba(245,251,255,.16)",
        accent: "#62e6ff",
        dust: "rgba(178,203,255,.07)",
      },
      harbor: {
        backdrop: ["#0b1726", "#0f2936", "#111d32"],
        ground: ["#18394a", "#19283b"],
        panel: "rgba(77,185,220,.12)",
        trim: "rgba(205,239,255,.18)",
        accent: "#5ed3ff",
        dust: "rgba(93,211,255,.08)",
      },
      lava: {
        backdrop: ["#1f1118", "#2a1829", "#35191c"],
        ground: ["#2b2636", "#231d2b"],
        panel: "rgba(255,117,73,.13)",
        trim: "rgba(255,194,115,.18)",
        accent: "#ff8b52",
        dust: "rgba(255,126,76,.08)",
      },
    };
    return themes[mapId] || themes.classic;
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
    const mapId = state.mapId || "classic";
    const theme = defenseMapTheme(mapId);
    drawMapEnvironment(mapId, theme);
    for (let index = 0; index < 96; index += 1) {
      const x = 30 + ((index * 151) % (world.width - 60));
      const y = 30 + ((index * 97) % (world.height - 60));
      if (
        pathCells.has(
          `${Math.floor(x / world.cell)},${Math.floor(y / world.cell)}`,
        )
      ) {
        continue;
      }
      const type = index % 5;
      if (type === 0) {
        ctx.fillStyle = theme.panel;
        ctx.fillRect(x - 16, y - 11, 32, 22);
        ctx.strokeStyle = theme.trim;
        ctx.strokeRect(x - 16, y - 11, 32, 22);
        ctx.fillStyle = "rgba(6,12,22,.32)";
        ctx.fillRect(x - 8, y - 5, 16, 10);
      } else if (type === 1) {
        ctx.fillStyle = "rgba(139,230,111,.09)";
        ctx.beginPath();
        ctx.moveTo(x, y - 18);
        ctx.lineTo(x + 18, y + 10);
        ctx.lineTo(x - 18, y + 10);
        ctx.closePath();
        ctx.fill();
      } else if (type === 2) {
        ctx.fillStyle = "rgba(255,186,90,.10)";
        ctx.fillRect(x - 11, y - 14, 22, 28);
        ctx.fillStyle = "rgba(255,255,255,.08)";
        ctx.fillRect(x - 7, y - 10, 14, 5);
      } else {
        ctx.strokeStyle =
          type === 3 ? "rgba(208,140,255,.12)" : "rgba(255,255,255,.07)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 18, y - 12, 36, 24);
        ctx.beginPath();
        ctx.moveTo(x - 12, y);
        ctx.lineTo(x + 12, y);
        ctx.stroke();
      }
    }
  }

  function drawMapEnvironment(mapId, theme) {
    ctx.save();
    if (mapId === "harbor") {
      drawHarborWater(theme);
    } else if (mapId === "lava") {
      drawLavaCracks(theme);
    } else {
      drawClassicTechFloor(theme);
    }
    ctx.restore();
  }

  function drawClassicTechFloor(theme) {
    ctx.strokeStyle = theme.dust;
    ctx.lineWidth = 2;
    for (let index = 0; index < 34; index += 1) {
      const x = 42 + ((index * 197) % (world.width - 120));
      const y = 54 + ((index * 131) % (world.height - 120));
      if (
        pathCells.has(
          `${Math.floor(x / world.cell)},${Math.floor(y / world.cell)}`,
        )
      )
        continue;
      const width = 54 + (index % 4) * 18;
      const height = 28 + (index % 3) * 10;
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle =
        index % 3 === 0 ? "rgba(98,230,255,.035)" : "rgba(255,255,255,.025)";
      ctx.fillRect(x + 3, y + 3, width - 6, height - 6);
      if (index % 2 === 0) {
        ctx.beginPath();
        ctx.moveTo(x + 10, y + height / 2);
        ctx.lineTo(x + width - 10, y + height / 2);
        ctx.stroke();
      }
    }
  }

  function drawHarborWater(theme) {
    const time = performance.now() / 1000;
    ctx.fillStyle = "rgba(30,124,162,.16)";
    ctx.fillRect(0, 0, world.width, 96);
    ctx.fillRect(0, world.height - 118, world.width, 118);
    ctx.strokeStyle = "rgba(122,229,255,.20)";
    ctx.lineWidth = 3;
    for (let y of [42, 76, world.height - 86, world.height - 42]) {
      ctx.beginPath();
      for (let x = 0; x <= world.width; x += 34) {
        const waveY = y + Math.sin(x / 54 + time * 1.6) * 5;
        if (x === 0) ctx.moveTo(x, waveY);
        else ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
    for (let index = 0; index < 22; index += 1) {
      const x = 60 + ((index * 173) % (world.width - 120));
      const y = index % 2 ? world.height - 82 : 42;
      if (
        pathCells.has(
          `${Math.floor(x / world.cell)},${Math.floor(y / world.cell)}`,
        )
      )
        continue;
      ctx.fillStyle = "rgba(116,76,42,.45)";
      ctx.fillRect(x - 20, y - 8, 40, 16);
      ctx.strokeStyle = theme.trim;
      ctx.strokeRect(x - 20, y - 8, 40, 16);
    }
  }

  function drawLavaCracks(theme) {
    const pulse = 0.55 + Math.sin(performance.now() / 360) * 0.25;
    for (let index = 0; index < 44; index += 1) {
      const x = 38 + ((index * 181) % (world.width - 76));
      const y = 42 + ((index * 113) % (world.height - 84));
      if (
        pathCells.has(
          `${Math.floor(x / world.cell)},${Math.floor(y / world.cell)}`,
        )
      )
        continue;
      ctx.strokeStyle = `rgba(255,112,68,${0.13 + pulse * 0.12})`;
      ctx.lineWidth = index % 3 === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(x - 22, y - 4);
      ctx.lineTo(x - 7, y + 7);
      ctx.lineTo(x + 8, y - 5);
      ctx.lineTo(x + 24, y + 8);
      ctx.stroke();
      if (index % 4 === 0) {
        ctx.fillStyle = "rgba(255,184,86,.08)";
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();
      }
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
    drawPathArrows();
  }

  function drawPathThreatOverlay() {
    const enemies = state.enemies || [];
    if (!pathPixels.length || (!enemies.length && state.phase !== "wave"))
      return;
    const pulse = 0.5 + Math.sin(performance.now() / 190) * 0.5;
    const spawned = Math.max(
      0,
      Number(state.spawnTotal || 0) - Number(state.spawnRemaining || 0),
    );
    const pressure = Math.min(
      1,
      (enemies.length * 0.8 + spawned * 0.2) /
        Math.max(8, Number(state.spawnTotal || 14)),
    );
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let index = 0; index < pathPixels.length - 1; index += 1) {
      const a = pathPixels[index];
      const b = pathPixels[index + 1];
      const segmentLoad = enemies.filter(
        (enemy) =>
          Math.max(0, Math.floor(Number(enemy.segment || 0))) === index,
      ).length;
      const baseProximity = index / Math.max(1, pathPixels.length - 2);
      const alpha = Math.min(
        0.52,
        0.035 + pressure * 0.11 + segmentLoad * 0.12 + baseProximity * 0.08,
      );
      if (alpha <= 0.05) continue;
      ctx.strokeStyle = `rgba(255,95,109,${alpha + pulse * 0.05})`;
      ctx.lineWidth = world.cell * (0.42 + pressure * 0.16);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    enemies.forEach((enemy) => {
      const danger = Math.min(
        1,
        Math.max(0, Number(enemy.segment || 0)) /
          Math.max(1, pathPixels.length - 2),
      );
      const radius = 20 + danger * 20 + pulse * 8;
      ctx.fillStyle = `rgba(255,95,109,${0.055 + danger * 0.08})`;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (danger > 0.72) {
        ctx.strokeStyle = `rgba(255,209,102,${0.45 + pulse * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, radius * 0.62, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    const leading = enemies.reduce(
      (best, enemy) =>
        Number(enemy.segment || 0) > Number(best?.segment || -1) ? enemy : best,
      null,
    );
    const healthRatio =
      Number(state.baseHealth || 0) /
      Math.max(1, Number(state.baseHealthMax || 1));
    const breachRisk =
      leading &&
      Number(leading.segment || 0) >= Math.max(1, pathPixels.length - 3);
    if (breachRisk || healthRatio <= 0.35) {
      const end = pathPixels[pathPixels.length - 1];
      ctx.strokeStyle = `rgba(255,95,109,${0.42 + pulse * 0.34})`;
      ctx.lineWidth = 5;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.arc(end.x, end.y - 12, 58 + pulse * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      drawDefenseLabel("기지 위험", end.x, end.y - 86, "#ff8f9a");
    }
    ctx.restore();
  }

  function drawPathArrows() {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,.46)";
    for (let index = 0; index < pathPixels.length - 1; index += 1) {
      const start = pathPixels[index];
      const end = pathPixels[index + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length < world.cell * 2.4) continue;
      const steps = Math.max(1, Math.floor(length / (world.cell * 5)));
      for (let step = 1; step <= steps; step += 1) {
        const t = step / (steps + 1);
        const x = start.x + dx * t;
        const y = start.y + dy * t;
        const angle = Math.atan2(dy, dx);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-8, -7);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-8, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawSpawnPortal() {
    const start = pathPixels[0];
    if (!start) return;
    const pulse = 0.5 + Math.sin(performance.now() / 240) * 0.5;
    ctx.save();
    ctx.shadowColor = "rgba(98,230,255,.88)";
    ctx.shadowBlur = 18 + pulse * 10;
    ctx.fillStyle = `rgba(98,230,255,${0.1 + pulse * 0.08})`;
    ctx.beginPath();
    ctx.arc(
      start.x,
      start.y,
      world.cell * (0.88 + pulse * 0.16),
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = "rgba(245,251,255,.64)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.arc(start.x, start.y, world.cell * 0.76, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#62e6ff";
    ctx.beginPath();
    ctx.arc(start.x, start.y, 7 + pulse * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBase() {
    const end = pathPixels[pathPixels.length - 1];
    const pulse = 0.5 + Math.sin(performance.now() / 260) * 0.5;
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fillRect(end.x - 27, end.y - 16, 54, 36);
    ctx.fillStyle = "#f6f3c8";
    ctx.fillRect(end.x - 24, end.y - 34, 48, 58);
    ctx.shadowColor = "rgba(139,230,111,.8)";
    ctx.shadowBlur = 12 + pulse * 10;
    ctx.fillStyle = "#8be66f";
    ctx.fillRect(end.x - 13, end.y - 48, 26, 16);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(139,230,111,${0.24 + pulse * 0.28})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(end.x, end.y - 16, 38 + pulse * 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ff6a6a";
    ctx.fillRect(
      end.x - 16,
      end.y - 58,
      32 * ((state.baseHealth || 0) / (state.baseHealthMax || 20)),
      6,
    );
  }

  function drawRangeRing(center, range, color, options = {}) {
    ctx.save();
    ctx.fillStyle = colorWithAlpha(color, options.fillAlpha ?? 0.07);
    ctx.strokeStyle = colorWithAlpha(color, options.strokeAlpha ?? 0.62);
    ctx.lineWidth = options.lineWidth || 3;
    if (options.dashed) ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.arc(center.x, center.y, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawCoverageCells(center, range, color, alpha = 0.15) {
    ctx.save();
    ctx.fillStyle = colorWithAlpha(color, alpha);
    pathCells.forEach((key) => {
      const [cellX, cellY] = key.split(",").map(Number);
      const point = cellCenter(cellX, cellY);
      if (
        Math.hypot(point.x - center.x, point.y - center.y) >
        range + world.cell * 0.45
      ) {
        return;
      }
      ctx.fillRect(
        cellX * world.cell + 4,
        cellY * world.cell + 4,
        world.cell - 8,
        world.cell - 8,
      );
    });
    ctx.restore();
  }

  function drawDefenseLabel(text, x, y, color = "#f5fbff") {
    if (!text) return;
    ctx.save();
    ctx.font = "900 15px Malgun Gothic, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const width = Math.min(230, Math.max(92, ctx.measureText(text).width + 24));
    const labelX = Math.max(
      width / 2 + 12,
      Math.min(world.width - width / 2 - 12, x),
    );
    const labelY = Math.max(20, Math.min(world.height - 20, y));
    ctx.fillStyle = "rgba(7,17,31,.84)";
    ctx.strokeStyle = colorWithAlpha(color, 0.72);
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect)
      ctx.roundRect(labelX - width / 2, labelY - 14, width, 28, 8);
    else ctx.rect(labelX - width / 2, labelY - 14, width, 28);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, labelX, labelY + 1);
    ctx.restore();
  }

  function drawTowerGhost(center, config, valid) {
    ctx.save();
    ctx.globalAlpha = valid ? 0.88 : 0.48;
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + 12, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#101827";
    ctx.fillRect(center.x - 13, center.y - 13, 26, 26);
    ctx.fillStyle = valid ? config.color : "#ff5f6d";
    if (config.boost) {
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillRect(center.x - 9, center.y - 9, 18, 18);
      ctx.strokeStyle = valid
        ? colorWithAlpha(config.color, 0.86)
        : "rgba(255,95,109,.9)";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(center.x + 24, center.y - 11);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlacementPreview() {
    if (!hoverCell) return;
    if (
      hoverCell.x < 0 ||
      hoverCell.x >= world.columns ||
      hoverCell.y < 0 ||
      hoverCell.y >= world.rows
    ) {
      return;
    }
    const config = towerTypes[selectedTowerType] || towerTypes.basic;
    const center = cellCenter(hoverCell.x, hoverCell.y);
    const coverage = pathCoverageFor(center, config.range);
    const valid = canPlace(hoverCell.x, hoverCell.y) && state.phase === "build";
    const color = valid ? config.color : "#ff5f6d";
    drawCoverageCells(center, config.range, color, valid ? 0.17 : 0.06);
    drawRangeRing(center, config.range, color, {
      dashed: true,
      fillAlpha: valid ? 0.08 : 0.035,
      strokeAlpha: valid ? 0.68 : 0.7,
      lineWidth: valid ? 3 : 2.5,
    });
    ctx.fillStyle = valid ? "rgba(98,230,255,.18)" : "rgba(255,95,109,.22)";
    ctx.fillRect(
      hoverCell.x * world.cell,
      hoverCell.y * world.cell,
      world.cell,
      world.cell,
    );
    ctx.strokeStyle = valid
      ? colorWithAlpha(config.color, 0.9)
      : "rgba(255,95,109,.95)";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      hoverCell.x * world.cell + 2,
      hoverCell.y * world.cell + 2,
      world.cell - 4,
      world.cell - 4,
    );
    drawTowerGhost(center, config, valid);
    drawDefenseLabel(
      valid
        ? `사거리 ${Math.round(config.range)} · 경로 ${coverage.count}칸`
        : placementBlockReason(hoverCell.x, hoverCell.y) || "배치 불가",
      center.x,
      center.y - config.range - 18,
      valid ? config.color : "#ff8f9a",
    );
  }

  function drawRoundRect(x, y, width, height, radius = 6) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
    else ctx.rect(x, y, width, height);
  }

  function drawTowerOwnerRing(tower, center, selected) {
    const ownerColor = towerOwnerColor(tower);
    const mine = isMyTower(tower);
    const level = Math.max(1, Math.min(3, Number(tower.level || 1)));
    const pulse = 0.5 + Math.sin(performance.now() / 260) * 0.5;
    ctx.save();
    ctx.strokeStyle = colorWithAlpha(ownerColor, mine ? 0.92 : 0.72);
    ctx.lineWidth = mine ? 4 : 3;
    if (!mine) ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.arc(
      center.x,
      center.y,
      24 + level * 3 + (selected ? pulse * 3 : 0),
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = colorWithAlpha(ownerColor, mine ? 0.18 : 0.1);
    ctx.beginPath();
    ctx.arc(center.x, center.y, 19 + level * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTowerOwnerBadge(tower, center, selected) {
    const ownerColor = towerOwnerColor(tower);
    const mine = isMyTower(tower);
    const initials = mine ? "나" : nameInitials(towerOwnerName(tower));
    ctx.save();
    ctx.font = "900 10px Malgun Gothic, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(7,17,31,.88)";
    ctx.strokeStyle = colorWithAlpha(ownerColor, mine ? 0.95 : 0.72);
    ctx.lineWidth = mine ? 2.5 : 2;
    drawRoundRect(center.x - 13, center.y - 42, 26, 18, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = mine ? "#f8f871" : "#f5fbff";
    ctx.fillText(initials, center.x, center.y - 32.5);
    ctx.restore();
    if (selected) {
      drawDefenseLabel(
        `${towerOwnerLabel(tower)} · Lv${tower.level}`,
        center.x,
        center.y + 54,
        ownerColor,
      );
    }
  }

  function drawTowerLevelPips(level, color) {
    for (let index = 0; index < 3; index += 1) {
      ctx.fillStyle =
        index < level ? colorWithAlpha(color, 0.95) : "rgba(255,255,255,.18)";
      ctx.fillRect(-13 + index * 9, 15, 6, 4);
    }
  }

  function drawTowerBody(tower, center, config, aim, target) {
    const type = tower.type || "basic";
    const level = Math.max(1, Math.min(3, Number(tower.level || 1)));
    const color = config.color || "#62e6ff";
    const ownerColor = towerOwnerColor(tower);
    const pulse = 0.5 + Math.sin(performance.now() / 220) * 0.5;
    const baseSize = 28 + level * 3;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.fillStyle = "rgba(0,0,0,.34)";
    ctx.beginPath();
    ctx.ellipse(0, 15, 21 + level * 2, 8 + level, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#101827";
    ctx.strokeStyle = colorWithAlpha(ownerColor, 0.64);
    ctx.lineWidth = 2.5;
    drawRoundRect(-baseSize / 2, -baseSize / 2, baseSize, baseSize, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colorWithAlpha(color, 0.28);
    drawRoundRect(
      -baseSize / 2 + 4,
      -baseSize / 2 + 4,
      baseSize - 8,
      baseSize - 8,
      4,
    );
    ctx.fill();

    if (type === "boost") {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10 + level * 3;
      ctx.strokeStyle = colorWithAlpha(color, 0.82);
      ctx.lineWidth = 3;
      for (let ring = 0; ring < level; ring += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, 8 + ring * 6 + pulse * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 7 + level, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.save();
      ctx.rotate(aim);
      ctx.lineCap = "round";
      if (type === "sniper") {
        ctx.strokeStyle = "rgba(0,0,0,.5)";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(31 + level * 4, 0);
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.lineTo(34 + level * 5, 0);
        ctx.stroke();
        ctx.strokeStyle = colorWithAlpha(color, 0.72);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(12, 0, 8 + level, 0, Math.PI * 2);
        ctx.moveTo(12, -12 - level);
        ctx.lineTo(12, 12 + level);
        ctx.moveTo(0 - level, 0);
        ctx.lineTo(24 + level, 0);
        ctx.stroke();
      } else if (type === "blast") {
        ctx.fillStyle = colorWithAlpha(color, 0.9);
        ctx.beginPath();
        ctx.arc(5, 0, 10 + level * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.44)";
        ctx.lineWidth = 10 + level * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(23 + level * 3, 0);
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = 6 + level;
        ctx.stroke();
      } else if (type === "slow") {
        ctx.strokeStyle = colorWithAlpha(color, 0.9);
        ctx.lineWidth = 4;
        for (let arm = 0; arm < 4; arm += 1) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(20 + level * 3, 0);
          ctx.stroke();
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let index = 0; index < 6; index += 1) {
          const angle = (Math.PI * 2 * index) / 6;
          const radius = index % 2 ? 9 + level : 13 + level * 1.5;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (index) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = "rgba(0,0,0,.42)";
        ctx.lineWidth = 7;
        [-4, 4].forEach((offset) => {
          ctx.beginPath();
          ctx.moveTo(-2, offset);
          ctx.lineTo(23 + level * 4, offset);
          ctx.stroke();
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        [-4, 4].forEach((offset) => {
          ctx.beginPath();
          ctx.moveTo(-2, offset);
          ctx.lineTo(24 + level * 4, offset);
          ctx.stroke();
        });
      }
      if (target) {
        ctx.fillStyle = "#f5fbff";
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(28 + level * 4, 0, 3.5 + level, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    ctx.fillStyle = "rgba(255,255,255,.24)";
    ctx.beginPath();
    ctx.arc(-5, -7, 5 + level, 0, Math.PI * 2);
    ctx.fill();
    drawTowerLevelPips(level, color);
    ctx.restore();
  }

  function drawTower(tower) {
    const config = towerTypes[tower.type] || towerTypes.basic;
    const center = cellCenter(tower.cellX, tower.cellY);
    const selected = tower.id === selectedTowerId;
    const range = towerRangeFor(tower, config);
    const target = findVisibleTowerTarget(tower, center, config);
    const aim = target
      ? Math.atan2(target.y - center.y, target.x - center.x)
      : -Math.PI / 2;
    if (selected) {
      drawCoverageCells(center, range, config.color, 0.18);
      drawRangeRing(center, range, config.color, {
        fillAlpha: 0.075,
        strokeAlpha: 0.78,
        lineWidth: 3,
      });
      drawSelectedTowerLinks(tower, center, range, config, target);
    }
    drawTowerOwnerRing(tower, center, selected);
    drawTowerBody(tower, center, config, aim, target);
    drawTowerOwnerBadge(tower, center, selected);
    drawTowerCooldown(tower, center, config);
  }

  function drawSelectedTowerLinks(tower, center, range, config, target) {
    ctx.save();
    if (config.boost) {
      state.towers.forEach((other) => {
        if (other.id === tower.id) return;
        const otherCenter = cellCenter(other.cellX, other.cellY);
        if (
          Math.hypot(otherCenter.x - center.x, otherCenter.y - center.y) > range
        )
          return;
        ctx.strokeStyle = colorWithAlpha(config.color, 0.48);
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 7]);
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(otherCenter.x, otherCenter.y);
        ctx.stroke();
      });
      const coverage = state.towers.filter((other) => {
        if (other.id === tower.id) return false;
        const otherCenter = cellCenter(other.cellX, other.cellY);
        return (
          Math.hypot(otherCenter.x - center.x, otherCenter.y - center.y) <=
          range
        );
      }).length;
      drawDefenseLabel(
        `증폭 대상 ${coverage}`,
        center.x,
        center.y - range - 20,
        config.color,
      );
    } else if (target) {
      ctx.strokeStyle = colorWithAlpha(config.color, 0.62);
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      ctx.fillStyle = colorWithAlpha(config.color, 0.38);
      ctx.beginPath();
      ctx.arc(target.x, target.y, 18, 0, Math.PI * 2);
      ctx.fill();
      drawDefenseLabel("현재 목표", target.x, target.y - 34, config.color);
    }
    ctx.restore();
  }

  function drawTowerCooldown(tower, center, config) {
    const cooldown = Number(tower.cooldownLeft || 0);
    if (cooldown <= 0 || config.boost) return;
    const baseCooldown = Number(config.cooldown || 1);
    const ratio = Math.max(0, Math.min(1, cooldown / baseCooldown));
    ctx.save();
    ctx.strokeStyle = colorWithAlpha(config.color, 0.84);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      center.x,
      center.y,
      24,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * (1 - ratio),
    );
    ctx.stroke();
    ctx.restore();
  }

  function findVisibleTowerTarget(tower, center, config) {
    if (config.boost || !state.enemies?.length) return null;
    const range = tower.range || config.range;
    return state.enemies
      .filter(
        (enemy) => Math.hypot(enemy.x - center.x, enemy.y - center.y) <= range,
      )
      .sort(
        (a, b) =>
          (b.segment || 0) - (a.segment || 0) ||
          Math.hypot(a.x - center.x, a.y - center.y) -
            Math.hypot(b.x - center.x, b.y - center.y),
      )[0];
  }

  function enemyDirection(enemy) {
    if (!pathPixels.length) return 0;
    const segment =
      typeof enemy.segment === "number"
        ? enemy.segment
        : closestPathSegment(enemy.x, enemy.y);
    const next = pathPixels[Math.min(pathPixels.length - 1, segment + 1)];
    if (!next) return 0;
    return Math.atan2(next.y - enemy.y, next.x - enemy.x);
  }

  function closestPathSegment(x, y) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    pathPixels.forEach((point, index) => {
      const nextDistance = Math.hypot(point.x - x, point.y - y);
      if (nextDistance < bestDistance) {
        bestDistance = nextDistance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function drawEnemy(enemy) {
    const config = enemyTypes[enemy.type] || enemyTypes.normal;
    const size = enemy.type === "boss" ? 34 : 22;
    const direction = enemyDirection(enemy);
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
    ctx.fillStyle = enemy.enraged
      ? "#ff5f6d"
      : enemy.burning || enemy.burnUntil > 0
        ? "#ffba5a"
        : enemy.marked || enemy.markedUntil > 0
          ? "#c8f7ff"
          : enemy.slowed || enemy.slowUntil > 0
            ? "#88e66f"
            : config.color;
    ctx.beginPath();
    if (enemy.type === "runner") {
      ctx.ellipse(
        enemy.x,
        enemy.y,
        size * 0.62,
        size * 0.38,
        0,
        0,
        Math.PI * 2,
      );
    } else if (enemy.type === "tank") {
      ctx.rect(
        enemy.x - size * 0.48,
        enemy.y - size * 0.42,
        size * 0.96,
        size * 0.84,
      );
    } else if (enemy.type === "boss") {
      ctx.moveTo(enemy.x, enemy.y - size * 0.6);
      for (let index = 1; index < 8; index += 1) {
        const angle = -Math.PI / 2 + index * (Math.PI / 4);
        const radius = index % 2 ? size * 0.62 : size * 0.42;
        ctx.lineTo(
          enemy.x + Math.cos(angle) * radius,
          enemy.y + Math.sin(angle) * radius,
        );
      }
      ctx.closePath();
    } else {
      ctx.arc(enemy.x, enemy.y, size / 2, 0, Math.PI * 2);
    }
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
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(direction);
    ctx.fillStyle = "rgba(11,18,32,.58)";
    ctx.beginPath();
    ctx.moveTo(size * 0.5, 0);
    ctx.lineTo(size * 0.05, -size * 0.22);
    ctx.lineTo(size * 0.12, 0);
    ctx.lineTo(size * 0.05, size * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    if (enemy.enraged) {
      ctx.strokeStyle = "rgba(255,95,109,.85)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(
        enemy.x,
        enemy.y,
        size / 2 + 12 + Math.sin(performance.now() / 120) * 3,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    if (enemy.burning || enemy.burnUntil > 0) {
      ctx.fillStyle = "rgba(255,186,90,.78)";
      for (let ember = 0; ember < 3; ember += 1) {
        const angle = performance.now() / 260 + ember * 2.1;
        ctx.beginPath();
        ctx.arc(
          enemy.x + Math.cos(angle) * (size * 0.28),
          enemy.y - size * 0.5 + Math.sin(angle) * 4,
          3.4,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    if (enemy.marked || enemy.markedUntil > 0) {
      ctx.strokeStyle = "rgba(200,247,255,.88)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, size / 2 + 10, 0, Math.PI * 2);
      ctx.moveTo(enemy.x - size / 2 - 14, enemy.y);
      ctx.lineTo(enemy.x - size / 2 - 4, enemy.y);
      ctx.moveTo(enemy.x + size / 2 + 4, enemy.y);
      ctx.lineTo(enemy.x + size / 2 + 14, enemy.y);
      ctx.stroke();
    }
    if (enemy.shield > 0) {
      const shieldRatio = Math.max(
        0.15,
        enemy.shield / (enemy.maxShield || enemy.shield),
      );
      ctx.strokeStyle = `rgba(111,232,255,${0.38 + shieldRatio * 0.5})`;
      ctx.lineWidth = 2 + shieldRatio * 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(
        enemy.x,
        enemy.y,
        size / 2 + 6 + Math.sin(performance.now() / 180) * 1.5,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.setLineDash([]);
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
    const alpha = Math.max(0.2, Math.min(1, (shot.ttl || 0.1) / 0.18));
    ctx.save();
    ctx.strokeStyle = shot.color || "#fff";
    ctx.lineWidth = 7;
    ctx.globalAlpha = alpha * 0.22;
    ctx.beginPath();
    ctx.moveTo(shot.x, shot.y);
    ctx.lineTo(shot.targetX, shot.targetY);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = shot.color || "#fff";
    ctx.shadowColor = shot.color || "#fff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(shot.targetX, shot.targetY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDefenseEffect(effect) {
    const ttl = Number(effect.ttl || 0);
    const alpha = Math.max(0.08, Math.min(1, ttl / 0.85));
    const color = effect.color || "#62e6ff";
    const lift = (1 - alpha) * 28;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    if (
      ["build", "upgrade", "wave", "reward", "map", "repair"].includes(
        effect.kind,
      )
    ) {
      ctx.strokeStyle = color;
      ctx.lineWidth = effect.kind === "wave" ? 6 : 4;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 18 + (1 - alpha) * 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(245,251,255,${0.08 * alpha})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 10 + (1 - alpha) * 16, 0, Math.PI * 2);
      ctx.fill();
    } else if (
      ["kill", "base_hit", "rage", "airstrike", "freeze"].includes(effect.kind)
    ) {
      ctx.fillStyle =
        effect.kind === "base_hit" || effect.kind === "airstrike"
          ? `rgba(255,95,109,${0.24 * alpha})`
          : effect.kind === "rage"
            ? `rgba(255,95,109,${0.24 * alpha})`
            : effect.kind === "freeze"
              ? `rgba(105,220,255,${0.24 * alpha})`
              : `rgba(255,209,102,${0.22 * alpha})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 24 + (1 - alpha) * 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 34 + (1 - alpha) * 30, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 7 + (1 - alpha) * 10, 0, Math.PI * 2);
      ctx.fill();
    }
    if (effect.text) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#f5fbff";
      ctx.font = `900 ${effect.kind === "wave" ? 22 : 15}px Malgun Gothic, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(7,17,31,.82)";
      ctx.strokeText(effect.text, effect.x, effect.y - 26 - lift);
      ctx.fillText(effect.text, effect.x, effect.y - 26 - lift);
    }
    ctx.restore();
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
          `<button type="button" data-tower="${escapeHtml(key)}" class="${selectedTowerType === key ? "active" : ""}"><span style="background:${tower.color}"></span><strong>${escapeHtml(tower.name)}</strong><small>${tower.cost} · 사거리 ${tower.range} · ${escapeHtml(tower.desc || (tower.boost ? "주변 타워 강화" : "공격"))}</small></button>`,
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
    queueResize();
  }

  function renderSkillButtons() {
    const player = selfPlayer();
    const cooldowns = player?.skillCooldowns || {};
    const html = Object.entries(skillTypes)
      .map(([key, skill]) => {
        const cooldown = Number(cooldowns[key] || 0);
        const disabled =
          !player ||
          player.resources < skill.cost ||
          cooldown > 0 ||
          ["win", "defeat"].includes(state.phase) ||
          ((key === "airstrike" || key === "freeze") &&
            (!state.enemies || !state.enemies.length)) ||
          (key === "repair" && state.baseHealth >= state.baseHealthMax);
        const label =
          cooldown > 0 ? `${Math.ceil(cooldown)}s` : `${skill.cost}`;
        return `<button type="button" data-skill="${escapeHtml(key)}" class="${disabled ? "disabled" : ""}" ${disabled ? "disabled" : ""}><span style="background:${skill.color}"></span><strong>${escapeHtml(skill.name)}</strong><small>${label} · ${escapeHtml(skill.desc || "")}</small></button>`;
      })
      .join("");
    if (ui.skills.innerHTML !== html) {
      ui.skills.innerHTML = html;
      queueResize();
    }
    ui.skills.querySelectorAll("[data-skill]").forEach((button) => {
      button.onclick = () => actionSkill(button.dataset.skill || "");
    });
  }

  ui.panelToggle.onclick = () => {
    const collapsed = ui.panel.classList.toggle("collapsed");
    ui.panelToggle.setAttribute("aria-expanded", String(!collapsed));
  };
  ui.toolbarToggle.onclick = () => {
    toolbarCollapsed = !toolbarCollapsed;
    applyToolbarState();
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
  ui.speedButtons.forEach((button) => {
    button.addEventListener("click", () =>
      actionGameSpeed(button.dataset.defenseSpeed),
    );
  });
  canvas.addEventListener("pointermove", (event) => {
    hoverCell = cellFromEvent(event);
    if (!selectedTowerId) renderHud();
  });
  canvas.addEventListener("pointerleave", () => {
    hoverCell = null;
    if (!selectedTowerId) renderHud();
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
    if (event.key.toLowerCase() === "q") actionSkill("airstrike");
    if (event.key.toLowerCase() === "e") actionSkill("freeze");
    if (event.key.toLowerCase() === "f") actionSkill("repair");
    if (event.key === " ") {
      event.preventDefault();
      actionStartWave();
    }
  });

  ui.name.value = storage.getItem("defense_name") || "Player";
  ui.serverUrl.value = params.has("host")
    ? defaultServerUrl()
    : storage.getItem("defense_url") || defaultServerUrl();
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
  applyToolbarState();
  renderMapOptions();
  renderTowerButtons();
  renderHud();
  updateNetInfo();
  resize();
  draw();
  if (!isSolo && params.get("auto") === "1") connect();
})();
