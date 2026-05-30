(() => {
  const params = new URLSearchParams(window.location.search);
  const assetVersion = params.get("v") || "20260530bc";
  const SAVE_KEY = "good_etc_rpg_save_v1";
  const SAVE_API = "/api/rpg/save";
  const MIN_FINAL_PLAY_SECONDS = 5 * 60 * 60;
  const canvasScale = window.devicePixelRatio || 1;

  const shell = document.querySelector(".arena-shell");
  shell.className = "rpg-shell";
  shell.innerHTML = `
    <style>
      .rpg-shell {
        position: relative;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background:
          radial-gradient(circle at 24% 18%, rgba(83,226,168,.16), transparent 30%),
          radial-gradient(circle at 78% 20%, rgba(255,188,84,.12), transparent 28%),
          linear-gradient(140deg, #06121d 0%, #111827 48%, #1d1530 100%);
      }
      .rpg-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
      }
      .rpg-panel {
        position: absolute;
        z-index: 3;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(11,20,35,.86);
        color: #eef6ff;
        box-shadow: 0 18px 60px rgba(0,0,0,.34);
        backdrop-filter: blur(14px);
        border-radius: 8px;
      }
      .rpg-top {
        top: 16px;
        left: 16px;
        width: min(380px, calc(100vw - 32px));
        padding: 14px;
      }
      .rpg-side {
        top: 16px;
        right: 16px;
        width: min(340px, calc(100vw - 32px));
        max-height: calc(100vh - 32px);
        overflow: auto;
        padding: 14px;
      }
      .rpg-bottom {
        left: 50%;
        bottom: 16px;
        transform: translateX(-50%);
        width: min(760px, calc(100vw - 32px));
        padding: 10px 12px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
        color: #a8bdd5;
        font-size: .84rem;
      }
      .rpg-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .rpg-mark {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: conic-gradient(from 40deg, #53e2a8, #48a5ff, #d08cff, #ffba5a, #53e2a8);
        box-shadow: 0 0 30px rgba(83,226,168,.42);
        flex: 0 0 auto;
      }
      .rpg-panel h1,
      .rpg-panel h2,
      .rpg-panel p {
        margin: 0;
      }
      .rpg-panel h1 {
        font-size: 1.18rem;
      }
      .rpg-panel h2 {
        margin-bottom: 8px;
        font-size: .98rem;
      }
      .rpg-muted {
        color: #a8bdd5;
        font-size: .82rem;
      }
      .rpg-bars {
        display: grid;
        gap: 6px;
        margin-top: 12px;
      }
      .rpg-bar {
        height: 9px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255,255,255,.1);
      }
      .rpg-bar span {
        display: block;
        height: 100%;
        border-radius: inherit;
      }
      .rpg-hp span { background: linear-gradient(90deg, #ff5f6d, #ffba5a); }
      .rpg-mp span { background: linear-gradient(90deg, #48a5ff, #d08cff); }
      .rpg-xp span { background: linear-gradient(90deg, #53e2a8, #f8f871); }
      .rpg-actions {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-top: 12px;
      }
      .rpg-actions button,
      .rpg-modal button {
        min-height: 36px;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 8px;
        background: rgba(255,255,255,.08);
        color: #eef6ff;
        font-weight: 900;
        cursor: pointer;
      }
      .rpg-actions button.primary,
      .rpg-modal button.primary {
        background: #53e2a8;
        color: #062016;
        border-color: transparent;
      }
      .rpg-stat-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin: 10px 0;
      }
      .rpg-stat-grid span,
      .rpg-pill {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 8px;
        padding: 8px;
        background: rgba(255,255,255,.06);
      }
      .rpg-quest {
        display: grid;
        gap: 8px;
        margin-top: 10px;
      }
      .rpg-inventory {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 10px;
      }
      .rpg-modal-wrap {
        position: absolute;
        inset: 0;
        z-index: 10;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(0,0,0,.32);
      }
      .rpg-modal-wrap.show {
        display: flex;
      }
      .rpg-modal {
        width: min(720px, calc(100vw - 36px));
        max-height: min(720px, calc(100vh - 36px));
        overflow: auto;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 8px;
        background: rgba(9,18,31,.96);
        color: #eef6ff;
        padding: 18px;
        box-shadow: 0 30px 90px rgba(0,0,0,.48);
      }
      .rpg-modal .lines {
        display: grid;
        gap: 10px;
        line-height: 1.55;
      }
      .rpg-modal .choice-grid {
        display: grid;
        gap: 8px;
        margin-top: 14px;
      }
      .rpg-modal .item-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 10px;
        margin-top: 14px;
      }
      .rpg-modal .item-card {
        display: grid;
        gap: 7px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 8px;
        padding: 10px;
        background: rgba(255,255,255,.055);
      }
      .rpg-modal .item-card button {
        width: 100%;
      }
      .rpg-toast {
        position: absolute;
        left: 50%;
        top: 22%;
        transform: translateX(-50%);
        z-index: 9;
        min-width: min(420px, calc(100vw - 32px));
        border-radius: 8px;
        padding: 12px 14px;
        border: 1px solid rgba(255,255,255,.18);
        background: rgba(9,18,31,.9);
        text-align: center;
        color: #eef6ff;
        opacity: 0;
        transition: opacity .18s ease;
        pointer-events: none;
      }
      .rpg-toast.show { opacity: 1; }
      @media (max-width: 760px) {
        .rpg-side { display: none; }
        .rpg-top { width: calc(100vw - 32px); }
        .rpg-actions { grid-template-columns: repeat(2, 1fr); }
      }
    </style>
    <canvas id="rpgCanvas" class="rpg-canvas" aria-label="서약의 연대기 RPG"></canvas>
    <section class="rpg-panel rpg-top" aria-label="RPG 상태">
      <div class="rpg-brand">
        <span class="rpg-mark"></span>
        <div>
          <h1>서약의 연대기</h1>
          <p class="rpg-muted" id="rpgLocation">불러오는 중</p>
        </div>
      </div>
      <div class="rpg-bars">
        <div class="rpg-bar rpg-hp"><span id="rpgHpBar"></span></div>
        <div class="rpg-bar rpg-mp"><span id="rpgMpBar"></span></div>
        <div class="rpg-bar rpg-xp"><span id="rpgXpBar"></span></div>
      </div>
      <div class="rpg-actions">
        <button type="button" class="primary" id="rpgSave">저장</button>
        <button type="button" id="rpgQuest">퀘스트</button>
        <button type="button" id="rpgBag">가방</button>
        <button type="button" id="rpgStatsButton">성장</button>
        <button type="button" id="rpgJournal">서고</button>
        <button type="button" id="rpgHelp">?</button>
      </div>
      <p class="rpg-muted" id="rpgSaveStatus">저장 준비 중</p>
    </section>
    <section class="rpg-panel rpg-side" aria-label="캐릭터와 퀘스트">
      <h2 id="rpgHeroName">영웅</h2>
      <div class="rpg-stat-grid" id="rpgStats"></div>
      <div class="rpg-quest" id="rpgQuestBox"></div>
      <div class="rpg-inventory" id="rpgInventoryMini"></div>
    </section>
    <section class="rpg-panel rpg-bottom" aria-label="조작">
      <span>WASD/방향키 이동</span>
      <span>J 공격 · NPC 앞 Space 대화</span>
      <span>K 서약기</span>
      <span>E 대화/포털/상점</span>
      <span>Shift 회피</span>
      <span>1 물약</span>
      <span>Ctrl+S 저장</span>
    </section>
    <div class="rpg-toast" id="rpgToast"></div>
    <div class="rpg-modal-wrap" id="rpgModalWrap">
      <div class="rpg-modal" id="rpgModal"></div>
    </div>`;

  const canvas = document.getElementById("rpgCanvas");
  const ctx = canvas.getContext("2d");
  const ui = {
    location: document.getElementById("rpgLocation"),
    hp: document.getElementById("rpgHpBar"),
    mp: document.getElementById("rpgMpBar"),
    xp: document.getElementById("rpgXpBar"),
    stats: document.getElementById("rpgStats"),
    quest: document.getElementById("rpgQuestBox"),
    inventory: document.getElementById("rpgInventoryMini"),
    saveStatus: document.getElementById("rpgSaveStatus"),
    heroName: document.getElementById("rpgHeroName"),
    toast: document.getElementById("rpgToast"),
    modalWrap: document.getElementById("rpgModalWrap"),
    modal: document.getElementById("rpgModal"),
  };

  const ITEMS = {
    smallPotion: {
      name: "하급 회복약",
      type: "potion",
      heal: 120,
      price: 35,
      rarity: "common",
      desc: "전투 중 잃은 HP를 빠르게 회복합니다.",
    },
    manaDew: {
      name: "마나 이슬",
      type: "mana",
      mana: 90,
      price: 42,
      rarity: "common",
      desc: "서약기 사용에 필요한 MP를 회복합니다.",
    },
    oathTonic: {
      name: "서약 강장제",
      type: "buff",
      price: 130,
      rarity: "rare",
      desc: "HP/MP를 회복하고 짧은 보호막 시간을 얻습니다.",
    },
    ironBlade: {
      name: "무쇠 장검",
      type: "weapon",
      atk: 7,
      price: 210,
      rarity: "common",
      desc: "루멘 대장간의 표준 장검입니다.",
    },
    moonBlade: {
      name: "월광검",
      type: "weapon",
      atk: 18,
      agi: 1,
      price: 740,
      rarity: "rare",
      desc: "월식의 빛을 받아 검격이 조금 더 빨라집니다.",
    },
    emberBlade: {
      name: "잿불 절단검",
      type: "weapon",
      atk: 28,
      str: 2,
      price: 1280,
      rarity: "epic",
      desc: "강한 일격에 특화된 붉은 광맥의 검입니다.",
    },
    starforgedBlade: {
      name: "성련검",
      type: "weapon",
      atk: 42,
      str: 3,
      agi: 2,
      price: 0,
      rarity: "legend",
      desc: "기원의 탑에서만 완성되는 서약자의 검입니다.",
    },
    guardCoat: {
      name: "수호자의 코트",
      type: "armor",
      def: 7,
      price: 260,
      rarity: "common",
      desc: "가벼운 방어구라 초반 탐험에 적합합니다.",
    },
    runeMail: {
      name: "룬 메일",
      type: "armor",
      def: 16,
      vit: 1,
      price: 840,
      rarity: "rare",
      desc: "각인된 룬이 충격을 흘려보냅니다.",
    },
    oathMantle: {
      name: "서약의 망토",
      type: "armor",
      def: 25,
      wis: 2,
      price: 0,
      rarity: "epic",
      desc: "오래 버틴 서약자에게만 반응하는 망토입니다.",
    },
    greenSigil: {
      name: "녹음 인장",
      type: "charm",
      vit: 2,
      price: 0,
      rarity: "rare",
      desc: "숲의 생명력으로 방어와 체력을 보조합니다.",
    },
    tideCharm: {
      name: "푸른 조류 부적",
      type: "charm",
      wis: 2,
      price: 0,
      rarity: "rare",
      desc: "MP 회복과 서약기 운용을 돕는 항구의 부적입니다.",
    },
    emberCore: {
      name: "잿불 핵",
      type: "charm",
      str: 2,
      price: 0,
      rarity: "epic",
      desc: "기본 공격의 체감 화력을 끌어올립니다.",
    },
    snowSigil: {
      name: "설휘 각인",
      type: "charm",
      def: 4,
      wis: 1,
      price: 0,
      rarity: "epic",
      desc: "강한 보스전에서 버티기 쉬운 방어형 부적입니다.",
    },
    eclipseRing: {
      name: "월식 반지",
      type: "charm",
      atk: 8,
      agi: 2,
      price: 0,
      rarity: "legend",
      desc: "연속 공격과 회피 플레이에 맞춘 반지입니다.",
    },
    dawnRelic: {
      name: "새벽 성물",
      type: "charm",
      atk: 10,
      def: 6,
      str: 2,
      vit: 2,
      wis: 2,
      agi: 2,
      price: 0,
      rarity: "legend",
      desc: "모든 장을 관통하는 최종 보상 성물입니다.",
    },
  };

  const RARITY = {
    common: { label: "일반", color: "#a8bdd5" },
    rare: { label: "희귀", color: "#48a5ff" },
    epic: { label: "영웅", color: "#d08cff" },
    legend: { label: "전설", color: "#f8f871" },
  };

  const BOSS_REWARDS = [
    "greenSigil",
    "tideCharm",
    "emberBlade",
    "snowSigil",
    "oathMantle",
    "eclipseRing",
    "starforgedBlade",
    "dawnRelic",
    "oathTonic",
    "dawnRelic",
  ];

  const ZONES = [
    {
      id: "lumen",
      name: "루멘 마을",
      subtitle: "잔불이 꺼지지 않는 시작의 마을",
      w: 2800,
      h: 1900,
      floor: ["#17324b", "#1b3d55", "#263b4f"],
      accent: "#53e2a8",
      enemies: ["slime", "wolf"],
      npc: [
        { id: "selene", name: "셀린", role: "서약 사제", x: 620, y: 760 },
        {
          id: "doran",
          name: "도란",
          role: "대장장이",
          x: 1080,
          y: 940,
          shop: "forge",
        },
        {
          id: "mira",
          name: "미라",
          role: "물약상",
          x: 1420,
          y: 680,
          shop: "apothecary",
        },
      ],
      portals: [{ to: "greenwood", x: 2520, y: 930, label: "녹음 숲길" }],
    },
    {
      id: "greenwood",
      name: "녹음 숲길",
      subtitle: "오래된 나무와 잊힌 제단",
      w: 3200,
      h: 2200,
      floor: ["#0f2e24", "#174b32", "#233f2f"],
      accent: "#8be66f",
      enemies: ["wolf", "thorn"],
      npc: [{ id: "rien", name: "리엔", role: "숲 파수꾼", x: 530, y: 640 }],
      portals: [
        { to: "lumen", x: 180, y: 1050, label: "루멘 마을" },
        { to: "saltwind", x: 2980, y: 1160, label: "솔트윈드 항구" },
      ],
    },
    {
      id: "saltwind",
      name: "솔트윈드 항구",
      subtitle: "바다 안개와 밀수꾼의 등불",
      w: 3400,
      h: 2100,
      floor: ["#123047", "#14556a", "#263a4d"],
      accent: "#42d7ff",
      enemies: ["raider", "mist"],
      npc: [{ id: "kael", name: "카엘", role: "선장", x: 760, y: 820 }],
      portals: [
        { to: "greenwood", x: 210, y: 1080, label: "녹음 숲길" },
        { to: "embermine", x: 3150, y: 920, label: "잿불 광산" },
      ],
    },
    {
      id: "embermine",
      name: "잿불 광산",
      subtitle: "붉은 광맥과 무너진 승강기",
      w: 3300,
      h: 2300,
      floor: ["#2f201b", "#4a2c23", "#633320"],
      accent: "#ffba5a",
      enemies: ["golem", "raider"],
      npc: [{ id: "oran", name: "오란", role: "광부장", x: 620, y: 760 }],
      portals: [
        { to: "saltwind", x: 220, y: 1120, label: "솔트윈드 항구" },
        { to: "snowveil", x: 3030, y: 1620, label: "설휘 고원" },
      ],
    },
    {
      id: "snowveil",
      name: "설휘 고원",
      subtitle: "눈보라 속에 묻힌 왕가의 길",
      w: 3500,
      h: 2300,
      floor: ["#23384f", "#2f5571", "#d7eef7"],
      accent: "#b7ecff",
      enemies: ["wraith", "golem"],
      npc: [{ id: "iyun", name: "이윤", role: "유배 기사", x: 640, y: 820 }],
      portals: [
        { to: "embermine", x: 250, y: 1220, label: "잿불 광산" },
        { to: "veilkeep", x: 3200, y: 960, label: "베일 성채" },
      ],
    },
    {
      id: "veilkeep",
      name: "베일 성채",
      subtitle: "침묵하는 왕좌와 닫힌 서고",
      w: 3600,
      h: 2400,
      floor: ["#1a1d33", "#2c3152", "#3b3658"],
      accent: "#d08cff",
      enemies: ["knight", "wraith"],
      npc: [{ id: "seren", name: "세렌", role: "왕실 기록관", x: 760, y: 760 }],
      portals: [
        { to: "snowveil", x: 250, y: 1180, label: "설휘 고원" },
        { to: "eclipse", x: 3340, y: 1320, label: "월식 협곡" },
      ],
    },
    {
      id: "eclipse",
      name: "월식 협곡",
      subtitle: "하늘의 균열이 내려앉은 전장",
      w: 3800,
      h: 2500,
      floor: ["#211525", "#3a1d41", "#4f254a"],
      accent: "#ff5f6d",
      enemies: ["shade", "knight"],
      npc: [{ id: "avel", name: "아벨", role: "흑월 추적자", x: 820, y: 920 }],
      portals: [
        { to: "veilkeep", x: 260, y: 1260, label: "베일 성채" },
        { to: "origin", x: 3520, y: 1180, label: "기원의 탑" },
      ],
    },
    {
      id: "origin",
      name: "기원의 탑",
      subtitle: "서약이 별빛으로 새겨지는 마지막 문",
      w: 3200,
      h: 2600,
      floor: ["#101827", "#202a45", "#392752"],
      accent: "#f8f871",
      enemies: ["shade", "archon"],
      npc: [{ id: "noa", name: "노아", role: "잊힌 영웅", x: 620, y: 820 }],
      portals: [{ to: "eclipse", x: 200, y: 1280, label: "월식 협곡" }],
    },
  ];
  const zoneMap = Object.fromEntries(ZONES.map((zone) => [zone.id, zone]));

  const ENEMIES = {
    slime: {
      name: "밤이끼 슬라임",
      hp: 70,
      atk: 9,
      def: 1,
      xp: 18,
      gold: 11,
      color: "#53e2a8",
    },
    wolf: {
      name: "그늘 늑대",
      hp: 105,
      atk: 15,
      def: 2,
      xp: 26,
      gold: 16,
      color: "#8be66f",
    },
    thorn: {
      name: "가시 망령",
      hp: 130,
      atk: 19,
      def: 4,
      xp: 34,
      gold: 22,
      color: "#9cffb4",
    },
    raider: {
      name: "항구 약탈자",
      hp: 165,
      atk: 24,
      def: 5,
      xp: 44,
      gold: 32,
      color: "#ffba5a",
    },
    mist: {
      name: "안개 혼령",
      hp: 150,
      atk: 28,
      def: 3,
      xp: 48,
      gold: 30,
      color: "#42d7ff",
    },
    golem: {
      name: "잿불 골렘",
      hp: 250,
      atk: 34,
      def: 11,
      xp: 66,
      gold: 48,
      color: "#d66b34",
    },
    wraith: {
      name: "설원 망령",
      hp: 220,
      atk: 39,
      def: 7,
      xp: 72,
      gold: 56,
      color: "#b7ecff",
    },
    knight: {
      name: "검은 성채 기사",
      hp: 310,
      atk: 46,
      def: 13,
      xp: 94,
      gold: 72,
      color: "#d08cff",
    },
    shade: {
      name: "월식의 그림자",
      hp: 360,
      atk: 56,
      def: 14,
      xp: 122,
      gold: 95,
      color: "#ff5f6d",
    },
    archon: {
      name: "별을 삼킨 집행자",
      hp: 620,
      atk: 68,
      def: 18,
      xp: 240,
      gold: 180,
      color: "#f8f871",
    },
  };

  const SHOPS = {
    apothecary: ["smallPotion", "manaDew", "oathTonic"],
    forge: ["ironBlade", "guardCoat", "moonBlade", "runeMail", "emberBlade"],
  };

  const ACTS = [
    {
      title: "잔불의 서약",
      zone: "lumen",
      npc: "selene",
      enemy: "slime",
      boss: "wolf",
      collect: "서약 파편",
      line: "사라진 영웅들의 이름이 성소의 불씨에서 하나씩 지워지고 있습니다.",
    },
    {
      title: "숲의 문장",
      zone: "greenwood",
      npc: "rien",
      enemy: "wolf",
      boss: "thorn",
      collect: "녹음 인장",
      line: "숲은 길을 숨기지 않습니다. 다만 준비되지 않은 자에게 침묵할 뿐입니다.",
    },
    {
      title: "항구의 배신",
      zone: "saltwind",
      npc: "kael",
      enemy: "raider",
      boss: "mist",
      collect: "푸른 항로표",
      line: "밤마다 검은 배가 들어옵니다. 선창 아래에는 왕가의 물건이 실려 있었죠.",
    },
    {
      title: "잿불 광맥",
      zone: "embermine",
      npc: "oran",
      enemy: "golem",
      boss: "raider",
      collect: "붉은 광석",
      line: "광산 아래에서 심장처럼 뛰는 소리가 납니다. 사람의 것은 아닙니다.",
    },
    {
      title: "눈 속의 왕명",
      zone: "snowveil",
      npc: "iyun",
      enemy: "wraith",
      boss: "golem",
      collect: "동토의 서신",
      line: "왕은 죽기 전 마지막 명령을 남겼습니다. 그 명령은 아직 끝나지 않았습니다.",
    },
    {
      title: "닫힌 서고",
      zone: "veilkeep",
      npc: "seren",
      enemy: "knight",
      boss: "wraith",
      collect: "금서의 장",
      line: "기록을 믿지 마세요. 승자도, 패자도, 모두가 자신에게 유리한 문장을 남깁니다.",
    },
    {
      title: "월식의 추적자",
      zone: "eclipse",
      npc: "avel",
      enemy: "shade",
      boss: "knight",
      collect: "흑월의 흔적",
      line: "그림자는 빛이 있을 때 태어납니다. 그렇다면 가장 깊은 어둠의 주인은 누구일까요.",
    },
    {
      title: "기원의 계단",
      zone: "origin",
      npc: "noa",
      enemy: "archon",
      boss: "shade",
      collect: "별의 조각",
      line: "네가 찾는 영웅서기는 책이 아니다. 선택을 버티는 사람의 기록이다.",
    },
    {
      title: "무너진 서약",
      zone: "eclipse",
      npc: "avel",
      enemy: "shade",
      boss: "archon",
      collect: "파열된 맹세",
      line: "모든 증거가 한 사람을 가리킵니다. 문제는 그 사람이 이미 죽었다는 겁니다.",
    },
    {
      title: "별의 귀환",
      zone: "origin",
      npc: "noa",
      enemy: "archon",
      boss: "archon",
      collect: "새벽의 룬",
      line: "마지막 문은 힘으로 열리지 않습니다. 충분히 오래 버틴 서약만이 문장을 완성합니다.",
      final: true,
    },
  ];

  const QUESTS = ACTS.flatMap((act, actIndex) => {
    const rank = actIndex + 1;
    const base = rank * 4;
    return [
      {
        id: `act${rank}_talk`,
        act: rank,
        title: `${act.title}: 첫 단서`,
        zone: act.zone,
        npc: act.npc,
        type: "talk",
        required: 1,
        intro: [act.line, "대화를 끝까지 듣고 다음 목적지를 확인하세요."],
        done: ["좋습니다. 이제 흔적을 따라 움직일 시간입니다."],
        reason: "단서를 들어야 현재 장의 목적과 다음 전장을 알 수 있습니다.",
        reward: { xp: 40 + base * 4, gold: 30 + base },
      },
      {
        id: `act${rank}_hunt`,
        act: rank,
        title: `${act.title}: 길을 여는 전투`,
        zone: act.zone,
        npc: act.npc,
        type: "hunt",
        enemy: act.enemy,
        required: 8 + rank * 2,
        intro: [
          `${ENEMIES[act.enemy].name}들이 길목을 막고 있습니다.`,
          "전장을 정리하면 다음 증언을 들을 수 있습니다.",
        ],
        done: [
          "검의 흔적이 길을 열었습니다. 하지만 더 깊은 곳에서 낯선 기척이 납니다.",
        ],
        reason: "적을 줄이면 NPC가 움직일 수 있고 새 지역의 증언이 열립니다.",
        reward: { xp: 130 + base * 10, gold: 70 + base * 4 },
      },
      {
        id: `act${rank}_collect`,
        act: rank,
        title: `${act.title}: ${act.collect} 회수`,
        zone: act.zone,
        npc: act.npc,
        type: "collect",
        item: act.collect,
        required: 5 + rank,
        intro: [
          `${act.collect}을 모아 서약의 문장을 복원해야 합니다.`,
          "빛나는 잔해는 전장 곳곳에 흩어져 있습니다.",
        ],
        done: ["조각이 맞물리자 오래된 문장이 다시 숨을 쉽니다."],
        reason:
          "흩어진 물증을 모으면 서약의 문장이 복구되어 결계가 약해집니다.",
        reward: {
          xp: 160 + base * 12,
          gold: 95 + base * 5,
          item: rank % 2 ? "smallPotion" : "manaDew",
        },
      },
      {
        id: `act${rank}_boss`,
        act: rank,
        title: `${act.title}: 결계 파쇄`,
        zone: act.zone,
        npc: act.npc,
        type: "boss",
        enemy: act.boss,
        required: 1,
        minPlaySeconds: act.final ? MIN_FINAL_PLAY_SECONDS : 0,
        intro: act.final
          ? [
              "기원의 문은 5시간 이상의 서약 기록이 새겨져야 열립니다.",
              "전투와 탐험을 이어가며 충분한 준비가 쌓이면 최종 집행자가 모습을 드러냅니다.",
            ]
          : [
              `${ENEMIES[act.boss].name}이 결계를 지키고 있습니다.`,
              "강한 공격은 피하고, 서약기로 빈틈을 찌르세요.",
            ],
        done: act.final
          ? [
              "별빛이 다시 책장 위에 내려앉습니다.",
              "당신의 이름이 마지막 영웅서기에 새겨졌습니다.",
            ]
          : ["결계가 깨졌습니다. 다음 장의 길이 열렸습니다."],
        reason: act.final
          ? "최종 집행자를 쓰러뜨려 사라진 영웅서기의 마지막 빈 칸을 채워야 합니다."
          : "수호자를 쓰러뜨려 다음 장으로 이어지는 길과 장비 보상을 엽니다.",
        reward: {
          xp: 260 + base * 20,
          gold: 160 + base * 8,
          item: BOSS_REWARDS[rank - 1] || "oathTonic",
        },
        final: act.final,
      },
    ];
  });

  const keys = new Set();
  const pointer = { x: 0, y: 0, down: false };
  const camera = { x: 0, y: 0, scale: 1 };
  let lastFrame = performance.now();
  let lastSaveAt = 0;
  let toastTimer = 0;
  let attackFlash = 0;
  let modalMode = "";
  let speechBubble = null;
  let state = null;

  function xpForLevel(level) {
    return Math.floor(100 + level * level * 48);
  }

  function newGameState() {
    return {
      version: assetVersion,
      createdAt: new Date().toISOString(),
      savedAt: "",
      playSeconds: 0,
      zone: "lumen",
      unlockedZones: ["lumen", "greenwood"],
      player: {
        name: "서약자",
        x: 760,
        y: 980,
        level: 1,
        xp: 0,
        hp: 280,
        maxHp: 280,
        mp: 120,
        maxMp: 120,
        atk: 24,
        def: 6,
        gold: 120,
        facing: 0,
        attackCd: 0,
        skillCd: 0,
        dashCd: 0,
        dashTime: 0,
        dashVx: 0,
        dashVy: 0,
        invuln: 0,
        combo: 0,
        comboTimer: 0,
        statPoints: 0,
        skillPoints: 0,
        skillRank: 0,
        renown: 0,
        baseStats: { str: 5, vit: 5, wis: 4, agi: 4 },
        equipment: { weapon: "", armor: "", charm: "" },
        inventory: { smallPotion: 5, manaDew: 2 },
      },
      journal: [
        {
          title: "서약의 시작",
          text: "루멘 성소의 불씨에서 영웅들의 이름이 하나씩 사라지고 있다.",
        },
      ],
      questIndex: 0,
      questProgress: 0,
      enemies: [],
      drops: [],
      effects: [],
      completed: false,
    };
  }

  async function loadGame() {
    const local = readLocalSave();
    if (location.protocol === "http:" || location.protocol === "https:") {
      try {
        const response = await fetch(SAVE_API, { cache: "no-store" });
        const payload = await response.json();
        if (payload?.save?.player) {
          state = normalizeSave(payload.save);
          ui.saveStatus.textContent = "EXE/로컬 서버 저장을 불러왔습니다.";
          return;
        }
      } catch {
        // localStorage fallback below
      }
    }
    state = normalizeSave(local || newGameState());
    ui.saveStatus.textContent = local
      ? "브라우저 저장을 불러왔습니다."
      : "새 이야기를 시작합니다.";
  }

  function readLocalSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function normalizeSave(save) {
    const fresh = newGameState();
    const next = { ...fresh, ...save };
    next.player = { ...fresh.player, ...(save?.player || {}) };
    next.player.inventory = {
      ...fresh.player.inventory,
      ...(save?.player?.inventory || {}),
    };
    next.player.equipment = {
      ...fresh.player.equipment,
      ...(save?.player?.equipment || {}),
    };
    next.player.baseStats = {
      ...fresh.player.baseStats,
      ...(save?.player?.baseStats || {}),
    };
    next.player.statPoints = Number.isFinite(next.player.statPoints)
      ? next.player.statPoints
      : 0;
    next.player.skillPoints = Number.isFinite(next.player.skillPoints)
      ? next.player.skillPoints
      : 0;
    next.player.skillRank = Number.isFinite(next.player.skillRank)
      ? next.player.skillRank
      : 0;
    next.player.renown = Number.isFinite(next.player.renown)
      ? next.player.renown
      : 0;
    next.player.combo = 0;
    next.player.comboTimer = 0;
    next.player.dashCd = 0;
    next.player.dashTime = 0;
    next.player.dashVx = 0;
    next.player.dashVy = 0;
    next.unlockedZones = Array.isArray(next.unlockedZones)
      ? [...new Set(["lumen", ...next.unlockedZones])]
      : fresh.unlockedZones;
    next.journal = Array.isArray(next.journal)
      ? next.journal.slice(0, 80)
      : fresh.journal;
    next.enemies = [];
    next.drops = Array.isArray(next.drops) ? next.drops.slice(0, 60) : [];
    next.effects = [];
    return next;
  }

  async function saveGame(manual = false) {
    const payload = {
      ...state,
      savedAt: new Date().toISOString(),
      enemies: [],
      effects: [],
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    let remote = false;
    if (location.protocol === "http:" || location.protocol === "https:") {
      try {
        const response = await fetch(SAVE_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        remote = response.ok;
      } catch {
        remote = false;
      }
    }
    ui.saveStatus.textContent =
      (remote ? "EXE/로컬 서버 저장 완료" : "브라우저 저장 완료") +
      ` · ${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    if (manual)
      toast(
        remote
          ? "저장했습니다. EXE에서는 사용자 데이터 폴더에 보관됩니다."
          : "저장했습니다. 현재 브라우저 저장소에 보관됩니다.",
      );
  }

  function currentZone() {
    return zoneMap[state.zone] || zoneMap.lumen;
  }

  function currentQuest() {
    return QUESTS[state.questIndex] || null;
  }

  function questReady(quest = currentQuest()) {
    if (!quest) return false;
    if (quest.minPlaySeconds && state.playSeconds < quest.minPlaySeconds)
      return false;
    return state.questProgress >= quest.required;
  }

  function questObjectiveText(quest = currentQuest()) {
    if (!quest) return "모든 이야기를 완료했습니다.";
    if (quest.minPlaySeconds && state.playSeconds < quest.minPlaySeconds) {
      return `서약 기록 ${formatTime(state.playSeconds)} / ${formatTime(quest.minPlaySeconds)}를 채워 최종 결계를 여세요.`;
    }
    if (quest.type === "talk") return `${npcName(quest.npc)}와 대화`;
    if (quest.type === "hunt")
      return `${ENEMIES[quest.enemy].name} 처치 ${state.questProgress}/${quest.required}`;
    if (quest.type === "collect")
      return `${quest.item} 수집 ${state.questProgress}/${quest.required}`;
    if (quest.type === "boss")
      return `${ENEMIES[quest.enemy].name} 격파 ${state.questProgress}/${quest.required}`;
    return "-";
  }

  function npcName(id) {
    return (
      ZONES.flatMap((zone) => zone.npc || []).find((npc) => npc.id === id)
        ?.name || id
    );
  }

  function addQuestProgress(amount = 1) {
    const quest = currentQuest();
    if (!quest || state.completed) return;
    state.questProgress = Math.min(
      quest.required,
      state.questProgress + amount,
    );
    if (questReady(quest)) toast("목표 완료. 의뢰인에게 돌아가세요.");
  }

  function advanceQuest() {
    const quest = currentQuest();
    if (!quest || !questReady(quest)) return;
    showDialogue(quest.final ? "엔딩" : "퀘스트 완료", quest.done, [
      {
        label: quest.final ? "엔딩 기록 저장" : "다음 장으로",
        action: () => completeQuest(quest, true),
      },
    ]);
  }

  function completeQuest(quest = currentQuest(), closeCurrentModal = false) {
    if (!quest || !questReady(quest)) return;
    giveReward(quest.reward);
    unlockNextZone(quest);
    addJournalEntry(quest);
    if (closeCurrentModal) closeModal();
    if (quest.final) {
      state.completed = true;
      toast("서약의 연대기를 완료했습니다.");
    } else {
      state.questIndex += 1;
      state.questProgress = 0;
      moveToQuestZone();
      const next = currentQuest();
      next &&
        startSpeechBubble(findNpcById(next.npc), next.intro, () =>
          toast("새 퀘스트가 시작되었습니다."),
        );
    }
    saveGame(false);
  }

  function giveReward(reward = {}) {
    const player = state.player;
    player.gold += reward.gold || 0;
    player.xp += reward.xp || 0;
    if (reward.item) {
      player.inventory[reward.item] = (player.inventory[reward.item] || 0) + 1;
      if (["weapon", "armor", "charm"].includes(ITEMS[reward.item]?.type))
        equipItem(reward.item);
    }
    if (Array.isArray(reward.items)) {
      reward.items.forEach((id) => {
        player.inventory[id] = (player.inventory[id] || 0) + 1;
      });
    }
    player.renown += reward.renown || 1;
    let leveled = false;
    while (player.xp >= xpForLevel(player.level)) {
      player.xp -= xpForLevel(player.level);
      player.level += 1;
      player.maxHp += 38;
      player.maxMp += 14;
      player.atk += 4;
      player.def += 2;
      player.statPoints += 3;
      player.skillPoints += 1;
      player.hp = player.maxHp;
      player.mp = player.maxMp;
      leveled = true;
    }
    toast(
      `보상: 경험치 ${reward.xp || 0}, 골드 ${reward.gold || 0}` +
        (reward.item ? `, ${ITEMS[reward.item].name}` : "") +
        (leveled ? " · 레벨 업! 성장 포인트 +3, 서약 포인트 +1" : ""),
    );
  }

  function addJournalEntry(quest) {
    const title = quest.final ? "서약 완성" : quest.title;
    const text = quest.done.join(" ");
    state.journal = [
      { title, text, time: formatTime(state.playSeconds) },
      ...(state.journal || []),
    ].slice(0, 80);
  }

  function unlockNextZone(quest) {
    const act = ACTS[Math.min(ACTS.length - 1, quest.act || 1)];
    if (act?.zone && !state.unlockedZones.includes(act.zone))
      state.unlockedZones.push(act.zone);
    const zone = currentZone();
    zone.portals.forEach((portal) => {
      if (!state.unlockedZones.includes(portal.to))
        state.unlockedZones.push(portal.to);
    });
  }

  function moveToQuestZone() {
    const quest = currentQuest();
    if (!quest || quest.zone === state.zone) return;
    changeZone(quest.zone);
  }

  function changeZone(zoneId) {
    if (!zoneMap[zoneId]) return;
    if (!state.unlockedZones.includes(zoneId)) state.unlockedZones.push(zoneId);
    state.zone = zoneId;
    state.player.x = 420;
    state.player.y = Math.min(currentZone().h - 420, currentZone().h / 2);
    state.enemies = [];
    state.drops = state.drops.filter((drop) => drop.zone === zoneId);
    toast(`${currentZone().name}에 도착했습니다.`);
  }

  function spawnEnemies() {
    const zone = currentZone();
    const quest = currentQuest();
    const targetType =
      quest &&
      quest.zone === zone.id &&
      (quest.type === "hunt" ||
        (quest.type === "boss" &&
          (!quest.minPlaySeconds || state.playSeconds >= quest.minPlaySeconds)))
        ? quest.enemy
        : null;
    const bossActive =
      quest?.type === "boss" && quest.zone === zone.id && targetType;
    const maxEnemies = bossActive ? 1 : 9;
    if (state.enemies.length >= maxEnemies) return;
    if (bossActive && state.enemies.some((enemy) => enemy.boss)) return;
    const type =
      targetType ||
      zone.enemies[Math.floor(Math.random() * zone.enemies.length)];
    const spec = ENEMIES[type];
    const boss = bossActive;
    const point = randomSpawnPoint(zone);
    state.enemies.push({
      id: `e${Date.now()}${Math.random()}`,
      type,
      name: boss ? `결계 수호자 ${spec.name}` : spec.name,
      x: point.x,
      y: point.y,
      hp: Math.round(
        spec.hp *
          (boss ? 3.2 : 1) *
          (1 + Math.max(0, state.player.level - 1) * 0.08),
      ),
      maxHp: Math.round(
        spec.hp *
          (boss ? 3.2 : 1) *
          (1 + Math.max(0, state.player.level - 1) * 0.08),
      ),
      atk: Math.round(
        spec.atk *
          (boss ? 1.35 : 1) *
          (1 + Math.max(0, state.player.level - 1) * 0.05),
      ),
      def: spec.def + (boss ? 8 : 0),
      color: spec.color,
      boss,
      hit: 0,
      attackCd: 0,
      windup: 0,
    });
  }

  function randomSpawnPoint(zone) {
    for (let i = 0; i < 30; i += 1) {
      const x = 160 + Math.random() * (zone.w - 320);
      const y = 160 + Math.random() * (zone.h - 320);
      if (distance(x, y, state.player.x, state.player.y) > 520) return { x, y };
    }
    return { x: zone.w * 0.7, y: zone.h * 0.5 };
  }

  function update(dt) {
    if (!state || modalMode) return;
    state.playSeconds += dt;
    const player = state.player;
    player.attackCd = Math.max(0, player.attackCd - dt);
    player.skillCd = Math.max(0, player.skillCd - dt);
    player.dashCd = Math.max(0, (player.dashCd || 0) - dt);
    player.dashTime = Math.max(0, (player.dashTime || 0) - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.mp = Math.min(player.maxMp, player.mp + dt * 3.5);
    player.comboTimer = Math.max(0, (player.comboTimer || 0) - dt);
    if (player.comboTimer <= 0) player.combo = 0;
    updatePlayer(dt);
    if (Math.random() < dt * 2.1) spawnEnemies();
    updateEnemies(dt);
    updateDrops();
    state.effects = state.effects
      .map((effect) => ({ ...effect, ttl: effect.ttl - dt }))
      .filter((effect) => effect.ttl > 0);
    if (Date.now() - lastSaveAt > 30000) {
      lastSaveAt = Date.now();
      saveGame(false);
    }
  }

  function updatePlayer(dt) {
    const player = state.player;
    let dx =
      Number(keys.has("arrowright") || keys.has("d")) -
      Number(keys.has("arrowleft") || keys.has("a"));
    let dy =
      Number(keys.has("arrowdown") || keys.has("s")) -
      Number(keys.has("arrowup") || keys.has("w"));
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    if (dx || dy) player.facing = Math.atan2(dy, dx);
    let speed = 245 + statValue("agi") * 3;
    const zone = currentZone();
    if (player.dashTime > 0) {
      dx = player.dashVx || Math.cos(player.facing);
      dy = player.dashVy || Math.sin(player.facing);
      speed = 720 + statValue("agi") * 10;
    }
    player.x = clamp(player.x + dx * speed * dt, 40, zone.w - 40);
    player.y = clamp(player.y + dy * speed * dt, 40, zone.h - 40);
  }

  function updateEnemies(dt) {
    const player = state.player;
    state.enemies.forEach((enemy) => {
      enemy.hit = Math.max(0, enemy.hit - dt);
      enemy.attackCd = Math.max(0, enemy.attackCd - dt);
      const windupBefore = enemy.windup || 0;
      enemy.windup = Math.max(0, windupBefore - dt);
      const gap = distance(enemy.x, enemy.y, player.x, player.y);
      if (gap < 720) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const speed = enemy.windup > 0 ? 18 : enemy.boss ? 110 : 135;
        enemy.x += Math.cos(angle) * speed * dt;
        enemy.y += Math.sin(angle) * speed * dt;
      }
      if (gap < 58 && enemy.attackCd <= 0 && enemy.windup <= 0) {
        enemy.windup = enemy.boss ? 0.62 : 0.42;
        enemy.attackCd = enemy.boss ? 1.1 : 1.35;
      }
      if (windupBefore > 0 && enemy.windup <= 0 && gap < 72) {
        hurtPlayer(Math.max(6, enemy.atk - totalDef()));
      }
    });
    state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  }

  function updateDrops() {
    const player = state.player;
    state.drops = state.drops.filter((drop) => {
      if (drop.zone !== state.zone) return true;
      if (distance(player.x, player.y, drop.x, drop.y) > 34) return true;
      if (drop.kind === "gold") player.gold += drop.value;
      if (drop.kind === "quest") addQuestProgress(1);
      if (drop.kind === "item")
        player.inventory[drop.item] = (player.inventory[drop.item] || 0) + 1;
      showEffect(
        drop.x,
        drop.y,
        drop.kind === "gold" ? `+${drop.value}G` : drop.label,
        "#f8f871",
      );
      return false;
    });
  }

  function dash() {
    if (modalMode || speechBubble) return;
    const player = state.player;
    if ((player.dashCd || 0) > 0) return;
    let dx =
      Number(keys.has("arrowright") || keys.has("d")) -
      Number(keys.has("arrowleft") || keys.has("a"));
    let dy =
      Number(keys.has("arrowdown") || keys.has("s")) -
      Number(keys.has("arrowup") || keys.has("w"));
    const len = Math.hypot(dx, dy);
    if (len) {
      dx /= len;
      dy /= len;
    } else {
      dx = Math.cos(player.facing);
      dy = Math.sin(player.facing);
    }
    player.dashVx = dx;
    player.dashVy = dy;
    player.dashTime = 0.18;
    player.dashCd = Math.max(0.75, 1.05 - statValue("agi") * 0.02);
    player.invuln = Math.max(player.invuln, 0.22);
    showEffect(player.x, player.y - 44, "회피", "#48a5ff");
  }

  function attack(skill = false) {
    if (modalMode || speechBubble) return;
    const player = state.player;
    if (skill) {
      if (player.skillCd > 0)
        return toast("서약기가 아직 준비되지 않았습니다.");
      const cost = Math.max(
        20,
        36 - statValue("wis") - (player.skillRank || 0),
      );
      if (player.mp < cost) return toast("마나가 부족합니다.");
      player.mp -= cost;
      player.skillCd = Math.max(3.2, 5.5 - (player.skillRank || 0) * 0.24);
    } else {
      if (player.attackCd > 0) return;
      player.attackCd = Math.max(0.22, 0.34 - statValue("agi") * 0.006);
    }
    attackFlash = skill ? 0.34 : 0.18;
    const range = skill ? 180 : 92;
    const arc = skill ? 1.35 : 0.9;
    const damage = Math.round(
      totalAtk() * (skill ? 2.4 + (player.skillRank || 0) * 0.18 : 1) +
        Math.random() * 12,
    );
    let hitCount = 0;
    state.enemies.forEach((enemy) => {
      const gap = distance(player.x, player.y, enemy.x, enemy.y);
      const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      const delta = Math.abs(normalizeAngle(angle - player.facing));
      if (gap <= range && delta <= arc) {
        const dealt = Math.max(4, damage - enemy.def);
        enemy.hp -= dealt;
        enemy.hit = 0.16;
        hitCount += 1;
        showEffect(
          enemy.x,
          enemy.y - 28,
          `-${dealt}`,
          skill ? "#d08cff" : "#fffbba",
        );
        if (enemy.hp <= 0) killEnemy(enemy);
      }
    });
    if (hitCount && skill)
      showEffect(player.x, player.y - 52, "서약기", "#d08cff");
    if (hitCount) {
      player.combo = Math.min(99, (player.combo || 0) + hitCount);
      player.comboTimer = 4.5;
      if (player.combo >= 8)
        showEffect(player.x, player.y - 72, `${player.combo}연격`, "#53e2a8");
    }
  }

  function killEnemy(enemy) {
    const spec = ENEMIES[enemy.type];
    const comboBonus = 1 + Math.min(0.28, (state.player.combo || 0) * 0.012);
    const xp = Math.round(spec.xp * (enemy.boss ? 4.2 : 1) * comboBonus);
    const gold = Math.round(spec.gold * (enemy.boss ? 3.6 : 1) * comboBonus);
    giveReward({ xp, gold });
    const quest = currentQuest();
    if (
      quest?.zone === state.zone &&
      quest.enemy === enemy.type &&
      (quest.type === "hunt" || quest.type === "boss")
    ) {
      addQuestProgress(1);
    }
    if (Math.random() < 0.22 || quest?.type === "collect") {
      const collectQuest = currentQuest();
      const rareItem =
        collectQuest?.type !== "collect" && !enemy.boss && Math.random() < 0.08
          ? Math.random() < 0.55
            ? "smallPotion"
            : "manaDew"
          : "";
      state.drops.push({
        zone: state.zone,
        x: enemy.x + Math.random() * 38 - 19,
        y: enemy.y + Math.random() * 38 - 19,
        kind: rareItem
          ? "item"
          : collectQuest?.type === "collect" && collectQuest.zone === state.zone
            ? "quest"
            : "gold",
        value: Math.max(8, Math.round(gold * 0.45)),
        item: rareItem,
        label: rareItem ? ITEMS[rareItem].name : collectQuest?.item || "골드",
      });
    }
  }

  function hurtPlayer(amount) {
    const player = state.player;
    if (player.invuln > 0) return;
    player.hp -= amount;
    player.invuln = 0.75;
    showEffect(player.x, player.y - 34, `-${amount}`, "#ff5f6d");
    if (player.hp <= 0) {
      player.hp = Math.round(player.maxHp * 0.62);
      player.mp = Math.round(player.maxMp * 0.55);
      player.combo = 0;
      player.comboTimer = 0;
      player.gold = Math.max(
        0,
        player.gold - Math.max(20, Math.round(player.gold * 0.08)),
      );
      changeZone("lumen");
      toast(
        "쓰러졌지만 루멘 성소에서 다시 일어났습니다. 일부 골드를 잃었습니다.",
      );
    }
  }

  function interact() {
    if (modalMode) return;
    if (speechBubble) return advanceSpeechBubble();
    const target = interactionTarget();
    if (target?.type === "npc") return talkToNpc(target.npc);
    if (target?.type === "portal") return openTravel(target.portal.to);
    toast("가까운 대상이 없습니다.");
  }

  function interactionTarget() {
    const npc = nearestNpc();
    if (npc && npc.d < 96) return { type: "npc", npc };
    const portal = currentZone().portals.find(
      (item) => distance(state.player.x, state.player.y, item.x, item.y) < 105,
    );
    if (portal) return { type: "portal", portal };
    return null;
  }

  function nearestNpc() {
    return currentZone()
      .npc.map((npc) => ({
        ...npc,
        d: distance(state.player.x, state.player.y, npc.x, npc.y),
      }))
      .sort((a, b) => a.d - b.d)[0];
  }

  function talkToNpc(npc) {
    const quest = currentQuest();
    if (npc.shop) {
      return startSpeechBubble(
        npc,
        [
          `${npc.role} ${npc.name}: 필요한 장비와 소모품을 준비해 두었습니다.`,
          "보스 보상으로 얻은 장비는 가방에서 다시 착용할 수 있습니다.",
        ],
        () => openShop(npc),
      );
    }
    if (quest && quest.npc === npc.id) {
      if (quest.type === "talk" && state.questProgress < quest.required) {
        return startSpeechBubble(npc, quest.intro, () => {
          state.questProgress = quest.required;
          completeQuest(quest);
        });
      }
      if (questReady(quest))
        return startSpeechBubble(npc, quest.done, () => completeQuest(quest));
      return startSpeechBubble(
        npc,
        quest.intro.concat([
          `현재 목표: ${questObjectiveText(quest)}`,
          `왜 해야 하나: ${quest.reason || "다음 장을 열기 위한 핵심 단계입니다."}`,
          `예상 보상: ${rewardText(quest.reward)}`,
        ]),
      );
    }
    startSpeechBubble(npc, [
      `${npc.role} ${npc.name}: 지금은 ${currentZone().name}의 상황을 살피고 있습니다.`,
      "퀘스트 목표를 따라가면 다시 도움이 필요할 때가 올 겁니다.",
    ]);
  }

  function startSpeechBubble(npc, lines = [], onDone = null) {
    const speaker = npc || {
      id: "system",
      name: "서약",
      role: "기록",
      x: state.player.x,
      y: state.player.y,
    };
    speechBubble = {
      npcId: speaker.id,
      name: speaker.name || "서약",
      role: speaker.role || "",
      x: speaker.x,
      y: speaker.y,
      lines: lines.filter(Boolean),
      index: 0,
      onDone,
    };
  }

  function advanceSpeechBubble() {
    if (!speechBubble) return false;
    if (speechBubble.index < speechBubble.lines.length - 1) {
      speechBubble.index += 1;
      return true;
    }
    const done = speechBubble.onDone;
    speechBubble = null;
    done?.();
    return true;
  }

  function findNpcById(id) {
    return currentZone().npc.find((npc) => npc.id === id) || null;
  }

  function openShop(npc) {
    modalMode = "shop";
    const list = SHOPS[npc.shop] || [];
    ui.modal.innerHTML = `
      <h2>${npc.name}의 상점</h2>
      <p class="rpg-muted">보유 골드: ${state.player.gold}G · 장비는 구매 후 가방에 보관되고 즉시 착용됩니다.</p>
      <div class="item-grid">
        ${list
          .map((id) => {
            const item = ITEMS[id];
            return `<div class="item-card">
              <strong>${escapeHtml(item.name)} <span style="color:${rarityInfo(item).color}">[${rarityInfo(item).label}]</span></strong>
              <span>${escapeHtml(item.desc || "")}</span>
              <span class="rpg-muted">${itemStatsText(item)}</span>
              <button type="button" data-buy="${id}">${item.price}G 구매</button>
            </div>`;
          })
          .join("")}
      </div>
      <div class="choice-grid">
        <button type="button" data-close>닫기</button>
      </div>`;
    ui.modalWrap.classList.add("show");
  }

  function openTravel(defaultZone = "") {
    modalMode = "travel";
    const options = state.unlockedZones.filter((id) => zoneMap[id]);
    ui.modal.innerHTML = `
      <h2>이동</h2>
      <p class="rpg-muted">해금된 지역으로 즉시 이동합니다. 현재 진행 중인 퀘스트 지역은 강조됩니다.</p>
      <div class="choice-grid">
        ${options
          .map(
            (id) =>
              `<button type="button" class="${id === defaultZone ? "primary" : ""}" data-travel="${id}">${zoneMap[id].name}</button>`,
          )
          .join("")}
        <button type="button" data-close>닫기</button>
      </div>`;
    ui.modalWrap.classList.add("show");
  }

  function openInventory() {
    modalMode = "inventory";
    const inv = Object.entries(state.player.inventory).filter(
      ([, count]) => count > 0,
    );
    ui.modal.innerHTML = `
      <h2>가방</h2>
      <p class="rpg-muted">소모품은 사용하고, 무기/방어구/부적은 원하는 장비로 바꿔 착용할 수 있습니다.</p>
      <div class="item-grid">
        ${
          inv.length
            ? inv
                .map(([id, count]) => {
                  const item = ITEMS[id] || { name: id, type: "misc" };
                  const equipped =
                    state.player.equipment?.[item.type] === id
                      ? " · 착용 중"
                      : "";
                  const action = ["weapon", "armor", "charm"].includes(
                    item.type,
                  )
                    ? `<button type="button" data-equip="${id}">착용</button>`
                    : `<button type="button" data-use="${id}">사용</button>`;
                  return `<div class="item-card">
                    <strong>${escapeHtml(item.name)} x${count}${equipped}</strong>
                    <span>${escapeHtml(item.desc || "")}</span>
                    <span class="rpg-muted">${itemStatsText(item)}</span>
                    ${action}
                  </div>`;
                })
                .join("")
            : "<p>가방이 비어 있습니다.</p>"
        }
      </div>
      <div class="choice-grid">
        <button type="button" data-close>닫기</button>
      </div>`;
    ui.modalWrap.classList.add("show");
  }

  function openQuestLog() {
    modalMode = "quest";
    const quest = currentQuest();
    const finished = QUESTS.slice(0, state.questIndex).slice(-8);
    ui.modal.innerHTML = `
      <h2>퀘스트 기록</h2>
      <div class="lines">
        <p><strong>현재:</strong> ${quest ? quest.title : "완료"}</p>
        <p>${questObjectiveText(quest)}</p>
        ${quest ? `<p><strong>왜 해야 하나:</strong> ${escapeHtml(quest.reason || "다음 장을 열기 위한 핵심 단계입니다.")}</p>` : ""}
        ${quest ? `<p><strong>예상 보상:</strong> ${rewardText(quest.reward)}</p>` : ""}
        <p>전체 진행: ${Math.min(state.questIndex + 1, QUESTS.length)} / ${QUESTS.length} · 플레이 기록 ${formatTime(state.playSeconds)}</p>
        <p>목표 분량: 최종 장은 ${formatTime(MIN_FINAL_PLAY_SECONDS)} 이상의 플레이 기록을 요구합니다.</p>
        ${finished.length ? `<p><strong>최근 완료</strong><br>${finished.map((item) => item.title).join("<br>")}</p>` : ""}
      </div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openStats() {
    modalMode = "stats";
    const player = state.player;
    const stats = [
      ["str", "힘", "공격 피해가 오릅니다."],
      ["vit", "체력", "최대 HP와 방어 안정성이 오릅니다."],
      ["wis", "지혜", "최대 MP와 서약기 효율이 오릅니다."],
      ["agi", "민첩", "이동/공격/회피 흐름이 빨라집니다."],
    ];
    ui.modal.innerHTML = `
      <h2>성장</h2>
      <p class="rpg-muted">성장 포인트 ${player.statPoints || 0} · 서약 포인트 ${player.skillPoints || 0} · 명성 ${player.renown || 0}</p>
      <div class="item-grid">
        ${stats
          .map(
            ([id, label, desc]) => `<div class="item-card">
              <strong>${label} ${statValue(id)}</strong>
              <span>${desc}</span>
              <button type="button" data-stat="${id}" ${(player.statPoints || 0) <= 0 ? "disabled" : ""}>+1 투자</button>
            </div>`,
          )
          .join("")}
        <div class="item-card">
          <strong>서약기 Lv.${player.skillRank || 0}</strong>
          <span>서약기의 피해량을 올리고 재사용 대기시간과 MP 부담을 낮춥니다.</span>
          <button type="button" data-skill-up ${(player.skillPoints || 0) <= 0 ? "disabled" : ""}>서약 포인트 투자</button>
        </div>
      </div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openJournal() {
    modalMode = "journal";
    const entries = (state.journal || []).slice(0, 12);
    ui.modal.innerHTML = `
      <h2>서약 서고</h2>
      <p class="rpg-muted">완료한 장의 기록과 지금까지 왜 싸워왔는지 확인합니다.</p>
      <div class="lines">
        ${
          entries.length
            ? entries
                .map(
                  (entry) =>
                    `<p><strong>${escapeHtml(entry.title)}</strong>${entry.time ? ` · ${escapeHtml(entry.time)}` : ""}<br>${escapeHtml(entry.text)}</p>`,
                )
                .join("")
            : "<p>아직 기록된 서약이 없습니다.</p>"
        }
      </div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function addStatPoint(stat) {
    const player = state.player;
    if ((player.statPoints || 0) <= 0) return;
    player.baseStats[stat] = (player.baseStats[stat] || 0) + 1;
    player.statPoints -= 1;
    if (stat === "vit") {
      player.maxHp += 18;
      player.hp = Math.min(player.maxHp, player.hp + 18);
    }
    if (stat === "wis") {
      player.maxMp += 10;
      player.mp = Math.min(player.maxMp, player.mp + 10);
    }
    toast("성장 포인트를 투자했습니다.");
    openStats();
  }

  function upgradeSkill() {
    const player = state.player;
    if ((player.skillPoints || 0) <= 0) return;
    player.skillPoints -= 1;
    player.skillRank = (player.skillRank || 0) + 1;
    toast("서약기가 강화되었습니다.");
    openStats();
  }

  function openHelp() {
    showDialogue("사용 방법", [
      "서약의 연대기는 소켓을 사용하지 않는 혼자하기 액션 RPG입니다.",
      "WASD/방향키로 이동하고 J로 공격합니다. NPC 가까이에서는 Space 또는 E로 말풍선 대화를 진행하고, K는 서약기, Shift는 짧은 회피 대시입니다.",
      "퀘스트에는 왜 해야 하는지와 예상 보상이 표시됩니다. 화면의 방향선과 미니맵을 보고 NPC, 수집품, 보스 위치로 이동하세요.",
      "상점에서 물약과 장비를 구매하고, 보스 보상으로 얻은 무기/방어구/부적을 가방에서 바꿔 착용하세요. 성장 메뉴에서 레벨업 포인트를 힘/체력/지혜/민첩과 서약기에 투자할 수 있습니다.",
      "서고에는 완료한 장의 기록이 쌓여 다음에 이어 할 때도 이야기의 목적을 다시 확인할 수 있습니다.",
      "EXE 또는 로컬 서버에서 실행하면 저장 파일은 사용자 데이터 폴더의 Good_ETC/saves/rpg_save.json에 저장됩니다. 파일로 직접 열면 브라우저 localStorage에 저장됩니다.",
      "최종 장은 5시간 이상의 플레이 기록이 쌓여야 열리도록 설계되어 장기 플레이를 전제로 합니다.",
    ]);
  }

  function showDialogue(
    title,
    lines,
    choices = [{ label: "닫기", action: closeModal }],
  ) {
    modalMode = "dialogue";
    ui.modal.innerHTML = `
      <h2>${escapeHtml(title)}</h2>
      <div class="lines">${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>
      <div class="choice-grid">
        ${choices.map((choice, index) => `<button type="button" class="${choice.primary ? "primary" : ""}" data-choice="${index}">${escapeHtml(choice.label)}</button>`).join("")}
      </div>`;
    ui.modalWrap.classList.add("show");
    ui.modal._choices = choices;
  }

  function closeModal() {
    modalMode = "";
    ui.modalWrap.classList.remove("show");
    ui.modal.innerHTML = "";
    ui.modal._choices = null;
  }

  function buyItem(id) {
    const item = ITEMS[id];
    if (!item) return;
    if (state.player.gold < item.price) return toast("골드가 부족합니다.");
    state.player.gold -= item.price;
    state.player.inventory[id] = Math.max(
      state.player.inventory[id] || 0,
      ["weapon", "armor", "charm"].includes(item.type)
        ? 1
        : (state.player.inventory[id] || 0) + 1,
    );
    if (["weapon", "armor", "charm"].includes(item.type)) equipItem(id);
    toast(`${item.name}을 구매했습니다.`);
    openShop(nearestNpc() || { name: "상점", shop: "apothecary" });
  }

  function equipItem(id) {
    const item = ITEMS[id];
    if (!item || !["weapon", "armor", "charm"].includes(item.type)) return;
    state.player.equipment[item.type] = id;
    toast(`${item.name} 착용`);
    if (modalMode === "inventory") openInventory();
  }

  function useItem(id) {
    const item = ITEMS[id];
    if (!item || (state.player.inventory[id] || 0) <= 0) return;
    const player = state.player;
    if (item.heal) player.hp = Math.min(player.maxHp, player.hp + item.heal);
    if (item.mana) player.mp = Math.min(player.maxMp, player.mp + item.mana);
    if (item.type === "buff") {
      player.hp = Math.min(player.maxHp, player.hp + 180);
      player.mp = Math.min(player.maxMp, player.mp + 120);
      player.invuln = Math.max(player.invuln, 2.5);
    }
    player.inventory[id] -= 1;
    toast(`${item.name} 사용`);
    if (modalMode === "inventory") openInventory();
  }

  function statValue(stat) {
    return (state.player.baseStats?.[stat] || 0) + itemBonus(stat);
  }

  function itemBonus(field) {
    const equipment = state.player.equipment || {};
    return Object.values(equipment).reduce(
      (sum, id) => sum + (ITEMS[id]?.[field] || 0),
      0,
    );
  }

  function totalAtk() {
    return (
      state.player.atk +
      itemBonus("atk") +
      Math.floor(statValue("str") * 1.8) +
      Math.floor(statValue("agi") * 0.6)
    );
  }

  function totalDef() {
    return (
      state.player.def + itemBonus("def") + Math.floor(statValue("vit") * 1.4)
    );
  }

  function rarityInfo(item) {
    return RARITY[item?.rarity || "common"] || RARITY.common;
  }

  function itemStatsText(item = {}) {
    return [
      item.atk ? `공격 +${item.atk}` : "",
      item.def ? `방어 +${item.def}` : "",
      item.str ? `힘 +${item.str}` : "",
      item.vit ? `체력 +${item.vit}` : "",
      item.wis ? `지혜 +${item.wis}` : "",
      item.agi ? `민첩 +${item.agi}` : "",
      item.heal ? `HP +${item.heal}` : "",
      item.mana ? `MP +${item.mana}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function rewardText(reward = {}) {
    return [
      reward.xp ? `경험치 ${reward.xp}` : "",
      reward.gold ? `골드 ${reward.gold}` : "",
      reward.item ? ITEMS[reward.item]?.name || reward.item : "",
      reward.renown ? `명성 ${reward.renown}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function renderHud() {
    const player = state.player;
    const quest = currentQuest();
    ui.location.textContent = `${currentZone().name} · ${currentZone().subtitle}`;
    ui.heroName.textContent = `${player.name} Lv.${player.level}`;
    ui.hp.style.width = `${clamp((player.hp / player.maxHp) * 100, 0, 100)}%`;
    ui.mp.style.width = `${clamp((player.mp / player.maxMp) * 100, 0, 100)}%`;
    ui.xp.style.width = `${clamp((player.xp / xpForLevel(player.level)) * 100, 0, 100)}%`;
    ui.stats.innerHTML = `
      <span>HP<br><strong>${Math.round(player.hp)}/${player.maxHp}</strong></span>
      <span>MP<br><strong>${Math.round(player.mp)}/${player.maxMp}</strong></span>
      <span>골드<br><strong>${player.gold}G</strong></span>
      <span>공격<br><strong>${totalAtk()}</strong></span>
      <span>방어<br><strong>${totalDef()}</strong></span>
      <span>연격<br><strong>${player.combo || 0}</strong></span>
      <span>성장<br><strong>${player.statPoints || 0}P</strong></span>
      <span>서약기<br><strong>Lv.${player.skillRank || 0}</strong></span>
      <span>기록<br><strong>${formatTime(state.playSeconds)}</strong></span>`;
    ui.quest.innerHTML = quest
      ? `<h2>${quest.title}</h2><p>${questObjectiveText(quest)}</p><p class="rpg-muted">${quest.reason || quest.intro[0]}</p><p class="rpg-muted">보상: ${rewardText(quest.reward)}</p>`
      : "<h2>완료</h2><p>모든 장을 완료했습니다.</p>";
    const inv = Object.entries(player.inventory).filter(
      ([, count]) => count > 0,
    );
    ui.inventory.innerHTML = inv
      .slice(0, 8)
      .map(
        ([id, count]) =>
          `<span class="rpg-pill">${ITEMS[id]?.name || id} x${count}</span>`,
      )
      .join("");
    const equipped = ["weapon", "armor", "charm"]
      .map((slot) => ITEMS[player.equipment?.[slot]]?.name)
      .filter(Boolean)
      .join(" · ");
    if (equipped)
      ui.inventory.innerHTML += `<span class="rpg-pill">착용: ${equipped}</span>`;
  }

  function resize() {
    canvas.width = Math.floor(window.innerWidth * canvasScale);
    canvas.height = Math.floor(window.innerHeight * canvasScale);
    ctx.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
    camera.scale = window.innerWidth < 780 ? 0.78 : 0.92;
  }

  function draw() {
    if (!state) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    update(dt);
    updateCamera();
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.save();
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-camera.x, -camera.y);
    drawWorld();
    drawQuestCompass();
    drawDrops();
    drawPortals();
    drawNpcs();
    drawEnemies();
    drawPlayer();
    drawEffects();
    drawSpeechBubble();
    ctx.restore();
    drawMinimap();
    drawBossBar();
    renderHud();
    requestAnimationFrame(draw);
  }

  function updateCamera() {
    const viewW = window.innerWidth / camera.scale;
    const viewH = window.innerHeight / camera.scale;
    const zone = currentZone();
    camera.x +=
      (clamp(state.player.x - viewW / 2, 0, Math.max(0, zone.w - viewW)) -
        camera.x) *
      0.14;
    camera.y +=
      (clamp(state.player.y - viewH / 2, 0, Math.max(0, zone.h - viewH)) -
        camera.y) *
      0.14;
  }

  function drawWorld() {
    const zone = currentZone();
    const grad = ctx.createLinearGradient(0, 0, zone.w, zone.h);
    zone.floor.forEach((color, index) =>
      grad.addColorStop(index / Math.max(1, zone.floor.length - 1), color),
    );
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, zone.w, zone.h);
    ctx.strokeStyle = "rgba(255,255,255,.055)";
    ctx.lineWidth = 1;
    for (let x = 0; x < zone.w; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, zone.h);
      ctx.stroke();
    }
    for (let y = 0; y < zone.h; y += 96) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(zone.w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 90; i += 1) {
      const x = ((i * 353) % zone.w) + Math.sin(i) * 16;
      const y = ((i * 197) % zone.h) + Math.cos(i) * 16;
      ctx.fillStyle =
        i % 4 === 0 ? `${zone.accent}33` : "rgba(255,255,255,.07)";
      ctx.beginPath();
      ctx.ellipse(x, y, 18 + (i % 5) * 7, 8 + (i % 3) * 4, i, 0, Math.PI * 2);
      ctx.fill();
    }
    drawZoneLandmarks(zone);
    drawWeather(zone);
  }

  function drawZoneLandmarks(zone) {
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = `${zone.accent}55`;
    ctx.lineWidth = 18;
    ctx.setLineDash([42, 28]);
    ctx.beginPath();
    ctx.moveTo(160, zone.h * 0.52);
    ctx.bezierCurveTo(
      zone.w * 0.28,
      zone.h * 0.34,
      zone.w * 0.58,
      zone.h * 0.72,
      zone.w - 160,
      zone.h * 0.5,
    );
    ctx.stroke();
    ctx.setLineDash([]);
    const seed = zone.id
      .split("")
      .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    for (let i = 0; i < 34; i += 1) {
      const x = ((seed * 97 + i * 311) % (zone.w - 180)) + 90;
      const y = ((seed * 53 + i * 197) % (zone.h - 180)) + 90;
      if (zone.id === "lumen") drawBuilding(x, y, zone.accent);
      else if (zone.id === "greenwood") drawTreeCluster(x, y, zone.accent);
      else if (zone.id === "saltwind") drawDockCrate(x, y, zone.accent);
      else if (zone.id === "embermine") drawMineDetail(x, y, zone.accent);
      else if (zone.id === "snowveil") drawSnowStone(x, y, zone.accent);
      else if (zone.id === "veilkeep") drawKeepPillar(x, y, zone.accent);
      else if (zone.id === "eclipse") drawCrystal(x, y, zone.accent);
      else drawRuneCircle(x, y, zone.accent);
    }
    ctx.restore();
  }

  function drawBuilding(x, y, color) {
    ctx.fillStyle = "rgba(9,18,31,.62)";
    ctx.fillRect(x - 34, y - 24, 68, 52);
    ctx.fillStyle = `${color}55`;
    ctx.beginPath();
    ctx.moveTo(x - 44, y - 24);
    ctx.lineTo(x, y - 58);
    ctx.lineTo(x + 44, y - 24);
    ctx.closePath();
    ctx.fill();
  }

  function drawTreeCluster(x, y, color) {
    ctx.fillStyle = "rgba(12,30,22,.72)";
    ctx.fillRect(x - 6, y - 10, 12, 34);
    ctx.fillStyle = `${color}88`;
    [-18, 0, 18].forEach((offset) => {
      ctx.beginPath();
      ctx.arc(x + offset, y - 20, 22, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawDockCrate(x, y, color) {
    ctx.fillStyle = "rgba(7,24,38,.66)";
    ctx.fillRect(x - 40, y - 8, 80, 16);
    ctx.fillStyle = `${color}77`;
    ctx.fillRect(x - 22, y - 34, 44, 30);
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.strokeRect(x - 22, y - 34, 44, 30);
  }

  function drawMineDetail(x, y, color) {
    ctx.strokeStyle = `${color}66`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - 38, y + 28);
    ctx.lineTo(x + 38, y - 28);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,122,62,.2)";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSnowStone(x, y, color) {
    ctx.fillStyle = "rgba(240,249,255,.18)";
    ctx.beginPath();
    ctx.ellipse(x, y, 36, 18, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `${color}77`;
    ctx.stroke();
  }

  function drawKeepPillar(x, y, color) {
    ctx.fillStyle = "rgba(25,25,48,.72)";
    ctx.fillRect(x - 14, y - 54, 28, 88);
    ctx.fillStyle = `${color}55`;
    ctx.fillRect(x - 28, y - 62, 56, 14);
  }

  function drawCrystal(x, y, color) {
    ctx.fillStyle = `${color}66`;
    ctx.beginPath();
    ctx.moveTo(x, y - 48);
    ctx.lineTo(x + 24, y - 6);
    ctx.lineTo(x + 8, y + 38);
    ctx.lineTo(x - 24, y + 4);
    ctx.closePath();
    ctx.fill();
  }

  function drawRuneCircle(x, y, color) {
    ctx.strokeStyle = `${color}88`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `${color}55`;
    ctx.fillRect(x - 4, y - 28, 8, 56);
  }

  function drawWeather(zone) {
    const now = performance.now() / 1000;
    const kind =
      zone.id === "snowveil"
        ? "snow"
        : zone.id === "embermine"
          ? "ember"
          : zone.id === "greenwood"
            ? "leaf"
            : zone.id === "eclipse"
              ? "ash"
              : "";
    if (!kind) return;
    for (let i = 0; i < 42; i += 1) {
      const x = (i * 173 + now * (kind === "snow" ? 36 : 58)) % zone.w;
      const y = (i * 251 + now * (kind === "snow" ? 62 : 34)) % zone.h;
      ctx.fillStyle =
        kind === "snow"
          ? "rgba(235,250,255,.55)"
          : kind === "ember"
            ? "rgba(255,186,90,.45)"
            : kind === "leaf"
              ? "rgba(139,230,111,.35)"
              : "rgba(208,140,255,.28)";
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        kind === "snow" ? 3 : 5,
        kind === "leaf" ? 9 : 3,
        now + i,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  function drawPortals() {
    currentZone().portals.forEach((portal) => {
      ctx.save();
      ctx.translate(portal.x, portal.y);
      const pulse = 0.72 + Math.sin(performance.now() / 380) * 0.16;
      ctx.strokeStyle = currentZone().accent;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.ellipse(0, 0, 48 * pulse, 72 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.12)";
      ctx.fillRect(-34, -10, 68, 20);
      ctx.fillStyle = "#eef6ff";
      ctx.font = "700 15px Malgun Gothic, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(portal.label, 0, -82);
      ctx.restore();
    });
  }

  function drawNpcs() {
    currentZone().npc.forEach((npc) => {
      ctx.save();
      ctx.translate(npc.x, npc.y);
      drawShadow(0, 20, 28);
      const near = distance(state.player.x, state.player.y, npc.x, npc.y) < 96;
      ctx.fillStyle = npc.shop ? "#ffba5a" : currentZone().accent;
      ctx.beginPath();
      ctx.roundRect(-18, -36, 36, 58, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.2)";
      ctx.fillRect(-14, -28, 28, 9);
      ctx.fillStyle = "#f8dcc4";
      ctx.beginPath();
      ctx.arc(0, -44, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = npc.shop ? "#7a4218" : "#263a4d";
      ctx.fillRect(-12, -56, 24, 7);
      if (near) {
        ctx.strokeStyle = `${currentZone().accent}cc`;
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(0, -10, 48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = "#eef6ff";
      ctx.font = "800 14px Malgun Gothic, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(npc.name, 0, -66);
      ctx.fillStyle = "#a8bdd5";
      ctx.font = "12px Malgun Gothic, sans-serif";
      ctx.fillText(npc.shop ? "상점" : npc.role, 0, 38);
      if (near) {
        ctx.fillStyle = "#fff7b3";
        ctx.font = "900 12px Malgun Gothic, sans-serif";
        ctx.fillText("Space/E", 0, 56);
      }
      ctx.restore();
    });
  }

  function drawDrops() {
    state.drops
      .filter((drop) => drop.zone === state.zone)
      .forEach((drop) => {
        ctx.save();
        ctx.translate(drop.x, drop.y);
        ctx.fillStyle = drop.kind === "quest" ? "#f8f871" : "#ffba5a";
        ctx.beginPath();
        ctx.arc(
          0,
          0,
          10 + Math.sin(performance.now() / 160) * 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();
      });
  }

  function drawEnemies() {
    state.enemies.forEach((enemy) => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      drawShadow(0, 22, enemy.boss ? 44 : 30);
      if (enemy.windup > 0) {
        ctx.strokeStyle = "rgba(255,95,109,.72)";
        ctx.fillStyle = "rgba(255,95,109,.14)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -8, enemy.boss ? 76 : 54, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = enemy.hit > 0 ? "#fff" : enemy.color;
      ctx.beginPath();
      ctx.roundRect(
        enemy.boss ? -30 : -20,
        enemy.boss ? -46 : -32,
        enemy.boss ? 60 : 40,
        enemy.boss ? 72 : 52,
        12,
      );
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.36)";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.26)";
      ctx.fillRect(
        enemy.boss ? -20 : -14,
        enemy.boss ? -34 : -24,
        enemy.boss ? 40 : 28,
        9,
      );
      ctx.fillStyle = "#101827";
      ctx.beginPath();
      ctx.arc(-8, enemy.boss ? -16 : -12, 3, 0, Math.PI * 2);
      ctx.arc(10, enemy.boss ? -16 : -12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111827";
      ctx.fillRect(-24, -58, 48, 6);
      ctx.fillStyle = "#ff5f6d";
      ctx.fillRect(-24, -58, 48 * Math.max(0, enemy.hp / enemy.maxHp), 6);
      if (enemy.boss) {
        ctx.fillStyle = "#eef6ff";
        ctx.font = "800 14px Malgun Gothic, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(enemy.name, 0, -72);
      }
      ctx.restore();
    });
  }

  function drawPlayer() {
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    drawShadow(0, 24, 34);
    if (p.invuln > 0) {
      ctx.strokeStyle = "rgba(255,255,255,.72)";
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -10, 42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (p.dashTime > 0) {
      ctx.strokeStyle = "rgba(72,165,255,.45)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-p.dashVx * 70, -p.dashVy * 70 - 6);
      ctx.lineTo(0, -6);
      ctx.stroke();
    }
    ctx.rotate(p.facing);
    ctx.fillStyle = "#1c293d";
    ctx.beginPath();
    ctx.roundRect(-18, -28, 36, 54, 8);
    ctx.fill();
    ctx.fillStyle = currentZone().accent;
    ctx.fillRect(-8, -34, 16, 20);
    ctx.fillStyle = "#d08cff";
    ctx.fillRect(-18, -10, 7, 26);
    ctx.fillRect(11, -10, 7, 26);
    ctx.fillStyle = "#d9b08c";
    ctx.beginPath();
    ctx.arc(0, -42, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2c1f31";
    ctx.beginPath();
    ctx.arc(0, -47, 14, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#eef6ff";
    ctx.beginPath();
    ctx.roundRect(18, -5, 46, 7, 4);
    ctx.fill();
    if (attackFlash > 0) {
      attackFlash = Math.max(0, attackFlash - 0.04);
      ctx.strokeStyle = "rgba(248,248,113,.75)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(8, 0, attackFlash > 0.24 ? 170 : 92, -0.7, 0.7);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawQuestCompass() {
    const target = questTarget();
    if (!target) return;
    const player = state.player;
    ctx.save();
    ctx.strokeStyle = "rgba(248,248,113,.42)";
    ctx.fillStyle = "rgba(248,248,113,.2)";
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 24);
    ctx.lineTo(target.x, target.y - 24);
    ctx.stroke();
    ctx.setLineDash([]);
    const pulse = 1 + Math.sin(performance.now() / 220) * 0.12;
    ctx.beginPath();
    ctx.arc(target.x, target.y - 28, 42 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = currentZone().accent;
    ctx.stroke();
    ctx.fillStyle = "#fff7b3";
    ctx.font = "900 14px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(target.label, target.x, target.y - 78);
    ctx.restore();
  }

  function questTarget() {
    const quest = currentQuest();
    if (!quest) return null;
    if (quest.zone !== state.zone) {
      const direct = currentZone().portals.find(
        (portal) => portal.to === quest.zone,
      );
      const portal = direct || currentZone().portals[0];
      return portal
        ? {
            x: portal.x,
            y: portal.y,
            label: `${zoneMap[quest.zone]?.name || "다음 지역"} 방향`,
          }
        : null;
    }
    if (quest.type === "talk") {
      const npc = findNpcById(quest.npc);
      return npc ? { x: npc.x, y: npc.y, label: `${npc.name}와 대화` } : null;
    }
    if (quest.type === "collect") {
      const drop = state.drops.find(
        (item) => item.zone === state.zone && item.kind === "quest",
      );
      if (drop) return { x: drop.x, y: drop.y, label: quest.item };
      const anyEnemy = state.enemies[0];
      if (anyEnemy)
        return { x: anyEnemy.x, y: anyEnemy.y, label: "수집품 단서" };
    }
    const enemy = state.enemies.find((item) => item.type === quest.enemy);
    if (enemy) return { x: enemy.x, y: enemy.y, label: enemy.name };
    const npc = findNpcById(quest.npc);
    return npc ? { x: npc.x, y: npc.y, label: "의뢰인" } : null;
  }

  function drawEffects() {
    state.effects.forEach((effect) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, effect.ttl));
      ctx.fillStyle = effect.color;
      ctx.font = "900 18px Malgun Gothic, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(effect.text, effect.x, effect.y - (1 - effect.ttl) * 36);
      ctx.restore();
    });
  }

  function drawSpeechBubble() {
    if (!speechBubble) return;
    const npc = findNpcById(speechBubble.npcId);
    const x = npc?.x ?? speechBubble.x ?? state.player.x;
    const y = npc?.y ?? speechBubble.y ?? state.player.y;
    const line = speechBubble.lines[speechBubble.index] || "";
    const lines = wrapCanvasText(line, 320);
    const width = 360;
    const height = 68 + lines.length * 22;
    const bx = x - width / 2;
    const by = y - 150 - lines.length * 8;
    ctx.save();
    ctx.fillStyle = "rgba(8,17,30,.94)";
    ctx.strokeStyle = `${currentZone().accent}cc`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, width, height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 12, by + height);
    ctx.lineTo(x, by + height + 18);
    ctx.lineTo(x + 12, by + height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = currentZone().accent;
    ctx.font = "900 14px Malgun Gothic, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      `${speechBubble.name}${speechBubble.role ? ` · ${speechBubble.role}` : ""}`,
      bx + 18,
      by + 24,
    );
    ctx.fillStyle = "#eef6ff";
    ctx.font = "700 16px Malgun Gothic, sans-serif";
    lines.forEach((text, index) =>
      ctx.fillText(text, bx + 18, by + 54 + index * 22),
    );
    ctx.fillStyle = "#a8bdd5";
    ctx.font = "12px Malgun Gothic, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Space/E 다음", bx + width - 18, by + height - 14);
    ctx.restore();
  }

  function drawBossBar() {
    const boss = state.enemies.find((enemy) => enemy.boss);
    if (!boss) return;
    const width = Math.min(620, window.innerWidth - 40);
    const x = (window.innerWidth - width) / 2;
    const y = 18;
    ctx.save();
    ctx.fillStyle = "rgba(9,18,31,.84)";
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, 38, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ff5f6d";
    ctx.fillRect(
      x + 12,
      y + 22,
      (width - 24) * Math.max(0, boss.hp / boss.maxHp),
      8,
    );
    ctx.fillStyle = "#eef6ff";
    ctx.font = "900 15px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(boss.name, x + width / 2, y + 16);
    ctx.restore();
  }

  function drawMinimap() {
    const zone = currentZone();
    const w = 176;
    const h = 124;
    const x = window.innerWidth - w - 18;
    const y = window.innerHeight - h - 18;
    ctx.save();
    ctx.fillStyle = "rgba(9,18,31,.78)";
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    const sx = w / zone.w;
    const sy = h / zone.h;
    ctx.fillStyle = zone.accent;
    ctx.beginPath();
    ctx.arc(
      x + state.player.x * sx,
      y + state.player.y * sy,
      4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = "#ff5f6d";
    state.enemies.forEach((enemy) =>
      ctx.fillRect(x + enemy.x * sx - 2, y + enemy.y * sy - 2, 4, 4),
    );
    ctx.fillStyle = "#f8f871";
    currentZone().npc.forEach((npc) =>
      ctx.fillRect(x + npc.x * sx - 2, y + npc.y * sy - 2, 4, 4),
    );
    ctx.restore();
  }

  function drawShadow(x, y, r) {
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function showEffect(x, y, text, color = "#eef6ff") {
    state.effects.push({ x, y, text, color, ttl: 1 });
    state.effects = state.effects.slice(-60);
  }

  function toast(message) {
    window.clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    toastTimer = window.setTimeout(
      () => ui.toast.classList.remove("show"),
      2200,
    );
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return h ? `${h}시간 ${m}분` : `${m}분`;
  }

  function distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeAngle(angle) {
    let next = angle;
    while (next > Math.PI) next -= Math.PI * 2;
    while (next < -Math.PI) next += Math.PI * 2;
    return next;
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

  function wrapCanvasText(text, maxWidth) {
    const words = String(text || "").split(" ");
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  function bindEvents() {
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (
        [
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          " ",
          "spacebar",
          "shift",
        ].includes(key) ||
        ((event.ctrlKey || event.metaKey) && key === "s")
      )
        event.preventDefault();
      keys.add(key);
      if ((key === " " || key === "e") && speechBubble) {
        advanceSpeechBubble();
        return;
      }
      if (key === " " && interactionTarget()) {
        interact();
        return;
      }
      if (key === "j" || key === " ") attack(false);
      if (key === "k") attack(true);
      if (key === "e") interact();
      if (key === "shift") dash();
      if (key === "1") useItem("smallPotion");
      if (key === "i") openInventory();
      if (key === "q") openQuestLog();
      if (key === "g") openStats();
      if (key === "m") openTravel();
      if (key === "h" || key === "?") openHelp();
      if (key === "s" && (event.ctrlKey || event.metaKey)) saveGame(true);
      if (key === "escape") closeModal();
    });
    window.addEventListener("keyup", (event) =>
      keys.delete(event.key.toLowerCase()),
    );
    canvas.addEventListener("pointermove", (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      const worldX = camera.x + event.clientX / camera.scale;
      const worldY = camera.y + event.clientY / camera.scale;
      state.player.facing = Math.atan2(
        worldY - state.player.y,
        worldX - state.player.x,
      );
    });
    canvas.addEventListener("pointerdown", () => attack(false));
    document.getElementById("rpgSave").onclick = () => saveGame(true);
    document.getElementById("rpgQuest").onclick = openQuestLog;
    document.getElementById("rpgBag").onclick = openInventory;
    document.getElementById("rpgStatsButton").onclick = openStats;
    document.getElementById("rpgJournal").onclick = openJournal;
    document.getElementById("rpgHelp").onclick = openHelp;
    ui.modal.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.close !== undefined) return closeModal();
      if (button.dataset.choice !== undefined) {
        const choice = ui.modal._choices?.[Number(button.dataset.choice)];
        choice?.action?.();
      }
      if (button.dataset.buy) buyItem(button.dataset.buy);
      if (button.dataset.use) useItem(button.dataset.use);
      if (button.dataset.equip) equipItem(button.dataset.equip);
      if (button.dataset.stat) addStatPoint(button.dataset.stat);
      if (button.dataset.skillUp !== undefined) upgradeSkill();
      if (button.dataset.travel) {
        const zoneId = button.dataset.travel;
        closeModal();
        changeZone(zoneId);
      }
    });
  }

  (async function start() {
    resize();
    bindEvents();
    await loadGame();
    const quest = currentQuest();
    if (quest && state.questIndex === 0 && state.questProgress === 0) {
      showDialogue(quest.title, quest.intro, [
        { label: "서약을 시작한다", primary: true, action: closeModal },
      ]);
    }
    lastFrame = performance.now();
    requestAnimationFrame(draw);
  })();
})();
