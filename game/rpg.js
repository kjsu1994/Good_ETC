(() => {
  const params = new URLSearchParams(window.location.search);
  const assetVersion = params.get("v") || "20260531rpg63";
  const SAVE_KEY = "good_etc_rpg_save_v1";
  const PANEL_PREF_KEY = "good_etc_rpg_panels_v1";
  const SAVE_API = "/api/rpg/save";
  const MIN_FINAL_PLAY_SECONDS = 30 * 60 * 60;
  const PLAYER_BODY_RADIUS = 26;
  const ENEMY_BODY_RADIUS = 30;
  const BOSS_BODY_RADIUS = 46;
  const PLAYER_ENEMY_BODY_PADDING = 10;
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
      .rpg-panel-toggle {
        min-width: 42px;
        min-height: 32px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 8px;
        background: rgba(255,255,255,.1);
        color: #eef6ff;
        font-weight: 900;
        cursor: pointer;
      }
      .rpg-top .rpg-panel-toggle,
      .rpg-side .rpg-panel-toggle {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 2;
      }
      .rpg-top .rpg-panel-body,
      .rpg-side .rpg-panel-body {
        padding-top: 26px;
      }
      .rpg-panel.is-collapsed {
        width: auto;
        min-width: 48px;
        max-height: none;
        overflow: visible;
        padding: 6px;
      }
      .rpg-panel.is-collapsed .rpg-panel-body {
        display: none;
      }
      .rpg-panel.is-collapsed .rpg-panel-toggle {
        position: static;
      }
      .rpg-top {
        top: 16px;
        left: 16px;
        width: min(380px, calc(100vw - 32px));
        max-height: calc(100vh - 32px);
        overflow: auto;
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
        max-height: 104px;
        overflow: auto;
        padding: 10px 12px;
        display: block;
        gap: 10px;
        color: #a8bdd5;
        font-size: .84rem;
      }
      .rpg-bottom .rpg-panel-toggle {
        display: block;
        margin: 0 auto 8px;
      }
      .rpg-bottom .rpg-panel-body {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .rpg-bottom.is-collapsed {
        width: auto;
        padding: 6px 8px;
      }
      .rpg-bottom.is-collapsed .rpg-panel-toggle {
        margin-bottom: 0;
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
      .rpg-skillbar {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
        margin-top: 10px;
      }
      .rpg-skillbar button {
        min-height: 42px;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 8px;
        background: rgba(255,255,255,.075);
        color: #eef6ff;
        font-weight: 900;
        cursor: pointer;
      }
      .rpg-skillbar button[disabled] {
        opacity: .48;
        cursor: not-allowed;
      }
      .rpg-stat-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin: 10px 0;
        max-height: 226px;
        overflow: auto;
        padding-right: 2px;
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
      .rpg-focus {
        display: grid;
        gap: 8px;
        margin: 10px 0;
        padding: 10px;
        border: 1px solid rgba(83,226,168,.22);
        border-radius: 8px;
        background: rgba(83,226,168,.08);
      }
      .rpg-focus-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }
      .rpg-focus-head strong {
        display: block;
        color: #eef6ff;
        font-size: .94rem;
        line-height: 1.35;
      }
      .rpg-focus-head span {
        flex: 0 0 auto;
        color: #53e2a8;
        font-size: .76rem;
        font-weight: 900;
      }
      .rpg-focus-list {
        display: grid;
        gap: 6px;
      }
      .rpg-focus-item {
        display: grid;
        gap: 3px;
        padding: 7px 8px;
        border-left: 3px solid var(--focus-color, #48a5ff);
        border-radius: 8px;
        background: rgba(255,255,255,.055);
      }
      .rpg-focus-item.is-ready {
        background: rgba(255,186,90,.1);
      }
      .rpg-focus-item strong {
        color: #eef6ff;
        font-size: .82rem;
      }
      .rpg-focus-item span {
        color: #a8bdd5;
        font-size: .76rem;
        line-height: 1.35;
      }
      .rpg-focus-item button {
        justify-self: start;
        min-height: 26px;
        margin-top: 3px;
        padding: 4px 8px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 7px;
        background: rgba(255,255,255,.08);
        color: #eef6ff;
        font-size: .74rem;
        font-weight: 900;
        cursor: pointer;
      }
      .rpg-focus-item.is-ready button {
        background: rgba(255,186,90,.18);
        border-color: rgba(255,186,90,.32);
      }
      .rpg-journey {
        display: grid;
        gap: 7px;
        margin: 10px 0;
        padding: 10px;
        border: 1px solid rgba(72,165,255,.22);
        border-radius: 8px;
        background: rgba(72,165,255,.075);
      }
      .rpg-journey-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: #eef6ff;
        font-size: .82rem;
        font-weight: 900;
      }
      .rpg-journey-head span {
        color: #a8bdd5;
        font-size: .74rem;
      }
      .rpg-journey-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 7px 8px;
        align-items: center;
        padding: 7px 8px;
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 8px;
        background: rgba(255,255,255,.045);
      }
      .rpg-journey-row strong,
      .rpg-journey-row small {
        display: block;
      }
      .rpg-journey-row strong {
        color: #eef6ff;
        font-size: .8rem;
      }
      .rpg-journey-row small {
        color: #a8bdd5;
        font-size: .72rem;
        line-height: 1.35;
      }
      .rpg-journey-row em {
        color: var(--journey-color, #48a5ff);
        font-style: normal;
        font-size: .76rem;
        font-weight: 900;
      }
      .rpg-journey-row button {
        min-height: 28px;
        padding: 4px 8px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 7px;
        background: rgba(255,255,255,.08);
        color: #eef6ff;
        font-size: .72rem;
        font-weight: 900;
        cursor: pointer;
      }
      .rpg-journey-bar {
        grid-column: 1 / -1;
        height: 6px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255,255,255,.11);
      }
      .rpg-journey-bar span {
        display: block;
        width: var(--journey-progress, 0%);
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--journey-color, #48a5ff), rgba(255,255,255,.9));
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
        .rpg-side {
          top: auto;
          right: 12px;
          bottom: 110px;
          width: min(320px, calc(100vw - 24px));
          max-height: min(38vh, 320px);
        }
        .rpg-top {
          width: calc(100vw - 32px);
          max-height: min(40vh, 320px);
        }
        .rpg-bottom {
          bottom: 12px;
          max-height: 86px;
          font-size: .76rem;
        }
        .rpg-actions { grid-template-columns: repeat(2, 1fr); }
      }
    </style>
    <canvas id="rpgCanvas" class="rpg-canvas" aria-label="서약의 연대기 RPG"></canvas>
    <section class="rpg-panel rpg-top" aria-label="RPG 상태">
      <button type="button" class="rpg-panel-toggle" data-rpg-panel-toggle="left" aria-controls="rpgLeftPanelBody">상태 접기</button>
      <div class="rpg-panel-body" id="rpgLeftPanelBody">
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
        <div class="rpg-skillbar" id="rpgOathArts"></div>
        <div class="rpg-actions">
          <button type="button" class="primary" id="rpgSave">저장</button>
          <button type="button" id="rpgQuest">퀘스트</button>
          <button type="button" id="rpgDecisions">결의</button>
          <button type="button" id="rpgSideStories">외전</button>
          <button type="button" id="rpgTrials">시험</button>
          <button type="button" id="rpgBag">가방</button>
          <button type="button" id="rpgStatsButton">성장</button>
          <button type="button" id="rpgSpecialize">전문화</button>
          <button type="button" id="rpgTactics">전술</button>
          <button type="button" id="rpgExpedition">던전</button>
          <button type="button" id="rpgEchoTrials">회상전</button>
          <button type="button" id="rpgCrafting">공방</button>
          <button type="button" id="rpgAlchemy">연금</button>
          <button type="button" id="rpgEnhance">강화</button>
          <button type="button" id="rpgContracts">의뢰</button>
          <button type="button" id="rpgBounties">수배</button>
          <button type="button" id="rpgArmory">장비록</button>
          <button type="button" id="rpgCampaigns">원정</button>
          <button type="button" id="rpgHuntPlans">계획</button>
          <button type="button" id="rpgNamedHunts">강적</button>
          <button type="button" id="rpgTreasures">보물</button>
          <button type="button" id="rpgBestiary">도감</button>
          <button type="button" id="rpgCompanions">동료</button>
          <button type="button" id="rpgBonds">인연</button>
          <button type="button" id="rpgSanctuary">성소</button>
          <button type="button" id="rpgCamps">야영</button>
          <button type="button" id="rpgPatrols">순찰</button>
          <button type="button" id="rpgRunes">각인</button>
          <button type="button" id="rpgChronicles">연대기</button>
          <button type="button" id="rpgRelics">유물</button>
          <button type="button" id="rpgTitles">칭호</button>
          <button type="button" id="rpgJournal">서고</button>
          <button type="button" id="rpgGoalAudit">진단</button>
          <button type="button" id="rpgHelp">?</button>
        </div>
        <p class="rpg-muted" id="rpgSaveStatus">저장 준비 중</p>
      </div>
    </section>
    <section class="rpg-panel rpg-side" aria-label="캐릭터와 퀘스트">
      <button type="button" class="rpg-panel-toggle" data-rpg-panel-toggle="right" aria-controls="rpgRightPanelBody">정보 접기</button>
      <div class="rpg-panel-body" id="rpgRightPanelBody">
        <h2 id="rpgHeroName">영웅</h2>
        <div class="rpg-focus" id="rpgQuickGuide"></div>
        <div class="rpg-journey" id="rpgJourney"></div>
        <div class="rpg-stat-grid" id="rpgStats"></div>
        <div class="rpg-quest" id="rpgQuestBox"></div>
        <div class="rpg-inventory" id="rpgInventoryMini"></div>
      </div>
    </section>
    <section class="rpg-panel rpg-bottom" aria-label="조작">
      <button type="button" class="rpg-panel-toggle" data-rpg-panel-toggle="bottom" aria-controls="rpgBottomPanelBody">조작 접기</button>
      <div class="rpg-panel-body" id="rpgBottomPanelBody">
        <span>WASD/방향키 이동</span>
        <span>J 공격 · NPC 앞 Space 대화</span>
        <span>K/2/3/4 서약 전술</span>
        <span>E 대화/포털/상점</span>
        <span>Shift 회피</span>
        <span>1 물약</span>
        <span>C 공방 · Z 연금 · U 강화 · B 도감 · N 의뢰 · F 수배 · 전술/장비록/원정/계획/강적/보물/야영/순찰/결의/외전/시험 버튼</span>
        <span>P 전문화 · L 던전 · 회상전 버튼 · O 동료 · X 인연 · R 성소 · Y 각인 · V 연대기 · T 칭호</span>
        <span>Ctrl+S 저장</span>
      </div>
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
    oathArts: document.getElementById("rpgOathArts"),
    stats: document.getElementById("rpgStats"),
    quickGuide: document.getElementById("rpgQuickGuide"),
    journey: document.getElementById("rpgJourney"),
    quest: document.getElementById("rpgQuestBox"),
    inventory: document.getElementById("rpgInventoryMini"),
    saveStatus: document.getElementById("rpgSaveStatus"),
    heroName: document.getElementById("rpgHeroName"),
    toast: document.getElementById("rpgToast"),
    modalWrap: document.getElementById("rpgModalWrap"),
    modal: document.getElementById("rpgModal"),
    panels: {
      left: document.querySelector(".rpg-top"),
      right: document.querySelector(".rpg-side"),
      bottom: document.querySelector(".rpg-bottom"),
    },
  };

  const PANEL_LABELS = {
    left: "상태",
    right: "정보",
    bottom: "조작",
  };

  let panelState = readPanelState();

  function defaultPanelState() {
    return { left: false, right: false, bottom: false };
  }

  function readPanelState() {
    try {
      const saved = JSON.parse(localStorage.getItem(PANEL_PREF_KEY) || "{}");
      const fallback = defaultPanelState();
      return Object.fromEntries(
        Object.keys(fallback).map((key) => [key, Boolean(saved[key])]),
      );
    } catch {
      return defaultPanelState();
    }
  }

  function savePanelState() {
    try {
      localStorage.setItem(PANEL_PREF_KEY, JSON.stringify(panelState));
    } catch {
      // Panel state is only a convenience preference.
    }
  }

  function applyPanelState(panel) {
    const element = ui.panels[panel];
    if (!element) return;
    const collapsed = Boolean(panelState[panel]);
    const button = element.querySelector("[data-rpg-panel-toggle]");
    element.classList.toggle("is-collapsed", collapsed);
    if (button) {
      const label = PANEL_LABELS[panel] || "패널";
      button.textContent = collapsed ? `${label} 펼치기` : `${label} 접기`;
      button.setAttribute("aria-expanded", String(!collapsed));
    }
  }

  function applyPanelStates() {
    Object.keys(PANEL_LABELS).forEach(applyPanelState);
  }

  function toggleInfoPanel(panel) {
    if (!Object.prototype.hasOwnProperty.call(panelState, panel)) return;
    panelState = { ...panelState, [panel]: !panelState[panel] };
    applyPanelState(panel);
    savePanelState();
  }

  applyPanelStates();

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
    greenHerb: {
      name: "루멘 약초",
      type: "material",
      price: 26,
      rarity: "common",
      desc: "초반 야영식과 회복 연금의 기본이 되는 싱그러운 약초입니다.",
    },
    tideKelp: {
      name: "조류 다시마",
      type: "material",
      price: 44,
      rarity: "common",
      desc: "항구와 습지의 물길에서 채집되는 MP 회복 재료입니다.",
    },
    mooncapMushroom: {
      name: "월갓 버섯",
      type: "material",
      price: 96,
      rarity: "rare",
      desc: "밤 사냥 전 집중력을 높이는 요리에 쓰이는 푸른 버섯입니다.",
    },
    emberPepper: {
      name: "잿불 고추",
      type: "material",
      price: 130,
      rarity: "rare",
      desc: "광산과 사막에서 자라 공격적인 야영식의 열기를 더합니다.",
    },
    frostLotus: {
      name: "설련",
      type: "material",
      price: 260,
      rarity: "epic",
      desc: "설원과 고지대에서 피는 방어 연금의 핵심 꽃입니다.",
    },
    riftBloom: {
      name: "균열화",
      type: "material",
      price: 420,
      rarity: "epic",
      desc: "균열에 물든 지역에서 드물게 피어 서약 전술을 증폭합니다.",
    },
    dawnGinseng: {
      name: "새벽 인삼",
      type: "material",
      price: 880,
      rarity: "legend",
      desc: "최후반 지역 채집으로 얻는 전설 야영식 재료입니다.",
    },
    fieldRation: {
      name: "야영 보급식",
      type: "food",
      heal: 80,
      price: 70,
      rarity: "common",
      buff: {
        duration: 360,
        stats: { xpGain: 0.025, healingPower: 0.04 },
      },
      desc: "짧은 사냥 전에 먹는 기본 보급식입니다. 경험치와 회복 효율이 오릅니다.",
    },
    hunterStew: {
      name: "사냥꾼 매운 스튜",
      type: "food",
      heal: 120,
      price: 180,
      rarity: "rare",
      buff: {
        duration: 480,
        stats: { atk: 8, basicDamage: 0.04 },
      },
      desc: "강적과 현상수배 표적을 추적할 때 먹는 공격형 야영식입니다.",
    },
    wardTea: {
      name: "수호 차",
      type: "food",
      mana: 80,
      price: 220,
      rarity: "rare",
      buff: {
        duration: 520,
        stats: { def: 8, damageReduce: 0.035 },
      },
      desc: "보스 예고 공격을 버티기 위해 마시는 방어형 차입니다.",
    },
    sageElixir: {
      name: "현자의 영약",
      type: "food",
      mana: 140,
      price: 420,
      rarity: "epic",
      buff: {
        duration: 600,
        stats: { skillDamage: 0.06, mpRegen: 0.75 },
      },
      desc: "서약 전술을 오래 굴리는 빌드를 위한 마력 영약입니다.",
    },
    dawnBanquet: {
      name: "새벽 만찬",
      type: "food",
      heal: 220,
      mana: 160,
      price: 980,
      rarity: "legend",
      buff: {
        duration: 900,
        stats: { atk: 10, def: 10, dropChance: 0.012, goldGain: 0.04 },
      },
      desc: "장기 균열 탐험과 후반 보스전을 위해 준비하는 전설 야영식입니다.",
    },
    oathSteel: {
      name: "서약 강철",
      type: "material",
      price: 95,
      rarity: "common",
      desc: "무기 강화에 쓰이는 기본 금속 재료입니다.",
    },
    guardianThread: {
      name: "수호 실타래",
      type: "material",
      price: 90,
      rarity: "common",
      desc: "방어구의 결계를 촘촘하게 묶는 강화 재료입니다.",
    },
    starDust: {
      name: "별가루",
      type: "material",
      price: 260,
      rarity: "rare",
      desc: "부적과 서약 장비의 힘을 깨우는 희귀 재료입니다.",
    },
    abyssCore: {
      name: "심연 핵",
      type: "material",
      price: 680,
      rarity: "epic",
      desc: "영웅 등급 이상 장비를 고강화할 때 필요한 응축 재료입니다.",
    },
    dawnPrism: {
      name: "새벽 프리즘",
      type: "material",
      price: 1450,
      rarity: "legend",
      desc: "전설 장비의 마지막 강화 단계에 쓰이는 빛의 결정입니다.",
    },
    mossRune: {
      name: "이끼 생명 각인",
      type: "rune",
      vit: 1,
      healingPower: 0.03,
      price: 360,
      rarity: "rare",
      desc: "밤이끼의 회복력을 장비 위에 새기는 초반 생존 각인입니다.",
    },
    huntRune: {
      name: "그늘 사냥 각인",
      type: "rune",
      agi: 2,
      basicDamage: 0.025,
      price: 520,
      rarity: "rare",
      desc: "빠른 기본 공격과 추격 플레이에 맞는 늑대 발톱 각인입니다.",
    },
    thornRune: {
      name: "가시 수호 각인",
      type: "rune",
      def: 3,
      damageReduce: 0.012,
      price: 620,
      rarity: "rare",
      desc: "근접 피해를 버티기 쉽게 만드는 방어형 각인입니다.",
    },
    tideRune: {
      name: "조류 마력 각인",
      type: "rune",
      wis: 2,
      mpRegen: 0.35,
      price: 920,
      rarity: "rare",
      desc: "서약 전술을 자주 쓰는 빌드에 어울리는 마력 각인입니다.",
    },
    emberRune: {
      name: "잿불 맹공 각인",
      type: "rune",
      atk: 5,
      str: 2,
      price: 1380,
      rarity: "epic",
      desc: "강한 한 방과 기본 공격 화력을 끌어올리는 붉은 각인입니다.",
    },
    frostRune: {
      name: "설휘 결계 각인",
      type: "rune",
      def: 4,
      wis: 1,
      damageReduce: 0.016,
      price: 1680,
      rarity: "epic",
      desc: "보스의 강한 패턴을 버티기 위한 설원 결계 각인입니다.",
    },
    eclipseRune: {
      name: "월식 탐색 각인",
      type: "rune",
      agi: 2,
      dropChance: 0.006,
      goldGain: 0.025,
      price: 2600,
      rarity: "epic",
      desc: "희귀 장비와 골드를 노리는 장기 파밍형 각인입니다.",
    },
    dawnRune: {
      name: "새벽 서약 각인",
      type: "rune",
      str: 1,
      vit: 1,
      wis: 1,
      agi: 1,
      skillDamage: 0.035,
      price: 6200,
      rarity: "legend",
      desc: "최후반 서약 전술 피해와 모든 기본 능력을 보정하는 전설 각인입니다.",
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
      price: 5200,
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
      price: 2300,
      rarity: "epic",
      desc: "오래 버틴 서약자에게만 반응하는 망토입니다.",
    },
    greenSigil: {
      name: "녹음 인장",
      type: "charm",
      vit: 2,
      price: 620,
      rarity: "rare",
      desc: "숲의 생명력으로 방어와 체력을 보조합니다.",
    },
    tideCharm: {
      name: "푸른 조류 부적",
      type: "charm",
      wis: 2,
      price: 960,
      rarity: "rare",
      desc: "MP 회복과 서약기 운용을 돕는 항구의 부적입니다.",
    },
    emberCore: {
      name: "잿불 핵",
      type: "charm",
      str: 2,
      price: 1180,
      rarity: "epic",
      desc: "기본 공격의 체감 화력을 끌어올립니다.",
    },
    snowSigil: {
      name: "설휘 각인",
      type: "charm",
      def: 4,
      wis: 1,
      price: 1780,
      rarity: "epic",
      desc: "강한 보스전에서 버티기 쉬운 방어형 부적입니다.",
    },
    eclipseRing: {
      name: "월식 반지",
      type: "charm",
      atk: 8,
      agi: 2,
      price: 3200,
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
      price: 9000,
      rarity: "legend",
      desc: "모든 장을 관통하는 최종 보상 성물입니다.",
    },
    rangerSaber: {
      name: "숲지기 곡검",
      type: "weapon",
      atk: 13,
      agi: 1,
      price: 520,
      rarity: "rare",
      desc: "숲길 정찰대가 쓰는 빠른 곡검입니다.",
    },
    tideSpear: {
      name: "조류 장창",
      type: "weapon",
      atk: 24,
      wis: 1,
      price: 1120,
      rarity: "rare",
      desc: "항구 전투에 맞춘 긴 사거리의 창입니다.",
    },
    basaltAegis: {
      name: "현무암 견갑",
      type: "armor",
      def: 22,
      vit: 2,
      price: 1380,
      rarity: "epic",
      desc: "광산 열기에도 버티는 묵직한 방어구입니다.",
    },
    silverWard: {
      name: "은빛 결계복",
      type: "armor",
      def: 33,
      wis: 2,
      price: 2380,
      rarity: "epic",
      desc: "망령의 일격을 흘리는 의식용 갑주입니다.",
    },
    dawnPlate: {
      name: "새벽 판금갑",
      type: "armor",
      def: 44,
      vit: 3,
      wis: 1,
      price: 4200,
      rarity: "legend",
      desc: "최후반 결계전에 맞춘 상점제 전설 방어구입니다.",
    },
    oathThread: {
      name: "서약 매듭끈",
      type: "charm",
      wis: 1,
      agi: 1,
      price: 430,
      rarity: "rare",
      desc: "초반 서약기와 회피 운용을 돕는 부적입니다.",
    },
    slimeCrown: {
      name: "밤이끼 왕관",
      type: "charm",
      vit: 1,
      wis: 1,
      price: 0,
      rarity: "rare",
      desc: "밤이끼 슬라임이 낮은 확률로 남기는 말랑한 왕관입니다.",
    },
    wolfClaw: {
      name: "그늘 발톱검",
      type: "weapon",
      atk: 10,
      agi: 2,
      price: 0,
      rarity: "rare",
      desc: "그늘 늑대의 발톱을 덧댄 짧은 검입니다.",
    },
    thornMantle: {
      name: "가시 망토",
      type: "armor",
      def: 13,
      vit: 2,
      price: 0,
      rarity: "rare",
      desc: "가시 망령의 잔가지가 엮인 방어구입니다.",
    },
    raiderCutlass: {
      name: "약탈자 커틀러스",
      type: "weapon",
      atk: 17,
      str: 1,
      agi: 1,
      price: 0,
      rarity: "rare",
      desc: "항구 약탈자가 애용하는 넓은 곡도입니다.",
    },
    mistVeil: {
      name: "안개 장막복",
      type: "armor",
      def: 12,
      wis: 3,
      price: 0,
      rarity: "rare",
      desc: "안개 혼령의 결을 붙잡아 만든 가벼운 의복입니다.",
    },
    golemCoreGuard: {
      name: "골렘 핵갑",
      type: "armor",
      def: 25,
      str: 2,
      price: 0,
      rarity: "epic",
      desc: "잿불 골렘의 핵 조각이 박힌 튼튼한 갑주입니다.",
    },
    wraithLantern: {
      name: "망령 등불",
      type: "charm",
      def: 3,
      wis: 3,
      price: 0,
      rarity: "epic",
      desc: "설원 망령의 한기가 깃든 푸른 등불입니다.",
    },
    knightOathblade: {
      name: "성채 맹세검",
      type: "weapon",
      atk: 34,
      def: 4,
      price: 0,
      rarity: "epic",
      desc: "검은 성채 기사의 맹세문이 새겨진 대검입니다.",
    },
    shadeBand: {
      name: "월식 고리",
      type: "charm",
      atk: 7,
      agi: 3,
      price: 4100,
      rarity: "epic",
      desc: "월식의 그림자가 남긴 검은 반지입니다.",
    },
    archonHalo: {
      name: "별집행 후광검",
      type: "weapon",
      atk: 48,
      wis: 3,
      price: 6500,
      rarity: "legend",
      desc: "별을 삼킨 집행자의 후광을 검날로 굳힌 전설 무기입니다.",
    },
    stalkerVeil: {
      name: "심연 추적자의 베일",
      type: "armor",
      def: 18,
      agi: 2,
      price: 0,
      rarity: "epic",
      desc: "심연 추적자의 기척을 감춘 베일입니다.",
    },
    duelistRapier: {
      name: "황혼 결투검",
      type: "weapon",
      atk: 31,
      agi: 3,
      price: 0,
      rarity: "epic",
      desc: "황혼 결투사가 쓰던 날렵한 찌르기 검입니다.",
    },
    sirenPearl: {
      name: "폭풍 진주",
      type: "charm",
      wis: 4,
      agi: 1,
      price: 3800,
      rarity: "epic",
      desc: "폭풍 세이렌의 노래가 잠긴 진주입니다.",
    },
    automatonGear: {
      name: "흑요 태엽갑",
      type: "armor",
      def: 31,
      str: 1,
      vit: 2,
      price: 0,
      rarity: "epic",
      desc: "흑요 자동인형의 태엽 장갑을 이어 만든 갑주입니다.",
    },
    alchemistBand: {
      name: "연금술사의 문장띠",
      type: "charm",
      atk: 5,
      wis: 4,
      price: 3600,
      rarity: "epic",
      desc: "서약기 위력을 끌어올리는 연금 문장입니다.",
    },
    sentinelPlate: {
      name: "성좌 감시자 흉갑",
      type: "armor",
      def: 40,
      vit: 3,
      price: 5400,
      rarity: "legend",
      desc: "성좌 감시자의 별무늬 판금 흉갑입니다.",
    },
    seraphFeather: {
      name: "별비 깃장식",
      type: "charm",
      atk: 6,
      wis: 2,
      agi: 3,
      price: 0,
      rarity: "legend",
      desc: "별비 세라프가 떨어뜨리는 희귀한 깃장식입니다.",
    },
    voidCrown: {
      name: "공허관",
      type: "charm",
      atk: 12,
      def: 8,
      wis: 3,
      price: 7600,
      rarity: "legend",
      desc: "무저갱 괴수의 중심핵이 왕관처럼 굳은 성물입니다.",
    },
    verdantOathEdge: {
      name: "녹음 서약검",
      type: "weapon",
      atk: 26,
      vit: 2,
      agi: 2,
      basicDamage: 0.04,
      price: 0,
      rarity: "epic",
      desc: "초록숲과 루멘 성소의 재료를 맞물려 만든 공방 전용 검입니다.",
    },
    wardkeeperHarness: {
      name: "수호대 전투갑",
      type: "armor",
      def: 29,
      vit: 3,
      damageReduce: 0.025,
      price: 0,
      rarity: "epic",
      desc: "성소 병영의 결계술을 실전형 판갑에 엮은 제작 방어구입니다.",
    },
    tideglassVow: {
      name: "조류유리 맹세부적",
      type: "charm",
      def: 3,
      wis: 4,
      mpRegen: 0.45,
      price: 0,
      rarity: "epic",
      desc: "항구의 기억 조각과 별가루를 녹여 만든 서약 부적입니다.",
    },
    riftbreakerGreatsword: {
      name: "균열파쇄 대검",
      type: "weapon",
      atk: 52,
      str: 4,
      skillDamage: 0.045,
      price: 0,
      rarity: "legend",
      desc: "균열 기록과 심연 핵을 단조해 수호자 보스전에 맞춘 전설 대검입니다.",
    },
    dawnweaveMantle: {
      name: "새벽직조 망토갑",
      type: "armor",
      def: 47,
      vit: 3,
      wis: 2,
      healingPower: 0.06,
      price: 0,
      rarity: "legend",
      desc: "새벽 프리즘과 수호 실타래를 층층이 직조한 장기 여정용 갑옷입니다.",
    },
    oathsmithSeal: {
      name: "서약공 장인 인장",
      type: "charm",
      atk: 9,
      def: 7,
      str: 2,
      wis: 2,
      dropChance: 0.012,
      price: 0,
      rarity: "legend",
      desc: "공방의 모든 제작식을 증명한 장인이 지니는 전설 인장입니다.",
    },
  };

  const RARITY = {
    common: { label: "일반", color: "#a8bdd5" },
    rare: { label: "희귀", color: "#48a5ff" },
    epic: { label: "영웅", color: "#d08cff" },
    legend: { label: "전설", color: "#f8f871" },
  };

  const EQUIPMENT_SETS = [
    {
      id: "oathguard",
      name: "서약 수호 세트",
      color: "#53e2a8",
      items: ["ironBlade", "guardCoat", "runeMail", "greenSigil", "oathThread"],
      bonuses: [
        { count: 2, text: "방어 +4, 체력 +2", stats: { def: 4, vit: 2 } },
        {
          count: 3,
          text: "피해 감소 +6%, MP 회복 +0.8",
          stats: { damageReduce: 0.06, mpRegen: 0.8 },
        },
      ],
    },
    {
      id: "tidecaller",
      name: "조류술사 세트",
      color: "#42d7ff",
      items: ["tideSpear", "tideCharm", "mistVeil", "sirenPearl"],
      bonuses: [
        { count: 2, text: "지혜 +3, 민첩 +1", stats: { wis: 3, agi: 1 } },
        {
          count: 3,
          text: "서약기 비용 -5, 재사용 -0.35초",
          stats: { skillCost: 5, skillCd: 0.35 },
        },
      ],
    },
    {
      id: "emberforge",
      name: "잿불 단조 세트",
      color: "#ffba5a",
      items: ["emberBlade", "emberCore", "basaltAegis", "golemCoreGuard"],
      bonuses: [
        { count: 2, text: "공격 +8, 힘 +2", stats: { atk: 8, str: 2 } },
        {
          count: 3,
          text: "기본 공격 피해 +8%, 장비 드롭률 +1.2%",
          stats: { basicDamage: 0.08, dropChance: 0.012 },
        },
      ],
    },
    {
      id: "eclipseshade",
      name: "월식 그림자 세트",
      color: "#d08cff",
      items: [
        "wolfClaw",
        "shadeBand",
        "stalkerVeil",
        "eclipseRing",
        "voidCrown",
      ],
      bonuses: [
        { count: 2, text: "민첩 +3, 공격 +5", stats: { agi: 3, atk: 5 } },
        {
          count: 3,
          text: "경험치 +6%, 골드 +6%",
          stats: { xpGain: 0.06, goldGain: 0.06 },
        },
      ],
    },
    {
      id: "dawnarchon",
      name: "새벽 집행자 세트",
      color: "#f8f871",
      items: [
        "starforgedBlade",
        "dawnPlate",
        "dawnRelic",
        "seraphFeather",
        "archonHalo",
        "sentinelPlate",
      ],
      bonuses: [
        {
          count: 2,
          text: "모든 기본 스탯 +2",
          stats: { str: 2, vit: 2, wis: 2, agi: 2 },
        },
        {
          count: 3,
          text: "서약기 피해 +12%, 피해 감소 +8%",
          stats: { skillDamage: 0.12, damageReduce: 0.08 },
        },
      ],
    },
    {
      id: "oathsmith",
      name: "서약 공방 세트",
      color: "#ffba5a",
      items: [
        "verdantOathEdge",
        "wardkeeperHarness",
        "tideglassVow",
        "riftbreakerGreatsword",
        "dawnweaveMantle",
        "oathsmithSeal",
      ],
      bonuses: [
        {
          count: 2,
          text: "공격 +6, 방어 +6, 장비 드롭률 +0.8%",
          stats: { atk: 6, def: 6, dropChance: 0.008 },
        },
        {
          count: 3,
          text: "기본 공격 피해 +7%, 서약기 피해 +7%, 피해 감소 +4%",
          stats: {
            basicDamage: 0.07,
            skillDamage: 0.07,
            damageReduce: 0.04,
          },
        },
      ],
    },
  ];

  const CRAFTING_RECIPES = [
    {
      id: "expedition_tonics",
      name: "원정 보급 묶음",
      desc: "긴 사냥과 균열 탐험 전에 회복약과 마나 이슬을 강장제로 정제합니다.",
      output: "oathTonic",
      outputCount: 2,
      gold: 180,
      materials: { smallPotion: 2, manaDew: 1, starDust: 1 },
      unlock: { questIndex: 4 },
    },
    {
      id: "verdant_oath_edge",
      name: "녹음 서약검 단조",
      desc: "초반 지역을 다시 안정화하며 얻은 재료로 빠른 전투용 검을 제작합니다.",
      output: "verdantOathEdge",
      gold: 920,
      materials: { oathSteel: 6, starDust: 2 },
      unlock: { questIndex: 8, stability: { lumen: 25 } },
      unique: true,
    },
    {
      id: "wardkeeper_harness",
      name: "수호대 전투갑 재단",
      desc: "성소 수호 병영의 결계 실타래를 전투갑으로 엮습니다.",
      output: "wardkeeperHarness",
      gold: 1260,
      materials: { guardianThread: 8, starDust: 3 },
      unlock: { questIndex: 14, sanctuary: { wardens: 1 } },
      unique: true,
    },
    {
      id: "tideglass_vow",
      name: "조류유리 맹세부적 세공",
      desc: "항구와 습지의 기억을 부적에 새겨 서약기 운용을 보완합니다.",
      output: "tideglassVow",
      gold: 1620,
      materials: { starDust: 6, abyssCore: 1 },
      unlock: { questIndex: 22, memories: 8 },
      unique: true,
    },
    {
      id: "rune_cache",
      name: "각인 보관함 조율",
      desc: "몬스터 각인 연구를 바탕으로 희귀 각인을 하나 더 엮습니다.",
      output: "eclipseRune",
      gold: 2400,
      materials: { starDust: 8, abyssCore: 2 },
      unlock: { questIndex: 34, runes: 3 },
    },
    {
      id: "riftbreaker_greatsword",
      name: "균열파쇄 대검 단조",
      desc: "균열 층을 돌파한 기록과 심연 핵을 합쳐 수호자용 대검을 만듭니다.",
      output: "riftbreakerGreatsword",
      gold: 5200,
      materials: { oathSteel: 14, abyssCore: 5 },
      unlock: { questIndex: 42, expeditions: 2, sanctuary: { forge: 2 } },
      unique: true,
    },
    {
      id: "dawnweave_mantle",
      name: "새벽직조 망토갑 직조",
      desc: "후반 지역의 새벽 프리즘을 수호 실타래와 겹쳐 전설 방어구로 만듭니다.",
      output: "dawnweaveMantle",
      gold: 6400,
      materials: { guardianThread: 16, abyssCore: 4, dawnPrism: 1 },
      unlock: { questIndex: 56, chronicles: 24, sanctuary: { dawnaltar: 1 } },
      unique: true,
    },
    {
      id: "oathsmith_seal",
      name: "서약공 장인 인장 완성",
      desc: "제작 장비, 기억, 연대기, 성소 재건을 한 인장에 모아 최종 제작 목표를 완성합니다.",
      output: "oathsmithSeal",
      gold: 9200,
      materials: { starDust: 18, abyssCore: 6, dawnPrism: 2 },
      unlock: {
        questIndex: 68,
        memories: 24,
        chronicles: 36,
        crafted: 5,
        sanctuaryTotal: 12,
      },
      unique: true,
    },
  ];

  const ALCHEMY_RECIPES = [
    {
      id: "field_ration",
      name: "야영 보급식 조리",
      desc: "채집한 루멘 약초를 회복약과 함께 말려 짧은 사냥용 보급식으로 만듭니다.",
      output: "fieldRation",
      outputCount: 2,
      gold: 45,
      materials: { greenHerb: 2, smallPotion: 1 },
      unlock: {},
    },
    {
      id: "hunter_stew",
      name: "사냥꾼 매운 스튜",
      desc: "잿불 고추와 월갓 버섯으로 현상수배와 강적 사냥 전에 먹는 공격식을 끓입니다.",
      output: "hunterStew",
      outputCount: 1,
      gold: 160,
      materials: { greenHerb: 2, emberPepper: 1, mooncapMushroom: 1 },
      unlock: { questIndex: 8 },
    },
    {
      id: "ward_tea",
      name: "수호 차 우림",
      desc: "조류 다시마와 설련을 우려 보스 예고 공격을 버티는 방어 차를 만듭니다.",
      output: "wardTea",
      outputCount: 1,
      gold: 220,
      materials: { tideKelp: 3, frostLotus: 1, manaDew: 1 },
      unlock: { questIndex: 18, stability: { greenwood: 25 } },
    },
    {
      id: "sage_elixir",
      name: "현자의 영약 정제",
      desc: "균열화와 별가루를 정제해 서약 전술 운용 시간을 늘리는 영약을 만듭니다.",
      output: "sageElixir",
      outputCount: 1,
      gold: 520,
      materials: { riftBloom: 2, starDust: 3, mooncapMushroom: 2 },
      unlock: { questIndex: 34, chronicles: 10 },
    },
    {
      id: "dawn_banquet",
      name: "새벽 만찬 준비",
      desc: "새벽 인삼, 균열화, 프리즘을 장기 원정용 전설 만찬으로 완성합니다.",
      output: "dawnBanquet",
      outputCount: 1,
      gold: 1280,
      materials: { dawnGinseng: 2, riftBloom: 3, dawnPrism: 1 },
      unlock: { questIndex: 58, expeditions: 2, memories: 20 },
    },
  ];

  const FORAGE_NODE_TYPES = {
    herb: {
      label: "약초 군락",
      color: "#53e2a8",
      cooldown: 300,
    },
    ore: {
      label: "광물 더미",
      color: "#a8bdd5",
      cooldown: 420,
    },
    relic: {
      label: "유적 화초",
      color: "#d08cff",
      cooldown: 540,
    },
  };

  const OATH_ARTS = [
    {
      id: "cleave",
      key: "K",
      name: "서약 참격",
      unlock: 0,
      cost: 36,
      cooldown: 5.5,
      minCooldown: 2.6,
      range: 180,
      arc: 1.35,
      multiplier: 2.4,
      color: "#d08cff",
      desc: "전방 넓은 범위를 베어 여러 적을 동시에 타격합니다.",
    },
    {
      id: "spear",
      key: "2",
      name: "별빛 투창",
      unlock: 2,
      cost: 46,
      cooldown: 7.2,
      minCooldown: 3.2,
      range: 390,
      arc: 0.32,
      multiplier: 3.35,
      color: "#48a5ff",
      effectKind: "line",
      desc: "긴 직선 궤적으로 멀리 있는 강적을 꿰뚫습니다.",
    },
    {
      id: "ward",
      key: "3",
      name: "수호 결계",
      unlock: 4,
      cost: 42,
      cooldown: 10.5,
      minCooldown: 5.8,
      range: 160,
      arc: Math.PI,
      multiplier: 1.45,
      color: "#53e2a8",
      effectKind: "ring",
      shield: 2.2,
      desc: "주변 적을 밀어내며 짧은 보호막과 무적 시간을 얻습니다.",
    },
    {
      id: "rupture",
      key: "4",
      name: "균열 폭쇄",
      unlock: 7,
      cost: 58,
      cooldown: 13.5,
      minCooldown: 7.2,
      range: 230,
      arc: Math.PI,
      multiplier: 2.05,
      color: "#ffba5a",
      effectKind: "burst",
      slow: 1.6,
      desc: "주변 균열을 터뜨려 넓은 범위에 큰 피해와 둔화를 줍니다.",
    },
  ];

  const COMPANIONS = [
    {
      id: "lia",
      name: "리아",
      role: "루멘 기록관",
      color: "#f8f871",
      accent: "#53e2a8",
      unlockQuest: 0,
      range: 360,
      cooldown: 2.8,
      damage: 0.42,
      stats: { xpGain: 0.02, wis: 1 },
      growth: { xpGain: 0.001, wis: 0.15 },
      story:
        "사라진 영웅들의 이름을 기록하며 서약자의 여정을 처음부터 따라옵니다.",
      passive: "경험치 획득과 지혜를 조금 올립니다.",
    },
    {
      id: "bran",
      name: "브란",
      role: "회색 방패",
      color: "#48a5ff",
      accent: "#a8bdd5",
      unlockQuest: 12,
      range: 150,
      cooldown: 3.3,
      damage: 0.56,
      melee: true,
      stats: { def: 3, damageReduce: 0.025 },
      growth: { def: 0.35, damageReduce: 0.001 },
      story: "몰락한 성채의 방패병으로, 강적의 돌진을 막는 데 익숙합니다.",
      passive: "방어와 피해 감소를 올립니다.",
    },
    {
      id: "sera",
      name: "세라",
      role: "조류 사제",
      color: "#53e2a8",
      accent: "#42d7ff",
      unlockQuest: 28,
      range: 310,
      cooldown: 7.4,
      damage: 0.34,
      heal: 86,
      stats: { mpRegen: 0.55, vit: 1 },
      growth: { mpRegen: 0.025, vit: 0.12 },
      story:
        "항구의 조류 성소를 지키던 사제로, 위험한 전투 중 회복을 돕습니다.",
      passive: "MP 회복과 체력을 올리고, 전투 중 낮은 체력을 회복합니다.",
    },
    {
      id: "kael",
      name: "카엘",
      role: "잿불 사냥꾼",
      color: "#ffba5a",
      accent: "#ff5f6d",
      unlockQuest: 44,
      range: 390,
      cooldown: 2.45,
      damage: 0.5,
      stats: { atk: 5, dropChance: 0.006 },
      growth: { atk: 0.45, dropChance: 0.0003 },
      story: "잿불 단조장에서 괴수의 흔적을 추적하던 사냥꾼입니다.",
      passive: "공격과 장비 드롭률을 올립니다.",
    },
    {
      id: "nyx",
      name: "닉스",
      role: "월식 정찰자",
      color: "#d08cff",
      accent: "#111827",
      unlockQuest: 60,
      range: 430,
      cooldown: 2.15,
      damage: 0.54,
      stats: { agi: 2, goldGain: 0.035 },
      growth: { agi: 0.18, goldGain: 0.0012 },
      story:
        "월식림의 그림자 길을 아는 정찰자로, 후반 지역에서 빠른 교전을 돕습니다.",
      passive: "민첩과 골드 획득량을 올립니다.",
    },
  ];

  const COMPANION_MISSION_STAGES = [
    {
      companion: "lia",
      stages: [
        {
          key: "names",
          title: "사라진 이름 대조",
          desc: "리아와 함께 기억 조각을 대조해 영웅서기의 빈 이름을 복원합니다.",
          goal: "기억 조각 4개 수집",
          required: 4,
          progress: () => collectedMemoryCount(),
          stats: { xpGain: 0.01, wis: 0.4 },
          reward: { xp: 420, gold: 180, item: "starDust" },
        },
        {
          key: "index",
          title: "지역 색인 정리",
          desc: "각 지역 연대기를 엮어 다음 장의 숨은 근거를 찾습니다.",
          goal: "지역 연대기 6개 완료",
          required: 6,
          progress: () => claimedChronicleCount(),
          stats: { xpGain: 0.015, skillDamage: 0.012 },
          reward: { xp: 720, gold: 260, item: "abyssCore" },
        },
        {
          key: "choice",
          title: "결의의 원문",
          desc: "완료한 장의 결의를 기록해 영웅서기의 주석을 완성합니다.",
          goal: "서약 결의 6개 선택",
          required: 6,
          progress: () => totalOathDecisionCount(),
          stats: { wis: 1, xpGain: 0.02, skillDamage: 0.018 },
          reward: { xp: 1180, gold: 420, item: "dawnPrism", renown: 2 },
        },
      ],
    },
    {
      companion: "bran",
      stages: [
        {
          key: "shieldline",
          title: "회색 방패선",
          desc: "브란과 전선을 정리해 성소로 이어지는 방패선을 복구합니다.",
          goal: "몬스터 120마리 처치",
          required: 120,
          progress: () => totalBestiaryKills(),
          stats: { def: 1.5, damageReduce: 0.006 },
          reward: { xp: 520, gold: 220, item: "guardianThread" },
        },
        {
          key: "wanted",
          title: "방패 현상수배",
          desc: "위험 표적의 공격 방식을 분석해 브란의 방어 반격을 강화합니다.",
          goal: "현상수배 5회 완료",
          required: 5,
          progress: () => totalBountyClaims(),
          stats: { def: 2, vit: 0.8 },
          reward: { xp: 840, gold: 360, item: "oathSteel", itemCount: 2 },
        },
        {
          key: "citadel",
          title: "성소 방벽 재건",
          desc: "성소 시설을 되살려 브란이 지킬 수 있는 실제 방어 거점을 세웁니다.",
          goal: "성소 재건 합계 10단계",
          required: 10,
          progress: () => sanctuaryTotalLevel(),
          stats: { def: 3, damageReduce: 0.012, healingPower: 0.012 },
          reward: { xp: 1260, gold: 520, item: "dawnPrism", renown: 2 },
        },
      ],
    },
    {
      companion: "sera",
      stages: [
        {
          key: "herbs",
          title: "조류 약초 지도",
          desc: "세라와 야영 보급을 정리해 보스전 전 준비 루프를 안정화합니다.",
          goal: "채집 20회 완료",
          required: 20,
          progress: () => totalForageHarvests(),
          stats: { healingPower: 0.018, mpRegen: 0.12 },
          reward: { xp: 500, gold: 170, item: "greenHerb", itemCount: 3 },
        },
        {
          key: "camp",
          title: "회복 야영식",
          desc: "연금과 야영식 기록을 쌓아 장기 탐험 중 회복 효율을 높입니다.",
          goal: "연금/요리 10회 제작",
          required: 10,
          progress: () => totalAlchemyBrews(),
          stats: { healingPower: 0.025, vit: 0.6 },
          reward: { xp: 780, gold: 260, item: "wardTea" },
        },
        {
          key: "vows",
          title: "주민을 위한 기도",
          desc: "지역 주민의 후일담을 세라와 정리해 회복 서약의 의미를 남깁니다.",
          goal: "외전 기록 8개 완료",
          required: 8,
          progress: () => claimedSideStoryCount(),
          stats: { mpRegen: 0.28, healingPower: 0.035, xpGain: 0.01 },
          reward: { xp: 1120, gold: 410, item: "dawnGinseng", renown: 2 },
        },
      ],
    },
    {
      companion: "kael",
      stages: [
        {
          key: "tracks",
          title: "정예 흔적 추적",
          desc: "카엘과 정예의 발자국을 추적해 같은 필드 전투의 변수를 읽습니다.",
          goal: "정예 몬스터 15마리 처치",
          required: 15,
          progress: () => totalEliteKills(),
          stats: { atk: 1.8, dropChance: 0.002 },
          reward: { xp: 760, gold: 320, item: "oathSteel", itemCount: 2 },
        },
        {
          key: "arsenal",
          title: "전설 사냥감",
          desc: "희귀 장비 수집을 카엘의 사냥 기록으로 남겨 전리품 감각을 끌어올립니다.",
          goal: "전설 장비 1개 보유",
          required: 1,
          progress: () => ownedLegendaryEquipmentCount(),
          stats: { atk: 2.4, dropChance: 0.004 },
          reward: { xp: 1040, gold: 520, item: "starDust", itemCount: 2 },
        },
        {
          key: "mastery",
          title: "무구 사냥술",
          desc: "여러 장비를 오래 다뤄 카엘과 함께 장비별 사냥 방식을 체득합니다.",
          goal: "장비 숙련 총합 18",
          required: 18,
          progress: () => totalGearMasteryLevel(),
          stats: { atk: 3.2, basicDamage: 0.022, dropChance: 0.005 },
          reward: { xp: 1460, gold: 680, item: "abyssCore", renown: 2 },
        },
      ],
    },
    {
      companion: "nyx",
      stages: [
        {
          key: "riftstep",
          title: "그림자 균열 답사",
          desc: "닉스와 균열 길을 표시해 후반 지역의 이동 판단을 빠르게 만듭니다.",
          goal: "균열 정복 기록 2개",
          required: 2,
          progress: () => (state.expeditionLog || []).length,
          stats: { agi: 0.8, goldGain: 0.01 },
          reward: { xp: 900, gold: 420, item: "abyssCore" },
        },
        {
          key: "signals",
          title: "돌발 신호 해독",
          desc: "지역 돌발 사건의 신호를 정리해 빠른 판단과 보상 회수를 돕습니다.",
          goal: "지역 돌발 사건 6회 해결",
          required: 6,
          progress: () => (state.worldEventLog || []).length,
          stats: { agi: 1.2, goldGain: 0.016, dropChance: 0.002 },
          reward: { xp: 1180, gold: 560, item: "riftBloom", itemCount: 2 },
        },
        {
          key: "deepmap",
          title: "월식 심층 지도",
          desc: "후반 지역의 외전과 균열 기록을 하나로 엮어 닉스의 정찰망을 완성합니다.",
          goal: "외전 기록 16개 완료",
          required: 16,
          progress: () => claimedSideStoryCount(),
          stats: { agi: 1.8, goldGain: 0.022, skillDamage: 0.018 },
          reward: { xp: 1680, gold: 780, item: "dawnPrism", renown: 3 },
        },
      ],
    },
  ];

  const COMPANION_MISSIONS = COMPANION_MISSION_STAGES.flatMap((group) =>
    group.stages.map((stage, index) => ({
      ...stage,
      id: `${group.companion}_${stage.key}`,
      companion: group.companion,
      stage: index + 1,
    })),
  );

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
    "shadeBand",
    "duelistRapier",
    "stalkerVeil",
    "sirenPearl",
    "automatonGear",
    "alchemistBand",
    "sentinelPlate",
    "seraphFeather",
    "voidCrown",
    "archonHalo",
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
      npc: [
        { id: "rien", name: "리엔", role: "숲 파수꾼", x: 530, y: 640 },
        {
          id: "lya",
          name: "리아",
          role: "순찰 보급관",
          x: 910,
          y: 820,
          shop: "ranger",
        },
      ],
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
      npc: [
        { id: "kael", name: "카엘", role: "선장", x: 760, y: 820 },
        {
          id: "narin",
          name: "나린",
          role: "항구 무기상",
          x: 1120,
          y: 760,
          shop: "harbor",
        },
      ],
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
      npc: [
        { id: "oran", name: "오란", role: "광부장", x: 620, y: 760 },
        {
          id: "bram",
          name: "브람",
          role: "광산 장비상",
          x: 1000,
          y: 980,
          shop: "miner",
        },
      ],
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
      npc: [
        { id: "iyun", name: "이윤", role: "유배 기사", x: 640, y: 820 },
        {
          id: "sova",
          name: "소바",
          role: "설휘 장인",
          x: 1080,
          y: 860,
          shop: "winter",
        },
      ],
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
      npc: [
        { id: "seren", name: "세렌", role: "왕실 기록관", x: 760, y: 760 },
        {
          id: "karel",
          name: "카렐",
          role: "성채 보급관",
          x: 1140,
          y: 920,
          shop: "relic",
        },
      ],
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
      npc: [
        { id: "avel", name: "아벨", role: "흑월 추적자", x: 820, y: 920 },
        {
          id: "ven",
          name: "벤",
          role: "월식 밀상",
          x: 1180,
          y: 1040,
          shop: "eclipseShop",
        },
      ],
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
      npc: [
        { id: "noa", name: "노아", role: "잊힌 영웅", x: 620, y: 820 },
        {
          id: "iora",
          name: "이오라",
          role: "기원 장비상",
          x: 980,
          y: 1060,
          shop: "originForge",
        },
      ],
      portals: [
        { to: "eclipse", x: 200, y: 1280, label: "월식 협곡" },
        { to: "duskbazaar", x: 3020, y: 1320, label: "황혼 시장" },
      ],
    },
    {
      id: "duskbazaar",
      name: "황혼 시장",
      subtitle: "닫힌 장막 아래 정보와 검이 거래되는 도시",
      w: 3900,
      h: 2500,
      floor: ["#241b2d", "#3d273d", "#51384a"],
      accent: "#ff9f6e",
      enemies: ["duelist", "raider"],
      npc: [
        { id: "hayan", name: "하얀", role: "시장 정보상", x: 720, y: 820 },
        {
          id: "pavo",
          name: "파보",
          role: "황혼 무기상",
          x: 1160,
          y: 980,
          shop: "bazaar",
        },
      ],
      portals: [
        { to: "origin", x: 240, y: 1260, label: "기원의 탑" },
        { to: "deepgrove", x: 3620, y: 1180, label: "심연 숲" },
      ],
    },
    {
      id: "deepgrove",
      name: "심연 숲",
      subtitle: "나무뿌리가 오래된 죄를 붙잡은 숲",
      w: 4100,
      h: 2700,
      floor: ["#0b241e", "#173525", "#28402b"],
      accent: "#7cff9b",
      enemies: ["stalker", "thorn"],
      npc: [{ id: "maeil", name: "매일", role: "심연 숲지기", x: 680, y: 880 }],
      portals: [
        { to: "duskbazaar", x: 260, y: 1350, label: "황혼 시장" },
        { to: "stormcliff", x: 3820, y: 1420, label: "폭풍 절벽" },
      ],
    },
    {
      id: "stormcliff",
      name: "폭풍 절벽",
      subtitle: "번개와 파도가 전장을 갈라놓는 절벽",
      w: 4200,
      h: 2600,
      floor: ["#10283d", "#1c4d66", "#2f6678"],
      accent: "#69dcff",
      enemies: ["siren", "mist"],
      npc: [
        { id: "rude", name: "루드", role: "절벽 파수꾼", x: 760, y: 900 },
        {
          id: "sella",
          name: "셀라",
          role: "폭풍 보급상",
          x: 1180,
          y: 1040,
          shop: "storm",
        },
      ],
      portals: [
        { to: "deepgrove", x: 260, y: 1280, label: "심연 숲" },
        { to: "obsidianLab", x: 3920, y: 1180, label: "흑요 연구소" },
      ],
    },
    {
      id: "obsidianLab",
      name: "흑요 연구소",
      subtitle: "태엽과 주문이 같은 박자로 울리는 폐쇄 구역",
      w: 4300,
      h: 2800,
      floor: ["#171c24", "#232c38", "#343248"],
      accent: "#b987ff",
      enemies: ["automaton", "alchemist"],
      npc: [
        { id: "eden", name: "에덴", role: "추방 연금술사", x: 740, y: 920 },
      ],
      portals: [
        { to: "stormcliff", x: 280, y: 1420, label: "폭풍 절벽" },
        { to: "astralLibrary", x: 3980, y: 1320, label: "성좌 서고" },
      ],
    },
    {
      id: "astralLibrary",
      name: "성좌 서고",
      subtitle: "책장이 별자리처럼 떠다니는 금지 서고",
      w: 4300,
      h: 2900,
      floor: ["#111827", "#232040", "#334155"],
      accent: "#f8f871",
      enemies: ["alchemist", "sentinel"],
      npc: [
        { id: "lias", name: "리아스", role: "성좌 사서", x: 780, y: 940 },
        {
          id: "morden",
          name: "모르덴",
          role: "서고 장비상",
          x: 1240,
          y: 1080,
          shop: "library",
        },
      ],
      portals: [
        { to: "obsidianLab", x: 280, y: 1480, label: "흑요 연구소" },
        { to: "duskcapital", x: 4020, y: 1380, label: "황혼 왕도" },
      ],
    },
    {
      id: "duskcapital",
      name: "황혼 왕도",
      subtitle: "왕관 없는 성벽과 꺼지지 않는 붉은 등",
      w: 4500,
      h: 3000,
      floor: ["#281d2f", "#3f2437", "#56334d"],
      accent: "#ff6d8f",
      enemies: ["sentinel", "duelist"],
      npc: [
        { id: "arhan", name: "아르한", role: "왕도 망명자", x: 820, y: 960 },
      ],
      portals: [
        { to: "astralLibrary", x: 300, y: 1540, label: "성좌 서고" },
        { to: "starfallGarden", x: 4180, y: 1460, label: "별비 정원" },
      ],
    },
    {
      id: "starfallGarden",
      name: "별비 정원",
      subtitle: "떨어진 별빛이 꽃잎처럼 쌓인 정원",
      w: 4400,
      h: 3000,
      floor: ["#142035", "#243a52", "#3b4167"],
      accent: "#d8f7ff",
      enemies: ["seraph", "shade"],
      npc: [{ id: "yura", name: "유라", role: "별비 수호자", x: 780, y: 920 }],
      portals: [
        { to: "duskcapital", x: 280, y: 1480, label: "황혼 왕도" },
        { to: "abyssGate", x: 4100, y: 1380, label: "무저갱 관문" },
      ],
    },
    {
      id: "abyssGate",
      name: "무저갱 관문",
      subtitle: "발밑의 그림자가 하늘보다 깊은 관문",
      w: 4600,
      h: 3100,
      floor: ["#0c101c", "#1b1830", "#2c1f3a"],
      accent: "#9f7cff",
      enemies: ["voidbeast", "archon"],
      npc: [{ id: "vahl", name: "바알", role: "관문 감시자", x: 820, y: 980 }],
      portals: [
        { to: "starfallGarden", x: 280, y: 1560, label: "별비 정원" },
        { to: "dawnspire", x: 4280, y: 1500, label: "새벽 첨탑" },
      ],
    },
    {
      id: "dawnspire",
      name: "새벽 첨탑",
      subtitle: "30시간의 서약을 완성해야 열리는 마지막 하늘",
      w: 4200,
      h: 3200,
      floor: ["#101827", "#202a45", "#4b3b6b"],
      accent: "#fff2a6",
      enemies: ["seraph", "voidbeast"],
      npc: [
        { id: "elia", name: "엘리아", role: "새벽의 증인", x: 760, y: 980 },
        {
          id: "solen",
          name: "솔렌",
          role: "최종 보급관",
          x: 1180,
          y: 1120,
          shop: "dawnForge",
        },
      ],
      portals: [{ to: "abyssGate", x: 260, y: 1600, label: "무저갱 관문" }],
    },
  ];
  const zoneMap = Object.fromEntries(ZONES.map((zone) => [zone.id, zone]));

  const NPC_BONDS = ZONES.flatMap((zone, zoneIndex) =>
    (zone.npc || []).map((npc, npcIndex) => ({
      id: npc.id,
      name: npc.name,
      role: npc.role,
      zone: zone.id,
      zoneName: zone.name,
      zoneIndex,
      npcIndex,
      shop: Boolean(npc.shop),
      color: npc.shop ? "#ffba5a" : zone.accent,
      material: npcBondMaterial(zoneIndex, npcIndex),
      stats: npcBondStats(npc),
      stories: npcBondStories(npc, zone),
    })),
  );

  const COMMENDATION_STAGES = [
    {
      key: "trust",
      title: "주민 감사장",
      label: "신뢰",
      required: 34,
      color: "#53e2a8",
      desc: "주민 인연, 지역 안정도, 반복 의뢰가 쌓여 지역 사람들이 서약자의 이름을 기억합니다.",
      stats: (zoneIndex) => ({
        goldGain: 0.006 + zoneIndex * 0.0005,
        shopDiscount: 0.025,
        healingPower: 0.006,
      }),
    },
    {
      key: "defense",
      title: "전선 표창",
      label: "수호",
      required: 68,
      color: "#ffba5a",
      desc: "수호 시험, 현상수배, 도감 전투 기록이 지역 방어선의 실전 경험으로 남습니다.",
      stats: (zoneIndex) => ({
        atk: 1 + Math.floor(zoneIndex / 5),
        def: 1 + Math.floor(zoneIndex / 4),
        damageReduce: 0.004,
      }),
    },
    {
      key: "legacy",
      title: "연대 휘장",
      label: "기록",
      required: 102,
      color: "#d08cff",
      desc: "기억 조각, 지역 연대기, 복원 유물, 균열 기록이 장기 서사 보상으로 묶입니다.",
      stats: (zoneIndex) => ({
        xpGain: 0.008 + zoneIndex * 0.0005,
        dropChance: 0.0025,
        skillDamage: 0.006,
      }),
    },
  ];

  const REGION_COMMENDATIONS = ZONES.flatMap((zone, zoneIndex) =>
    COMMENDATION_STAGES.map((stage, stageIndex) => ({
      id: `${zone.id}_${stage.key}`,
      zone: zone.id,
      zoneIndex,
      stageIndex,
      key: stage.key,
      label: stage.label,
      title: `${zone.name} ${stage.title}`,
      desc: stage.desc,
      required: stage.required,
      color: stage.color,
      stats: stage.stats(zoneIndex),
    })),
  );

  const MEMORY_FRAGMENT_TEMPLATES = [
    {
      id: "echo",
      label: "잔향",
      px: 0.34,
      py: 0.28,
      title: (zone) => `${zone.name}의 첫 잔향`,
      text: (zone) =>
        `${zone.subtitle}. 이곳에 남은 작은 잔향은 사라진 영웅들이 처음 두려움을 이긴 순간을 비추고 있습니다.`,
    },
    {
      id: "oath",
      label: "서약",
      px: 0.72,
      py: 0.68,
      title: (zone) => `${zone.name}의 숨은 서약`,
      text: (zone) =>
        `${zone.name} 깊은 곳에서 발견한 문장은 이 지역의 균열이 단순한 재앙이 아니라 누군가의 미완성된 맹세였음을 알려줍니다.`,
    },
  ];

  const MEMORY_FRAGMENTS = ZONES.flatMap((zone, zoneIndex) =>
    MEMORY_FRAGMENT_TEMPLATES.map((template, index) => {
      const xBias = ((zoneIndex % 5) - 2) * 34 + index * 28;
      const yBias = (((zoneIndex + index) % 4) - 1.5) * 38;
      return {
        id: `${zone.id}-${template.id}`,
        zone: zone.id,
        label: template.label,
        title: template.title(zone),
        text: template.text(zone),
        x: clamp(Math.round(zone.w * template.px + xBias), 210, zone.w - 210),
        y: clamp(Math.round(zone.h * template.py + yBias), 210, zone.h - 210),
      };
    }),
  );

  const SECRET_LANDMARK_TEMPLATES = [
    {
      key: "vista",
      label: "전망 표식",
      px: 0.24,
      py: 0.74,
      color: "#48a5ff",
      title: (zone) => `${zone.name} 전선 전망대`,
      text: (zone) =>
        `${zone.name}의 높은 표식에서 ${zone.subtitle}의 균열 흐름과 적의 이동로를 다시 읽었습니다.`,
    },
    {
      key: "cache",
      label: "숨은 보급함",
      px: 0.62,
      py: 0.26,
      color: "#ffba5a",
      title: (zone) => `${zone.name} 유실 보급함`,
      text: (zone) =>
        `${zone.name} 순찰대가 숨겨 둔 보급품을 찾아 장기 사냥에 필요한 재료를 회수했습니다.`,
    },
    {
      key: "inscription",
      label: "영웅 비문",
      px: 0.78,
      py: 0.66,
      color: "#d08cff",
      title: (zone) => `${zone.name} 영웅 비문`,
      text: (zone) =>
        `${zone.name}에 남은 오래된 비문이 이 지역을 지나간 서약자들의 전투 방식을 보여 줍니다.`,
    },
  ];

  const REGION_SECRETS = ZONES.flatMap((zone, zoneIndex) =>
    SECRET_LANDMARK_TEMPLATES.map((template, index) => {
      const seed = (zoneIndex + 5) * (index + 11);
      return {
        id: `${zone.id}_${template.key}`,
        zone: zone.id,
        zoneIndex,
        stageIndex: index,
        key: template.key,
        label: template.label,
        title: template.title(zone),
        text: template.text(zone),
        color: template.color,
        x: clamp(
          Math.round(zone.w * template.px + Math.sin(seed) * 86),
          220,
          zone.w - 220,
        ),
        y: clamp(
          Math.round(zone.h * template.py + Math.cos(seed * 1.3) * 78),
          220,
          zone.h - 220,
        ),
      };
    }),
  );

  const TREASURE_SITE_TEMPLATES = [
    {
      key: "cache",
      label: "낡은 지도함",
      px: 0.18,
      py: 0.58,
      color: "#f8f871",
      required: 4,
      title: (zone) => `${zone.name} 낡은 지도함`,
      clue: "몬스터가 흘린 지도 조각을 맞추면 오래된 보급함 위치가 드러납니다.",
      text: (zone) =>
        `${zone.name} 순찰대가 전투 중 잃어버린 보급 지도를 복원했습니다. 단순 사냥 기록이 실제 탐색로로 이어집니다.`,
    },
    {
      key: "relic",
      label: "묻힌 장비고",
      px: 0.52,
      py: 0.78,
      color: "#ffba5a",
      required: 8,
      title: (zone) => `${zone.name} 묻힌 장비고`,
      clue: "추가 지도 조각을 모으면 지역 몬스터의 전리품 흔적이 장비고로 이어집니다.",
      text: (zone) =>
        `${zone.name}에 묻힌 장비고에서 이전 서약자들의 무구 흔적을 찾았습니다. 장비 파밍과 지역 이야기가 하나의 목표가 됩니다.`,
    },
    {
      key: "archive",
      label: "비밀 서고문",
      px: 0.77,
      py: 0.35,
      color: "#d08cff",
      required: 13,
      title: (zone) => `${zone.name} 비밀 서고문`,
      clue: "충분한 지도 조각과 전투 기록이 모이면 지역의 숨은 서고문을 열 수 있습니다.",
      text: (zone) =>
        `${zone.name}의 비밀 서고문을 열어 전리품 경로, 주민 기록, 균열 흔적을 한 장의 보물 기록으로 묶었습니다.`,
    },
  ];

  const REGION_TREASURE_SITES = ZONES.flatMap((zone, zoneIndex) =>
    TREASURE_SITE_TEMPLATES.map((template, index) => {
      const seed = (zoneIndex + 9) * (index + 13);
      return {
        id: `${zone.id}_${template.key}`,
        zone: zone.id,
        zoneIndex,
        stageIndex: index,
        key: template.key,
        label: template.label,
        title: template.title(zone),
        clue: template.clue,
        text: template.text(zone),
        color: template.color,
        required: template.required + Math.floor(zoneIndex / 4) + index * 2,
        x: clamp(
          Math.round(zone.w * template.px + Math.sin(seed) * 118),
          240,
          zone.w - 240,
        ),
        y: clamp(
          Math.round(zone.h * template.py + Math.cos(seed * 1.17) * 96),
          240,
          zone.h - 240,
        ),
      };
    }),
  );

  const NAMED_HUNT_EPITHETS = [
    "잔월의",
    "붉은 갈기의",
    "검은 비늘",
    "잿빛 포효",
    "서리 이빨",
    "황혼 칼날",
    "월식의",
    "별무덤",
    "심연 흔적",
    "새벽 파수",
  ];

  const REGIONAL_NAMED_HUNTS = ZONES.map((zone, zoneIndex) => {
    const target =
      zone.enemies[(zoneIndex + 1) % zone.enemies.length] || zone.enemies[0];
    const epithet = NAMED_HUNT_EPITHETS[zoneIndex % NAMED_HUNT_EPITHETS.length];
    const seed = (zoneIndex + 7) * 19;
    return {
      id: `${zone.id}_named`,
      zone: zone.id,
      zoneIndex,
      target,
      epithet,
      title: `${zone.name} 네임드 강적`,
      color: zone.accent,
      requiredKills: 14 + zoneIndex * 2,
      requiredFragments: Math.min(8 + Math.floor(zoneIndex / 3), 14),
      x: clamp(
        Math.round(zone.w * 0.52 + Math.sin(seed) * 220),
        260,
        zone.w - 260,
      ),
      y: clamp(
        Math.round(zone.h * 0.54 + Math.cos(seed * 1.21) * 190),
        260,
        zone.h - 260,
      ),
      desc: `${zone.subtitle}에 남은 강적입니다. 도감 전투 기록과 지도 조각을 모은 뒤 직접 소환해 장비와 전술을 시험합니다.`,
    };
  });

  const CAMPFIRE_STYLES = [
    {
      key: "watch",
      label: "감시 야영지",
      color: "#ffba5a",
      stats: { def: 2, damageReduce: 0.018, mpRegen: 0.35 },
      text: (zone) =>
        `${zone.name}의 감시 야영지에서 적의 야간 이동로와 다음 전투의 후퇴선을 정리했습니다.`,
    },
    {
      key: "feast",
      label: "보급 야영지",
      color: "#53e2a8",
      stats: { healingPower: 0.06, vit: 1, xpGain: 0.012 },
      text: (zone) =>
        `${zone.name}의 보급 야영지에서 주민들이 남긴 식량과 약초를 정리해 긴 여정의 체력을 되찾았습니다.`,
    },
    {
      key: "oath",
      label: "서약 야영지",
      color: "#b7ecff",
      stats: { skillDamage: 0.018, wis: 1, goldGain: 0.012 },
      text: (zone) =>
        `${zone.name}의 서약 야영지에서 동료와 지난 장의 의미를 되짚고 다음 서약 전술을 가다듬었습니다.`,
    },
  ];

  const REGIONAL_CAMPSITES = ZONES.map((zone, zoneIndex) => {
    const style = CAMPFIRE_STYLES[zoneIndex % CAMPFIRE_STYLES.length];
    const seed = (zoneIndex + 11) * 23;
    return {
      id: `${zone.id}_camp`,
      zone: zone.id,
      zoneIndex,
      key: style.key,
      label: style.label,
      title: `${zone.name} ${style.label}`,
      color: style.color,
      stats: style.stats,
      text: style.text(zone),
      x: clamp(
        Math.round(zone.w * 0.34 + Math.sin(seed) * 185),
        250,
        zone.w - 250,
      ),
      y: clamp(
        Math.round(zone.h * 0.82 + Math.cos(seed * 1.13) * 130),
        260,
        zone.h - 260,
      ),
    };
  });

  const PATROL_OPERATION_TYPES = [
    {
      key: "scout",
      label: "정찰 순찰",
      color: "#48a5ff",
      stats: { agi: 1, xpGain: 0.01 },
      text: (zone) =>
        `${zone.name} 외곽을 돌며 숨은 길, 몬스터 이동 흔적, 주민 대피로를 지도에 보탰습니다.`,
    },
    {
      key: "supply",
      label: "보급 순찰",
      color: "#53e2a8",
      stats: { healingPower: 0.025, goldGain: 0.012 },
      text: (zone) =>
        `${zone.name}의 야영지와 채집지를 이어 보급품이 끊기지 않도록 순찰 동선을 정리했습니다.`,
    },
    {
      key: "ward",
      label: "수호 순찰",
      color: "#ffba5a",
      stats: { def: 1, damageReduce: 0.008 },
      text: (zone) =>
        `${zone.name}에 남은 강한 위협과 균열 잔흔을 확인해 다음 수호 작전의 기준선을 세웠습니다.`,
    },
  ];

  const REGIONAL_PATROL_OPERATIONS = ZONES.flatMap((zone, zoneIndex) =>
    PATROL_OPERATION_TYPES.map((type, stageIndex) => ({
      id: `${zone.id}_${type.key}_patrol`,
      zone: zone.id,
      zoneIndex,
      stageIndex,
      key: type.key,
      label: type.label,
      title: `${zone.name} ${type.label}`,
      color: type.color,
      stats: type.stats,
      text: type.text(zone),
    })),
  );

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
    stalker: {
      name: "심연 추적자",
      hp: 420,
      atk: 62,
      def: 16,
      xp: 150,
      gold: 110,
      color: "#7cff9b",
    },
    duelist: {
      name: "황혼 결투사",
      hp: 450,
      atk: 70,
      def: 17,
      xp: 170,
      gold: 132,
      color: "#ff9f6e",
    },
    siren: {
      name: "폭풍 세이렌",
      hp: 480,
      atk: 74,
      def: 15,
      xp: 190,
      gold: 145,
      color: "#69dcff",
    },
    automaton: {
      name: "흑요 자동인형",
      hp: 560,
      atk: 78,
      def: 24,
      xp: 220,
      gold: 168,
      color: "#b987ff",
    },
    alchemist: {
      name: "타락 연금술사",
      hp: 520,
      atk: 84,
      def: 19,
      xp: 235,
      gold: 180,
      color: "#d08cff",
    },
    sentinel: {
      name: "성좌 감시자",
      hp: 680,
      atk: 92,
      def: 28,
      xp: 290,
      gold: 220,
      color: "#f8f871",
    },
    seraph: {
      name: "별비 세라프",
      hp: 720,
      atk: 102,
      def: 25,
      xp: 330,
      gold: 245,
      color: "#d8f7ff",
    },
    voidbeast: {
      name: "무저갱 괴수",
      hp: 900,
      atk: 118,
      def: 32,
      xp: 430,
      gold: 310,
      color: "#9f7cff",
    },
  };

  const MONSTER_EQUIPMENT_DROPS = {
    slime: ["slimeCrown"],
    wolf: ["wolfClaw"],
    thorn: ["thornMantle"],
    raider: ["raiderCutlass"],
    mist: ["mistVeil"],
    golem: ["golemCoreGuard"],
    wraith: ["wraithLantern"],
    knight: ["knightOathblade"],
    shade: ["shadeBand"],
    archon: ["archonHalo"],
    stalker: ["stalkerVeil"],
    duelist: ["duelistRapier"],
    siren: ["sirenPearl"],
    automaton: ["automatonGear"],
    alchemist: ["alchemistBand"],
    sentinel: ["sentinelPlate"],
    seraph: ["seraphFeather"],
    voidbeast: ["voidCrown"],
  };

  const ARMORY_RECORD_TYPES = [
    {
      key: "catalog",
      label: "전리품 표본",
      color: "#48a5ff",
      stats: { dropChance: 0.001, xpGain: 0.003 },
      text: (zone) =>
        `${zone.name} 몬스터가 남긴 고유 장비 표본을 장비록에 등록했습니다.`,
    },
    {
      key: "mastery",
      label: "전장 운용",
      color: "#ffba5a",
      stats: { atk: 0.45, def: 0.35, damageReduce: 0.0015 },
      text: (zone) =>
        `${zone.name} 고유 장비를 직접 강화하거나 오래 사용해 전장 운용법을 정리했습니다.`,
    },
  ];

  const REGIONAL_ARMORY_RECORDS = ZONES.flatMap((zone, zoneIndex) =>
    ARMORY_RECORD_TYPES.map((type, stageIndex) => ({
      id: `${zone.id}_${type.key}_armory`,
      zone: zone.id,
      zoneIndex,
      stageIndex,
      key: type.key,
      label: type.label,
      title: `${zone.name} ${type.label}`,
      color: type.color,
      stats: type.stats,
      text: type.text(zone),
    })),
  );

  const MONSTER_RUNE_DROPS = {
    slime: ["mossRune"],
    wolf: ["huntRune"],
    thorn: ["thornRune"],
    raider: ["huntRune"],
    mist: ["tideRune"],
    golem: ["emberRune"],
    wraith: ["frostRune"],
    knight: ["thornRune", "frostRune"],
    shade: ["eclipseRune"],
    archon: ["dawnRune"],
    stalker: ["eclipseRune"],
    duelist: ["huntRune", "emberRune"],
    siren: ["tideRune"],
    automaton: ["emberRune", "frostRune"],
    alchemist: ["tideRune", "eclipseRune"],
    sentinel: ["frostRune", "dawnRune"],
    seraph: ["dawnRune"],
    voidbeast: ["eclipseRune", "dawnRune"],
  };

  const MONSTER_MATERIAL_DROPS = {
    slime: { item: "guardianThread", chance: 0.36, min: 1, max: 2 },
    wolf: { item: "oathSteel", chance: 0.34, min: 1, max: 2 },
    thorn: { item: "guardianThread", chance: 0.38, min: 1, max: 3 },
    raider: { item: "oathSteel", chance: 0.36, min: 1, max: 3 },
    mist: { item: "starDust", chance: 0.26, min: 1, max: 2 },
    golem: { item: "oathSteel", chance: 0.42, min: 2, max: 4 },
    wraith: { item: "starDust", chance: 0.32, min: 1, max: 3 },
    knight: { item: "guardianThread", chance: 0.34, min: 2, max: 4 },
    shade: { item: "abyssCore", chance: 0.2, min: 1, max: 2 },
    archon: { item: "dawnPrism", chance: 0.16, min: 1, max: 1 },
    stalker: { item: "abyssCore", chance: 0.22, min: 1, max: 2 },
    duelist: { item: "oathSteel", chance: 0.38, min: 2, max: 5 },
    siren: { item: "starDust", chance: 0.38, min: 2, max: 4 },
    automaton: { item: "abyssCore", chance: 0.28, min: 1, max: 3 },
    alchemist: { item: "starDust", chance: 0.42, min: 2, max: 4 },
    sentinel: { item: "dawnPrism", chance: 0.18, min: 1, max: 2 },
    seraph: { item: "dawnPrism", chance: 0.2, min: 1, max: 2 },
    voidbeast: { item: "abyssCore", chance: 0.36, min: 2, max: 4 },
  };

  const SHOPS = {
    apothecary: [
      "smallPotion",
      "manaDew",
      "fieldRation",
      "greenHerb",
      "oathTonic",
      "starDust",
      "mossRune",
    ],
    forge: [
      "ironBlade",
      "guardCoat",
      "oathThread",
      "moonBlade",
      "runeMail",
      "emberBlade",
      "oathSteel",
      "guardianThread",
    ],
    ranger: [
      "smallPotion",
      "manaDew",
      "rangerSaber",
      "oathThread",
      "guardianThread",
      "huntRune",
      "thornRune",
    ],
    harbor: [
      "smallPotion",
      "tideKelp",
      "wardTea",
      "tideSpear",
      "tideCharm",
      "runeMail",
      "tideRune",
    ],
    miner: [
      "smallPotion",
      "oathTonic",
      "emberPepper",
      "hunterStew",
      "emberBlade",
      "basaltAegis",
      "oathSteel",
      "emberRune",
    ],
    winter: [
      "manaDew",
      "frostLotus",
      "wardTea",
      "silverWard",
      "snowSigil",
      "oathMantle",
      "frostRune",
    ],
    relic: [
      "moonBlade",
      "runeMail",
      "eclipseRing",
      "silverWard",
      "eclipseRune",
    ],
    eclipseShop: [
      "oathTonic",
      "sageElixir",
      "riftBloom",
      "starforgedBlade",
      "shadeBand",
      "basaltAegis",
      "eclipseRune",
    ],
    originForge: [
      "oathTonic",
      "starforgedBlade",
      "dawnPlate",
      "dawnRelic",
      "dawnRune",
    ],
    bazaar: [
      "smallPotion",
      "manaDew",
      "rangerSaber",
      "tideSpear",
      "oathThread",
    ],
    storm: ["oathTonic", "tideSpear", "silverWard", "sirenPearl"],
    library: [
      "manaDew",
      "sageElixir",
      "alchemistBand",
      "sentinelPlate",
      "dawnPlate",
      "starDust",
      "abyssCore",
      "tideRune",
      "eclipseRune",
    ],
    dawnForge: [
      "oathTonic",
      "dawnBanquet",
      "dawnGinseng",
      "dawnPlate",
      "archonHalo",
      "voidCrown",
      "dawnRelic",
      "abyssCore",
      "dawnPrism",
      "dawnRune",
    ],
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
      line: "기원의 탑은 끝이 아니라 더 오래 숨겨진 길의 입구였습니다.",
    },
    {
      title: "황혼의 거래",
      zone: "duskbazaar",
      npc: "hayan",
      enemy: "duelist",
      boss: "raider",
      collect: "암거래 장부",
      line: "황혼 시장에서는 물건보다 기억이 비싸게 팔립니다. 사라진 장부를 되찾아야 합니다.",
    },
    {
      title: "심연 숲의 심장",
      zone: "deepgrove",
      npc: "maeil",
      enemy: "stalker",
      boss: "thorn",
      collect: "검은 씨앗",
      line: "숲의 가장 깊은 뿌리가 살아 있는 사람의 이름을 빨아들이고 있습니다.",
    },
    {
      title: "폭풍 절벽의 노래",
      zone: "stormcliff",
      npc: "rude",
      enemy: "siren",
      boss: "mist",
      collect: "벼락 조각",
      line: "절벽 아래의 노래는 배를 부르는 것이 아니라 영혼을 끌어내리는 신호입니다.",
    },
    {
      title: "흑요 연구소",
      zone: "obsidianLab",
      npc: "eden",
      enemy: "automaton",
      boss: "alchemist",
      collect: "흑요 회로",
      line: "흑요 연구소는 멈춘 줄 알았던 전쟁을 태엽으로 다시 돌리고 있습니다.",
    },
    {
      title: "성좌 서고의 색인",
      zone: "astralLibrary",
      npc: "lias",
      enemy: "alchemist",
      boss: "sentinel",
      collect: "성좌 색인",
      line: "별자리는 하늘의 글자가 아니라 누군가가 고쳐 쓴 운명의 색인입니다.",
    },
    {
      title: "왕관 없는 왕도",
      zone: "duskcapital",
      npc: "arhan",
      enemy: "sentinel",
      boss: "duelist",
      collect: "왕도의 봉인",
      line: "왕도에는 왕이 없지만 명령은 아직 살아 있습니다. 봉인을 깨야 길이 열립니다.",
    },
    {
      title: "별비 정원",
      zone: "starfallGarden",
      npc: "yura",
      enemy: "seraph",
      boss: "shade",
      collect: "별비 꽃잎",
      line: "정원에 내리는 별비는 축복처럼 보이지만, 오래 맞으면 기억을 지웁니다.",
    },
    {
      title: "무저갱 관문",
      zone: "abyssGate",
      npc: "vahl",
      enemy: "voidbeast",
      boss: "archon",
      collect: "공허 열쇠",
      line: "관문은 아래로 열립니다. 내려갈수록 하늘이 멀어지는 이유를 알아내야 합니다.",
    },
    {
      title: "새벽 첨탑",
      zone: "dawnspire",
      npc: "elia",
      enemy: "seraph",
      boss: "voidbeast",
      collect: "새벽의 심장",
      line: "새벽 첨탑은 모든 서약자가 마지막으로 시험받는 하늘의 심장입니다.",
    },
    {
      title: "영웅서기의 완성",
      zone: "dawnspire",
      npc: "elia",
      enemy: "voidbeast",
      boss: "archon",
      collect: "영웅서기 원전",
      line: "마지막 문은 힘으로 열리지 않습니다. 충분히 오래, 충분히 많은 장을 살아낸 서약만이 문장을 완성합니다.",
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
              `${formatTime(MIN_FINAL_PLAY_SECONDS)} 이상의 서약 기록과 모든 장의 증거가 새겨져야 마지막 문이 열립니다.`,
              "전투, 탐험, 장비 수집, 지역 해금을 이어가며 충분한 준비가 쌓이면 최종 집행자가 모습을 드러냅니다.",
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

  const ECHO_TRIAL_TIERS = [
    {
      key: "memory",
      name: "기억",
      color: "#48a5ff",
      hp: 1.16,
      atk: 1.07,
      def: 2,
      reward: 1,
      renown: 1,
      desc: "처음 결계를 깼던 보스전을 다시 읽어 전투 감각과 장비 구성을 점검합니다.",
    },
    {
      key: "oath",
      name: "맹세",
      color: "#d08cff",
      hp: 1.58,
      atk: 1.24,
      def: 6,
      reward: 1.35,
      renown: 2,
      desc: "강해진 수호자를 상대하며 서약 전술, 동료, 성소 보정을 함께 시험합니다.",
    },
    {
      key: "rift",
      name: "균열",
      color: "#ffba5a",
      hp: 2.08,
      atk: 1.44,
      def: 10,
      reward: 1.75,
      renown: 3,
      desc: "최고 단계 회상전입니다. 강화 장비와 음식, 각인을 준비해야 안정적으로 돌파할 수 있습니다.",
    },
  ];

  const ECHO_TRIALS = ACTS.flatMap((act, actIndex) => {
    const actNo = actIndex + 1;
    return ECHO_TRIAL_TIERS.map((tier, tierIndex) => ({
      id: `act${actNo}_${tier.key}`,
      act: actNo,
      tier: tier.key,
      tierIndex,
      tierName: tier.name,
      title: `${act.title}: ${tier.name} 회상전`,
      zone: act.zone,
      npc: act.npc,
      boss: act.boss,
      collect: act.collect,
      color: tier.color,
      desc: tier.desc,
      unlock:
        tierIndex === 0
          ? `${actNo}장 보스 클리어`
          : `${act.title}: ${ECHO_TRIAL_TIERS[tierIndex - 1].name} 회상전 클리어`,
    }));
  });

  const ACT_MASTERY_STAGES = [
    {
      key: "record",
      name: "장의 기록",
      color: "#48a5ff",
      required: 4,
      desc: "메인 장과 기본 기록을 정리해 다음 지역으로 넘어갈 준비를 마칩니다.",
    },
    {
      key: "frontline",
      name: "전선 정리",
      color: "#53e2a8",
      required: 8,
      desc: "지역 탐색, 외전, 시험, 전투 기록을 묶어 장의 남은 위협을 줄입니다.",
    },
    {
      key: "legacy",
      name: "영웅서기 주석",
      color: "#f8f871",
      required: 12,
      desc: "회상전, 유물, 감사장, 균열 기록까지 모아 한 장의 후일담을 완성합니다.",
    },
  ];

  const OATH_CAMPAIGN_STAGES = [
    {
      key: "supply",
      name: "보급 원정",
      color: "#53e2a8",
      desc: "완료한 장의 야영지와 순찰 보급선을 다시 잇고 주민 대피로를 정리합니다.",
      stats: { xpGain: 0.006, goldGain: 0.004, healingPower: 0.004 },
      requirements: [
        {
          key: "main",
          label: "메인 장 완료",
          check: (actNo) => completedActCount() >= actNo,
        },
        {
          key: "mastery",
          label: "영웅서기 장 보상 1개",
          check: (actNo) => claimedActMasteryCount(actNo) >= 1,
        },
        {
          key: "camp",
          label: "지역 야영 기록",
          check: (_actNo, zoneId) => claimedCampsiteCount(zoneId) >= 1,
        },
        {
          key: "patrol",
          label: "지역 순찰 작전",
          check: (_actNo, zoneId) => claimedPatrolOperationCount(zoneId) >= 1,
        },
      ],
    },
    {
      key: "assault",
      name: "강습 원정",
      color: "#ff6b86",
      desc: "강적 토벌, 회상전, 고유 장비 운용 기록을 묶어 해당 장의 전투 원정을 정리합니다.",
      stats: { atk: 0.65, skillDamage: 0.003, dropChance: 0.0008 },
      requirements: [
        {
          key: "mastery",
          label: "영웅서기 장 보상 2개",
          check: (actNo) => claimedActMasteryCount(actNo) >= 2,
        },
        {
          key: "named",
          label: "지역 네임드 강적",
          check: (_actNo, zoneId) => claimedNamedHuntCount(zoneId) >= 1,
        },
        {
          key: "echo",
          label: "해당 장 회상전",
          check: (actNo) =>
            clearedEchoTrialIds().some((id) => id.startsWith(`act${actNo}_`)),
        },
        {
          key: "armory",
          label: "지역 장비록",
          check: (_actNo, zoneId) => claimedArmoryRecordCount(zoneId) >= 1,
        },
      ],
    },
    {
      key: "legacy",
      name: "서사 원정",
      color: "#f8f871",
      desc: "유물, 감사장, 외전, 균열 기록을 이어 최종 장 이후에도 남는 서사를 완성합니다.",
      stats: { def: 0.55, damageReduce: 0.002, mpRegen: 0.035 },
      requirements: [
        {
          key: "mastery",
          label: "영웅서기 장 보상 3개",
          check: (actNo) => claimedActMasteryCount(actNo) >= 3,
        },
        {
          key: "relic",
          label: "지역 유물 복원",
          check: (_actNo, zoneId) => zoneRelicRestoredCount(zoneId) >= 1,
        },
        {
          key: "commendation",
          label: "주민 감사장",
          check: (_actNo, zoneId) => claimedCommendationCount(zoneId) >= 1,
        },
        {
          key: "side",
          label: "지역 외전",
          check: (_actNo, zoneId) => zoneSideStoryClaimedCount(zoneId) >= 1,
        },
        {
          key: "rift",
          label: "지역 균열 기록",
          check: (_actNo, zoneId) => zoneExpeditionCount(zoneId) >= 1,
        },
      ],
    },
  ];

  const OATH_CAMPAIGNS = ACTS.flatMap((act, index) => {
    const actNo = index + 1;
    return OATH_CAMPAIGN_STAGES.map((stage, stageIndex) => ({
      id: `act${actNo}_${stage.key}_campaign`,
      act: actNo,
      zone: act.zone,
      stageIndex,
      key: stage.key,
      name: stage.name,
      color: stage.color,
      title: `${act.title}: ${stage.name}`,
      desc: stage.desc,
      stats: stage.stats,
      collect: act.collect,
      npc: act.npc,
    }));
  });

  const TACTIC_MANUAL_STAGES = [
    {
      key: "blade",
      name: "검격 교범",
      label: "검격",
      color: "#ffba5a",
      desc: "지역 몬스터의 몸놀림과 고유 장비 운용 기록을 묶어 기본 공격 동선을 정리합니다.",
      stats: { atk: 0.7, basicDamage: 0.003, agi: 0.12 },
      requirements: [
        {
          label: "지역 몬스터 처치",
          target: (tactic) => 24 + tactic.zoneIndex * 3,
          current: (tactic) => zoneBestiaryKills(tactic.zone),
        },
        {
          label: "지역 장비록",
          target: () => 1,
          current: (tactic) => claimedArmoryRecordCount(tactic.zone),
        },
        {
          label: "검격/서약 숙련",
          target: (tactic) => 2 + Math.floor(tactic.zoneIndex / 5),
          current: () =>
            specializationRank("blade") +
            Math.floor((state.player.skillRank || 0) / 2),
        },
      ],
    },
    {
      key: "ward",
      name: "수호 교범",
      label: "수호",
      color: "#53e2a8",
      desc: "지역 방어선, 야영지, 순찰과 수호 시험 기록을 합쳐 피해를 줄이는 진형을 정리합니다.",
      stats: { def: 0.65, damageReduce: 0.002, healingPower: 0.003 },
      requirements: [
        {
          label: "지역 안정도",
          target: (tactic) => 35 + tactic.zoneIndex * 3,
          current: (tactic) => Math.floor(regionStabilityValue(tactic.zone)),
        },
        {
          label: "순찰 또는 야영",
          target: () => 1,
          current: (tactic) =>
            claimedPatrolOperationCount(tactic.zone) +
            claimedCampsiteCount(tactic.zone),
        },
        {
          label: "지역 수호 시험",
          target: () => 1,
          current: (tactic) => claimedRegionTrialCount(tactic.zone),
        },
      ],
    },
    {
      key: "oath",
      name: "서약 교범",
      label: "서약",
      color: "#b7ecff",
      desc: "연대기, 유물, 회상전, 원정 기록을 서약 전술 운용 원리로 다시 엮습니다.",
      stats: { wis: 0.18, skillDamage: 0.003, mpRegen: 0.04 },
      requirements: [
        {
          label: "지역 기록",
          target: () => 3,
          current: (tactic) =>
            zoneChronicleCount(tactic.zone) +
            zoneRelicRestoredCount(tactic.zone) +
            zoneSideStoryClaimedCount(tactic.zone),
        },
        {
          label: "회상전 또는 원정",
          target: () => 1,
          current: (tactic) =>
            clearedEchoTrialCount(tactic.zone) +
            claimedCampaignCount(tactic.zone),
        },
        {
          label: "장 완료",
          target: (tactic) => tactic.act,
          current: () => completedActCount(),
        },
      ],
    },
  ];

  const TACTIC_MANUALS = ZONES.flatMap((zone, zoneIndex) => {
    const act = ACTS.findIndex((entry) => entry.zone === zone.id) + 1 || 1;
    return TACTIC_MANUAL_STAGES.map((stage, stageIndex) => ({
      id: `${zone.id}_${stage.key}_manual`,
      zone: zone.id,
      zoneIndex,
      act,
      key: stage.key,
      stageIndex,
      name: stage.name,
      label: stage.label,
      color: stage.color,
      desc: stage.desc,
      stats: stage.stats,
      requirements: stage.requirements,
      title: `${zone.name} ${stage.name}`,
    }));
  });

  const OATH_DECISION_PATHS = [
    {
      key: "ward",
      name: "수호 결의",
      color: "#53e2a8",
      motive: "주민과 성소 방어선을 먼저 복구합니다.",
      result: "지역 방어망이 정비되어 장기 생존력이 오릅니다.",
      stats: { def: 0.8, vit: 0.28, damageReduce: 0.002, healingPower: 0.002 },
      item: "guardianThread",
    },
    {
      key: "truth",
      name: "진실 결의",
      color: "#b7ecff",
      motive: "기록을 대조해 영웅서기에 남길 진실을 확정합니다.",
      result: "서고 해석이 깊어져 성장과 서약 전술 운용이 좋아집니다.",
      stats: { wis: 0.36, xpGain: 0.004, skillDamage: 0.002, mpRegen: 0.04 },
      item: "starDust",
    },
    {
      key: "frontier",
      name: "개척 결의",
      color: "#ffba5a",
      motive: "숨은 길과 보급로를 열어 다음 지역 탐험을 앞당깁니다.",
      result: "전리품과 기동 전투에 강해져 장비 수집 루프가 넓어집니다.",
      stats: { atk: 0.55, agi: 0.25, goldGain: 0.003, dropChance: 0.0008 },
      item: "oathSteel",
    },
  ];

  const OATH_DECISIONS = ACTS.map((act, index) => {
    const actNo = index + 1;
    return {
      id: `act${actNo}`,
      act: actNo,
      zone: act.zone,
      title: `${act.title}: 장의 결의`,
      desc: `${zoneMap[act.zone]?.name || "해당 지역"}에서 ${act.collect}을 둘러싼 결정을 남깁니다. 이 선택은 되돌릴 수 없고, 영웅서기 보정으로 누적됩니다.`,
      npc: act.npc,
      line: act.line,
    };
  });

  const REGION_TRIAL_STAGES = [
    {
      key: "ward",
      name: "수호 시험",
      color: "#53e2a8",
      desc: "지역 안정도와 토벌 기록을 바탕으로 방어선을 완성합니다.",
      metric: "ward",
      material: "guardianThread",
      stats: { def: 0.65, damageReduce: 0.0018 },
    },
    {
      key: "supply",
      name: "보급 시험",
      color: "#ffba5a",
      desc: "지역 채집과 야영 준비를 통해 장기 탐험 보급망을 다집니다.",
      metric: "supply",
      material: "greenHerb",
      stats: { healingPower: 0.004, mpRegen: 0.035, goldGain: 0.002 },
    },
    {
      key: "record",
      name: "기록 시험",
      color: "#b7ecff",
      desc: "기억, 연대기, 외전, 균열 기록을 묶어 지역의 남은 이야기를 정리합니다.",
      metric: "record",
      material: "starDust",
      stats: { xpGain: 0.0035, skillDamage: 0.0025, dropChance: 0.0005 },
    },
  ];

  const REGION_TRIALS = ZONES.flatMap((zone, zoneIndex) =>
    REGION_TRIAL_STAGES.map((stage, stageIndex) => ({
      id: `${zone.id}_${stage.key}`,
      zone: zone.id,
      zoneIndex,
      stageIndex,
      key: stage.key,
      name: stage.name,
      title: `${zone.name}: ${stage.name}`,
      desc: `${zone.subtitle} ${stage.desc}`,
      metric: stage.metric,
      color: stage.color,
      material: stage.material,
      stats: stage.stats,
    })),
  );

  const REGIONAL_CONTRACTS = Object.fromEntries(
    ZONES.map((zone, index) => {
      const target = zone.enemies[0];
      const rank = index + 1;
      return [
        zone.id,
        {
          zone: zone.id,
          title: `${zone.name} 지역 의뢰`,
          target,
          required: 12 + rank * 3,
          reason: `${zone.name}의 주민들이 ${ENEMIES[target].name} 토벌 증표를 요청했습니다.`,
          reward: {
            xp: 120 + rank * 45,
            gold: 95 + rank * 38,
            renown: 2 + Math.floor(rank / 4),
            item:
              rank > 16
                ? "dawnPrism"
                : rank > 11
                  ? "abyssCore"
                  : rank > 6
                    ? "starDust"
                    : rank % 2
                      ? "oathSteel"
                      : "guardianThread",
          },
        },
      ];
    }),
  );

  const CHRONICLE_STAGES = [
    {
      key: "memory",
      name: "기억 회수",
      desc: "지역에 숨겨진 기억 조각을 모두 찾아 서고에 복원합니다.",
      goal: "기억 조각 2개 수집",
      required: 2,
      material: "starDust",
    },
    {
      key: "contract",
      name: "주민 의뢰",
      desc: "지역 주민의 반복 의뢰를 1회 완료해 전선의 안전을 확보합니다.",
      goal: "지역 의뢰 1회 완료",
      required: 1,
      material: "guardianThread",
    },
    {
      key: "rift",
      name: "균열 기록",
      desc: "지역 균열 던전을 끝까지 돌파해 수호자 기록을 남깁니다.",
      goal: "지역 균열 1회 정복",
      required: 1,
      material: "abyssCore",
    },
    {
      key: "stability",
      name: "안정화",
      desc: "퀘스트, 사건, 던전, 의뢰를 엮어 지역 안정도를 회복합니다.",
      goal: "지역 안정도 60 달성",
      required: 60,
      material: "dawnPrism",
    },
  ];

  const REGIONAL_CHRONICLES = ZONES.flatMap((zone, zoneIndex) =>
    CHRONICLE_STAGES.map((stage, stageIndex) => ({
      id: `${zone.id}_${stage.key}`,
      zone: zone.id,
      zoneIndex,
      stageIndex,
      key: stage.key,
      title: `${zone.name}: ${stage.name}`,
      goal: stage.goal,
      required: stage.required,
      material: stage.material,
      desc: `${zone.subtitle} ${stage.desc}`,
    })),
  );

  const SIDE_STORY_STAGES = [
    {
      key: "witness",
      name: "주민의 이름",
      metric: "bond",
      goal: "해당 지역 NPC 인연",
      material: "guardianThread",
      color: "#53e2a8",
    },
    {
      key: "supply",
      name: "야영 보급로",
      metric: "preparation",
      goal: "해당 지역 채집과 연금 준비",
      material: "greenHerb",
      color: "#ffba5a",
    },
    {
      key: "shadow",
      name: "남은 그림자",
      metric: "zoneKills",
      goal: "해당 지역 몬스터 도감 처치",
      material: "oathSteel",
      color: "#ff5f6d",
    },
    {
      key: "afterrift",
      name: "균열 후일담",
      metric: "records",
      goal: "해당 지역 기억/연대기/균열 기록",
      material: "abyssCore",
      color: "#d08cff",
    },
  ];

  const SIDE_STORIES = ZONES.flatMap((zone, zoneIndex) =>
    SIDE_STORY_STAGES.map((stage, stageIndex) => ({
      id: `${zone.id}_${stage.key}`,
      zone: zone.id,
      zoneIndex,
      stageIndex,
      key: stage.key,
      metric: stage.metric,
      title: `${zone.name}: ${stage.name}`,
      goal: stage.goal,
      material: stage.material,
      color: stage.color,
      desc: `${zone.subtitle}에서 ${stage.goal}을 해결해 메인 서약 뒤에 남은 사람들의 후일담을 기록합니다.`,
    })),
  );

  const REGION_RELIC_STAGES = [
    {
      key: "memory",
      name: "기억 성물",
      goal: "기억 조각과 지역 안정도",
      metric: "memory",
      material: "guardianThread",
      color: "#48a5ff",
      stats: { xpGain: 0.004, wis: 0.5 },
      desc: "흩어진 기억 조각을 지역 성물에 묶어, 지나간 장의 이야기를 다시 읽을 수 있게 합니다.",
    },
    {
      key: "ward",
      name: "수호 표장",
      goal: "외전, 시험, 의뢰 기록",
      metric: "ward",
      material: "oathSteel",
      color: "#53e2a8",
      stats: { def: 0.7, damageReduce: 0.0025 },
      desc: "주민 후일담과 수호 시험을 표장에 새겨, 지역을 지킨 기록을 전투 보정으로 남깁니다.",
    },
    {
      key: "rift",
      name: "균열 성핵",
      goal: "연대기, 균열, 수배 기록",
      metric: "rift",
      material: "abyssCore",
      color: "#d08cff",
      stats: { atk: 0.55, skillDamage: 0.0025, dropChance: 0.0008 },
      desc: "균열과 수배 표적의 흔적을 성핵에 봉인해, 장비 파밍과 서약 전술 운용에 힘을 더합니다.",
    },
  ];

  const REGION_RELICS = ZONES.flatMap((zone, zoneIndex) =>
    REGION_RELIC_STAGES.map((stage, stageIndex) => ({
      id: `${zone.id}_${stage.key}`,
      zone: zone.id,
      zoneIndex,
      stageIndex,
      key: stage.key,
      metric: stage.metric,
      title: `${zone.name}: ${stage.name}`,
      goal: stage.goal,
      material: stage.material,
      color: stage.color,
      stats: stage.stats,
      desc: `${zone.subtitle} ${stage.desc}`,
    })),
  );

  const BESTIARY_MILESTONES = [10, 30, 75, 150];

  const BESTIARY_RESEARCH_STAGES = [
    {
      kills: 10,
      name: "조우 기록",
      desc: "출몰 위치와 기본 움직임을 기록해 초반 대응이 빨라집니다.",
    },
    {
      kills: 30,
      name: "습성 해석",
      desc: "공격 전조와 약한 방어 자세를 알아내 받는 피해를 줄입니다.",
    },
    {
      kills: 75,
      name: "약점 기록",
      desc: "약점 부위와 전리품 흔적을 정리해 고유 장비 탐색이 쉬워집니다.",
    },
    {
      kills: 150,
      name: "생태 완성",
      desc: "정예와 보스 개체의 변형까지 정리해 사냥 보상이 안정됩니다.",
    },
  ];

  const HUNT_PLAN_TYPES = {
    research: {
      name: "생태 조사",
      label: "도감 연구",
      color: "#48a5ff",
      desc: "연구가 덜 된 몬스터를 골라 도감 단계와 전투 보정을 함께 밀어 올립니다.",
    },
    trophy: {
      name: "전리품 추적",
      label: "고유 장비",
      color: "#ffba5a",
      desc: "고유 장비와 각인을 노릴 표적을 정하고 실제 사냥 루프를 짧은 목표로 묶습니다.",
    },
    stability: {
      name: "전선 안정화",
      label: "지역 안정도",
      color: "#53e2a8",
      desc: "현재 전선의 위협 몬스터를 정리해 지역 안정도와 명성을 같이 회복합니다.",
    },
  };

  const OATH_SPECIALIZATIONS = {
    blade: {
      name: "검격",
      desc: "기본 공격, 연격, 근접 처치 보상이 강해지는 전투형 전문화입니다.",
      color: "#ffba5a",
    },
    ward: {
      name: "수호",
      desc: "받는 피해, 회피 후 안정성, 보스전 버티기가 강해지는 방어형 전문화입니다.",
      color: "#53e2a8",
    },
    surge: {
      name: "서약",
      desc: "서약기 피해, MP 회복, 스킬 재사용 흐름이 강해지는 마력형 전문화입니다.",
      color: "#d08cff",
    },
  };

  const EXPEDITION_MODIFIERS = [
    {
      id: "ember",
      name: "잿불 균열",
      desc: "적 공격력이 오르지만 장비 강화 재료 보상이 늘어납니다.",
      enemyAtk: 1.12,
      reward: 1.25,
      color: "#ffba5a",
    },
    {
      id: "frost",
      name: "설휘 균열",
      desc: "적 체력이 오르지만 보스 처치 보상이 늘어납니다.",
      enemyHp: 1.18,
      reward: 1.18,
      color: "#b7ecff",
    },
    {
      id: "eclipse",
      name: "월식 균열",
      desc: "적 수가 빠르게 늘지만 고유 장비 드롭 기대값이 조금 오릅니다.",
      spawn: 1.25,
      drop: 0.025,
      color: "#d08cff",
    },
    {
      id: "dawn",
      name: "새벽 균열",
      desc: "난이도는 표준이지만 경험치와 명성 보상이 안정적입니다.",
      reward: 1.12,
      renown: 1,
      color: "#f8f871",
    },
  ];

  const EXPEDITION_NODE_TYPES = [
    {
      kind: "cache",
      label: "보급",
      title: "균열 보급함",
      desc: "강화 재료와 골드를 얻습니다.",
      color: "#f8f871",
    },
    {
      kind: "shrine",
      label: "성소",
      title: "회복 성소",
      desc: "HP/MP를 회복하고 짧은 보호 시간을 얻습니다.",
      color: "#53e2a8",
    },
    {
      kind: "lore",
      label: "기록",
      title: "오래된 서약 기록",
      desc: "경험치와 명성을 얻고 여정 기록에 단서를 남깁니다.",
      color: "#48a5ff",
    },
    {
      kind: "seal",
      label: "봉인",
      title: "약화 봉인석",
      desc: "현재 층의 수호자 소환 진행도를 앞당깁니다.",
      color: "#d08cff",
    },
  ];

  const ELITE_AFFIXES = [
    {
      id: "iron",
      name: "철갑",
      desc: "체력과 방어가 높아 오래 버티지만 보상이 좋습니다.",
      color: "#a8bdd5",
      hp: 1.38,
      atk: 1.06,
      def: 7,
      speed: 0.84,
      reward: 1.25,
      drop: 0.01,
    },
    {
      id: "blood",
      name: "흡혈",
      desc: "근접 공격이 적중하면 체력을 회복합니다.",
      color: "#ff5f6d",
      hp: 1.18,
      atk: 1.18,
      speed: 1.02,
      reward: 1.28,
      leech: 0.032,
    },
    {
      id: "storm",
      name: "폭풍",
      desc: "이동과 특수 공격 흐름이 빨라 회피 타이밍을 흔듭니다.",
      color: "#48a5ff",
      hp: 1.12,
      atk: 1.12,
      speed: 1.22,
      specialCd: 0.72,
      reward: 1.32,
    },
    {
      id: "rift",
      name: "균열",
      desc: "균열 기운으로 공격력이 높고 특수 패턴이 자주 나옵니다.",
      color: "#d08cff",
      hp: 1.26,
      atk: 1.26,
      speed: 1.04,
      specialCd: 0.82,
      reward: 1.38,
      drop: 0.014,
    },
    {
      id: "gold",
      name: "황금",
      desc: "전투력은 크게 오르지 않지만 골드와 장비 기대값이 높습니다.",
      color: "#f8f871",
      hp: 1.1,
      atk: 1.04,
      speed: 0.96,
      reward: 1.16,
      gold: 1.85,
      drop: 0.018,
    },
  ];

  const WORLD_EVENT_TYPES = [
    {
      kind: "elite",
      label: "정예",
      title: "지역 정예 추적",
      desc: "지역에 나타난 강화 몬스터를 처치하면 명성과 장비 보상이 오릅니다.",
      color: "#ff5f6d",
      duration: 260,
      targetKills: 5,
      reward: { xp: 360, gold: 240, renown: 2 },
    },
    {
      kind: "breach",
      label: "잔재",
      title: "균열 잔재 정화",
      desc: "균열에 물든 몬스터를 처치해 지역 결계를 안정시킵니다.",
      color: "#d08cff",
      duration: 240,
      targetKills: 7,
      reward: { xp: 420, gold: 180, renown: 2 },
    },
    {
      kind: "cache",
      label: "보급",
      title: "유실 보급품 회수",
      desc: "필드에 떨어진 보급품을 찾아 강화 재료와 골드를 회수합니다.",
      color: "#f8f871",
      duration: 190,
      reward: { xp: 130, gold: 330, renown: 1 },
      interactive: true,
    },
    {
      kind: "sanctuary",
      label: "성역",
      title: "서약 성역 복구",
      desc: "무너진 성역을 복구하면 회복, 보호막, 성장 보상을 얻습니다.",
      color: "#53e2a8",
      duration: 210,
      reward: { xp: 260, gold: 120, renown: 1 },
      interactive: true,
    },
  ];

  const SANCTUARY_FACILITIES = [
    {
      id: "archive",
      name: "기록관",
      color: "#f8f871",
      material: "starDust",
      baseGold: 520,
      baseMaterial: 2,
      stats: { xpGain: 0.025, wis: 1 },
      growth: { xpGain: 0.012, wis: 0.45 },
      desc: "완료한 장과 균열 기록을 정리해 경험치와 지혜 보정을 올립니다.",
    },
    {
      id: "forge",
      name: "서약 대장간",
      color: "#ffba5a",
      material: "oathSteel",
      baseGold: 640,
      baseMaterial: 4,
      stats: { atk: 3, dropChance: 0.003 },
      growth: { atk: 1.4, dropChance: 0.001 },
      desc: "전장 장비를 재단해 공격력과 장비 획득률을 높입니다.",
    },
    {
      id: "wardens",
      name: "수호 병영",
      color: "#48a5ff",
      material: "guardianThread",
      baseGold: 610,
      baseMaterial: 4,
      stats: { def: 3, damageReduce: 0.018 },
      growth: { def: 1.25, damageReduce: 0.005 },
      desc: "수호 결계를 보강해 방어와 피해 감소를 올립니다.",
    },
    {
      id: "garden",
      name: "성역 약초원",
      color: "#53e2a8",
      material: "starDust",
      baseGold: 560,
      baseMaterial: 3,
      stats: { vit: 1, mpRegen: 0.25, healingPower: 0.06 },
      growth: { vit: 0.5, mpRegen: 0.08, healingPower: 0.018 },
      desc: "물약과 성역 회복술을 개선해 생존 지속력을 높입니다.",
    },
    {
      id: "riftgate",
      name: "균열 관측문",
      color: "#d08cff",
      material: "abyssCore",
      baseGold: 980,
      baseMaterial: 2,
      stats: { goldGain: 0.025, skillDamage: 0.025 },
      growth: { goldGain: 0.012, skillDamage: 0.01 },
      desc: "균열 흐름을 관측해 골드와 서약 전술 피해를 올립니다.",
    },
    {
      id: "dawnaltar",
      name: "새벽 제단",
      color: "#eef6ff",
      material: "dawnPrism",
      baseGold: 1600,
      baseMaterial: 1,
      stats: { str: 1, vit: 1, wis: 1, agi: 1 },
      growth: { str: 0.35, vit: 0.35, wis: 0.35, agi: 0.35 },
      desc: "후반 지역의 새벽 결정을 봉헌해 모든 기본 능력치를 올립니다.",
    },
  ];

  const GEAR_LOADOUT_SLOTS = [
    {
      id: "hunt",
      name: "사냥",
      desc: "경험치와 드롭률 장비를 빠르게 꺼내 쓰는 프리셋입니다.",
    },
    {
      id: "guard",
      name: "수호",
      desc: "보스전과 균열 생존용 방어 장비를 저장합니다.",
    },
    {
      id: "explore",
      name: "탐험",
      desc: "채집, 의뢰, 지역 정리용 균형 장비를 저장합니다.",
    },
  ];

  const GEAR_COLLECTION_TIERS = [
    {
      count: 6,
      stats: { atk: 1, def: 1, dropChance: 0.002 },
      text: "공격 +1, 방어 +1, 장비 드롭률 +0.2%",
    },
    {
      count: 12,
      stats: { atk: 2, def: 2, xpGain: 0.008, goldGain: 0.008 },
      text: "공격 +2, 방어 +2, 경험치/골드 +0.8%",
    },
    {
      count: 20,
      stats: { str: 1, vit: 1, wis: 1, agi: 1, dropChance: 0.003 },
      text: "기본 능력 +1, 장비 드롭률 +0.3%",
    },
    {
      count: 32,
      stats: { atk: 3, def: 3, skillDamage: 0.018, basicDamage: 0.018 },
      text: "공격/방어 +3, 기본/서약 전술 피해 +1.8%",
    },
    {
      count: 45,
      stats: { xpGain: 0.018, goldGain: 0.018, dropChance: 0.005 },
      text: "경험치/골드 +1.8%, 장비 드롭률 +0.5%",
    },
  ];

  const OATH_TITLES = [
    {
      id: "green_oath",
      name: "초록숲의 서약자",
      color: "#53e2a8",
      desc: "초반 장을 돌파해 루멘과 초록숲의 서약을 잇습니다.",
      requirement: "메인 퀘스트 8개 완료",
      stats: { vit: 1, def: 2 },
      condition: () => state.questIndex >= 8,
    },
    {
      id: "hunter_50",
      name: "전장 사냥꾼",
      color: "#ffba5a",
      desc: "필드 전투에 익숙해진 서약자에게 주어지는 칭호입니다.",
      requirement: "몬스터 50마리 처치",
      stats: { atk: 3 },
      condition: () => totalBestiaryKills() >= 50,
    },
    {
      id: "hunter_250",
      name: "백전의 추적자",
      color: "#ff5f6d",
      desc: "수많은 전투 기록을 남긴 추적자 칭호입니다.",
      requirement: "몬스터 250마리 처치",
      stats: { atk: 6, xpGain: 0.025 },
      condition: () => totalBestiaryKills() >= 250,
    },
    {
      id: "bestiary_keeper",
      name: "도감 관리인",
      color: "#48a5ff",
      desc: "다양한 몬스터의 습성과 드롭 정보를 기록했습니다.",
      requirement: "도감에 10종 기록",
      stats: { dropChance: 0.006, wis: 1 },
      condition: () => knownBestiaryTypes() >= 10,
    },
    {
      id: "monster_ecologist",
      name: "생태 연구자",
      color: "#53e2a8",
      desc: "몬스터별 습성 연구를 쌓아 전투 판단과 전리품 추적을 정리했습니다.",
      requirement: "몬스터 연구 단계 총합 24",
      stats: { basicDamage: 0.025, damageReduce: 0.02, dropChance: 0.006 },
      condition: () => totalBestiaryResearchTier() >= 24,
    },
    {
      id: "apex_ecologist",
      name: "대륙 생태학자",
      color: "#ffffff",
      desc: "대륙 전역의 몬스터 생태를 완성해 장기 전투 지식을 남겼습니다.",
      requirement: "몬스터 연구 단계 총합 54",
      stats: { atk: 4, def: 4, xpGain: 0.025, dropChance: 0.01 },
      condition: () => totalBestiaryResearchTier() >= 54,
    },
    {
      id: "elite_hunter",
      name: "정예 추적자",
      color: "#ff5f6d",
      desc: "속성 정예 몬스터를 상대하며 전투 변수를 읽는 법을 익혔습니다.",
      requirement: "정예 몬스터 25마리 처치",
      stats: { atk: 4, def: 3, dropChance: 0.006 },
      condition: () => totalEliteKills() >= 25,
    },
    {
      id: "bounty_tracker",
      name: "현상수배 추적자",
      color: "#ffba5a",
      desc: "지역별 위험 표적을 꾸준히 추적한 서약자 칭호입니다.",
      requirement: "현상수배 8회 완료",
      stats: { atk: 4, goldGain: 0.025, dropChance: 0.006 },
      condition: () => totalBountyClaims() >= 8,
    },
    {
      id: "wanted_breaker",
      name: "수배 파쇄자",
      color: "#f8f871",
      desc: "여러 지역의 고단계 표적을 꺾어 전선의 흐름을 바꿨습니다.",
      requirement: "현상수배 최고 단계 10",
      stats: { atk: 6, def: 4, skillDamage: 0.035 },
      condition: () => maxBountyTier() >= 10,
    },
    {
      id: "named_slayer",
      name: "강적 토벌자",
      color: "#ff5f6d",
      desc: "지역마다 숨어 있던 네임드 강적을 찾아 장비와 전술로 제압했습니다.",
      requirement: "네임드 강적 8마리 토벌",
      stats: { atk: 4, def: 3, dropChance: 0.006, skillDamage: 0.018 },
      condition: () => claimedNamedHuntCount() >= 8,
    },
    {
      id: "continent_slayer",
      name: "대륙 강적 사냥꾼",
      color: "#ffffff",
      desc: "대륙 전역의 위험한 이름들을 서고에 토벌 기록으로 남겼습니다.",
      requirement: "네임드 강적 16마리 토벌",
      stats: { atk: 6, def: 5, xpGain: 0.025, dropChance: 0.01 },
      condition: () => claimedNamedHuntCount() >= 16,
    },
    {
      id: "camp_wayfarer",
      name: "야영 순례자",
      color: "#53e2a8",
      desc: "전투 사이 지역 야영지를 찾아 보급로와 동료 대화를 기록했습니다.",
      requirement: "야영지 8곳 휴식",
      stats: { healingPower: 0.04, xpGain: 0.018, mpRegen: 0.25 },
      condition: () => claimedCampsiteCount() >= 8,
    },
    {
      id: "continent_camper",
      name: "대륙 야영대장",
      color: "#ffffff",
      desc: "대륙 전역의 야영지를 정리해 긴 여정의 보급과 전술 휴식을 완성했습니다.",
      requirement: "야영지 16곳 휴식",
      stats: { def: 4, wis: 2, damageReduce: 0.018, skillDamage: 0.02 },
      condition: () => claimedCampsiteCount() >= 16,
    },
    {
      id: "patrol_commander",
      name: "전선 순찰대장",
      color: "#48a5ff",
      desc: "지역별 정찰, 보급, 수호 순찰을 묶어 전선의 빈틈을 줄였습니다.",
      requirement: "순찰 작전 15개 완료",
      stats: { agi: 2, xpGain: 0.02, dropChance: 0.005 },
      condition: () => claimedPatrolOperationCount() >= 15,
    },
    {
      id: "continent_patrol_commander",
      name: "대륙 순찰사령관",
      color: "#ffffff",
      desc: "대륙 전역의 순찰 기록을 서고에 남겨 긴 여정의 안전망을 완성했습니다.",
      requirement: "순찰 작전 42개 완료",
      stats: { atk: 4, def: 4, goldGain: 0.025, damageReduce: 0.018 },
      condition: () => claimedPatrolOperationCount() >= 42,
    },
    {
      id: "armory_curator",
      name: "장비록 관리인",
      color: "#48a5ff",
      desc: "몬스터 고유 장비를 수집하고 장비록에 전리품 표본을 정리했습니다.",
      requirement: "지역 장비록 14개 완료",
      stats: { dropChance: 0.007, xpGain: 0.02, atk: 2 },
      condition: () => claimedArmoryRecordCount() >= 14,
    },
    {
      id: "continent_armory_master",
      name: "대륙 장비감정가",
      color: "#ffffff",
      desc: "대륙 전역의 고유 장비를 운용 기록까지 남겨 장비 파밍을 장기 목표로 완성했습니다.",
      requirement: "지역 장비록 30개 완료",
      stats: { atk: 5, def: 4, dropChance: 0.012, skillDamage: 0.025 },
      condition: () => claimedArmoryRecordCount() >= 30,
    },
    {
      id: "campaign_leader",
      name: "서약 원정대장",
      color: "#ffba5a",
      desc: "완료한 장의 보급, 강습, 서사 기록을 다시 묶어 후반 원정을 이끌었습니다.",
      requirement: "서약 원정 18개 완료",
      stats: { atk: 4, def: 3, xpGain: 0.025, goldGain: 0.018 },
      condition: () => claimedCampaignCount() >= 18,
    },
    {
      id: "continent_campaigner",
      name: "대륙 원정 총사령관",
      color: "#ffffff",
      desc: "대륙 대부분의 장을 원정 기록으로 다시 정리해 긴 여정의 후일담을 완성했습니다.",
      requirement: "서약 원정 48개 완료",
      stats: { atk: 6, def: 6, dropChance: 0.012, damageReduce: 0.024 },
      condition: () => claimedCampaignCount() >= 48,
    },
    {
      id: "tactic_instructor",
      name: "전술 교관",
      color: "#b7ecff",
      desc: "지역 전투 기록을 검격, 수호, 서약 교범으로 정리해 다음 전장에 전수했습니다.",
      requirement: "전술 교범 18개 정리",
      stats: { atk: 3, def: 3, basicDamage: 0.018, skillDamage: 0.018 },
      condition: () => claimedTacticManualCount() >= 18,
    },
    {
      id: "continent_tactician",
      name: "대륙 전술가",
      color: "#ffffff",
      desc: "대륙 전역의 교범을 정리해 장비, 기록, 방어선, 회상전 준비를 하나의 전술 체계로 만들었습니다.",
      requirement: "전술 교범 42개 정리",
      stats: { atk: 5, def: 5, damageReduce: 0.018, mpRegen: 0.35 },
      condition: () => claimedTacticManualCount() >= 42,
    },
    {
      id: "oath_hunt_planner",
      name: "서약 사냥 설계자",
      color: "#48a5ff",
      desc: "도감, 전리품, 지역 안정화 목표를 직접 골라 장기 사냥 흐름을 설계했습니다.",
      requirement: "서약 사냥 계획 12회 완료",
      stats: { atk: 3, xpGain: 0.02, dropChance: 0.006 },
      condition: () => totalHuntPlanClaims() >= 12,
    },
    {
      id: "field_harvester",
      name: "들길 채집가",
      color: "#53e2a8",
      desc: "사냥 사이에 지역 재료를 살펴 장기 여정의 준비 루프를 만들었습니다.",
      requirement: "채집 25회 완료",
      stats: { healingPower: 0.04, xpGain: 0.015 },
      condition: () => totalForageHarvests() >= 25,
    },
    {
      id: "oath_alchemist",
      name: "서약 연금술사",
      color: "#d08cff",
      desc: "채집 재료를 전투 준비식과 영약으로 바꾸는 법을 익혔습니다.",
      requirement: "연금/요리 12회 제작",
      stats: { mpRegen: 0.7, dropChance: 0.005, goldGain: 0.02 },
      condition: () => totalAlchemyBrews() >= 12,
    },
    {
      id: "side_story_scribe",
      name: "외전 기록자",
      color: "#48a5ff",
      desc: "메인 서약 밖에 남은 주민, 보급로, 그림자, 균열의 후일담을 기록했습니다.",
      requirement: "외전 기록 12개 완료",
      stats: { xpGain: 0.025, wis: 2, goldGain: 0.015 },
      condition: () => claimedSideStoryCount() >= 12,
    },
    {
      id: "regional_epilogue_keeper",
      name: "지역 후일담 보관자",
      color: "#f8f871",
      desc: "여러 지역의 메인 장 이후 이야기를 이어 장기 여정의 목적을 넓혔습니다.",
      requirement: "외전 기록 32개 완료",
      stats: { atk: 4, def: 4, dropChance: 0.01, healingPower: 0.04 },
      condition: () => claimedSideStoryCount() >= 32,
    },
    {
      id: "relic_restorer",
      name: "유물 복원가",
      color: "#48a5ff",
      desc: "지역의 기억, 수호, 균열 기록을 유물로 복원해 지나간 장을 다시 의미 있는 목표로 만들었습니다.",
      requirement: "지역 유물 15개 복원",
      stats: { xpGain: 0.025, def: 2, dropChance: 0.006 },
      condition: () => restoredRelicCount() >= 15,
    },
    {
      id: "continent_relic_keeper",
      name: "대륙 유물 관리자",
      color: "#ffffff",
      desc: "대륙 전역의 복원 유물을 관리해 오래된 지역의 이야기와 전투 보정을 함께 완성했습니다.",
      requirement: "지역 유물 36개 복원",
      stats: { atk: 4, def: 4, xpGain: 0.03, goldGain: 0.03 },
      condition: () => restoredRelicCount() >= 36,
    },
    {
      id: "field_cartographer",
      name: "전선 지도 제작자",
      color: "#48a5ff",
      desc: "필드의 전망대, 보급함, 비문을 찾아 전선 지도를 넓힌 서약자입니다.",
      requirement: "지역 탐색 표식 18개 조사",
      stats: { xpGain: 0.02, agi: 1, dropChance: 0.005 },
      condition: () => discoveredSecretCount() >= 18,
    },
    {
      id: "continent_cartographer",
      name: "대륙 지도 완성자",
      color: "#ffffff",
      desc: "대륙 전역의 숨은 표식을 정리해 오래된 지역에도 다시 갈 이유를 만들었습니다.",
      requirement: "지역 탐색 표식 42개 조사",
      stats: { atk: 3, def: 3, goldGain: 0.025, skillDamage: 0.025 },
      condition: () => discoveredSecretCount() >= 42,
    },
    {
      id: "treasure_seeker",
      name: "보물지도 추적자",
      color: "#ffba5a",
      desc: "몬스터가 흘린 지도 조각을 필드 발굴과 장비 보상으로 이어 낸 서약자입니다.",
      requirement: "보물지도 12개 발굴",
      stats: { goldGain: 0.025, dropChance: 0.006, agi: 1 },
      condition: () => claimedTreasureCount() >= 12,
    },
    {
      id: "continent_treasure_keeper",
      name: "대륙 보물 관리자",
      color: "#ffffff",
      desc: "지역 전리품, 숨은 장비고, 비밀 서고문을 대륙 규모로 정리했습니다.",
      requirement: "보물지도 36개 발굴",
      stats: { atk: 4, def: 4, goldGain: 0.03, dropChance: 0.01 },
      condition: () => claimedTreasureCount() >= 36,
    },
    {
      id: "village_patron",
      name: "마을의 후원자",
      color: "#53e2a8",
      desc: "여러 지역에서 주민 감사장을 받아 전선 뒤편의 삶까지 챙긴 서약자입니다.",
      requirement: "주민 감사장 18개 수령",
      stats: { goldGain: 0.025, healingPower: 0.035, shopDiscount: 0.02 },
      condition: () => claimedCommendationCount() >= 18,
    },
    {
      id: "continent_patron",
      name: "대륙의 은인",
      color: "#ffffff",
      desc: "대륙 곳곳의 감사장과 표창을 모아 사냥, 기록, 상점 루프를 장기 목표로 묶었습니다.",
      requirement: "주민 감사장 40개 수령",
      stats: { atk: 4, def: 4, xpGain: 0.025, dropChance: 0.008 },
      condition: () => claimedCommendationCount() >= 40,
    },
    {
      id: "region_trial_guard",
      name: "지역 수호 시험관",
      color: "#53e2a8",
      desc: "해금된 지역을 다시 돌아보며 수호, 보급, 기록 시험을 수행했습니다.",
      requirement: "지역 수호 시험 12개 완료",
      stats: { def: 4, healingPower: 0.035, xpGain: 0.02 },
      condition: () => claimedRegionTrialCount() >= 12,
    },
    {
      id: "continent_warden",
      name: "대륙 수호자",
      color: "#ffffff",
      desc: "여러 지역의 남은 위협과 보급, 기록을 끝까지 정리한 칭호입니다.",
      requirement: "지역 수호 시험 36개 완료",
      stats: { atk: 5, def: 5, dropChance: 0.012, skillDamage: 0.025 },
      condition: () => claimedRegionTrialCount() >= 36,
    },
    {
      id: "oath_decider",
      name: "결의를 남긴 자",
      color: "#b7ecff",
      desc: "각 장의 결말을 전투 보정과 서고 기록으로 남긴 서약자 칭호입니다.",
      requirement: "서약 결의 8개 선택",
      stats: { wis: 1, xpGain: 0.02, skillDamage: 0.02 },
      condition: () => totalOathDecisionCount() >= 8,
    },
    {
      id: "council_architect",
      name: "연대기 설계자",
      color: "#ffffff",
      desc: "여러 장의 후속 결정을 엮어 자신만의 영웅서기 방향을 완성했습니다.",
      requirement: "서약 결의 18개 선택",
      stats: { atk: 4, def: 4, dropChance: 0.008, goldGain: 0.02 },
      condition: () => totalOathDecisionCount() >= 18,
    },
    {
      id: "chapter_scribe",
      name: "장의 편찬자",
      color: "#b7ecff",
      desc: "메인 장, 지역 기록, 탐색, 전투 후일담을 한 장씩 정리한 서약자입니다.",
      requirement: "영웅서기 장 완성 보상 18개 수령",
      stats: { xpGain: 0.025, wis: 1, goldGain: 0.018 },
      condition: () => claimedActMasteryCount() >= 18,
    },
    {
      id: "heroic_editor",
      name: "영웅서기 편집자",
      color: "#ffffff",
      desc: "대륙의 여러 장을 완성도 목표로 묶어 긴 여정의 의미를 정리했습니다.",
      requirement: "영웅서기 장 완성 보상 48개 수령",
      stats: { atk: 4, def: 4, dropChance: 0.01, skillDamage: 0.028 },
      condition: () => claimedActMasteryCount() >= 48,
    },
    {
      id: "trusted_names",
      name: "이름을 기억하는 자",
      color: "#53e2a8",
      desc: "여러 지역 NPC와 신뢰를 쌓아 전선의 이야기를 넓혔습니다.",
      requirement: "NPC 인연 단계 합계 15",
      stats: { xpGain: 0.025, goldGain: 0.02, wis: 1 },
      condition: () => totalNpcBondLevel() >= 15,
    },
    {
      id: "oath_diplomat",
      name: "서약 외교관",
      color: "#f8f871",
      desc: "완성된 인연들이 지역들을 하나의 연대기로 이어 줍니다.",
      requirement: "NPC 인연 5단계 4명",
      stats: { atk: 4, def: 4, healingPower: 0.035, dropChance: 0.008 },
      condition: () => completedNpcBondCount() >= 4,
    },
    {
      id: "memory_reader",
      name: "기억을 읽는 자",
      color: "#b7ecff",
      desc: "잊힌 지역 기록을 충분히 모아 서약의 빈칸을 메웠습니다.",
      requirement: "기억 조각 12개 수집",
      stats: { xpGain: 0.025, wis: 2 },
      condition: () => collectedMemoryCount() >= 12,
    },
    {
      id: "memory_archivist",
      name: "연대기 복원가",
      color: "#ffffff",
      desc: "대륙 전역의 기억 조각을 모아 서약의 원문에 가까워졌습니다.",
      requirement: "기억 조각 28개 수집",
      stats: { skillDamage: 0.035, goldGain: 0.025 },
      condition: () => collectedMemoryCount() >= 28,
    },
    {
      id: "rift_delver",
      name: "균열 탐험가",
      color: "#d08cff",
      desc: "여러 지역의 균열을 정복한 탐험가 칭호입니다.",
      requirement: "균열 정복 기록 3개",
      stats: { skillDamage: 0.035, mpRegen: 0.25 },
      condition: () => (state.expeditionLog || []).length >= 3,
    },
    {
      id: "echo_challenger",
      name: "회상을 넘는 자",
      color: "#48a5ff",
      desc: "완료한 장의 보스전을 다시 마주해 장비와 전술 숙련을 증명했습니다.",
      requirement: "서약 회상전 12개 클리어",
      stats: { atk: 3, def: 3, skillDamage: 0.022, xpGain: 0.018 },
      condition: () => clearedEchoTrialCount() >= 12,
    },
    {
      id: "echo_conqueror",
      name: "서약 회상 정복자",
      color: "#ffffff",
      desc: "대륙의 주요 보스 회상을 단계별로 돌파해 장기 전투 준비를 완성했습니다.",
      requirement: "서약 회상전 45개 클리어",
      stats: { atk: 5, def: 5, dropChance: 0.01, skillDamage: 0.035 },
      condition: () => clearedEchoTrialCount() >= 45,
    },
    {
      id: "sanctuary_builder",
      name: "성소 재건자",
      color: "#eef6ff",
      desc: "무너진 성소를 실질적으로 복구해 장기 성장 기반을 세웠습니다.",
      requirement: "성소 재건 합계 8단계",
      stats: { goldGain: 0.035, healingPower: 0.05 },
      condition: () => sanctuaryTotalLevel() >= 8,
    },
    {
      id: "companion_bond",
      name: "동료의 맹세",
      color: "#f8f871",
      desc: "서약 동료와 충분한 전투 경험을 나눈 칭호입니다.",
      requirement: "동료 1명 Lv.8 달성",
      stats: { mpRegen: 0.35, damageReduce: 0.015 },
      condition: () =>
        Object.values(state.companions || {}).some(
          (entry) => (entry.level || 1) >= 8,
        ),
    },
    {
      id: "companion_story_keeper",
      name: "동료담 기록자",
      color: "#b7ecff",
      desc: "동료별 임무를 수행해 각자의 이야기를 전투 보정으로 남겼습니다.",
      requirement: "동료 임무 6개 완료",
      stats: { xpGain: 0.025, healingPower: 0.025, wis: 1 },
      condition: () => claimedCompanionMissionCount() >= 6,
    },
    {
      id: "oath_party_legend",
      name: "서약 파티의 전설",
      color: "#ffffff",
      desc: "모든 동료의 장기 임무를 대부분 완수한 서약 파티 칭호입니다.",
      requirement: "동료 임무 15개 완료",
      stats: { atk: 5, def: 5, dropChance: 0.01, skillDamage: 0.03 },
      condition: () => claimedCompanionMissionCount() >= 15,
    },
    {
      id: "set_collector",
      name: "세트 수집가",
      color: "#42d7ff",
      desc: "여러 계열 장비를 모아 빌드 전환 기반을 마련했습니다.",
      requirement: "세트 장비 8종 보유",
      stats: { dropChance: 0.008, goldGain: 0.02 },
      condition: () => ownedSetItemCount() >= 8,
    },
    {
      id: "gear_curator",
      name: "무구 보관관",
      color: "#b7ecff",
      desc: "다양한 장비를 모아 상황별 장비 전환의 토대를 마련했습니다.",
      requirement: "장비 20종 보유",
      stats: { atk: 3, def: 3, dropChance: 0.006 },
      condition: () => ownedGearCount() >= 20,
    },
    {
      id: "relic_collector",
      name: "성유물 수집가",
      color: "#ffffff",
      desc: "영웅과 전설 장비를 충분히 보관해 장기 파밍의 결실을 남겼습니다.",
      requirement: "영웅/전설 장비 12종 보유",
      stats: { xpGain: 0.025, goldGain: 0.025, skillDamage: 0.025 },
      condition: () =>
        ownedGearRarityCount("epic") + ownedGearRarityCount("legend") >= 12,
    },
    {
      id: "salvage_smith",
      name: "분해 장인",
      color: "#ffba5a",
      desc: "남는 장비를 분해해 다음 강화와 제작 재료로 되돌리는 법을 익혔습니다.",
      requirement: "장비 20개 분해",
      stats: { goldGain: 0.02, dropChance: 0.006 },
      condition: () => salvagedGearCount() >= 20,
    },
    {
      id: "rune_initiate",
      name: "각인 입문자",
      color: "#53e2a8",
      desc: "몬스터와 상점에서 얻은 각인으로 장비 운용 폭을 넓혔습니다.",
      requirement: "각인 3종 보유",
      stats: { wis: 1, dropChance: 0.006 },
      condition: () => ownedRuneCount() >= 3,
    },
    {
      id: "rune_weaver",
      name: "각인 직조자",
      color: "#d08cff",
      desc: "세 개의 각인을 동시에 엮어 전투 방식을 완성했습니다.",
      requirement: "각인 3개 동시 장착",
      stats: { skillDamage: 0.04, mpRegen: 0.25 },
      condition: () => equippedRuneIds().length >= 3,
    },
    {
      id: "regional_chronicler",
      name: "지역 연대기 작가",
      color: "#b7ecff",
      desc: "여러 지역의 기억, 의뢰, 균열, 안정화 기록을 엮었습니다.",
      requirement: "지역 연대기 16개 완료",
      stats: { xpGain: 0.03, goldGain: 0.03 },
      condition: () => claimedChronicleCount() >= 16,
    },
    {
      id: "oath_cartographer",
      name: "서약 지도 제작자",
      color: "#ffffff",
      desc: "대륙 곳곳의 지역 서사를 직접 복원한 장기 탐험가 칭호입니다.",
      requirement: "지역 연대기 44개 완료",
      stats: { atk: 4, def: 4, dropChance: 0.01 },
      condition: () => claimedChronicleCount() >= 44,
    },
    {
      id: "legendary_keeper",
      name: "전설 보관자",
      color: "#f8f871",
      desc: "전설 장비를 보유한 서약자에게 주어지는 칭호입니다.",
      requirement: "전설 장비 1개 보유",
      stats: { atk: 5, def: 4 },
      condition: () => ownedLegendaryEquipmentCount() >= 1,
    },
    {
      id: "gear_bond",
      name: "장비와 맺은 맹세",
      color: "#ffba5a",
      desc: "하나의 장비를 오래 사용해 손에 익힌 서약자 칭호입니다.",
      requirement: "장비 숙련 Lv.6 달성",
      stats: { atk: 3, def: 3, xpGain: 0.02 },
      condition: () => maxGearMasteryLevel() >= 6,
    },
    {
      id: "arsenal_master",
      name: "무구의 계승자",
      color: "#ffffff",
      desc: "여러 장비를 오래 다루며 장비 운용의 폭을 넓혔습니다.",
      requirement: "장비 숙련 총합 24 달성",
      stats: { atk: 5, def: 5, skillDamage: 0.03 },
      condition: () => totalGearMasteryLevel() >= 24,
    },
    {
      id: "oathsmith_apprentice",
      name: "서약공 견습장인",
      color: "#ffba5a",
      desc: "몬스터 재료와 지역 기록을 장비 제작으로 연결한 장인 칭호입니다.",
      requirement: "공방 제작 3회 완료",
      stats: { atk: 3, dropChance: 0.008, goldGain: 0.02 },
      condition: () => craftedRecipeCount() >= 3,
    },
    {
      id: "oathsmith_master",
      name: "서약공 명장",
      color: "#f8f871",
      desc: "전설 제작식을 완성해 장비 성장의 또 다른 축을 세웠습니다.",
      requirement: "전설 제작 장비 2종 완성",
      stats: { atk: 6, def: 6, basicDamage: 0.035, skillDamage: 0.035 },
      condition: () => craftedLegendaryRecipeCount() >= 2,
    },
    {
      id: "chronicle_witness",
      name: "연대기의 증인",
      color: "#ffffff",
      desc: "장시간 여정과 주요 장을 함께 쌓아 올린 최종권 칭호입니다.",
      requirement: "30시간 기록과 주요 장 완료",
      stats: { str: 2, vit: 2, wis: 2, agi: 2, skillDamage: 0.045 },
      condition: () =>
        state.playSeconds >= MIN_FINAL_PLAY_SECONDS && state.questIndex >= 79,
    },
  ];

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

  function npcBondMaterial(zoneIndex, npcIndex = 0) {
    if (zoneIndex >= 14) return "dawnPrism";
    if (zoneIndex >= 9) return "abyssCore";
    if (zoneIndex >= 5) return "starDust";
    return npcIndex % 2 ? "guardianThread" : "oathSteel";
  }

  function npcBondStats(npc) {
    const role = `${npc.role || ""} ${npc.name || ""}`;
    if (/사제|수호자|약초|증인|성소/.test(role)) {
      return { healingPower: 0.012, mpRegen: 0.08, vit: 0.25 };
    }
    if (/대장|무기|장비|장인|보급|상|광부|단조/.test(role)) {
      return { atk: 0.75, goldGain: 0.006, dropChance: 0.0015 };
    }
    if (/기록|사서|정보|영웅|연금|서고/.test(role)) {
      return { xpGain: 0.007, wis: 0.35, skillDamage: 0.004 };
    }
    if (/기사|방패|감시|파수|추적|정찰|사냥|선장|망명/.test(role)) {
      return { def: 0.75, damageReduce: 0.004, agi: 0.25 };
    }
    return { xpGain: 0.004, goldGain: 0.004, def: 0.35 };
  }

  function npcBondStories(npc, zone) {
    return [
      `${npc.name}은 ${zone.name}의 ${npc.role}로서, ${zone.subtitle}에 남은 첫 단서를 조심스럽게 건넵니다.`,
      `${npc.name}과 전선의 물자를 나누며 ${zone.name} 주민들이 균열 이후 어떻게 버텼는지 들었습니다.`,
      `${npc.name}은 오래 숨겨 둔 지역 기록을 보여 주며 다음 전투에서 주의할 적의 습성을 알려 줍니다.`,
      `${zone.name}의 신뢰가 깊어지자 ${npc.name}은 서약자의 이름을 지역 방어 명단에 올렸습니다.`,
      `${npc.name}과의 인연이 완성되어 ${zone.name}의 작은 이야기가 서약의 연대기에 함께 묶였습니다.`,
    ];
  }

  function initialContracts() {
    return Object.fromEntries(
      Object.entries(REGIONAL_CONTRACTS).map(([zoneId, contract]) => [
        zoneId,
        {
          target: contract.target,
          progress: 0,
          claimed: false,
          tier: 1,
        },
      ]),
    );
  }

  function initialBounties() {
    return Object.fromEntries(
      ZONES.map((zone) => [
        zone.id,
        {
          target: bountyTarget(zone.id, 1),
          progress: 0,
          tier: 1,
          claimed: 0,
        },
      ]),
    );
  }

  function initialHuntPlans() {
    return { active: null, completed: 0 };
  }

  const REGION_STABILITY_THRESHOLDS = [25, 60, 100];

  function initialRegionStability() {
    return Object.fromEntries(
      ZONES.map((zone) => [zone.id, { points: 0, claimed: [] }]),
    );
  }

  function initialCommendations() {
    return { claimed: [] };
  }

  function initialCompanions() {
    return Object.fromEntries(
      COMPANIONS.map((companion) => [
        companion.id,
        {
          unlocked: companion.unlockQuest === 0,
          level: 1,
          xp: 0,
          cooldown: 0,
        },
      ]),
    );
  }

  function initialCompanionMissions() {
    return { claimed: [] };
  }

  function initialSanctuary() {
    return Object.fromEntries(
      SANCTUARY_FACILITIES.map((facility) => [facility.id, 0]),
    );
  }

  function initialTitles() {
    return { unlocked: ["green_oath"], equipped: "green_oath" };
  }

  function initialMemories() {
    return { collected: [], rewards: [] };
  }

  function initialDiscoveries() {
    return { claimed: [] };
  }

  function initialEchoTrials() {
    return { active: null, cleared: [] };
  }

  function initialActMasteries() {
    return { claimed: [] };
  }

  function initialCampaigns() {
    return { claimed: [] };
  }

  function initialTactics() {
    return { claimed: [] };
  }

  function initialNamedHunts() {
    return { active: null, claimed: [] };
  }

  function initialCampsites() {
    return { claimed: [] };
  }

  function initialPatrols() {
    return { claimed: [] };
  }

  function initialArmory() {
    return { claimed: [] };
  }

  function initialTreasures() {
    return { fragments: {}, claimed: [] };
  }

  function initialChronicles() {
    return { claimed: [] };
  }

  function initialRelics() {
    return { claimed: [] };
  }

  function initialSideStories() {
    return { claimed: [] };
  }

  function initialRegionTrials() {
    return { claimed: [] };
  }

  function initialOathDecisions() {
    return { choices: {} };
  }

  function initialCrafting() {
    return { crafted: [] };
  }

  function initialAlchemy() {
    return { brewed: 0, recipes: {} };
  }

  function initialGathering() {
    return { harvested: 0, nodes: {}, zones: {} };
  }

  function initialNpcBonds() {
    return Object.fromEntries(
      NPC_BONDS.map((bond) => [bond.id, { level: 0, gifts: 0 }]),
    );
  }

  function oathDecisionEntry() {
    if (!state.decisions) state.decisions = initialOathDecisions();
    if (!state.decisions.choices || typeof state.decisions.choices !== "object")
      state.decisions.choices = {};
    return state.decisions;
  }

  function completedActCount() {
    if (state?.completed) return ACTS.length;
    return clamp(
      Math.floor(Number(state?.questIndex || 0) / 4),
      0,
      ACTS.length,
    );
  }

  function actMasteryId(actNo, stageKey) {
    return `act${actNo}_${stageKey}`;
  }

  function parseActMasteryId(id) {
    const match = String(id || "").match(/^act(\d+)_(\w+)$/);
    if (!match) return null;
    const actNo = Number(match[1]);
    const stage = ACT_MASTERY_STAGES.find((item) => item.key === match[2]);
    if (!stage || !ACTS[actNo - 1]) return null;
    return { actNo, stage };
  }

  function validActMasteryId(id) {
    return Boolean(parseActMasteryId(id));
  }

  function actMasteryClaimedIds() {
    if (!state.actMasteries) state.actMasteries = initialActMasteries();
    state.actMasteries.claimed = Array.isArray(state.actMasteries.claimed)
      ? [...new Set(state.actMasteries.claimed)].filter(validActMasteryId)
      : [];
    return state.actMasteries.claimed;
  }

  function claimedActMasteryCount(actNo = 0) {
    const claimed = new Set(actMasteryClaimedIds());
    return ACTS.reduce((sum, _act, index) => {
      const currentActNo = index + 1;
      if (actNo && currentActNo !== actNo) return sum;
      return (
        sum +
        ACT_MASTERY_STAGES.filter((stage) =>
          claimed.has(actMasteryId(currentActNo, stage.key)),
        ).length
      );
    }, 0);
  }

  function actMasteryTaskStatus(actNo) {
    const act = ACTS[actNo - 1];
    if (!act) return [];
    const zoneId = act.zone;
    const actEchoCount = clearedEchoTrialIds().filter((id) =>
      id.startsWith(`act${actNo}_`),
    ).length;
    return [
      {
        key: "main",
        label: "메인 장 보스 클리어",
        done: completedActCount() >= actNo,
      },
      {
        key: "decision",
        label: "장의 결의 선택",
        done: Boolean(oathDecisionEntry().choices?.[`act${actNo}`]),
      },
      {
        key: "memory",
        label: "지역 기억 조각",
        done: zoneMemoryCount(zoneId) >= 1,
      },
      {
        key: "secret",
        label: "지역 탐색 표식",
        done: zoneSecretDiscoveryCount(zoneId) >= 1,
      },
      {
        key: "treasure",
        label: "지역 보물지도",
        done: claimedTreasureCount(zoneId) >= 1,
      },
      {
        key: "named",
        label: "지역 네임드 강적",
        done: claimedNamedHuntCount(zoneId) >= 1,
      },
      {
        key: "camp",
        label: "지역 야영 기록",
        done: claimedCampsiteCount(zoneId) >= 1,
      },
      {
        key: "patrol",
        label: "지역 순찰 작전",
        done: claimedPatrolOperationCount(zoneId) >= 1,
      },
      {
        key: "armory",
        label: "지역 장비록",
        done: claimedArmoryRecordCount(zoneId) >= 1,
      },
      {
        key: "chronicle",
        label: "지역 연대기",
        done: zoneChronicleCount(zoneId) >= 1,
      },
      {
        key: "side",
        label: "지역 외전",
        done: zoneSideStoryClaimedCount(zoneId) >= 1,
      },
      {
        key: "trial",
        label: "지역 수호 시험",
        done: claimedRegionTrialCount(zoneId) >= 1,
      },
      {
        key: "relic",
        label: "지역 유물 복원",
        done: zoneRelicRestoredCount(zoneId) >= 1,
      },
      {
        key: "echo",
        label: "해당 장 회상전",
        done: actEchoCount >= 1,
      },
      {
        key: "commendation",
        label: "주민 감사장",
        done: claimedCommendationCount(zoneId) >= 1,
      },
      {
        key: "expedition",
        label: "지역 균열 기록",
        done: zoneExpeditionCount(zoneId) >= 1,
      },
      {
        key: "contract",
        label: "지역 의뢰",
        done: zoneContractClaims(zoneId) >= 1,
      },
      {
        key: "bounty",
        label: "지역 수배",
        done: zoneBountyClaims(zoneId) >= 1,
      },
      {
        key: "bestiary",
        label: "지역 도감 25킬",
        done: zoneBestiaryKills(zoneId) >= 25,
      },
    ];
  }

  function actMasteryProgress(actNo, stage) {
    const tasks = actMasteryTaskStatus(actNo);
    const current = tasks.filter((task) => task.done).length;
    return {
      current: Math.min(current, stage.required),
      required: stage.required,
      ready: current >= stage.required,
      tasks,
    };
  }

  function actMasteryMaterial(actNo, stageIndex) {
    if (stageIndex >= 2) {
      if (actNo >= 15) return "dawnPrism";
      if (actNo >= 9) return "abyssCore";
      return "starDust";
    }
    if (stageIndex === 1) {
      if (actNo >= 12) return "abyssCore";
      if (actNo >= 6) return "starDust";
      return "oathSteel";
    }
    if (actNo >= 14) return "dawnGinseng";
    if (actNo >= 8) return "riftBloom";
    if (actNo >= 4) return "guardianThread";
    return "greenHerb";
  }

  function actMasteryReward(actNo, stage) {
    const stageIndex = ACT_MASTERY_STAGES.findIndex(
      (item) => item.key === stage.key,
    );
    const material = actMasteryMaterial(actNo, stageIndex);
    return {
      xp: 220 + actNo * 90 + stageIndex * 260,
      gold: 140 + actNo * 58 + stageIndex * 180,
      renown: 1 + stageIndex,
      item: material,
      itemCount: Math.max(1, Math.ceil(actNo / 7)) + stageIndex,
    };
  }

  function claimActMastery(id) {
    const parsed = parseActMasteryId(id);
    if (!parsed) return;
    const { actNo, stage } = parsed;
    const claimed = actMasteryClaimedIds();
    const masteryId = actMasteryId(actNo, stage.key);
    if (claimed.includes(masteryId))
      return toast("이미 받은 영웅서기 장 보상입니다.");
    const progress = actMasteryProgress(actNo, stage);
    if (!progress.ready) return toast(`${stage.name} 조건이 아직 부족합니다.`);
    const act = ACTS[actNo - 1];
    const reward = actMasteryReward(actNo, stage);
    claimed.push(masteryId);
    giveReward(reward);
    addRegionStability(act.zone, 2 + stage.required, "actMastery");
    addJournalEntry({
      title: `영웅서기: ${act.title} ${stage.name}`,
      done: [
        `${act.title}의 ${stage.name}을 완성해 메인 기록, 지역 후일담, 탐색과 전투 기록을 한 장으로 묶었습니다.`,
        `완성 보상으로 ${rewardText(reward)}을 얻었습니다.`,
      ],
    });
    syncTitleUnlocks(true);
    toast(`${act.title} ${stage.name} 보상 수령`);
    openJournal();
  }

  function campaignSpec(id) {
    return OATH_CAMPAIGNS.find((campaign) => campaign.id === id) || null;
  }

  function validCampaignId(id) {
    return Boolean(campaignSpec(id));
  }

  function campaignClaimedIds() {
    if (!state.campaigns) state.campaigns = initialCampaigns();
    state.campaigns.claimed = Array.isArray(state.campaigns.claimed)
      ? [...new Set(state.campaigns.claimed)].filter(validCampaignId)
      : [];
    return state.campaigns.claimed;
  }

  function claimedCampaignCount(scope = "") {
    const claimed = new Set(campaignClaimedIds());
    return OATH_CAMPAIGNS.filter((campaign) => {
      if (scope && campaign.zone !== scope && campaign.act !== scope)
        return false;
      return claimed.has(campaign.id);
    }).length;
  }

  function campaignStageSpec(campaign) {
    return (
      OATH_CAMPAIGN_STAGES.find((stage) => stage.key === campaign?.key) || null
    );
  }

  function campaignProgress(campaign) {
    const stage = campaignStageSpec(campaign);
    const actNo = campaign?.act || 1;
    const zoneId = campaign?.zone || "";
    const tasks = stage
      ? stage.requirements.map((task) => ({
          key: task.key,
          label: task.label,
          done: Boolean(task.check(actNo, zoneId)),
        }))
      : [];
    const current = tasks.filter((task) => task.done).length;
    return {
      current,
      required: tasks.length,
      ready: tasks.length > 0 && current >= tasks.length,
      tasks,
    };
  }

  function campaignRewardItem(campaign) {
    const actNo = campaign?.act || 1;
    if (campaign?.key === "legacy") {
      if (actNo >= 15) return "dawnPrism";
      if (actNo >= 9) return "abyssCore";
      return "starDust";
    }
    if (campaign?.key === "assault") {
      if (actNo >= 14) return "abyssCore";
      if (actNo >= 7) return "guardianThread";
      return "oathSteel";
    }
    if (actNo >= 14) return "dawnGinseng";
    if (actNo >= 8) return "riftBloom";
    if (actNo >= 4) return "mooncapMushroom";
    return "fieldRation";
  }

  function campaignReward(campaign) {
    const stageIndex = Math.max(0, Number(campaign?.stageIndex) || 0);
    const actNo = campaign?.act || 1;
    return {
      xp: 360 + actNo * 120 + stageIndex * 360,
      gold: 220 + actNo * 70 + stageIndex * 240,
      renown: 2 + stageIndex,
      item: campaignRewardItem(campaign),
      itemCount: Math.max(1, Math.ceil(actNo / 6)) + stageIndex,
    };
  }

  function campaignBonus(field) {
    const claimed = new Set(campaignClaimedIds());
    return OATH_CAMPAIGNS.reduce(
      (sum, campaign) =>
        sum +
        (claimed.has(campaign.id) ? Number(campaign.stats?.[field]) || 0 : 0),
      0,
    );
  }

  function claimCampaign(id) {
    const campaign = campaignSpec(id);
    if (!campaign) return;
    const claimed = campaignClaimedIds();
    if (claimed.includes(campaign.id))
      return toast("이미 완료한 서약 원정입니다.");
    const progress = campaignProgress(campaign);
    if (!progress.ready) return toast("서약 원정 조건이 아직 부족합니다.");
    const reward = campaignReward(campaign);
    claimed.push(campaign.id);
    giveReward(reward);
    addRegionStability(campaign.zone, 5 + campaign.stageIndex * 3, "campaign");
    addJournalEntry({
      title: `서약 원정: ${campaign.title}`,
      done: [
        `${campaign.title}을 완료해 ${zoneMap[campaign.zone]?.name || "해당 지역"}의 보급, 전투, 서사를 다시 정리했습니다.`,
        `원정 보상으로 ${rewardText(reward)}을 얻고 ${buffStatsText(campaign.stats)} 보정이 누적되었습니다.`,
      ],
    });
    syncTitleUnlocks(true);
    toast(`${campaign.name} 완료`);
    openCampaigns();
  }

  function tacticManualSpec(id) {
    return TACTIC_MANUALS.find((manual) => manual.id === id) || null;
  }

  function validTacticManualId(id) {
    return Boolean(tacticManualSpec(id));
  }

  function tacticManualClaimedIds() {
    if (!state.tactics) state.tactics = initialTactics();
    state.tactics.claimed = Array.isArray(state.tactics.claimed)
      ? [...new Set(state.tactics.claimed)].filter(validTacticManualId)
      : [];
    return state.tactics.claimed;
  }

  function claimedTacticManualCount(scope = "") {
    const claimed = new Set(tacticManualClaimedIds());
    return TACTIC_MANUALS.filter((manual) => {
      if (scope && manual.zone !== scope && manual.key !== scope) return false;
      return claimed.has(manual.id);
    }).length;
  }

  function tacticManualRequirementValue(requirement, manual, field) {
    const value = requirement?.[field];
    return typeof value === "function"
      ? Math.max(0, Math.floor(Number(value(manual)) || 0))
      : Math.max(0, Math.floor(Number(value) || 0));
  }

  function tacticManualProgress(manual) {
    if (!manual) return { ready: false, rows: [] };
    const unlocked = state.unlockedZones?.includes(manual.zone);
    const rows = manual.requirements.map((requirement) => {
      const required = Math.max(
        1,
        tacticManualRequirementValue(requirement, manual, "target"),
      );
      const raw = tacticManualRequirementValue(requirement, manual, "current");
      return {
        label: requirement.label,
        current: Math.min(raw, required),
        raw,
        required,
        ready: raw >= required,
      };
    });
    return {
      ready: Boolean(unlocked) && rows.every((row) => row.ready),
      unlocked: Boolean(unlocked),
      rows,
    };
  }

  function tacticManualReward(manual) {
    const rank = (manual?.zoneIndex || 0) + 1;
    const material =
      manual?.key === "blade"
        ? rank >= 12
          ? "dawnPrism"
          : rank >= 7
            ? "abyssCore"
            : "oathSteel"
        : manual?.key === "ward"
          ? rank >= 12
            ? "dawnPrism"
            : rank >= 7
              ? "starDust"
              : "guardianThread"
          : rank >= 12
            ? "dawnGinseng"
            : rank >= 7
              ? "riftBloom"
              : "mooncapMushroom";
    return {
      xp: 240 + rank * 74 + (manual?.stageIndex || 0) * 150,
      gold: 160 + rank * 54 + (manual?.stageIndex || 0) * 110,
      renown: 1 + Math.floor(rank / 7),
      item: material,
      itemCount: rank >= 13 ? 3 : rank >= 8 ? 2 : 1,
    };
  }

  function tacticManualBonus(field) {
    const claimed = new Set(tacticManualClaimedIds());
    return TACTIC_MANUALS.reduce(
      (sum, manual) =>
        sum + (claimed.has(manual.id) ? Number(manual.stats?.[field]) || 0 : 0),
      0,
    );
  }

  function tacticManualStatsText(manual) {
    return buffStatsText(manual?.stats || {});
  }

  function claimTacticManual(id) {
    const manual = tacticManualSpec(id);
    if (!manual) return;
    const claimed = tacticManualClaimedIds();
    if (claimed.includes(manual.id))
      return toast("이미 정리한 전술 교범입니다.");
    const progress = tacticManualProgress(manual);
    if (!progress.ready) return toast("전술 교범 조건이 아직 부족합니다.");
    const reward = tacticManualReward(manual);
    claimed.push(manual.id);
    giveReward(reward);
    addRegionStability(manual.zone, 3 + manual.stageIndex, "tactic");
    addJournalEntry({
      title: `전술 교범: ${manual.title}`,
      done: [
        `${zoneMap[manual.zone]?.name || manual.zone}의 ${manual.label} 기록을 전술 교범으로 정리했습니다.`,
        `교범 보상으로 ${rewardText(reward)}을 얻고 ${tacticManualStatsText(manual)} 보정이 누적되었습니다.`,
      ],
    });
    syncTitleUnlocks(true);
    toast(`${manual.title} 정리 완료`);
    openTactics();
  }

  function namedHuntEntry() {
    if (!state.namedHunts) state.namedHunts = initialNamedHunts();
    const entry = state.namedHunts;
    const activeId =
      typeof entry.active === "string" ? entry.active : entry.active?.id;
    entry.active = validNamedHuntId(activeId)
      ? {
          id: activeId,
          startedAt: Math.max(0, Number(entry.active?.startedAt) || 0),
        }
      : null;
    entry.claimed = Array.isArray(entry.claimed)
      ? [...new Set(entry.claimed)].filter(validNamedHuntId)
      : [];
    return entry;
  }

  function validNamedHuntId(id) {
    return REGIONAL_NAMED_HUNTS.some((hunt) => hunt.id === id);
  }

  function namedHuntSpec(id) {
    return REGIONAL_NAMED_HUNTS.find((hunt) => hunt.id === id) || null;
  }

  function namedHuntDisplayName(hunt) {
    if (!hunt) return "네임드 강적";
    return `${hunt.epithet} ${ENEMIES[hunt.target]?.name || hunt.target}`;
  }

  function namedHuntClaimedIds() {
    return namedHuntEntry().claimed;
  }

  function activeNamedHunt() {
    const active = namedHuntEntry().active;
    const spec = active ? namedHuntSpec(active.id) : null;
    if (!spec) {
      namedHuntEntry().active = null;
      return null;
    }
    return { ...spec, startedAt: active.startedAt || 0 };
  }

  function claimedNamedHuntCount(zoneId = "") {
    const claimed = new Set(namedHuntClaimedIds());
    return REGIONAL_NAMED_HUNTS.filter(
      (hunt) => claimed.has(hunt.id) && (!zoneId || hunt.zone === zoneId),
    ).length;
  }

  function namedHuntProgress(hunt) {
    const kills = zoneBestiaryKills(hunt.zone);
    const fragments = treasureFragmentCount(hunt.zone);
    const ready =
      state.unlockedZones.includes(hunt.zone) &&
      kills >= hunt.requiredKills &&
      fragments >= hunt.requiredFragments;
    return {
      ready,
      kills: Math.min(kills, hunt.requiredKills),
      fragments: Math.min(fragments, hunt.requiredFragments),
      requiredKills: hunt.requiredKills,
      requiredFragments: hunt.requiredFragments,
    };
  }

  function namedHuntRewardItem(hunt) {
    const pool = (MONSTER_EQUIPMENT_DROPS[hunt.target] || []).filter((id) =>
      isGearItem(ITEMS[id]),
    );
    if (pool.length) return pool[(hunt.zoneIndex + 1) % pool.length];
    if (hunt.zoneIndex >= 14) return "dawnPrism";
    if (hunt.zoneIndex >= 9) return "abyssCore";
    return "starDust";
  }

  function namedHuntReward(hunt) {
    const item = namedHuntRewardItem(hunt);
    const gear = isGearItem(ITEMS[item]);
    return {
      xp: 720 + (hunt.zoneIndex + 1) * 185,
      gold: 420 + (hunt.zoneIndex + 1) * 120,
      renown: 3 + Math.floor(hunt.zoneIndex / 4),
      item,
      itemCount: gear ? 1 : 3 + Math.floor(hunt.zoneIndex / 5),
    };
  }

  function startNamedHunt(id) {
    const hunt = namedHuntSpec(id);
    if (!hunt) return;
    if (namedHuntClaimedIds().includes(id))
      return toast("이미 토벌한 네임드 강적입니다.");
    if (activeNamedHunt())
      return toast("이미 진행 중인 네임드 토벌이 있습니다.");
    const progress = namedHuntProgress(hunt);
    if (!progress.ready)
      return toast("도감 처치 기록과 지도 조각 조건이 아직 부족합니다.");
    namedHuntEntry().active = { id, startedAt: state.playSeconds };
    state.enemies = [];
    state.worldEvent = null;
    state.worldEventCooldown = Math.max(state.worldEventCooldown || 90, 90);
    if (state.zone !== hunt.zone) changeZone(hunt.zone);
    closeModal();
    toast(`${namedHuntDisplayName(hunt)} 토벌을 시작했습니다.`);
    saveGame(false);
  }

  function abandonNamedHunt() {
    const active = activeNamedHunt();
    if (!active) return;
    namedHuntEntry().active = null;
    state.enemies = state.enemies.filter((enemy) => !enemy.namedHuntId);
    toast(`${namedHuntDisplayName(active)} 토벌을 포기했습니다.`);
    openNamedHunts();
  }

  function completeNamedHunt(id, enemy) {
    const hunt = namedHuntSpec(id);
    if (!hunt) return;
    const claimed = namedHuntClaimedIds();
    if (!claimed.includes(id)) claimed.push(id);
    namedHuntEntry().active = null;
    const reward = namedHuntReward(hunt);
    giveReward(reward);
    addRegionStability(hunt.zone, 10 + Math.floor(hunt.zoneIndex / 2), "named");
    addJournalEntry({
      title: `네임드 토벌: ${namedHuntDisplayName(hunt)}`,
      done: [
        `${zoneMap[hunt.zone].name}의 강적 ${namedHuntDisplayName(hunt)}을 쓰러뜨려 지역의 남은 위협을 낮췄습니다.`,
        `토벌 보상으로 ${rewardText(reward)}을 얻었습니다.`,
      ],
    });
    showEffect(enemy.x, enemy.y - 118, "강적 토벌", hunt.color);
    syncTitleUnlocks(true);
    toast(`${namedHuntDisplayName(hunt)} 토벌 완료`);
    saveGame(false);
  }

  function campsiteEntry() {
    if (!state.campsites) state.campsites = initialCampsites();
    state.campsites.claimed = Array.isArray(state.campsites.claimed)
      ? [...new Set(state.campsites.claimed)].filter(validCampsiteId)
      : [];
    return state.campsites;
  }

  function validCampsiteId(id) {
    return REGIONAL_CAMPSITES.some((camp) => camp.id === id);
  }

  function campsiteSpec(id) {
    return REGIONAL_CAMPSITES.find((camp) => camp.id === id) || null;
  }

  function campsiteClaimedIds() {
    return campsiteEntry().claimed;
  }

  function claimedCampsiteCount(zoneId = "") {
    const claimed = new Set(campsiteClaimedIds());
    return REGIONAL_CAMPSITES.filter(
      (camp) => claimed.has(camp.id) && (!zoneId || camp.zone === zoneId),
    ).length;
  }

  function campsitesForZone(zoneId = state.zone) {
    const claimed = new Set(campsiteClaimedIds());
    return REGIONAL_CAMPSITES.filter((camp) => camp.zone === zoneId).map(
      (camp) => ({
        ...camp,
        claimed: claimed.has(camp.id),
      }),
    );
  }

  function visibleCampsites(zoneId = state.zone) {
    return campsitesForZone(zoneId).filter(
      (camp) => state.unlockedZones.includes(camp.zone) && !camp.claimed,
    );
  }

  function nearestCampsite() {
    return visibleCampsites()
      .map((camp) => ({
        ...camp,
        d: distance(state.player.x, state.player.y, camp.x, camp.y),
      }))
      .sort((a, b) => a.d - b.d)[0];
  }

  function campsiteRewardItem(camp) {
    if (camp.zoneIndex >= 13) return "dawnGinseng";
    if (camp.zoneIndex >= 8) return "riftBloom";
    if (camp.zoneIndex >= 4) return "mooncapMushroom";
    return "greenHerb";
  }

  function campsiteReward(camp) {
    return {
      xp: 180 + (camp.zoneIndex + 1) * 70,
      gold: 90 + (camp.zoneIndex + 1) * 38,
      renown: 1 + Math.floor(camp.zoneIndex / 6),
      item: campsiteRewardItem(camp),
      itemCount: 1 + Math.floor(camp.zoneIndex / 7),
    };
  }

  function applyCampsiteBuff(camp) {
    const id = `camp_${camp.zone}`;
    state.player.activeBuffs = activeBuffs().filter(
      (entry) => !String(entry.id || "").startsWith("camp_"),
    );
    state.player.activeBuffs.push({
      id,
      name: camp.label,
      color: camp.color,
      ttl: 900,
      stats: { ...camp.stats },
    });
    showEffect(state.player.x, state.player.y - 78, "야영 효과", camp.color);
  }

  function restAtCampsite(camp) {
    if (!camp || camp.d > 118) return;
    const current = campsiteSpec(camp.id);
    if (!current) return;
    const claimed = campsiteClaimedIds();
    if (claimed.includes(current.id)) return toast("이미 휴식한 야영지입니다.");
    claimed.push(current.id);
    const reward = campsiteReward(current);
    giveReward(reward);
    applyCampsiteBuff(current);
    state.player.hp = Math.min(
      state.player.maxHp,
      state.player.hp + Math.round(state.player.maxHp * 0.45),
    );
    state.player.mp = Math.min(
      state.player.maxMp,
      state.player.mp + Math.round(state.player.maxMp * 0.55),
    );
    addCompanionXp(80 + current.zoneIndex * 18);
    addRegionStability(
      current.zone,
      3 + Math.floor(current.zoneIndex / 4),
      "camp",
    );
    addJournalEntry({
      title: `야영지: ${current.title}`,
      done: [
        current.text,
        `야영 보상으로 ${rewardText(reward)}을 얻고 ${buffStatsText(current.stats)} 효과를 준비했습니다.`,
      ],
    });
    showEffect(current.x, current.y - 64, "휴식 완료", current.color);
    syncTitleUnlocks(true);
    toast(`${current.title}에서 휴식했습니다.`);
    if (modalMode === "camps") openCamps();
    saveGame(false);
  }

  function patrolEntry() {
    if (!state.patrols) state.patrols = initialPatrols();
    state.patrols.claimed = Array.isArray(state.patrols.claimed)
      ? [...new Set(state.patrols.claimed)].filter(validPatrolOperationId)
      : [];
    return state.patrols;
  }

  function validPatrolOperationId(id) {
    return REGIONAL_PATROL_OPERATIONS.some((operation) => operation.id === id);
  }

  function patrolOperationSpec(id) {
    return (
      REGIONAL_PATROL_OPERATIONS.find((operation) => operation.id === id) ||
      null
    );
  }

  function patrolClaimedIds() {
    return patrolEntry().claimed;
  }

  function claimedPatrolOperationCount(zoneId = "") {
    const claimed = new Set(patrolClaimedIds());
    return REGIONAL_PATROL_OPERATIONS.filter(
      (operation) =>
        claimed.has(operation.id) && (!zoneId || operation.zone === zoneId),
    ).length;
  }

  function patrolOperationRequirement(operation) {
    const rank = operation.zoneIndex + 1;
    if (operation.key === "scout") {
      return {
        primary: 12 + operation.zoneIndex * 4,
        secondary: 1 + Math.floor(operation.zoneIndex / 7),
      };
    }
    if (operation.key === "supply") {
      return {
        primary: 2 + Math.floor(operation.zoneIndex / 5),
        secondary: 1 + Math.floor(operation.zoneIndex / 8),
      };
    }
    return {
      primary: 18 + rank * 4,
      secondary: 1 + Math.floor(operation.zoneIndex / 6),
    };
  }

  function patrolOperationProgress(operation) {
    const requirement = patrolOperationRequirement(operation);
    const unlocked = state.unlockedZones.includes(operation.zone);
    if (operation.key === "scout") {
      const primary = zoneBestiaryKills(operation.zone);
      const secondary =
        zoneMemoryCount(operation.zone) +
        zoneSecretDiscoveryCount(operation.zone);
      return {
        unlocked,
        ready:
          unlocked &&
          primary >= requirement.primary &&
          secondary >= requirement.secondary,
        primary: Math.min(primary, requirement.primary),
        primaryRequired: requirement.primary,
        primaryLabel: "지역 도감 처치",
        secondary: Math.min(secondary, requirement.secondary),
        secondaryRequired: requirement.secondary,
        secondaryLabel: "기억/탐색 기록",
      };
    }
    if (operation.key === "supply") {
      const primary =
        zoneForageCount(operation.zone) +
        claimedCampsiteCount(operation.zone) * 2;
      const secondary =
        zoneContractClaims(operation.zone) +
        claimedCampsiteCount(operation.zone);
      return {
        unlocked,
        ready:
          unlocked &&
          primary >= requirement.primary &&
          secondary >= requirement.secondary,
        primary: Math.min(primary, requirement.primary),
        primaryRequired: requirement.primary,
        primaryLabel: "채집/야영 보급",
        secondary: Math.min(secondary, requirement.secondary),
        secondaryRequired: requirement.secondary,
        secondaryLabel: "의뢰/야영 연결",
      };
    }
    const primary = Math.floor(regionStabilityValue(operation.zone));
    const secondary =
      zoneBountyClaims(operation.zone) +
      zoneExpeditionCount(operation.zone) +
      claimedRegionTrialCount(operation.zone) +
      claimedNamedHuntCount(operation.zone);
    return {
      unlocked,
      ready:
        unlocked &&
        primary >= requirement.primary &&
        secondary >= requirement.secondary,
      primary: Math.min(primary, requirement.primary),
      primaryRequired: requirement.primary,
      primaryLabel: "지역 안정도",
      secondary: Math.min(secondary, requirement.secondary),
      secondaryRequired: requirement.secondary,
      secondaryLabel: "수배/균열/시험/강적",
    };
  }

  function patrolRewardItem(operation) {
    if (operation.key === "scout") {
      if (operation.zoneIndex >= 10) return "abyssCore";
      if (operation.zoneIndex >= 5) return "starDust";
      return "guardianThread";
    }
    if (operation.key === "supply") {
      if (operation.zoneIndex >= 13) return "dawnGinseng";
      if (operation.zoneIndex >= 8) return "riftBloom";
      if (operation.zoneIndex >= 4) return "mooncapMushroom";
      return "greenHerb";
    }
    if (operation.zoneIndex >= 14) return "dawnPrism";
    if (operation.zoneIndex >= 9) return "abyssCore";
    return "oathSteel";
  }

  function patrolOperationReward(operation) {
    const rank = operation.zoneIndex + 1;
    const keyBonus =
      operation.key === "ward" ? 1.22 : operation.key === "supply" ? 1.08 : 1;
    return {
      xp: Math.round((190 + rank * 76 + operation.stageIndex * 130) * keyBonus),
      gold: Math.round(
        (120 + rank * 48 + operation.stageIndex * 95) * keyBonus,
      ),
      renown: 1 + Math.floor(operation.zoneIndex / 6) + operation.stageIndex,
      item: patrolRewardItem(operation),
      itemCount: 1 + Math.floor(operation.zoneIndex / 8) + operation.stageIndex,
    };
  }

  function patrolStatsText(operation) {
    return buffStatsText(operation.stats);
  }

  function claimPatrolOperation(id) {
    const operation = patrolOperationSpec(id);
    if (!operation) return;
    const claimed = patrolClaimedIds();
    if (claimed.includes(id)) return toast("이미 완료한 순찰 작전입니다.");
    const progress = patrolOperationProgress(operation);
    if (!progress.ready)
      return toast("순찰 작전 조건이 아직 충족되지 않았습니다.");
    claimed.push(id);
    const reward = patrolOperationReward(operation);
    giveReward(reward);
    addRegionStability(
      operation.zone,
      2 + operation.stageIndex + Math.floor(operation.zoneIndex / 5),
      "patrol",
    );
    addJournalEntry({
      title: `순찰 작전: ${operation.title}`,
      done: [
        operation.text,
        `순찰 보상으로 ${rewardText(reward)}을 얻고 ${patrolStatsText(operation)} 작전 기록이 누적되었습니다.`,
      ],
    });
    syncTitleUnlocks(true);
    toast(`${operation.title} 완료`);
    openPatrols();
    saveGame(false);
  }

  function armoryEntry() {
    if (!state.armory) state.armory = initialArmory();
    state.armory.claimed = Array.isArray(state.armory.claimed)
      ? [...new Set(state.armory.claimed)].filter(validArmoryRecordId)
      : [];
    return state.armory;
  }

  function validArmoryRecordId(id) {
    return REGIONAL_ARMORY_RECORDS.some((record) => record.id === id);
  }

  function armoryRecordSpec(id) {
    return REGIONAL_ARMORY_RECORDS.find((record) => record.id === id) || null;
  }

  function armoryClaimedIds() {
    return armoryEntry().claimed;
  }

  function claimedArmoryRecordCount(zoneId = "") {
    const claimed = new Set(armoryClaimedIds());
    return REGIONAL_ARMORY_RECORDS.filter(
      (record) => claimed.has(record.id) && (!zoneId || record.zone === zoneId),
    ).length;
  }

  function regionMonsterGearIds(zoneId) {
    const zone = zoneMap[zoneId];
    if (!zone) return [];
    const ids = (zone.enemies || []).flatMap((type) =>
      monsterEquipmentDropPool(type),
    );
    return [...new Set(ids)];
  }

  function ownedRegionGearIds(zoneId) {
    const owned = new Set(gearCollectionIds());
    return regionMonsterGearIds(zoneId).filter((id) => owned.has(id));
  }

  function regionGearMasteryScore(zoneId) {
    return regionMonsterGearIds(zoneId).reduce((sum, id) => {
      const level = gearMasteryLevel(id);
      const enhance = enhancementLevel(id);
      return sum + level + enhance * 2;
    }, 0);
  }

  function armoryRecordRequirement(record) {
    const pool = regionMonsterGearIds(record.zone);
    const rank = record.zoneIndex + 1;
    if (record.key === "catalog") {
      return {
        primary: Math.min(1, pool.length || 1),
        secondary: 14 + record.zoneIndex * 4,
      };
    }
    return {
      primary: Math.min(2, pool.length || 1),
      secondary: 4 + Math.floor(rank / 2),
    };
  }

  function armoryRecordProgress(record) {
    const requirement = armoryRecordRequirement(record);
    const unlocked = state.unlockedZones.includes(record.zone);
    const owned = ownedRegionGearIds(record.zone);
    if (record.key === "catalog") {
      const kills = zoneBestiaryKills(record.zone);
      return {
        unlocked,
        ready:
          unlocked &&
          owned.length >= requirement.primary &&
          kills >= requirement.secondary,
        primary: Math.min(owned.length, requirement.primary),
        primaryRequired: requirement.primary,
        primaryLabel: "고유 장비 보유",
        secondary: Math.min(kills, requirement.secondary),
        secondaryRequired: requirement.secondary,
        secondaryLabel: "지역 도감 처치",
        owned,
      };
    }
    const score = regionGearMasteryScore(record.zone);
    return {
      unlocked,
      ready:
        unlocked &&
        owned.length >= requirement.primary &&
        score >= requirement.secondary,
      primary: Math.min(owned.length, requirement.primary),
      primaryRequired: requirement.primary,
      primaryLabel: "고유 장비 보유",
      secondary: Math.min(score, requirement.secondary),
      secondaryRequired: requirement.secondary,
      secondaryLabel: "숙련/강화 점수",
      owned,
    };
  }

  function armoryRewardItem(record) {
    if (record.key === "mastery") {
      if (record.zoneIndex >= 13) return "dawnPrism";
      if (record.zoneIndex >= 8) return "abyssCore";
      return "starDust";
    }
    if (record.zoneIndex >= 12) return "riftBloom";
    if (record.zoneIndex >= 6) return "mooncapMushroom";
    return record.zoneIndex % 2 ? "oathSteel" : "guardianThread";
  }

  function armoryRecordReward(record) {
    const rank = record.zoneIndex + 1;
    const mastery = record.key === "mastery";
    return {
      xp: 210 + rank * 82 + (mastery ? 260 : 0),
      gold: 130 + rank * 54 + (mastery ? 180 : 0),
      renown: 1 + Math.floor(record.zoneIndex / 7) + (mastery ? 1 : 0),
      item: armoryRewardItem(record),
      itemCount: 1 + Math.floor(record.zoneIndex / 8) + (mastery ? 1 : 0),
    };
  }

  function armoryBonus(field) {
    const claimed = new Set(armoryClaimedIds());
    return REGIONAL_ARMORY_RECORDS.reduce(
      (sum, record) =>
        sum + (claimed.has(record.id) ? Number(record.stats?.[field]) || 0 : 0),
      0,
    );
  }

  function claimArmoryRecord(id) {
    const record = armoryRecordSpec(id);
    if (!record) return;
    const claimed = armoryClaimedIds();
    if (claimed.includes(id)) return toast("이미 등록한 장비록입니다.");
    const progress = armoryRecordProgress(record);
    if (!progress.ready)
      return toast("장비록 등록 조건이 아직 충족되지 않았습니다.");
    claimed.push(id);
    const reward = armoryRecordReward(record);
    giveReward(reward);
    addRegionStability(record.zone, 2 + record.stageIndex, "armory");
    addJournalEntry({
      title: `지역 장비록: ${record.title}`,
      done: [
        record.text,
        `장비록 보상으로 ${rewardText(reward)}을 얻고 ${buffStatsText(record.stats)} 보정이 누적되었습니다.`,
      ],
    });
    syncTitleUnlocks(true);
    toast(`${record.title} 등록 완료`);
    openArmory();
    saveGame(false);
  }

  function treasureEntry() {
    if (!state.treasures) state.treasures = initialTreasures();
    if (
      !state.treasures.fragments ||
      typeof state.treasures.fragments !== "object"
    )
      state.treasures.fragments = {};
    if (!Array.isArray(state.treasures.claimed)) state.treasures.claimed = [];
    ZONES.forEach((zone) => {
      state.treasures.fragments[zone.id] = Math.max(
        0,
        Math.floor(Number(state.treasures.fragments[zone.id]) || 0),
      );
    });
    state.treasures.claimed = [...new Set(state.treasures.claimed)].filter(
      validTreasureSiteId,
    );
    return state.treasures;
  }

  function validTreasureSiteId(id) {
    return REGION_TREASURE_SITES.some((site) => site.id === id);
  }

  function treasureSiteById(id) {
    return REGION_TREASURE_SITES.find((site) => site.id === id) || null;
  }

  function treasureFragmentCount(zoneId = state.zone) {
    return Math.max(
      0,
      Math.floor(Number(treasureEntry().fragments[zoneId]) || 0),
    );
  }

  function totalTreasureFragments() {
    const entry = treasureEntry();
    return Object.values(entry.fragments).reduce(
      (sum, count) => sum + Math.max(0, Math.floor(Number(count) || 0)),
      0,
    );
  }

  function treasureClaimedIds() {
    return treasureEntry().claimed;
  }

  function claimedTreasureCount(zoneId = "") {
    const claimed = new Set(treasureClaimedIds());
    return REGION_TREASURE_SITES.filter(
      (site) => claimed.has(site.id) && (!zoneId || site.zone === zoneId),
    ).length;
  }

  function treasureSitesForZone(zoneId = state.zone) {
    const claimed = new Set(treasureClaimedIds());
    const fragments = treasureFragmentCount(zoneId);
    return REGION_TREASURE_SITES.filter((site) => site.zone === zoneId).map(
      (site) => ({
        ...site,
        fragments,
        ready: fragments >= site.required,
        claimed: claimed.has(site.id),
      }),
    );
  }

  function visibleTreasureSites(zoneId = state.zone) {
    return treasureSitesForZone(zoneId).filter(
      (site) =>
        state.unlockedZones.includes(site.zone) && site.ready && !site.claimed,
    );
  }

  function nearestTreasureSite() {
    return visibleTreasureSites()
      .map((site) => ({
        ...site,
        d: distance(state.player.x, state.player.y, site.x, site.y),
      }))
      .sort((a, b) => a.d - b.d)[0];
  }

  function treasureRewardItem(site) {
    const zone = zoneMap[site.zone];
    const gearPool = (zone?.enemies || [])
      .flatMap((type) => MONSTER_EQUIPMENT_DROPS[type] || [])
      .filter((id) => isGearItem(ITEMS[id]));
    if (site.key !== "cache" && gearPool.length) {
      return gearPool[(site.zoneIndex + site.stageIndex * 3) % gearPool.length];
    }
    if (site.key === "archive") {
      if (site.zoneIndex >= 13) return "dawnPrism";
      if (site.zoneIndex >= 8) return "abyssCore";
      return "starDust";
    }
    if (site.zoneIndex >= 12) return "riftBloom";
    if (site.zoneIndex >= 6) return "mooncapMushroom";
    return site.stageIndex % 2 ? "oathSteel" : "guardianThread";
  }

  function treasureReward(site) {
    const item = treasureRewardItem(site);
    const gear = isGearItem(ITEMS[item]);
    return {
      xp: 260 + (site.zoneIndex + 1) * 86 + site.stageIndex * 180,
      gold: 150 + (site.zoneIndex + 1) * 58 + site.stageIndex * 150,
      renown: 1 + site.stageIndex,
      item,
      itemCount: gear
        ? 1
        : 1 + Math.floor(site.zoneIndex / 6) + site.stageIndex,
    };
  }

  function collectTreasureSite(site) {
    if (!site || site.d > 116) return;
    const current = treasureSiteById(site.id);
    if (!current) return;
    const claimed = treasureClaimedIds();
    if (claimed.includes(current.id))
      return toast("이미 발굴한 보물지도입니다.");
    if (treasureFragmentCount(current.zone) < current.required)
      return toast("지도 조각이 아직 부족합니다.");
    claimed.push(current.id);
    const reward = treasureReward(current);
    giveReward(reward);
    addRegionStability(current.zone, 3 + current.stageIndex * 2, "treasure");
    addJournalEntry({
      title: `보물지도: ${current.title}`,
      done: [current.text, `발굴 보상으로 ${rewardText(reward)}을 얻었습니다.`],
    });
    showEffect(current.x, current.y - 60, current.label, current.color);
    syncTitleUnlocks(true);
    toast(`${current.title} 발굴 완료`);
    saveGame(false);
  }

  function rollTreasureFragment(enemy) {
    if (!enemy || enemy.echoTrialId || !zoneMap[state.zone]) return;
    const zoneSites = REGION_TREASURE_SITES.filter(
      (site) => site.zone === state.zone,
    );
    if (
      !zoneSites.length ||
      claimedTreasureCount(state.zone) >= zoneSites.length
    )
      return;
    const before = treasureFragmentCount(state.zone);
    const nextUnclaimed = zoneSites.find(
      (site) => !treasureClaimedIds().includes(site.id),
    );
    const affix = enemyEliteAffix(enemy);
    const chance =
      0.028 +
      (enemy.boss ? 0.14 : 0) +
      (affix ? 0.025 : 0) +
      Math.min(0.018, bestiaryResearchTier(enemy.type) * 0.002) +
      huntPlanBonus(enemy, "materialDrop") * 0.35 +
      relicBonus("dropChance") * 0.4 +
      commendationBonus("dropChance") * 0.3 +
      titleBonus("dropChance") * 0.35;
    if (Math.random() > chance) return;
    treasureEntry().fragments[state.zone] = before + (enemy.boss ? 2 : 1);
    const after = treasureFragmentCount(state.zone);
    showEffect(enemy.x, enemy.y - 102, "지도 조각", "#f8f871");
    if (
      nextUnclaimed &&
      before < nextUnclaimed.required &&
      after >= nextUnclaimed.required
    ) {
      toast(
        `${zoneMap[state.zone].name} 보물지도 완성. 보물 메뉴 또는 미니맵에서 위치를 확인하세요.`,
      );
    }
  }

  function oathDecisionPath(key) {
    return OATH_DECISION_PATHS.find((path) => path.key === key) || null;
  }

  function chosenOathDecisions() {
    const choices = oathDecisionEntry().choices;
    return Object.entries(choices)
      .map(([decisionId, key]) => ({
        decision: OATH_DECISIONS.find((item) => item.id === decisionId),
        path: oathDecisionPath(key),
      }))
      .filter((entry) => entry.decision && entry.path);
  }

  function totalOathDecisionCount() {
    return chosenOathDecisions().length;
  }

  function oathDecisionPathCount(key) {
    return chosenOathDecisions().filter((entry) => entry.path.key === key)
      .length;
  }

  function decisionBonus(field) {
    return chosenOathDecisions().reduce(
      (sum, entry) => sum + (Number(entry.path.stats?.[field]) || 0),
      0,
    );
  }

  function decisionBonusText() {
    const fields = [
      "atk",
      "def",
      "vit",
      "wis",
      "agi",
      "xpGain",
      "goldGain",
      "dropChance",
      "damageReduce",
      "healingPower",
      "skillDamage",
      "mpRegen",
    ];
    const parts = fields
      .map((field) => {
        const value = decisionBonus(field);
        return value ? statLabel(field, value) : "";
      })
      .filter(Boolean);
    return parts.join(" · ") || "아직 누적 보정이 없습니다.";
  }

  function oathDecisionReward(decision, path) {
    const act = decision.act || 1;
    return {
      xp: 180 + act * 55,
      gold: 120 + act * 42,
      renown: 1 + Math.floor(act / 5),
      item: path.item,
      itemCount: act >= 16 ? 3 : act >= 9 ? 2 : 1,
    };
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
        oathCooldowns: Object.fromEntries(OATH_ARTS.map((art) => [art.id, 0])),
        dashCd: 0,
        dashTime: 0,
        dashVx: 0,
        dashVy: 0,
        invuln: 0,
        hurtFlash: 0,
        oathShield: 0,
        combo: 0,
        comboTimer: 0,
        statPoints: 0,
        skillPoints: 0,
        skillRank: 0,
        specializations: { blade: 0, ward: 0, surge: 0 },
        renown: 0,
        baseStats: { str: 5, vit: 5, wis: 4, agi: 4 },
        equipment: { weapon: "", armor: "", charm: "" },
        gearLoadouts: initialGearLoadouts(),
        runes: [],
        enhancements: {},
        gearMastery: {},
        salvagedGear: 0,
        activeBuffs: [],
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
      contracts: initialContracts(),
      bounties: initialBounties(),
      huntPlans: initialHuntPlans(),
      bestiary: {},
      bestiaryRewards: [],
      regionStability: initialRegionStability(),
      commendations: initialCommendations(),
      companions: initialCompanions(),
      companionMissions: initialCompanionMissions(),
      activeCompanion: "lia",
      companionPosition: { x: 700, y: 1030, phase: 0, attackFlash: 0 },
      sanctuary: initialSanctuary(),
      titles: initialTitles(),
      memories: initialMemories(),
      discoveries: initialDiscoveries(),
      echoTrials: initialEchoTrials(),
      actMasteries: initialActMasteries(),
      campaigns: initialCampaigns(),
      tactics: initialTactics(),
      namedHunts: initialNamedHunts(),
      campsites: initialCampsites(),
      patrols: initialPatrols(),
      armory: initialArmory(),
      treasures: initialTreasures(),
      chronicles: initialChronicles(),
      relics: initialRelics(),
      sideStories: initialSideStories(),
      regionTrials: initialRegionTrials(),
      decisions: initialOathDecisions(),
      crafting: initialCrafting(),
      alchemy: initialAlchemy(),
      gathering: initialGathering(),
      npcBonds: initialNpcBonds(),
      expedition: null,
      expeditionLog: [],
      expeditionNodes: [],
      expeditionNodeFloor: "",
      worldEvent: null,
      worldEventCooldown: 45,
      worldEventLog: [],
      enemies: [],
      drops: [],
      effects: [],
      hazards: [],
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
    next.player.gearLoadouts = normalizeGearLoadouts(
      save?.player?.gearLoadouts,
    );
    next.player.runes = Array.isArray(save?.player?.runes)
      ? [...new Set(save.player.runes)]
          .filter((id) => ITEMS[id]?.type === "rune")
          .slice(0, 3)
      : [];
    next.player.enhancements = {
      ...fresh.player.enhancements,
      ...(save?.player?.enhancements || {}),
    };
    next.player.gearMastery =
      save?.player?.gearMastery && typeof save.player.gearMastery === "object"
        ? Object.fromEntries(
            Object.entries(save.player.gearMastery)
              .filter(([id]) => isGearItem(ITEMS[id]))
              .map(([id, entry]) => [
                id,
                {
                  level: clamp(Math.floor(Number(entry?.level) || 0), 0, 10),
                  xp: Math.max(0, Number(entry?.xp) || 0),
                },
              ]),
          )
        : {};
    next.player.activeBuffs = Array.isArray(save?.player?.activeBuffs)
      ? save.player.activeBuffs
          .filter((buff) => buff?.id && buff.ttl > 0)
          .map((buff) => ({
            id: String(buff.id),
            name: String(buff.name || ITEMS[buff.id]?.name || buff.id),
            color: String(buff.color || rarityInfo(ITEMS[buff.id]).color),
            ttl: clamp(Number(buff.ttl) || 0, 0, 1800),
            stats:
              buff.stats && typeof buff.stats === "object"
                ? Object.fromEntries(
                    Object.entries(buff.stats)
                      .map(([field, value]) => [field, Number(value) || 0])
                      .filter(([, value]) => value),
                  )
                : {},
          }))
      : [];
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
    next.player.salvagedGear = Math.max(
      0,
      Math.floor(Number(next.player.salvagedGear) || 0),
    );
    next.player.skillRank = Number.isFinite(next.player.skillRank)
      ? next.player.skillRank
      : 0;
    next.player.oathCooldowns = {
      ...fresh.player.oathCooldowns,
      ...(save?.player?.oathCooldowns || {}),
    };
    OATH_ARTS.forEach((art) => {
      next.player.oathCooldowns[art.id] = Math.max(
        0,
        Number(next.player.oathCooldowns[art.id]) || 0,
      );
    });
    if (Number(next.player.skillCd) > 0)
      next.player.oathCooldowns.cleave = Math.max(
        next.player.oathCooldowns.cleave || 0,
        Number(next.player.skillCd) || 0,
      );
    next.player.specializations = {
      ...fresh.player.specializations,
      ...(save?.player?.specializations || {}),
    };
    next.player.renown = Number.isFinite(next.player.renown)
      ? next.player.renown
      : 0;
    next.player.combo = 0;
    next.player.comboTimer = 0;
    next.player.dashCd = 0;
    next.player.dashTime = 0;
    next.player.dashVx = 0;
    next.player.dashVy = 0;
    next.player.hurtFlash = 0;
    next.player.oathShield = 0;
    next.unlockedZones = Array.isArray(next.unlockedZones)
      ? [...new Set(["lumen", ...next.unlockedZones])]
      : fresh.unlockedZones;
    next.contracts = {
      ...fresh.contracts,
      ...(save?.contracts || {}),
    };
    Object.entries(REGIONAL_CONTRACTS).forEach(([zoneId, contract]) => {
      next.contracts[zoneId] = {
        target: contract.target,
        progress: 0,
        claimed: false,
        tier: 1,
        ...(next.contracts[zoneId] || {}),
      };
    });
    next.bounties = {
      ...fresh.bounties,
      ...(save?.bounties || {}),
    };
    ZONES.forEach((zone) => {
      const entry = next.bounties[zone.id] || {};
      const tier = Math.max(1, Math.floor(Number(entry.tier) || 1));
      const target = zone.enemies.includes(entry.target)
        ? entry.target
        : bountyTarget(zone.id, tier);
      next.bounties[zone.id] = {
        target,
        progress: Math.max(0, Math.floor(Number(entry.progress) || 0)),
        tier,
        claimed: Math.max(0, Math.floor(Number(entry.claimed) || 0)),
      };
    });
    next.huntPlans = normalizeHuntPlans(save?.huntPlans);
    next.bestiary =
      save?.bestiary && typeof save.bestiary === "object"
        ? save.bestiary
        : fresh.bestiary;
    next.bestiaryRewards = Array.isArray(save?.bestiaryRewards)
      ? [...new Set(save.bestiaryRewards)]
      : fresh.bestiaryRewards;
    next.regionStability = {
      ...fresh.regionStability,
      ...(save?.regionStability || {}),
    };
    ZONES.forEach((zone) => {
      const entry = next.regionStability[zone.id] || {};
      next.regionStability[zone.id] = {
        points: clamp(Number(entry.points) || 0, 0, 120),
        claimed: Array.isArray(entry.claimed)
          ? [...new Set(entry.claimed.map(Number).filter(Boolean))]
          : [],
      };
    });
    const savedCommendations = save?.commendations || {};
    next.commendations = {
      claimed: Array.isArray(savedCommendations.claimed)
        ? [...new Set(savedCommendations.claimed)].filter((id) =>
            REGION_COMMENDATIONS.some((item) => item.id === id),
          )
        : [],
    };
    next.companions = {
      ...fresh.companions,
      ...(save?.companions || {}),
    };
    COMPANIONS.forEach((companion) => {
      const entry = next.companions[companion.id] || {};
      next.companions[companion.id] = {
        unlocked:
          Boolean(entry.unlocked) ||
          Number(next.questIndex || 0) >= companion.unlockQuest,
        level: clamp(Number(entry.level) || 1, 1, 30),
        xp: Math.max(0, Number(entry.xp) || 0),
        cooldown: Math.max(0, Number(entry.cooldown) || 0),
      };
    });
    if (!next.companions[next.activeCompanion]?.unlocked) {
      next.activeCompanion =
        COMPANIONS.find((companion) => next.companions[companion.id]?.unlocked)
          ?.id || "lia";
    }
    const savedCompanionMissions = save?.companionMissions || {};
    next.companionMissions = {
      claimed: Array.isArray(savedCompanionMissions.claimed)
        ? [...new Set(savedCompanionMissions.claimed)].filter((id) =>
            COMPANION_MISSIONS.some((mission) => mission.id === id),
          )
        : [],
    };
    next.companionPosition = {
      ...fresh.companionPosition,
      ...(save?.companionPosition || {}),
    };
    next.companionPosition.x = Number.isFinite(next.companionPosition.x)
      ? next.companionPosition.x
      : next.player.x - 64;
    next.companionPosition.y = Number.isFinite(next.companionPosition.y)
      ? next.companionPosition.y
      : next.player.y + 52;
    next.companionPosition.phase = 0;
    next.companionPosition.attackFlash = 0;
    next.sanctuary = {
      ...fresh.sanctuary,
      ...(save?.sanctuary || {}),
    };
    SANCTUARY_FACILITIES.forEach((facility) => {
      next.sanctuary[facility.id] = clamp(
        Math.floor(Number(next.sanctuary[facility.id]) || 0),
        0,
        4,
      );
    });
    const savedTitles = save?.titles || {};
    const unlockedTitles = Array.isArray(savedTitles.unlocked)
      ? savedTitles.unlocked
      : Array.isArray(savedTitles)
        ? savedTitles
        : [];
    next.titles = {
      unlocked: [...new Set(["green_oath", ...unlockedTitles])].filter((id) =>
        OATH_TITLES.some((title) => title.id === id),
      ),
      equipped: savedTitles.equipped || save?.equippedTitle || "green_oath",
    };
    if (!next.titles.unlocked.includes(next.titles.equipped))
      next.titles.equipped = next.titles.unlocked[0] || "green_oath";
    const savedMemories = save?.memories || {};
    next.memories = {
      collected: Array.isArray(savedMemories.collected)
        ? [...new Set(savedMemories.collected)].filter((id) =>
            MEMORY_FRAGMENTS.some((fragment) => fragment.id === id),
          )
        : [],
      rewards: Array.isArray(savedMemories.rewards)
        ? [...new Set(savedMemories.rewards.map(Number).filter(Boolean))]
        : [],
    };
    const savedDiscoveries = save?.discoveries || {};
    next.discoveries = {
      claimed: Array.isArray(savedDiscoveries.claimed)
        ? [...new Set(savedDiscoveries.claimed)].filter((id) =>
            REGION_SECRETS.some((secret) => secret.id === id),
          )
        : [],
    };
    const savedEchoTrials = save?.echoTrials || {};
    const savedEchoActive =
      typeof savedEchoTrials.active === "string"
        ? savedEchoTrials.active
        : savedEchoTrials.active?.id;
    next.echoTrials = {
      active: ECHO_TRIALS.some((trial) => trial.id === savedEchoActive)
        ? {
            id: savedEchoActive,
            startedAt: Math.max(
              0,
              Number(savedEchoTrials.active?.startedAt) || 0,
            ),
          }
        : null,
      cleared: Array.isArray(savedEchoTrials.cleared)
        ? [...new Set(savedEchoTrials.cleared)].filter((id) =>
            ECHO_TRIALS.some((trial) => trial.id === id),
          )
        : [],
    };
    const savedActMasteries = save?.actMasteries || {};
    next.actMasteries = {
      claimed: Array.isArray(savedActMasteries.claimed)
        ? [...new Set(savedActMasteries.claimed)].filter((id) =>
            validActMasteryId(id),
          )
        : [],
    };
    const savedCampaigns = save?.campaigns || {};
    next.campaigns = {
      claimed: Array.isArray(savedCampaigns.claimed)
        ? [...new Set(savedCampaigns.claimed)].filter(validCampaignId)
        : [],
    };
    const savedTactics = save?.tactics || {};
    next.tactics = {
      claimed: Array.isArray(savedTactics.claimed)
        ? [...new Set(savedTactics.claimed)].filter(validTacticManualId)
        : [],
    };
    const savedNamedHunts = save?.namedHunts || {};
    const savedNamedActive =
      typeof savedNamedHunts.active === "string"
        ? savedNamedHunts.active
        : savedNamedHunts.active?.id;
    next.namedHunts = {
      active: validNamedHuntId(savedNamedActive)
        ? {
            id: savedNamedActive,
            startedAt: Math.max(
              0,
              Number(savedNamedHunts.active?.startedAt) || 0,
            ),
          }
        : null,
      claimed: Array.isArray(savedNamedHunts.claimed)
        ? [...new Set(savedNamedHunts.claimed)].filter(validNamedHuntId)
        : [],
    };
    const savedCampsites = save?.campsites || {};
    next.campsites = {
      claimed: Array.isArray(savedCampsites.claimed)
        ? [...new Set(savedCampsites.claimed)].filter(validCampsiteId)
        : [],
    };
    const savedPatrols = save?.patrols || {};
    next.patrols = {
      claimed: Array.isArray(savedPatrols.claimed)
        ? [...new Set(savedPatrols.claimed)].filter(validPatrolOperationId)
        : [],
    };
    const savedArmory = save?.armory || {};
    next.armory = {
      claimed: Array.isArray(savedArmory.claimed)
        ? [...new Set(savedArmory.claimed)].filter(validArmoryRecordId)
        : [],
    };
    const savedTreasures = save?.treasures || {};
    next.treasures = {
      fragments: {},
      claimed: Array.isArray(savedTreasures.claimed)
        ? [...new Set(savedTreasures.claimed)].filter((id) =>
            validTreasureSiteId(id),
          )
        : [],
    };
    ZONES.forEach((zone) => {
      next.treasures.fragments[zone.id] = Math.max(
        0,
        Math.floor(Number(savedTreasures.fragments?.[zone.id]) || 0),
      );
    });
    const savedChronicles = save?.chronicles || {};
    next.chronicles = {
      claimed: Array.isArray(savedChronicles.claimed)
        ? [...new Set(savedChronicles.claimed)].filter((id) =>
            REGIONAL_CHRONICLES.some((item) => item.id === id),
          )
        : [],
    };
    const savedRelics = save?.relics || {};
    next.relics = {
      claimed: Array.isArray(savedRelics.claimed)
        ? [...new Set(savedRelics.claimed)].filter((id) =>
            REGION_RELICS.some((item) => item.id === id),
          )
        : [],
    };
    const savedSideStories = save?.sideStories || {};
    next.sideStories = {
      claimed: Array.isArray(savedSideStories.claimed)
        ? [...new Set(savedSideStories.claimed)].filter((id) =>
            SIDE_STORIES.some((item) => item.id === id),
          )
        : [],
    };
    const savedRegionTrials = save?.regionTrials || {};
    next.regionTrials = {
      claimed: Array.isArray(savedRegionTrials.claimed)
        ? [...new Set(savedRegionTrials.claimed)].filter((id) =>
            REGION_TRIALS.some((trial) => trial.id === id),
          )
        : [],
    };
    const savedDecisions = save?.decisions || {};
    const validPathKeys = new Set(OATH_DECISION_PATHS.map((path) => path.key));
    next.decisions = { choices: {} };
    Object.entries(savedDecisions.choices || {}).forEach(([id, key]) => {
      if (
        OATH_DECISIONS.some((decision) => decision.id === id) &&
        validPathKeys.has(key)
      ) {
        next.decisions.choices[id] = key;
      }
    });
    const savedCrafting = save?.crafting || {};
    next.crafting = {
      crafted: Array.isArray(savedCrafting.crafted)
        ? [...new Set(savedCrafting.crafted)].filter((id) =>
            CRAFTING_RECIPES.some((recipe) => recipe.id === id),
          )
        : [],
    };
    const savedAlchemy = save?.alchemy || {};
    next.alchemy = {
      brewed: Math.max(0, Math.floor(Number(savedAlchemy.brewed) || 0)),
      recipes: {},
    };
    ALCHEMY_RECIPES.forEach((recipe) => {
      next.alchemy.recipes[recipe.id] = Math.max(
        0,
        Math.floor(Number(savedAlchemy.recipes?.[recipe.id]) || 0),
      );
    });
    const savedGathering = save?.gathering || {};
    next.gathering = {
      harvested: Math.max(0, Math.floor(Number(savedGathering.harvested) || 0)),
      nodes: {},
      zones: {},
    };
    Object.entries(savedGathering.nodes || {}).forEach(([id, entry]) => {
      const readyAt = Number(entry?.readyAt) || 0;
      if (readyAt > 0) {
        next.gathering.nodes[id] = {
          readyAt: clamp(readyAt, 0, Math.max(0, next.playSeconds || 0) + 1800),
        };
      }
    });
    ZONES.forEach((zone) => {
      next.gathering.zones[zone.id] = Math.max(
        0,
        Math.floor(Number(savedGathering.zones?.[zone.id]) || 0),
      );
    });
    next.npcBonds = {
      ...fresh.npcBonds,
      ...(save?.npcBonds || {}),
    };
    NPC_BONDS.forEach((bond) => {
      const entry = next.npcBonds[bond.id] || {};
      next.npcBonds[bond.id] = {
        level: clamp(Math.floor(Number(entry.level) || 0), 0, 5),
        gifts: Math.max(0, Math.floor(Number(entry.gifts) || 0)),
      };
    });
    next.expedition =
      save?.expedition && typeof save.expedition === "object"
        ? {
            ...save.expedition,
            kills: Math.max(0, save.expedition.kills || 0),
            floor: Math.max(1, save.expedition.floor || 1),
          }
        : null;
    next.expeditionLog = Array.isArray(save?.expeditionLog)
      ? save.expeditionLog.slice(0, 40)
      : fresh.expeditionLog;
    next.expeditionNodes = [];
    next.expeditionNodeFloor = "";
    next.worldEvent =
      save?.worldEvent &&
      typeof save.worldEvent === "object" &&
      zoneMap[save.worldEvent.zone]
        ? {
            ...save.worldEvent,
            ttl: clamp(save.worldEvent.ttl || 0, 0, 360),
            progress: Math.max(0, save.worldEvent.progress || 0),
          }
        : null;
    next.worldEventCooldown = Number.isFinite(save?.worldEventCooldown)
      ? clamp(save.worldEventCooldown, 20, 360)
      : fresh.worldEventCooldown;
    next.worldEventLog = Array.isArray(save?.worldEventLog)
      ? save.worldEventLog.slice(0, 40)
      : fresh.worldEventLog;
    next.journal = Array.isArray(next.journal)
      ? next.journal.slice(0, 140)
      : fresh.journal;
    next.enemies = [];
    next.drops = Array.isArray(next.drops) ? next.drops.slice(0, 60) : [];
    next.effects = [];
    next.hazards = [];
    return next;
  }

  async function saveGame(manual = false) {
    const payload = {
      ...state,
      savedAt: new Date().toISOString(),
      enemies: [],
      expeditionNodes: [],
      expeditionNodeFloor: "",
      effects: [],
      hazards: [],
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

  function activeExpedition() {
    return state.expedition?.active ? state.expedition : null;
  }

  function expeditionModifier(expedition = activeExpedition()) {
    return expedition
      ? EXPEDITION_MODIFIERS.find((item) => item.id === expedition.modifier)
      : null;
  }

  function echoTrialEntry() {
    if (!state.echoTrials) state.echoTrials = initialEchoTrials();
    const entry = state.echoTrials;
    const activeId =
      typeof entry.active === "string" ? entry.active : entry.active?.id;
    entry.active = ECHO_TRIALS.some((trial) => trial.id === activeId)
      ? {
          id: activeId,
          startedAt: Math.max(0, Number(entry.active?.startedAt) || 0),
        }
      : null;
    entry.cleared = Array.isArray(entry.cleared)
      ? [...new Set(entry.cleared)].filter((id) =>
          ECHO_TRIALS.some((trial) => trial.id === id),
        )
      : [];
    return entry;
  }

  function echoTrialSpec(id) {
    return ECHO_TRIALS.find((trial) => trial.id === id) || null;
  }

  function echoTrialTierInfo(trial) {
    return ECHO_TRIAL_TIERS[trial?.tierIndex || 0] || ECHO_TRIAL_TIERS[0];
  }

  function clearedEchoTrialIds() {
    return echoTrialEntry().cleared;
  }

  function echoTrialCleared(trial) {
    return Boolean(trial && clearedEchoTrialIds().includes(trial.id));
  }

  function clearedEchoTrialCount(zoneId = "") {
    const cleared = new Set(clearedEchoTrialIds());
    return ECHO_TRIALS.filter(
      (trial) => cleared.has(trial.id) && (!zoneId || trial.zone === zoneId),
    ).length;
  }

  function previousEchoTrial(trial) {
    if (!trial || trial.tierIndex <= 0) return null;
    return ECHO_TRIALS.find(
      (item) =>
        item.act === trial.act && item.tierIndex === trial.tierIndex - 1,
    );
  }

  function echoTrialUnlocked(trial) {
    if (!trial || completedActCount() < trial.act) return false;
    const previous = previousEchoTrial(trial);
    return !previous || clearedEchoTrialIds().includes(previous.id);
  }

  function echoTrialUnlockText(trial) {
    if (!trial) return "";
    if (completedActCount() < trial.act) return trial.unlock;
    const previous = previousEchoTrial(trial);
    if (previous && !clearedEchoTrialIds().includes(previous.id))
      return previous.title;
    return "도전 가능";
  }

  function activeEchoTrial() {
    const active = echoTrialEntry().active;
    const trial = active ? echoTrialSpec(active.id) : null;
    return trial
      ? {
          ...trial,
          startedAt: Math.max(0, Number(active.startedAt) || 0),
        }
      : null;
  }

  function echoTrialModifier(trial) {
    const tier = echoTrialTierInfo(trial);
    const actScale = 1 + Math.max(0, (trial?.act || 1) - 1) * 0.035;
    return {
      color: tier.color,
      hp: tier.hp * actScale,
      atk: tier.atk * (1 + Math.max(0, (trial?.act || 1) - 1) * 0.022),
      def: tier.def + Math.floor((trial?.act || 1) / 3),
      reward: tier.reward,
    };
  }

  function echoTrialMaterial(trial) {
    const rank = trial?.act || 1;
    const tierIndex = trial?.tierIndex || 0;
    if (tierIndex >= 2) {
      if (rank >= 14) return "dawnPrism";
      if (rank >= 9) return "abyssCore";
      return "starDust";
    }
    if (tierIndex === 1) {
      if (rank >= 10) return "abyssCore";
      if (rank >= 5) return "starDust";
      return "oathSteel";
    }
    if (rank >= 12) return "dawnGinseng";
    if (rank >= 8) return "riftBloom";
    if (rank >= 4) return "guardianThread";
    return "greenHerb";
  }

  function echoTrialReward(trial, repeat = false) {
    const tier = echoTrialTierInfo(trial);
    const rank = trial?.act || 1;
    const rewardMult = tier.reward * (repeat ? 0.45 : 1);
    const material = echoTrialMaterial(trial);
    return {
      xp: Math.round((320 + rank * 95) * rewardMult),
      gold: Math.round((180 + rank * 62) * rewardMult),
      ...(repeat ? {} : { renown: tier.renown }),
      item:
        !repeat && (trial?.tierIndex || 0) === 0
          ? BOSS_REWARDS[rank - 1] || material
          : material,
      itemCount: repeat
        ? 1
        : Math.max(1, Math.ceil(rank / 7)) + (trial?.tierIndex >= 2 ? 1 : 0),
    };
  }

  function expeditionNodeMeta(kind) {
    return (
      EXPEDITION_NODE_TYPES.find((item) => item.kind === kind) ||
      EXPEDITION_NODE_TYPES[0]
    );
  }

  function worldEventMeta(kind) {
    return (
      WORLD_EVENT_TYPES.find((item) => item.kind === kind) ||
      WORLD_EVENT_TYPES[0]
    );
  }

  function activeWorldEvent() {
    return state.worldEvent?.active && state.worldEvent.zone === state.zone
      ? state.worldEvent
      : null;
  }

  function companionSpec(id = state.activeCompanion) {
    return COMPANIONS.find((companion) => companion.id === id) || null;
  }

  function companionEntry(id = state.activeCompanion) {
    if (!state.companions) state.companions = initialCompanions();
    if (!state.companions[id])
      state.companions[id] = { unlocked: false, level: 1, xp: 0, cooldown: 0 };
    return state.companions[id];
  }

  function companionMissionEntry() {
    if (!state.companionMissions)
      state.companionMissions = initialCompanionMissions();
    if (!Array.isArray(state.companionMissions.claimed))
      state.companionMissions.claimed = [];
    return state.companionMissions;
  }

  function companionMissionClaimedIds() {
    return companionMissionEntry().claimed;
  }

  function companionMissionsFor(id) {
    return COMPANION_MISSIONS.filter((mission) => mission.companion === id);
  }

  function companionMissionProgress(mission) {
    const current = Math.max(0, Number(mission.progress?.() || 0));
    return {
      current: Math.min(current, mission.required),
      required: mission.required,
      ready: current >= mission.required,
    };
  }

  function claimedCompanionMissionCount(id = "") {
    const claimed = companionMissionClaimedIds();
    return id
      ? claimed.filter((missionId) =>
          companionMissionsFor(id).some((mission) => mission.id === missionId),
        ).length
      : claimed.length;
  }

  function companionMissionBonus(field, companionId = state.activeCompanion) {
    const claimed = new Set(companionMissionClaimedIds());
    return companionMissionsFor(companionId)
      .filter((mission) => claimed.has(mission.id))
      .reduce((sum, mission) => sum + (Number(mission.stats?.[field]) || 0), 0);
  }

  function activeCompanion() {
    const spec = companionSpec();
    const entry = spec ? companionEntry(spec.id) : null;
    return spec && entry?.unlocked ? { spec, entry } : null;
  }

  function companionXpForLevel(level) {
    return Math.floor(120 + level * level * 55);
  }

  function companionBonus(field) {
    const companion = activeCompanion();
    if (!companion) return 0;
    const level = companion.entry.level || 1;
    const base = companion.spec.stats?.[field] || 0;
    const growth = companion.spec.growth?.[field] || 0;
    const value =
      base +
      growth * Math.max(0, level - 1) +
      companionMissionBonus(field, companion.spec.id);
    return ["str", "vit", "wis", "agi", "atk", "def"].includes(field)
      ? Math.floor(value)
      : value;
  }

  function syncCompanionUnlocks(show = false) {
    if (!state.companions) state.companions = initialCompanions();
    const unlocked = [];
    COMPANIONS.forEach((companion) => {
      const entry = companionEntry(companion.id);
      if (!entry.unlocked && state.questIndex >= companion.unlockQuest) {
        entry.unlocked = true;
        entry.level = Math.max(1, entry.level || 1);
        entry.xp = Math.max(0, entry.xp || 0);
        unlocked.push(companion);
      }
    });
    if (!state.companions[state.activeCompanion]?.unlocked) {
      state.activeCompanion =
        COMPANIONS.find((companion) => state.companions[companion.id]?.unlocked)
          ?.id || "lia";
    }
    if (show && unlocked.length) {
      unlocked.forEach((companion) =>
        addJournalEntry({
          title: `${companion.name} 합류`,
          done: [
            `${companion.role} ${companion.name}이 서약자의 여정에 합류했습니다.`,
            companion.story,
          ],
        }),
      );
      toast(`${unlocked[0].name}이 동료로 합류했습니다.`);
    }
  }

  function sanctuaryLevel(id) {
    if (!state.sanctuary) state.sanctuary = initialSanctuary();
    return clamp(Math.floor(Number(state.sanctuary[id]) || 0), 0, 4);
  }

  function sanctuaryTotalLevel() {
    return SANCTUARY_FACILITIES.reduce(
      (sum, facility) => sum + sanctuaryLevel(facility.id),
      0,
    );
  }

  function sanctuaryBonus(field) {
    return SANCTUARY_FACILITIES.reduce((sum, facility) => {
      const level = sanctuaryLevel(facility.id);
      if (!level) return sum;
      const value =
        (facility.stats?.[field] || 0) * level +
        (facility.growth?.[field] || 0) * Math.max(0, level - 1);
      return sum + value;
    }, 0);
  }

  function sanctuaryCost(facility) {
    const level = sanctuaryLevel(facility.id);
    if (level >= 4) return null;
    const next = level + 1;
    const rareMaterial = next >= 4 && facility.material !== "dawnPrism";
    return {
      next,
      gold: Math.round(facility.baseGold * (1 + level * 0.82) + next * 140),
      material: facility.material,
      count: facility.baseMaterial + level * 2,
      extraMaterial: rareMaterial ? "dawnPrism" : "",
      extraCount: rareMaterial ? 1 : 0,
    };
  }

  function sanctuaryFacilityEffectText(facility) {
    const level = sanctuaryLevel(facility.id);
    if (!level) return "아직 보정 없음";
    const parts = Object.keys({
      ...(facility.stats || {}),
      ...(facility.growth || {}),
    })
      .map((field) => {
        const value =
          (facility.stats?.[field] || 0) * level +
          (facility.growth?.[field] || 0) * Math.max(0, level - 1);
        return statLabel(field, value);
      })
      .filter(Boolean);
    return parts.join(" · ");
  }

  function statLabel(field, value) {
    const labels = {
      str: "힘",
      vit: "체력",
      wis: "지혜",
      agi: "민첩",
      atk: "공격",
      def: "방어",
      xpGain: "경험치",
      goldGain: "골드",
      dropChance: "장비 드롭",
      damageReduce: "피해 감소",
      mpRegen: "MP 회복",
      healingPower: "회복 효율",
      skillDamage: "서약 전술 피해",
      basicDamage: "기본 공격 피해",
      skillCost: "서약 전술 비용 감소",
      skillCd: "서약 전술 재사용 감소",
      shopDiscount: "상점 할인",
    };
    if (!labels[field]) return "";
    if (
      [
        "xpGain",
        "goldGain",
        "dropChance",
        "damageReduce",
        "healingPower",
        "skillDamage",
        "basicDamage",
        "shopDiscount",
      ].includes(field)
    )
      return `${labels[field]} +${Math.round(value * 1000) / 10}%`;
    if (field === "mpRegen") return `${labels[field]} +${value.toFixed(1)}/초`;
    if (field === "skillCost") return `${labels[field]} +${Math.floor(value)}`;
    if (field === "skillCd") return `${labels[field]} +${value.toFixed(2)}초`;
    return `${labels[field]} +${value < 1 ? value.toFixed(1) : Math.floor(value)}`;
  }

  function totalBestiaryKills() {
    return Object.values(state.bestiary || {}).reduce(
      (sum, entry) => sum + (entry.kills || 0),
      0,
    );
  }

  function knownBestiaryTypes() {
    return Object.values(state.bestiary || {}).filter(
      (entry) => entry.kills > 0,
    ).length;
  }

  function totalEliteKills() {
    return Object.values(state.bestiary || {}).reduce(
      (sum, entry) => sum + (entry.eliteKills || 0),
      0,
    );
  }

  function bestiaryResearchTier(type) {
    const kills = Math.max(0, Math.floor(state.bestiary?.[type]?.kills || 0));
    return BESTIARY_RESEARCH_STAGES.filter((stage) => kills >= stage.kills)
      .length;
  }

  function totalBestiaryResearchTier() {
    return Object.keys(ENEMIES).reduce(
      (sum, type) => sum + bestiaryResearchTier(type),
      0,
    );
  }

  function bestiaryResearchStage(type) {
    const tier = bestiaryResearchTier(type);
    return tier > 0 ? BESTIARY_RESEARCH_STAGES[tier - 1] : null;
  }

  function bestiaryNextResearchStage(type) {
    const tier = bestiaryResearchTier(type);
    return BESTIARY_RESEARCH_STAGES[tier] || null;
  }

  function bestiaryDamageBonus(enemy) {
    return bestiaryResearchTier(enemy?.type) * 0.025;
  }

  function bestiaryDefenseBonus(enemy) {
    return Math.min(0.1, bestiaryResearchTier(enemy?.type) * 0.018);
  }

  function bestiaryDropBonus(enemy) {
    const tier = bestiaryResearchTier(enemy?.type);
    return tier >= 3 ? 0.004 + (tier - 3) * 0.003 : 0;
  }

  function bestiaryRewardBonus(enemy, field) {
    const tier = bestiaryResearchTier(enemy?.type);
    if (tier < 4) return 0;
    if (field === "xpGain" || field === "goldGain") return 0.018;
    return 0;
  }

  function bestiaryResearchBonusText(type) {
    const tier = bestiaryResearchTier(type);
    const parts = [];
    if (tier >= 1) parts.push(`피해 +${Math.round(tier * 2.5 * 10) / 10}%`);
    if (tier >= 2)
      parts.push(
        `받는 피해 -${Math.round(bestiaryDefenseBonus({ type }) * 1000) / 10}%`,
      );
    if (tier >= 3)
      parts.push(
        `고유 장비 드롭 +${Math.round(bestiaryDropBonus({ type }) * 1000) / 10}%`,
      );
    if (tier >= 4) parts.push("경험치/골드 +1.8%");
    return (
      parts.join(" · ") ||
      "연구 단계가 열리면 해당 몬스터 대응 보정이 생깁니다."
    );
  }

  function bestiaryLore(type) {
    const enemy = ENEMIES[type] || {};
    const stage = bestiaryResearchStage(type);
    if (!stage)
      return `${enemy.name || "몬스터"}의 흔적을 아직 충분히 기록하지 못했습니다.`;
    return `${enemy.name} ${stage.name}: ${stage.desc}`;
  }

  function bountyTarget(zoneId, tier = 1) {
    const zone = zoneMap?.[zoneId] || ZONES.find((item) => item.id === zoneId);
    if (!zone?.enemies?.length) return "";
    const zoneIndex = Math.max(
      0,
      ZONES.findIndex((item) => item.id === zoneId),
    );
    return zone.enemies[(zoneIndex + Math.max(1, tier)) % zone.enemies.length];
  }

  function bountyEntry(zoneId = state.zone) {
    if (!state.bounties) state.bounties = initialBounties();
    if (!state.bounties[zoneId]) {
      state.bounties[zoneId] = {
        target: bountyTarget(zoneId, 1),
        progress: 0,
        tier: 1,
        claimed: 0,
      };
    }
    const entry = state.bounties[zoneId];
    entry.tier = Math.max(1, Math.floor(Number(entry.tier) || 1));
    entry.progress = Math.max(0, Math.floor(Number(entry.progress) || 0));
    entry.claimed = Math.max(0, Math.floor(Number(entry.claimed) || 0));
    if (!zoneMap[zoneId]?.enemies?.includes(entry.target)) {
      entry.target = bountyTarget(zoneId, entry.tier);
      entry.progress = 0;
    }
    return entry;
  }

  function bountyRequirement(zoneId = state.zone) {
    const zoneIndex = Math.max(
      0,
      ZONES.findIndex((zone) => zone.id === zoneId),
    );
    const tier = bountyEntry(zoneId).tier || 1;
    return 6 + Math.floor(zoneIndex / 2) + tier * 3;
  }

  function bountyReward(zoneId = state.zone) {
    const zoneIndex = Math.max(
      0,
      ZONES.findIndex((zone) => zone.id === zoneId),
    );
    const tier = bountyEntry(zoneId).tier || 1;
    const material =
      zoneIndex >= 14
        ? "dawnPrism"
        : zoneIndex >= 9
          ? "abyssCore"
          : zoneIndex >= 5
            ? "starDust"
            : tier % 2
              ? "oathSteel"
              : "guardianThread";
    return {
      xp: Math.round(180 + (zoneIndex + 1) * 58 + tier * 95),
      gold: Math.round(140 + (zoneIndex + 1) * 46 + tier * 72),
      renown: 1 + Math.floor(tier / 2),
      item: material,
      itemCount: tier >= 8 ? 2 : 1,
    };
  }

  function totalBountyClaims() {
    return Object.values(state.bounties || {}).reduce(
      (sum, entry) => sum + (entry.claimed || 0),
      0,
    );
  }

  function maxBountyTier() {
    return Math.max(
      1,
      ...Object.values(state.bounties || {}).map(
        (entry) => Number(entry.tier) || 1,
      ),
    );
  }

  function huntPlanId(zoneId, target, kind) {
    return `${zoneId}:${target}:${kind}`;
  }

  function huntPlanSpec(id) {
    const [zoneId, target, kind] = String(id || "").split(":");
    const zone = zoneMap[zoneId];
    const type = HUNT_PLAN_TYPES[kind];
    if (!zone?.enemies?.includes(target) || !ENEMIES[target] || !type)
      return null;
    const zoneIndex = Math.max(
      0,
      ZONES.findIndex((item) => item.id === zoneId),
    );
    return {
      id: huntPlanId(zoneId, target, kind),
      zoneId,
      zone,
      zoneIndex,
      target,
      enemy: ENEMIES[target],
      kind,
      type,
      title: `${zone.name} ${type.name}`,
    };
  }

  function normalizeHuntPlans(save) {
    const result = initialHuntPlans();
    result.completed = Math.max(0, Math.floor(Number(save?.completed) || 0));
    const active = save?.active;
    const spec = active ? huntPlanSpec(active.id) : null;
    if (spec) {
      result.active = {
        id: spec.id,
        progress: Math.max(0, Math.floor(Number(active.progress) || 0)),
        startedAt: Math.max(0, Math.floor(Number(active.startedAt) || 0)),
      };
    }
    return result;
  }

  function ensureHuntPlans() {
    if (!state.huntPlans || typeof state.huntPlans !== "object")
      state.huntPlans = initialHuntPlans();
    state.huntPlans.completed = Math.max(
      0,
      Math.floor(Number(state.huntPlans.completed) || 0),
    );
    if (state.huntPlans.active && !huntPlanSpec(state.huntPlans.active.id))
      state.huntPlans.active = null;
    return state.huntPlans;
  }

  function huntPlanResearchTarget(zone) {
    return (zone.enemies || [])
      .filter((type) => ENEMIES[type])
      .sort((left, right) => {
        const leftTier = bestiaryResearchTier(left);
        const rightTier = bestiaryResearchTier(right);
        if (leftTier !== rightTier) return leftTier - rightTier;
        const leftKills = state.bestiary?.[left]?.kills || 0;
        const rightKills = state.bestiary?.[right]?.kills || 0;
        if (leftKills !== rightKills) return leftKills - rightKills;
        return left.localeCompare(right);
      })[0];
  }

  function huntPlanTrophyTarget(zoneId) {
    const zone = zoneMap[zoneId];
    const bounty = state.bounties?.[zoneId];
    if (bounty?.target && zone?.enemies?.includes(bounty.target))
      return bounty.target;
    return (
      (zone?.enemies || []).find((type) => MONSTER_EQUIPMENT_DROPS[type]) ||
      zone?.enemies?.[0] ||
      ""
    );
  }

  function huntPlanStabilityTarget(zone, zoneIndex) {
    const enemies = (zone.enemies || []).filter((type) => ENEMIES[type]);
    if (!enemies.length) return "";
    const offset = (ensureHuntPlans().completed || 0) + zoneIndex;
    return enemies[offset % enemies.length];
  }

  function huntPlanCandidates() {
    const zoneIds = [
      state.zone,
      ...(Array.isArray(state.unlockedZones) ? state.unlockedZones : []),
    ].filter((zoneId, index, array) => array.indexOf(zoneId) === index);
    const cards = [];
    zoneIds
      .filter((zoneId) => zoneMap[zoneId]?.enemies?.length)
      .slice(0, 8)
      .forEach((zoneId) => {
        const zone = zoneMap[zoneId];
        const zoneIndex = Math.max(
          0,
          ZONES.findIndex((item) => item.id === zoneId),
        );
        const researchTarget = huntPlanResearchTarget(zone);
        const trophyTarget = huntPlanTrophyTarget(zoneId);
        const stabilityTarget = huntPlanStabilityTarget(zone, zoneIndex);
        [
          [researchTarget, "research"],
          [trophyTarget, "trophy"],
          [stabilityTarget, "stability"],
        ].forEach(([target, kind]) => {
          const spec = huntPlanSpec(huntPlanId(zoneId, target, kind));
          if (spec && !cards.some((item) => item.id === spec.id))
            cards.push(spec);
        });
      });
    return cards.slice(0, 15);
  }

  function huntPlanMaterial(spec) {
    if (MONSTER_MATERIAL_DROPS[spec.target]?.item)
      return MONSTER_MATERIAL_DROPS[spec.target].item;
    if (spec.zoneIndex >= 14) return "dawnPrism";
    if (spec.zoneIndex >= 9) return "abyssCore";
    if (spec.zoneIndex >= 5) return "starDust";
    return spec.kind === "research" ? "guardianThread" : "oathSteel";
  }

  function huntPlanRequirement(spec) {
    if (!spec) return 1;
    if (spec.kind === "research") {
      const kills = state?.bestiary?.[spec.target]?.kills || 0;
      const nextStage = BESTIARY_RESEARCH_STAGES.find(
        (stage) => kills < stage.kills,
      );
      return clamp(
        nextStage ? nextStage.kills - kills : 18 + spec.zoneIndex,
        6,
        38,
      );
    }
    if (spec.kind === "trophy") {
      const bountyTier = state?.bounties?.[spec.zoneId]?.tier || 1;
      return clamp(12 + spec.zoneIndex + bountyTier * 2, 10, 46);
    }
    const stabilityTier = state?.regionStability
      ? regionStabilityTier(spec.zoneId)
      : 0;
    return clamp(
      10 + Math.floor(spec.zoneIndex / 2) + stabilityTier * 5,
      8,
      34,
    );
  }

  function huntPlanReward(spec) {
    const required = huntPlanRequirement(spec);
    const material = huntPlanMaterial(spec);
    const kindBonus =
      spec.kind === "trophy" ? 1.18 : spec.kind === "stability" ? 1.08 : 1;
    return {
      xp: Math.round(
        (115 + (spec.zoneIndex + 1) * 52 + required * 18) * kindBonus,
      ),
      gold: Math.round(
        (90 + (spec.zoneIndex + 1) * 44 + required * 15) * kindBonus,
      ),
      renown:
        1 +
        Math.floor(spec.zoneIndex / 6) +
        (spec.kind === "stability" ? 1 : 0),
      item: material,
      itemCount: spec.kind === "trophy" || spec.zoneIndex >= 9 ? 2 : 1,
    };
  }

  function activeHuntPlan() {
    const plans = ensureHuntPlans();
    const active = plans.active;
    const spec = active ? huntPlanSpec(active.id) : null;
    if (!spec) {
      plans.active = null;
      return null;
    }
    const required = huntPlanRequirement(spec);
    active.progress = clamp(
      Math.floor(Number(active.progress) || 0),
      0,
      required,
    );
    return {
      ...spec,
      progress: active.progress,
      required,
      ready: active.progress >= required,
      startedAt: active.startedAt || 0,
    };
  }

  function activeHuntPlanForEnemy(enemy) {
    const plan = activeHuntPlan();
    if (!plan || !enemy) return null;
    if (plan.zoneId !== state.zone || plan.target !== enemy.type) return null;
    return plan;
  }

  function huntPlanBonus(enemy, field) {
    const plan = activeHuntPlanForEnemy(enemy);
    if (!plan) return 0;
    const bonuses = {
      research: {
        xpGain: 0.08,
        goldGain: 0.03,
        equipmentDrop: 0.012,
        runeDrop: 0.008,
        materialDrop: 0.035,
      },
      trophy: {
        xpGain: 0.025,
        goldGain: 0.025,
        equipmentDrop: 0.035,
        runeDrop: 0.016,
        materialDrop: 0.025,
      },
      stability: {
        xpGain: 0.03,
        goldGain: 0.08,
        equipmentDrop: 0.006,
        runeDrop: 0.004,
        materialDrop: 0.08,
      },
    };
    return bonuses[plan.kind]?.[field] || 0;
  }

  function totalHuntPlanClaims() {
    return ensureHuntPlans().completed || 0;
  }

  function totalForageHarvests() {
    if (!state.gathering) state.gathering = initialGathering();
    return Math.max(0, Math.floor(Number(state.gathering.harvested) || 0));
  }

  function totalAlchemyBrews() {
    if (!state.alchemy) state.alchemy = initialAlchemy();
    return Math.max(0, Math.floor(Number(state.alchemy.brewed) || 0));
  }

  function initialGearLoadouts() {
    return GEAR_LOADOUT_SLOTS.map((slot) => ({
      id: slot.id,
      name: slot.name,
      equipment: { weapon: "", armor: "", charm: "" },
    }));
  }

  function cleanGearEquipment(equipment = {}, requireOwned = false) {
    const next = { weapon: "", armor: "", charm: "" };
    Object.keys(next).forEach((type) => {
      const id = String(equipment?.[type] || "");
      if (!id || ITEMS[id]?.type !== type || !isGearItem(ITEMS[id])) return;
      if (requireOwned && !gearItemAvailable(id)) return;
      next[type] = id;
    });
    return next;
  }

  function normalizeGearLoadouts(loadouts) {
    const source = Array.isArray(loadouts) ? loadouts : [];
    return GEAR_LOADOUT_SLOTS.map((slot, index) => {
      const raw =
        source.find((entry) => entry?.id === slot.id) || source[index] || {};
      const name = String(raw.name || slot.name)
        .trim()
        .slice(0, 12);
      return {
        id: slot.id,
        name: name || slot.name,
        equipment: cleanGearEquipment(raw.equipment || {}),
      };
    });
  }

  function gearLoadouts() {
    state.player.gearLoadouts = normalizeGearLoadouts(
      state.player.gearLoadouts,
    );
    return state.player.gearLoadouts;
  }

  function gearItemAvailable(id) {
    if (!id || !isGearItem(ITEMS[id])) return false;
    return (
      (state.player.inventory?.[id] || 0) > 0 || equippedGearIds().includes(id)
    );
  }

  function gearCollectionIds() {
    const ids = new Set(equippedGearIds());
    Object.entries(state.player.inventory || {}).forEach(([id, count]) => {
      if (count > 0 && isGearItem(ITEMS[id])) ids.add(id);
    });
    return [...ids].sort((a, b) =>
      String(ITEMS[a]?.name || a).localeCompare(String(ITEMS[b]?.name || b)),
    );
  }

  function ownedGearCount() {
    return gearCollectionIds().length;
  }

  function ownedGearRarityCount(rarity) {
    return gearCollectionIds().filter((id) => ITEMS[id]?.rarity === rarity)
      .length;
  }

  function salvagedGearCount() {
    return Math.max(0, Math.floor(Number(state.player.salvagedGear) || 0));
  }

  function ownedSetItemCount() {
    const setItems = new Set(EQUIPMENT_SETS.flatMap((set) => set.items));
    return gearCollectionIds().filter((id) => setItems.has(id)).length;
  }

  function ownedLegendaryEquipmentCount() {
    return ownedGearRarityCount("legend");
  }

  function gearCollectionBonus(field) {
    const count = ownedGearCount();
    let total = GEAR_COLLECTION_TIERS.reduce(
      (sum, tier) => sum + (count >= tier.count ? tier.stats[field] || 0 : 0),
      0,
    );
    if (field === "dropChance") {
      total += Math.min(
        0.012,
        ownedGearRarityCount("epic") * 0.0005 +
          ownedGearRarityCount("legend") * 0.0012,
      );
    }
    if (field === "xpGain" || field === "goldGain") {
      total += Math.min(0.018, Math.floor(count / 8) * 0.003);
    }
    return total;
  }

  function gearMasteryEntry(id, create = true) {
    if (!isGearItem(ITEMS[id])) return { level: 0, xp: 0 };
    if (!state.player.gearMastery) state.player.gearMastery = {};
    if (!state.player.gearMastery[id] && !create) return { level: 0, xp: 0 };
    const entry = state.player.gearMastery[id] || { level: 0, xp: 0 };
    entry.level = clamp(Math.floor(Number(entry.level) || 0), 0, 10);
    entry.xp = Math.max(0, Number(entry.xp) || 0);
    state.player.gearMastery[id] = entry;
    return entry;
  }

  function gearMasteryLevel(id) {
    return gearMasteryEntry(id).level || 0;
  }

  function gearMasteryXpForLevel(id, level = gearMasteryLevel(id)) {
    const item = ITEMS[id] || {};
    const rarityMult = { common: 1, rare: 1.25, epic: 1.55, legend: 1.95 }[
      item.rarity || "common"
    ];
    return Math.round((160 + (level + 1) * (level + 1) * 95) * rarityMult);
  }

  function gearMasteryBonus(id, field) {
    const item = ITEMS[id];
    const level = gearMasteryEntry(id, false).level || 0;
    if (!item || !level) return 0;
    if (field === "atk" && item.type === "weapon") return level * 2;
    if (field === "def" && item.type === "armor") return level * 2;
    if (field === "atk" && item.type === "charm") return Math.floor(level / 2);
    if (field === "def" && item.type === "charm") return Math.floor(level / 2);
    if (["str", "vit", "wis", "agi"].includes(field) && item[field])
      return Math.floor((level + 1) / 3);
    return 0;
  }

  function gearMasteryText(id) {
    if (!isGearItem(ITEMS[id])) return "";
    const owned =
      (state.player.inventory?.[id] || 0) > 0 || equippedGearIds().includes(id);
    if (!owned && !state.player.gearMastery?.[id]) return "";
    const entry = gearMasteryEntry(id);
    if (entry.level >= 10) return "숙련 Lv.10 · 완성";
    return `숙련 Lv.${entry.level} · ${Math.floor(entry.xp)}/${gearMasteryXpForLevel(id, entry.level)}`;
  }

  function equippedGearIds() {
    return Object.values(state.player.equipment || {}).filter(
      (id) => id && isGearItem(ITEMS[id]),
    );
  }

  function addGearMasteryXp(amount = 0) {
    const ids = equippedGearIds();
    if (!ids.length || amount <= 0) return;
    const gained = Math.max(1, Math.round(amount));
    const leveled = [];
    ids.forEach((id) => {
      const entry = gearMasteryEntry(id);
      if (entry.level >= 10) return;
      entry.xp += gained;
      while (
        entry.level < 10 &&
        entry.xp >= gearMasteryXpForLevel(id, entry.level)
      ) {
        entry.xp -= gearMasteryXpForLevel(id, entry.level);
        entry.level += 1;
        leveled.push(id);
      }
      if (entry.level >= 10) entry.xp = 0;
    });
    if (leveled.length) {
      const id = leveled[0];
      showEffect(
        state.player.x,
        state.player.y - 92,
        `${ITEMS[id].name} 숙련 Lv.${gearMasteryLevel(id)}`,
        rarityInfo(ITEMS[id]).color,
      );
      syncTitleUnlocks(true);
    }
  }

  function totalGearMasteryLevel() {
    return Object.values(state.player.gearMastery || {}).reduce(
      (sum, entry) => sum + (Number(entry.level) || 0),
      0,
    );
  }

  function maxGearMasteryLevel() {
    return Math.max(
      0,
      ...Object.values(state.player.gearMastery || {}).map(
        (entry) => Number(entry.level) || 0,
      ),
    );
  }

  function npcBondSpec(id) {
    return NPC_BONDS.find((bond) => bond.id === id) || null;
  }

  function npcBondEntry(id) {
    if (!state.npcBonds) state.npcBonds = initialNpcBonds();
    if (!state.npcBonds[id]) state.npcBonds[id] = { level: 0, gifts: 0 };
    const entry = state.npcBonds[id];
    entry.level = clamp(Math.floor(Number(entry.level) || 0), 0, 5);
    entry.gifts = Math.max(0, Math.floor(Number(entry.gifts) || 0));
    return entry;
  }

  function totalNpcBondLevel() {
    return NPC_BONDS.reduce(
      (sum, bond) => sum + (npcBondEntry(bond.id).level || 0),
      0,
    );
  }

  function maxNpcBondLevel() {
    return Math.max(0, ...NPC_BONDS.map((bond) => npcBondEntry(bond.id).level));
  }

  function completedNpcBondCount() {
    return NPC_BONDS.filter((bond) => npcBondEntry(bond.id).level >= 5).length;
  }

  function npcBondBonus(field) {
    return NPC_BONDS.reduce((sum, bond) => {
      const level = npcBondEntry(bond.id).level || 0;
      return sum + (bond.stats?.[field] || 0) * level;
    }, 0);
  }

  function npcBondUnlocked(bond) {
    return Boolean(bond && state.unlockedZones.includes(bond.zone));
  }

  function npcBondGiftCost(bond) {
    const level = npcBondEntry(bond.id).level || 0;
    const next = Math.min(5, level + 1);
    return {
      gold: Math.round(120 + (bond.zoneIndex + 1) * 52 + next * next * 58),
      material: bond.material,
      count: 1 + Math.floor((bond.zoneIndex + next + bond.npcIndex) / 5),
    };
  }

  function npcBondEffectText(bond, level = npcBondEntry(bond.id).level) {
    const parts = Object.entries(bond.stats || {})
      .filter(([field, value]) => {
        const total = value * Math.max(1, level);
        return (
          !["str", "vit", "wis", "agi", "atk", "def"].includes(field) ||
          Math.floor(total) > 0
        );
      })
      .map(([field, value]) => statLabel(field, value * Math.max(1, level)))
      .filter(Boolean);
    return parts.join(" · ");
  }

  function craftedRecipeIds() {
    if (!state.crafting) state.crafting = initialCrafting();
    state.crafting.crafted = Array.isArray(state.crafting.crafted)
      ? [...new Set(state.crafting.crafted)].filter((id) =>
          CRAFTING_RECIPES.some((recipe) => recipe.id === id),
        )
      : [];
    return state.crafting.crafted;
  }

  function craftedRecipeCount() {
    return craftedRecipeIds().length;
  }

  function craftedLegendaryRecipeCount() {
    return CRAFTING_RECIPES.filter(
      (recipe) =>
        craftedRecipeIds().includes(recipe.id) &&
        ITEMS[recipe.output]?.rarity === "legend",
    ).length;
  }

  function isCraftedGear(id) {
    return CRAFTING_RECIPES.some(
      (recipe) => recipe.output === id && isGearItem(ITEMS[id]),
    );
  }

  function recipeUnlockStatus(recipe) {
    const unlock = recipe.unlock || {};
    const checks = [];
    if (unlock.questIndex)
      checks.push({
        text: `메인 ${unlock.questIndex}개 완료`,
        ok: state.questIndex >= unlock.questIndex,
      });
    if (unlock.memories)
      checks.push({
        text: `기억 조각 ${unlock.memories}개`,
        ok: collectedMemoryCount() >= unlock.memories,
      });
    if (unlock.chronicles)
      checks.push({
        text: `지역 연대기 ${unlock.chronicles}개`,
        ok: claimedChronicleCount() >= unlock.chronicles,
      });
    if (unlock.expeditions)
      checks.push({
        text: `균열 정복 ${unlock.expeditions}회`,
        ok: (state.expeditionLog || []).length >= unlock.expeditions,
      });
    if (unlock.runes)
      checks.push({
        text: `각인 ${unlock.runes}종 보유`,
        ok: ownedRuneCount() >= unlock.runes,
      });
    if (unlock.crafted)
      checks.push({
        text: `제작 ${unlock.crafted}회 완료`,
        ok: craftedRecipeCount() >= unlock.crafted,
      });
    if (unlock.sanctuaryTotal)
      checks.push({
        text: `성소 재건 합계 ${unlock.sanctuaryTotal}`,
        ok: sanctuaryTotalLevel() >= unlock.sanctuaryTotal,
      });
    Object.entries(unlock.stability || {}).forEach(([zoneId, value]) => {
      checks.push({
        text: `${zoneMap[zoneId]?.name || zoneId} 안정도 ${value}`,
        ok: regionStabilityValue(zoneId) >= value,
      });
    });
    Object.entries(unlock.sanctuary || {}).forEach(([facilityId, value]) => {
      const facility = SANCTUARY_FACILITIES.find(
        (item) => item.id === facilityId,
      );
      checks.push({
        text: `${facility?.name || facilityId} Lv.${value}`,
        ok: sanctuaryLevel(facilityId) >= value,
      });
    });
    return checks;
  }

  function recipeUnlocked(recipe) {
    return recipeUnlockStatus(recipe).every((item) => item.ok);
  }

  function recipeCostStatus(recipe) {
    const costs = [
      {
        text: `${recipe.gold || 0}G`,
        ok: state.player.gold >= (recipe.gold || 0),
      },
      ...Object.entries(recipe.materials || {}).map(([id, count]) => ({
        text: `${ITEMS[id]?.name || id} ${state.player.inventory[id] || 0}/${count}`,
        ok: (state.player.inventory[id] || 0) >= count,
      })),
    ];
    return costs;
  }

  function recipeAffordable(recipe) {
    return recipeCostStatus(recipe).every((item) => item.ok);
  }

  function recipeAlreadyCrafted(recipe) {
    return Boolean(recipe.unique && craftedRecipeIds().includes(recipe.id));
  }

  function recipeStatusText(recipe) {
    const unlocks = recipeUnlockStatus(recipe);
    const unlockText = unlocks.length
      ? unlocks
          .map((item) => `${item.ok ? "완료" : "필요"} ${item.text}`)
          .join(" · ")
      : "기본 해금";
    const costs = recipeCostStatus(recipe)
      .map((item) => `${item.ok ? "보유" : "부족"} ${item.text}`)
      .join(" · ");
    return { unlockText, costText: costs || "비용 없음" };
  }

  function craftRecipe(id) {
    const recipe = CRAFTING_RECIPES.find((item) => item.id === id);
    if (!recipe) return;
    if (!recipeUnlocked(recipe))
      return toast("아직 제작 조건이 충족되지 않았습니다.");
    if (recipeAlreadyCrafted(recipe))
      return toast("이미 완성한 고유 제작식입니다.");
    if (!recipeAffordable(recipe))
      return toast("제작 재료나 골드가 부족합니다.");
    state.player.gold -= recipe.gold || 0;
    Object.entries(recipe.materials || {}).forEach(([itemId, count]) => {
      state.player.inventory[itemId] =
        (state.player.inventory[itemId] || 0) - count;
    });
    addInventoryItem(recipe.output, recipe.outputCount || 1);
    if (recipe.unique) craftedRecipeIds().push(recipe.id);
    const item = ITEMS[recipe.output];
    showEffect(
      state.player.x,
      state.player.y - 92,
      `${item.name} 제작`,
      rarityInfo(item).color,
    );
    addJournalEntry({
      title: `공방 제작: ${recipe.name}`,
      done: [
        `${recipe.desc} ${item.name}${recipe.outputCount ? ` x${recipe.outputCount}` : ""}을 완성했습니다.`,
      ],
    });
    syncTitleUnlocks(true);
    toast(`${item.name} 제작 완료`);
    openCrafting();
  }

  function brewAlchemyRecipe(id) {
    const recipe = ALCHEMY_RECIPES.find((item) => item.id === id);
    if (!recipe) return;
    if (!recipeUnlocked(recipe))
      return toast("아직 연금 제작 조건이 충족되지 않았습니다.");
    if (!recipeAffordable(recipe))
      return toast("연금 재료나 골드가 부족합니다.");
    if (!state.alchemy) state.alchemy = initialAlchemy();
    if (!state.alchemy.recipes) state.alchemy.recipes = {};
    state.player.gold -= recipe.gold || 0;
    Object.entries(recipe.materials || {}).forEach(([itemId, count]) => {
      state.player.inventory[itemId] =
        (state.player.inventory[itemId] || 0) - count;
    });
    addInventoryItem(recipe.output, recipe.outputCount || 1);
    state.alchemy.brewed = totalAlchemyBrews() + 1;
    state.alchemy.recipes[recipe.id] =
      (state.alchemy.recipes[recipe.id] || 0) + 1;
    const item = ITEMS[recipe.output];
    showEffect(
      state.player.x,
      state.player.y - 92,
      `${item.name} 완성`,
      rarityInfo(item).color,
    );
    if ((state.alchemy.recipes[recipe.id] || 0) === 1) {
      addJournalEntry({
        title: `연금 제작: ${recipe.name}`,
        done: [
          `${recipe.desc} ${item.name}${recipe.outputCount ? ` x${recipe.outputCount}` : ""}을 준비했습니다.`,
        ],
      });
    }
    syncTitleUnlocks(true);
    toast(`${item.name} 제작 완료`);
    openAlchemy();
  }

  function ownedRuneCount() {
    return Object.entries(state.player.inventory || {}).filter(
      ([id, count]) => count > 0 && ITEMS[id]?.type === "rune",
    ).length;
  }

  function runeSlotCount() {
    return (
      1 + (state.questIndex >= 28 ? 1 : 0) + (state.questIndex >= 56 ? 1 : 0)
    );
  }

  function equippedRuneIds() {
    state.player.runes = Array.isArray(state.player.runes)
      ? [...new Set(state.player.runes)]
          .filter(
            (id) =>
              ITEMS[id]?.type === "rune" &&
              (state.player.inventory[id] || 0) > 0,
          )
          .slice(0, runeSlotCount())
      : [];
    return state.player.runes;
  }

  function runeBonus(field) {
    return equippedRuneIds().reduce(
      (sum, id) => sum + (ITEMS[id]?.[field] || 0),
      0,
    );
  }

  function runeEffectText(id) {
    const item = ITEMS[id] || {};
    const parts = Object.keys(item)
      .filter(
        (field) => !["name", "type", "price", "rarity", "desc"].includes(field),
      )
      .map((field) => statLabel(field, item[field]))
      .filter(Boolean);
    return parts.join(" · ");
  }

  function titleSpec(id = state.titles?.equipped) {
    return OATH_TITLES.find((title) => title.id === id) || null;
  }

  function unlockedTitleIds() {
    if (!state.titles) state.titles = initialTitles();
    state.titles.unlocked = Array.isArray(state.titles.unlocked)
      ? [...new Set(["green_oath", ...state.titles.unlocked])]
      : ["green_oath"];
    return state.titles.unlocked;
  }

  function titleBonus(field) {
    const title = titleSpec();
    return title && unlockedTitleIds().includes(title.id)
      ? title.stats?.[field] || 0
      : 0;
  }

  function titleEffectText(title) {
    const parts = Object.entries(title.stats || {})
      .map(([field, value]) => statLabel(field, value))
      .filter(Boolean);
    return parts.length ? parts.join(" · ") : "보정 없음";
  }

  function syncTitleUnlocks(show = false) {
    const unlocked = unlockedTitleIds();
    const newly = [];
    OATH_TITLES.forEach((title) => {
      if (!unlocked.includes(title.id) && title.condition()) {
        unlocked.push(title.id);
        newly.push(title);
      }
    });
    state.titles.unlocked = [...new Set(unlocked)];
    if (
      !state.titles.equipped ||
      !state.titles.unlocked.includes(state.titles.equipped)
    )
      state.titles.equipped = state.titles.unlocked[0] || "green_oath";
    if (show && newly.length) {
      toast(`칭호 획득: ${newly[0].name}`);
      newly.forEach((title) =>
        addJournalEntry({
          title: `칭호 획득: ${title.name}`,
          done: [title.desc, `효과: ${titleEffectText(title)}`],
        }),
      );
    }
  }

  function collectedMemoryIds() {
    if (!state.memories) state.memories = initialMemories();
    state.memories.collected = Array.isArray(state.memories.collected)
      ? [...new Set(state.memories.collected)]
      : [];
    return state.memories.collected;
  }

  function collectedMemoryCount() {
    return collectedMemoryIds().length;
  }

  function chronicleClaimedIds() {
    if (!state.chronicles) state.chronicles = initialChronicles();
    state.chronicles.claimed = Array.isArray(state.chronicles.claimed)
      ? [...new Set(state.chronicles.claimed)]
      : [];
    return state.chronicles.claimed;
  }

  function claimedChronicleCount() {
    return chronicleClaimedIds().length;
  }

  function relicClaimedIds() {
    if (!state.relics) state.relics = initialRelics();
    state.relics.claimed = Array.isArray(state.relics.claimed)
      ? [...new Set(state.relics.claimed)].filter((id) =>
          REGION_RELICS.some((relic) => relic.id === id),
        )
      : [];
    return state.relics.claimed;
  }

  function restoredRelicCount() {
    return relicClaimedIds().length;
  }

  function sideStoryClaimedIds() {
    if (!state.sideStories) state.sideStories = initialSideStories();
    state.sideStories.claimed = Array.isArray(state.sideStories.claimed)
      ? [...new Set(state.sideStories.claimed)].filter((id) =>
          SIDE_STORIES.some((story) => story.id === id),
        )
      : [];
    return state.sideStories.claimed;
  }

  function claimedSideStoryCount() {
    return sideStoryClaimedIds().length;
  }

  function regionTrialClaimedIds() {
    if (!state.regionTrials) state.regionTrials = initialRegionTrials();
    state.regionTrials.claimed = Array.isArray(state.regionTrials.claimed)
      ? [...new Set(state.regionTrials.claimed)].filter((id) =>
          REGION_TRIALS.some((trial) => trial.id === id),
        )
      : [];
    return state.regionTrials.claimed;
  }

  function claimedRegionTrialCount(zoneId = "") {
    const claimed = new Set(regionTrialClaimedIds());
    return REGION_TRIALS.filter(
      (trial) => claimed.has(trial.id) && (!zoneId || trial.zone === zoneId),
    ).length;
  }

  function regionTrialRequired(trial) {
    const rank = trial.zoneIndex + 1;
    if (trial.metric === "ward") return 45 + trial.zoneIndex * 4;
    if (trial.metric === "supply") return 4 + Math.floor(rank / 2);
    if (trial.metric === "record") return 3 + Math.floor(rank / 4);
    return 1;
  }

  function regionTrialCurrent(trial) {
    if (trial.metric === "ward") {
      return (
        Math.floor(regionStabilityValue(trial.zone)) +
        zoneBestiaryKills(trial.zone)
      );
    }
    if (trial.metric === "supply") return zoneForageCount(trial.zone);
    if (trial.metric === "record") {
      return (
        zoneMemoryCount(trial.zone) +
        zoneChronicleCount(trial.zone) +
        zoneSideStoryClaimedCount(trial.zone) +
        zoneExpeditionCount(trial.zone)
      );
    }
    return 0;
  }

  function regionTrialProgress(trial) {
    const required = regionTrialRequired(trial);
    const current = Math.max(0, regionTrialCurrent(trial));
    return {
      current: Math.min(current, required),
      required,
      ready: current >= required,
    };
  }

  function trialBonus(field) {
    const claimed = new Set(regionTrialClaimedIds());
    return REGION_TRIALS.filter((trial) => claimed.has(trial.id)).reduce(
      (sum, trial) => sum + (Number(trial.stats?.[field]) || 0),
      0,
    );
  }

  function regionTrialReward(trial) {
    const rank = trial.zoneIndex + 1;
    const material =
      trial.material === "greenHerb" && rank >= 10
        ? "riftBloom"
        : trial.material === "greenHerb" && rank >= 5
          ? "mooncapMushroom"
          : trial.material === "starDust" && rank >= 12
            ? "abyssCore"
            : trial.material === "guardianThread" && rank >= 14
              ? "dawnPrism"
              : trial.material;
    return {
      xp: 240 + rank * 70 + trial.stageIndex * 110,
      gold: 180 + rank * 48 + trial.stageIndex * 90,
      renown: 1 + Math.floor(rank / 6),
      item: material,
      itemCount: rank >= 13 ? 3 : rank >= 7 ? 2 : 1,
    };
  }

  function zoneSideStoryClaimedCount(zoneId) {
    const claimed = new Set(sideStoryClaimedIds());
    return SIDE_STORIES.filter(
      (story) => story.zone === zoneId && claimed.has(story.id),
    ).length;
  }

  function zoneForageCount(zoneId) {
    if (!state.gathering) state.gathering = initialGathering();
    if (!state.gathering.zones) state.gathering.zones = {};
    state.gathering.zones[zoneId] = Math.max(
      0,
      Math.floor(Number(state.gathering.zones[zoneId]) || 0),
    );
    return state.gathering.zones[zoneId];
  }

  function zoneNpcBondLevel(zoneId) {
    return NPC_BONDS.filter((bond) => bond.zone === zoneId).reduce(
      (sum, bond) => sum + (npcBondEntry(bond.id).level || 0),
      0,
    );
  }

  function zoneBestiaryKills(zoneId) {
    const zone = zoneMap[zoneId];
    if (!zone?.enemies) return 0;
    return zone.enemies.reduce(
      (sum, type) => sum + (state.bestiary?.[type]?.kills || 0),
      0,
    );
  }

  function zoneMemoryCount(zoneId) {
    const collected = new Set(collectedMemoryIds());
    return MEMORY_FRAGMENTS.filter(
      (fragment) => fragment.zone === zoneId && collected.has(fragment.id),
    ).length;
  }

  function zoneChronicleCount(zoneId) {
    const claimed = new Set(chronicleClaimedIds());
    return REGIONAL_CHRONICLES.filter(
      (entry) => entry.zone === zoneId && claimed.has(entry.id),
    ).length;
  }

  function zoneRelicRestoredCount(zoneId) {
    const claimed = new Set(relicClaimedIds());
    return REGION_RELICS.filter(
      (relic) => relic.zone === zoneId && claimed.has(relic.id),
    ).length;
  }

  function zoneContractClaims(zoneId) {
    return Math.max(
      0,
      Math.floor(Number(state.contracts?.[zoneId]?.tier) || 1) - 1,
    );
  }

  function zoneBountyClaims(zoneId) {
    return Math.max(
      0,
      Math.floor(Number(state.bounties?.[zoneId]?.claimed) || 0),
    );
  }

  function zoneExpeditionCount(zoneId) {
    const zone = zoneMap[zoneId];
    return (state.expeditionLog || []).filter(
      (entry) =>
        entry.zone === zoneId || entry.title?.includes(zone?.name || ""),
    ).length;
  }

  function commendationClaimedIds() {
    if (!state.commendations) state.commendations = initialCommendations();
    state.commendations.claimed = Array.isArray(state.commendations.claimed)
      ? [...new Set(state.commendations.claimed)].filter((id) =>
          REGION_COMMENDATIONS.some((item) => item.id === id),
        )
      : [];
    return state.commendations.claimed;
  }

  function claimedCommendationCount(zoneId = "") {
    const claimed = new Set(commendationClaimedIds());
    return REGION_COMMENDATIONS.filter(
      (entry) => claimed.has(entry.id) && (!zoneId || entry.zone === zoneId),
    ).length;
  }

  function regionCommendationScore(zoneId) {
    if (!zoneMap[zoneId]) return 0;
    const score =
      Math.min(38, regionStabilityValue(zoneId) * 0.32) +
      zoneNpcBondLevel(zoneId) * 4 +
      zoneSideStoryClaimedCount(zoneId) * 7 +
      Math.min(14, zoneContractClaims(zoneId) * 4) +
      Math.min(18, zoneBountyClaims(zoneId) * 3) +
      claimedRegionTrialCount(zoneId) * 6 +
      zoneRelicRestoredCount(zoneId) * 7 +
      zoneChronicleCount(zoneId) * 5 +
      zoneMemoryCount(zoneId) * 5 +
      zoneSecretDiscoveryCount(zoneId) * 6 +
      claimedTreasureCount(zoneId) * 6 +
      claimedNamedHuntCount(zoneId) * 7 +
      claimedCampsiteCount(zoneId) * 5 +
      claimedPatrolOperationCount(zoneId) * 4 +
      claimedArmoryRecordCount(zoneId) * 4 +
      claimedCampaignCount(zoneId) * 3 +
      Math.min(12, zoneExpeditionCount(zoneId) * 6) +
      Math.min(12, clearedEchoTrialCount(zoneId) * 3) +
      Math.min(18, Math.floor(zoneBestiaryKills(zoneId) / 12)) +
      Math.min(8, Math.floor(zoneForageCount(zoneId) / 3));
    return clamp(Math.floor(score), 0, 140);
  }

  function commendationProgress(entry) {
    const current = regionCommendationScore(entry.zone);
    return {
      current: Math.min(current, entry.required),
      required: entry.required,
      ready: current >= entry.required,
    };
  }

  function commendationReward(entry) {
    const rank = entry.zoneIndex + 1;
    const material =
      entry.key === "legacy"
        ? rank >= 12
          ? "dawnPrism"
          : rank >= 7
            ? "abyssCore"
            : "starDust"
        : entry.key === "defense"
          ? rank >= 10
            ? "abyssCore"
            : "oathSteel"
          : rank >= 9
            ? "riftBloom"
            : "greenHerb";
    return {
      xp: 220 + rank * 80 + entry.stageIndex * 160,
      gold: 180 + rank * 58 + entry.stageIndex * 120,
      renown: 1 + Math.floor(rank / 7) + (entry.key === "legacy" ? 1 : 0),
      item: material,
      itemCount: rank >= 13 ? 3 : rank >= 7 ? 2 : 1,
    };
  }

  function commendationTotalStats(zoneId = "") {
    const claimed = new Set(commendationClaimedIds());
    return REGION_COMMENDATIONS.filter(
      (entry) => claimed.has(entry.id) && (!zoneId || entry.zone === zoneId),
    ).reduce((stats, entry) => {
      Object.entries(entry.stats || {}).forEach(([field, value]) => {
        stats[field] = (stats[field] || 0) + (Number(value) || 0);
      });
      return stats;
    }, {});
  }

  function commendationBonus(field, zoneId = state.zone) {
    return Number(commendationTotalStats(zoneId)[field]) || 0;
  }

  function shopDiscount(zoneId = state.zone) {
    return clamp(
      commendationBonus("shopDiscount", zoneId) + titleBonus("shopDiscount"),
      0,
      0.28,
    );
  }

  function shopItemPrice(item, zoneId = state.zone) {
    const base = Math.max(1, Math.floor(Number(item?.price) || 1));
    return Math.max(1, Math.round(base * (1 - shopDiscount(zoneId))));
  }

  function claimCommendation(id) {
    const entry = REGION_COMMENDATIONS.find((item) => item.id === id);
    if (!entry) return;
    const claimed = commendationClaimedIds();
    if (claimed.includes(entry.id)) return toast("이미 받은 감사장입니다.");
    const progress = commendationProgress(entry);
    if (!progress.ready) return toast("아직 지역 감사장 조건이 부족합니다.");
    claimed.push(entry.id);
    const reward = commendationReward(entry);
    giveReward(reward);
    addRegionStability(entry.zone, 2 + entry.stageIndex, "commendation");
    addJournalEntry({
      title: `감사장: ${entry.title}`,
      done: [
        `${zoneMap[entry.zone].name} 주민들이 ${entry.label} 기록을 감사장으로 묶었습니다.`,
        `${entry.desc} 지역 보정 ${buffStatsText(entry.stats)}이 열렸습니다.`,
      ],
    });
    syncTitleUnlocks(true);
    toast(`${entry.title}을 받았습니다.`);
    openJournal();
  }

  function sideStoryRequired(story) {
    const zoneRank = story.zoneIndex + 1;
    if (story.metric === "bond")
      return Math.min(5, 1 + Math.floor(zoneRank / 5));
    if (story.metric === "preparation")
      return 4 + Math.floor(story.zoneIndex / 2);
    if (story.metric === "zoneKills") return 18 + story.zoneIndex * 4;
    if (story.metric === "records") return 2 + Math.floor(story.zoneIndex / 5);
    return 1;
  }

  function sideStoryProgress(story) {
    const required = sideStoryRequired(story);
    let current = 0;
    if (story.metric === "bond") current = zoneNpcBondLevel(story.zone);
    if (story.metric === "preparation")
      current = zoneForageCount(story.zone) + totalAlchemyBrews();
    if (story.metric === "zoneKills") current = zoneBestiaryKills(story.zone);
    if (story.metric === "records")
      current =
        zoneMemoryCount(story.zone) +
        zoneChronicleCount(story.zone) +
        zoneExpeditionCount(story.zone);
    return {
      current: Math.min(required, current),
      required,
      ready: current >= required,
    };
  }

  function sideStoryReward(story) {
    const zoneRank = story.zoneIndex + 1;
    const stageRank = story.stageIndex + 1;
    const lateMaterial =
      story.key === "afterrift" && zoneRank >= 10
        ? "dawnPrism"
        : story.key === "supply" && zoneRank >= 8
          ? "riftBloom"
          : story.material;
    return {
      xp: 260 + zoneRank * 74 + stageRank * 120,
      gold: 160 + zoneRank * 55 + stageRank * 72,
      renown: 1 + Math.floor(zoneRank / 4) + Math.floor(stageRank / 2),
      item: lateMaterial,
      itemCount: story.stageIndex >= 2 || zoneRank >= 9 ? 2 : 1,
    };
  }

  function sideStoryEpilogue(story) {
    const zone = zoneMap[story.zone] || currentZone();
    const stage = SIDE_STORY_STAGES.find((item) => item.key === story.key);
    const lead = `${zone.name}의 ${stage?.name || "외전"} 기록이 서고에 더해졌습니다.`;
    if (story.key === "witness")
      return [
        lead,
        "주민의 이름과 사연이 전선 기록에 남아, 이 지역이 단순한 사냥터가 아니라 지켜야 할 장소로 이어졌습니다.",
      ];
    if (story.key === "supply")
      return [
        lead,
        "채집한 재료와 야영 준비가 순찰 보급로를 안정시켜 다음 장의 전투를 버틸 기반이 되었습니다.",
      ];
    if (story.key === "shadow")
      return [
        lead,
        "남은 몬스터의 습성과 출몰지를 도감에 정리해, 같은 전투를 반복해도 더 빠르게 판단할 수 있게 되었습니다.",
      ];
    return [
      lead,
      "기억 조각, 연대기, 균열 기록이 맞물리며 메인 서약이 지나간 뒤에도 지역에 남은 균열의 결말이 드러났습니다.",
    ];
  }

  function chronicleReward(entry) {
    const zoneRank = entry.zoneIndex + 1;
    const stageRank = entry.stageIndex + 1;
    const lateMaterial =
      entry.key === "stability" && zoneRank < 11 ? "abyssCore" : entry.material;
    return {
      xp: 240 + zoneRank * 62 + stageRank * 145,
      gold: 150 + zoneRank * 48 + stageRank * 88,
      renown: 1 + stageRank + Math.floor(zoneRank / 5),
      item: lateMaterial,
      itemCount: stageRank >= 4 ? 2 : 1,
    };
  }

  function chronicleProgress(entry) {
    if (!entry) return { current: 0, required: 1, ready: false };
    if (entry.key === "memory") {
      const collected = new Set(collectedMemoryIds());
      const count = MEMORY_FRAGMENTS.filter(
        (fragment) =>
          fragment.zone === entry.zone && collected.has(fragment.id),
      ).length;
      return {
        current: Math.min(entry.required, count),
        required: entry.required,
        ready: count >= entry.required,
      };
    }
    if (entry.key === "contract") {
      const tier = state.contracts?.[entry.zone]?.tier || 1;
      const count = Math.max(0, tier - 1);
      return {
        current: Math.min(entry.required, count),
        required: entry.required,
        ready: count >= entry.required,
      };
    }
    if (entry.key === "rift") {
      const done = (state.expeditionLog || []).some((item) => {
        const zone = zoneMap[entry.zone];
        return (
          item.zone === entry.zone || item.title?.includes(zone?.name || "")
        );
      });
      return { current: done ? 1 : 0, required: 1, ready: done };
    }
    if (entry.key === "stability") {
      const value = Math.floor(regionStabilityValue(entry.zone));
      return {
        current: Math.min(entry.required, value),
        required: entry.required,
        ready: value >= entry.required,
      };
    }
    return { current: 0, required: 1, ready: false };
  }

  function relicRequirement(relic) {
    if (!relic) return 1;
    if (relic.metric === "memory")
      return clamp(2 + Math.floor(relic.zoneIndex / 5), 2, 5);
    if (relic.metric === "ward")
      return clamp(2 + Math.floor(relic.zoneIndex / 4), 2, 6);
    if (relic.metric === "rift")
      return clamp(2 + Math.floor(relic.zoneIndex / 5), 2, 6);
    return 1;
  }

  function relicCurrent(relic) {
    if (!relic) return 0;
    if (relic.metric === "memory")
      return zoneMemoryCount(relic.zone) + regionStabilityTier(relic.zone);
    if (relic.metric === "ward")
      return (
        zoneSideStoryClaimedCount(relic.zone) +
        claimedRegionTrialCount(relic.zone) +
        zoneContractClaims(relic.zone)
      );
    if (relic.metric === "rift")
      return (
        zoneChronicleCount(relic.zone) +
        zoneExpeditionCount(relic.zone) +
        zoneBountyClaims(relic.zone)
      );
    return 0;
  }

  function relicProgress(relic) {
    const required = relicRequirement(relic);
    const current = Math.max(0, relicCurrent(relic));
    return {
      current: Math.min(required, current),
      required,
      ready: current >= required,
    };
  }

  function relicMaterial(relic) {
    if (relic.key === "memory") {
      if (relic.zoneIndex >= 12) return "dawnGinseng";
      if (relic.zoneIndex >= 8) return "riftBloom";
      if (relic.zoneIndex >= 4) return "starDust";
      return relic.material;
    }
    if (relic.key === "ward") {
      if (relic.zoneIndex >= 13) return "dawnPrism";
      if (relic.zoneIndex >= 8) return "abyssCore";
      if (relic.zoneIndex >= 4) return "starDust";
      return relic.material;
    }
    if (relic.zoneIndex >= 14) return "dawnPrism";
    if (relic.zoneIndex >= 7) return "abyssCore";
    return relic.material;
  }

  function relicCost(relic) {
    const rank = relic.zoneIndex + 1;
    return {
      gold: 220 + rank * 85 + relic.stageIndex * 180,
      material: relicMaterial(relic),
      count: clamp(2 + Math.floor(rank / 3) + relic.stageIndex, 2, 10),
    };
  }

  function relicReward(relic) {
    const rank = relic.zoneIndex + 1;
    const material = relicMaterial(relic);
    return {
      xp: 360 + rank * 96 + relic.stageIndex * 180,
      gold: 190 + rank * 62 + relic.stageIndex * 120,
      renown: 1 + Math.floor(rank / 5) + (relic.key === "rift" ? 1 : 0),
      item: material,
      itemCount: relic.zoneIndex >= 10 ? 2 : 1,
    };
  }

  function relicCostReady(cost) {
    return (
      state.player.gold >= cost.gold &&
      (state.player.inventory[cost.material] || 0) >= cost.count
    );
  }

  function relicBonus(field) {
    const claimed = new Set(relicClaimedIds());
    return REGION_RELICS.filter((relic) => claimed.has(relic.id)).reduce(
      (sum, relic) => sum + (Number(relic.stats?.[field]) || 0),
      0,
    );
  }

  function relicLore(relic) {
    const zone = zoneMap[relic.zone] || currentZone();
    if (relic.key === "memory")
      return `${zone.name}의 사라진 이름과 전투 전조가 ${relic.name}에 새겨졌습니다. 기억 조각을 되찾을수록 이 지역의 길과 적을 더 또렷하게 읽습니다.`;
    if (relic.key === "ward")
      return `${zone.name}의 주민 후일담과 수호 시험이 ${relic.name}에 묶였습니다. 지켜 낸 이야기 자체가 다음 전투의 방패가 됩니다.`;
    return `${zone.name}의 균열, 수배 표적, 연대기 기록이 ${relic.name} 안에서 봉인되었습니다. 위험한 전리품의 흐름을 추적하는 감각이 남습니다.`;
  }

  function restoredRelicsForZone(zoneId = state.zone) {
    const zone = zoneMap[zoneId];
    if (!zone) return [];
    const claimed = new Set(relicClaimedIds());
    return REGION_RELICS.filter(
      (relic) => relic.zone === zoneId && claimed.has(relic.id),
    ).map((relic) => {
      const seed = (relic.zoneIndex + 3) * (relic.stageIndex + 7);
      return {
        ...relic,
        x: clamp(
          zone.w * (0.22 + relic.stageIndex * 0.24) + Math.sin(seed) * 96,
          130,
          zone.w - 130,
        ),
        y: clamp(
          zone.h * (0.66 - relic.stageIndex * 0.17) + Math.cos(seed * 1.7) * 92,
          130,
          zone.h - 130,
        ),
      };
    });
  }

  function nearestRestoredRelic() {
    return restoredRelicsForZone()
      .map((relic) => ({
        ...relic,
        d: distance(state.player.x, state.player.y, relic.x, relic.y),
      }))
      .sort((a, b) => a.d - b.d)[0];
  }

  function inspectRestoredRelic(relic) {
    if (!relic) return;
    showEffect(relic.x, relic.y - 54, relic.name, relic.color);
    showDialogue(`복원 유물: ${relic.title}`, [
      relicLore(relic),
      `복원 보정: ${buffStatsText(relic.stats)}.`,
      "유물 메뉴에서 다른 지역의 복원 조건과 보상을 확인할 수 있습니다.",
    ]);
  }

  function memoryFragmentById(id) {
    return MEMORY_FRAGMENTS.find((fragment) => fragment.id === id) || null;
  }

  function secretDiscoveryClaimedIds() {
    if (!state.discoveries) state.discoveries = initialDiscoveries();
    state.discoveries.claimed = Array.isArray(state.discoveries.claimed)
      ? [...new Set(state.discoveries.claimed)].filter((id) =>
          REGION_SECRETS.some((secret) => secret.id === id),
        )
      : [];
    return state.discoveries.claimed;
  }

  function discoveredSecretCount(zoneId = "") {
    const claimed = new Set(secretDiscoveryClaimedIds());
    return REGION_SECRETS.filter(
      (secret) => claimed.has(secret.id) && (!zoneId || secret.zone === zoneId),
    ).length;
  }

  function zoneSecretDiscoveryCount(zoneId) {
    return discoveredSecretCount(zoneId);
  }

  function visibleSecretLandmarks(zoneId = state.zone) {
    const claimed = new Set(secretDiscoveryClaimedIds());
    return REGION_SECRETS.filter(
      (secret) =>
        secret.zone === zoneId &&
        state.unlockedZones.includes(secret.zone) &&
        !claimed.has(secret.id),
    );
  }

  function nearestSecretLandmark() {
    return visibleSecretLandmarks()
      .map((secret) => ({
        ...secret,
        d: distance(state.player.x, state.player.y, secret.x, secret.y),
      }))
      .sort((a, b) => a.d - b.d)[0];
  }

  function secretLandmarkMaterial(secret) {
    const rank = secret.zoneIndex + 1;
    if (secret.key === "cache") {
      if (rank >= 14) return "dawnPrism";
      if (rank >= 9) return "abyssCore";
      if (rank >= 5) return "starDust";
      return rank % 2 ? "guardianThread" : "oathSteel";
    }
    if (secret.key === "inscription") {
      if (rank >= 12) return "dawnGinseng";
      if (rank >= 8) return "riftBloom";
      if (rank >= 4) return "frostLotus";
      return "mooncapMushroom";
    }
    if (rank >= 11) return "riftBloom";
    if (rank >= 6) return "emberPepper";
    return rank % 2 ? "tideKelp" : "greenHerb";
  }

  function secretLandmarkReward(secret) {
    const rank = secret.zoneIndex + 1;
    return {
      xp: 150 + rank * 62 + secret.stageIndex * 90,
      gold: 90 + rank * 38 + secret.stageIndex * 70,
      renown: secret.key === "inscription" || rank >= 10 ? 2 : 1,
      item: secretLandmarkMaterial(secret),
      itemCount: rank >= 12 ? 3 : rank >= 6 ? 2 : 1,
    };
  }

  function collectSecretLandmark(secret) {
    if (!secret || secretDiscoveryClaimedIds().includes(secret.id)) return;
    secretDiscoveryClaimedIds().push(secret.id);
    const reward = secretLandmarkReward(secret);
    giveReward(reward);
    addRegionStability(secret.zone, 1 + secret.stageIndex, "discovery");
    addJournalEntry({
      title: `지역 탐색: ${secret.title}`,
      done: [
        secret.text,
        `탐색 보상으로 ${rewardText(reward)}을 얻고 ${zoneMap[secret.zone].name} 감사 점수에 기록했습니다.`,
      ],
    });
    showEffect(secret.x, secret.y - 58, secret.label, secret.color);
    syncTitleUnlocks(true);
    toast(
      `${secret.title} 조사 완료 ${discoveredSecretCount()}/${REGION_SECRETS.length}`,
    );
  }

  function visibleMemoryFragments() {
    const collected = new Set(collectedMemoryIds());
    return MEMORY_FRAGMENTS.filter(
      (fragment) =>
        fragment.zone === state.zone &&
        state.unlockedZones.includes(fragment.zone) &&
        !collected.has(fragment.id),
    );
  }

  function nearestMemoryFragment() {
    return visibleMemoryFragments()
      .map((fragment) => ({
        ...fragment,
        d: distance(state.player.x, state.player.y, fragment.x, fragment.y),
      }))
      .sort((a, b) => a.d - b.d)[0];
  }

  function memoryRewardMilestones() {
    return [6, 14, 24, MEMORY_FRAGMENTS.length];
  }

  function collectMemoryFragment(fragment) {
    if (!fragment || collectedMemoryIds().includes(fragment.id)) return;
    state.memories.collected.push(fragment.id);
    const count = collectedMemoryCount();
    addJournalEntry({
      title: `기억 조각: ${fragment.title}`,
      done: [fragment.text],
    });
    giveReward({
      xp: 180 + count * 18,
      gold: 90 + count * 12,
      renown: count % 4 === 0 ? 2 : 1,
    });
    addRegionStability(fragment.zone, 2, "memory");
    claimMemoryMilestoneRewards();
    syncTitleUnlocks(true);
    toast(`기억 조각 수집 ${count}/${MEMORY_FRAGMENTS.length}`);
  }

  function forageMaterialForZone(zoneIndex, kind, slot = 0) {
    if (kind === "ore") {
      if (zoneIndex >= 14 && slot % 2) return "dawnPrism";
      if (zoneIndex >= 9) return "abyssCore";
      if (zoneIndex >= 5) return "starDust";
      return zoneIndex % 2 ? "guardianThread" : "oathSteel";
    }
    if (kind === "relic") {
      if (zoneIndex >= 13) return "dawnGinseng";
      if (zoneIndex >= 9) return "riftBloom";
      if (zoneIndex >= 5) return "frostLotus";
      return "mooncapMushroom";
    }
    if (zoneIndex >= 15) return "dawnGinseng";
    if (zoneIndex >= 11) return "riftBloom";
    if (zoneIndex >= 7) return "frostLotus";
    if (zoneIndex >= 3) return "emberPepper";
    return zoneIndex % 2 ? "tideKelp" : "greenHerb";
  }

  function forageNodesForZone(zone = currentZone()) {
    const zoneIndex = Math.max(
      0,
      ZONES.findIndex((item) => item.id === zone.id),
    );
    const pattern = ["herb", "ore", "herb", "relic"];
    return pattern.map((kind, index) => {
      const seed = (zoneIndex + 3) * (index + 5);
      const x = clamp(
        zone.w * (0.16 + ((seed * 0.173) % 0.68)),
        160,
        zone.w - 160,
      );
      const y = clamp(
        zone.h * (0.18 + ((seed * 0.229) % 0.62)),
        160,
        zone.h - 160,
      );
      const meta = FORAGE_NODE_TYPES[kind] || FORAGE_NODE_TYPES.herb;
      const item = forageMaterialForZone(zoneIndex, kind, index);
      return {
        id: `${zone.id}-${kind}-${index}`,
        zone: zone.id,
        kind,
        label: meta.label,
        color: meta.color,
        cooldown: Math.max(
          240,
          meta.cooldown - regionStabilityTier(zone.id) * 8,
        ),
        item,
        count:
          kind === "ore" && ITEMS[item]?.rarity === "legend"
            ? 1
            : 1 + (zoneIndex >= 6 && index % 2 === 0 ? 1 : 0),
        x,
        y,
      };
    });
  }

  function forageNodeEntry(node) {
    if (!state.gathering) state.gathering = initialGathering();
    if (!state.gathering.nodes) state.gathering.nodes = {};
    if (!state.gathering.nodes[node.id])
      state.gathering.nodes[node.id] = { readyAt: 0 };
    state.gathering.nodes[node.id].readyAt = Math.max(
      0,
      Number(state.gathering.nodes[node.id].readyAt) || 0,
    );
    return state.gathering.nodes[node.id];
  }

  function forageNodeReady(node) {
    return (forageNodeEntry(node).readyAt || 0) <= state.playSeconds;
  }

  function nearestForageNode() {
    return forageNodesForZone()
      .map((node) => ({
        ...node,
        d: distance(state.player.x, state.player.y, node.x, node.y),
      }))
      .sort((a, b) => a.d - b.d)[0];
  }

  function collectForageNode(node) {
    if (!node || node.d > 108) return;
    const entry = forageNodeEntry(node);
    if (!forageNodeReady(node)) {
      const left = Math.max(1, entry.readyAt - state.playSeconds);
      return toast(
        `${node.label}은 ${formatTime(left)} 뒤 다시 채집할 수 있습니다.`,
      );
    }
    const item = ITEMS[node.item];
    const bonusChance =
      0.12 +
      Math.min(0.18, regionStabilityTier(node.zone) * 0.025) +
      titleBonus("dropChance");
    const count = node.count + (Math.random() < bonusChance ? 1 : 0);
    addInventoryItem(node.item, count);
    if (Math.random() < 0.18 + Math.min(0.12, state.questIndex * 0.002)) {
      const zoneIndex = Math.max(
        0,
        ZONES.findIndex((zone) => zone.id === node.zone),
      );
      const extra =
        zoneIndex >= 10
          ? "riftBloom"
          : zoneIndex >= 5
            ? "mooncapMushroom"
            : "greenHerb";
      if (extra !== node.item) addInventoryItem(extra, 1);
    }
    entry.readyAt = state.playSeconds + node.cooldown;
    state.gathering.harvested = totalForageHarvests() + 1;
    state.gathering.zones = state.gathering.zones || {};
    state.gathering.zones[node.zone] = zoneForageCount(node.zone) + 1;
    addRegionStability(node.zone, 1, "");
    syncTitleUnlocks(true);
    showEffect(
      node.x,
      node.y - 46,
      `${item?.name || node.item} x${count}`,
      node.color,
    );
    toast(`${node.label} 채집: ${item?.name || node.item} x${count}`);
  }

  function claimMemoryMilestoneRewards() {
    if (!state.memories) state.memories = initialMemories();
    state.memories.rewards = Array.isArray(state.memories.rewards)
      ? state.memories.rewards
      : [];
    const count = collectedMemoryCount();
    memoryRewardMilestones().forEach((milestone) => {
      if (count < milestone || state.memories.rewards.includes(milestone))
        return;
      state.memories.rewards.push(milestone);
      const reward = {
        xp: milestone * 95,
        gold: milestone * 42,
        item:
          milestone >= 24
            ? "dawnPrism"
            : milestone >= 14
              ? "abyssCore"
              : "starDust",
        renown: Math.ceil(milestone / 6),
      };
      giveReward(reward);
      addJournalEntry({
        title: `기억 복원 ${milestone}개`,
        done: [
          `${milestone}개의 기억 조각이 서고에 이어져 잊힌 서약의 문장이 복원되었습니다.`,
          `보상: ${rewardText(reward)}`,
        ],
      });
    });
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
    addRegionStability(quest.zone, quest.final ? 12 : 5, "quest");
    syncTitleUnlocks(true);
    if (closeCurrentModal) closeModal();
    if (quest.final) {
      state.completed = true;
      toast("서약의 연대기를 완료했습니다.");
    } else {
      state.questIndex += 1;
      state.questProgress = 0;
      syncCompanionUnlocks(true);
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
      addInventoryItem(reward.item, reward.itemCount || 1);
      if (["weapon", "armor", "charm"].includes(ITEMS[reward.item]?.type))
        equipItem(reward.item);
    }
    if (Array.isArray(reward.items)) {
      reward.items.forEach((id) => {
        addInventoryItem(id, 1);
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

  function addInventoryItem(id, count = 1) {
    if (!id || !ITEMS[id]) return;
    state.player.inventory[id] =
      (state.player.inventory[id] || 0) + Math.max(1, count || 1);
  }

  function addJournalEntry(quest) {
    const title = quest.final ? "서약 완성" : quest.title;
    const text = quest.done.join(" ");
    state.journal = [
      { title, text, time: formatTime(state.playSeconds) },
      ...(state.journal || []),
    ].slice(0, 140);
  }

  function regionStabilityEntry(zoneId = state.zone) {
    if (!state.regionStability)
      state.regionStability = initialRegionStability();
    if (!state.regionStability[zoneId])
      state.regionStability[zoneId] = { points: 0, claimed: [] };
    return state.regionStability[zoneId];
  }

  function regionStabilityValue(zoneId = state.zone) {
    return clamp(regionStabilityEntry(zoneId).points || 0, 0, 120);
  }

  function regionStabilityTier(zoneId = state.zone) {
    const value = regionStabilityValue(zoneId);
    return REGION_STABILITY_THRESHOLDS.filter((threshold) => value >= threshold)
      .length;
  }

  function addRegionStability(zoneId, amount, reason = "진행") {
    if (!zoneMap[zoneId] || !amount) return;
    const entry = regionStabilityEntry(zoneId);
    const before = entry.points || 0;
    entry.points = clamp(before + amount, 0, 120);
    if (entry.points <= before) return;
    const crossed = REGION_STABILITY_THRESHOLDS.filter(
      (threshold) => before < threshold && entry.points >= threshold,
    );
    if (state.zone === zoneId) {
      showEffect(
        state.player.x,
        state.player.y - 86,
        `안정도 +${entry.points - before}`,
        zoneMap[zoneId].accent,
      );
    }
    if (crossed.length) {
      toast(
        `${zoneMap[zoneId].name} 안정도 ${crossed[crossed.length - 1]} 달성. 서고에서 보상을 받을 수 있습니다.`,
      );
    } else if (reason) {
      toast(`${zoneMap[zoneId].name} 안정도 +${entry.points - before}`);
    }
  }

  function regionReward(zoneId, threshold) {
    const zoneIndex = Math.max(
      0,
      ZONES.findIndex((zone) => zone.id === zoneId),
    );
    const material =
      threshold >= 100
        ? "dawnPrism"
        : zoneIndex >= 8
          ? "abyssCore"
          : threshold >= 60
            ? "starDust"
            : "oathSteel";
    return {
      xp: Math.round((180 + zoneIndex * 42) * (threshold / 25)),
      gold: Math.round((120 + zoneIndex * 35) * (threshold / 25)),
      renown: Math.max(1, Math.floor(threshold / 25)),
      item: material,
      itemCount: threshold >= 100 ? 2 : 1,
    };
  }

  function regionPassiveText(zoneId = state.zone) {
    const tier = regionStabilityTier(zoneId);
    if (!tier) return "아직 지역 패시브가 없습니다.";
    return [
      `지역 전투 보정 ${tier}단계`,
      `공격 +${Math.floor(tier / 2)}`,
      `방어 +${tier}`,
      `경험치/골드 +${tier * 2}%`,
    ].join(" · ");
  }

  function regionBonus(field, zoneId = state.zone) {
    const tier = regionStabilityTier(zoneId);
    if (field === "atk") return Math.floor(tier / 2);
    if (field === "def") return tier;
    if (field === "xpGain" || field === "goldGain") return tier * 0.02;
    return 0;
  }

  function claimRegionReward(zoneId, threshold) {
    const entry = regionStabilityEntry(zoneId);
    const value = regionStabilityValue(zoneId);
    const level = Number(threshold);
    if (!REGION_STABILITY_THRESHOLDS.includes(level)) return;
    if (value < level) return toast("지역 안정도가 아직 부족합니다.");
    if ((entry.claimed || []).includes(level))
      return toast("이미 받은 안정도 보상입니다.");
    entry.claimed = [...(entry.claimed || []), level];
    giveReward(regionReward(zoneId, level));
    toast(`${zoneMap[zoneId].name} 안정도 ${level} 보상을 받았습니다.`);
    openJournal();
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
    const echoTrial = activeEchoTrial();
    const cancelEchoTrial = echoTrial && echoTrial.zone !== zoneId;
    if (!state.unlockedZones.includes(zoneId)) state.unlockedZones.push(zoneId);
    state.zone = zoneId;
    state.player.x = 420;
    state.player.y = Math.min(currentZone().h - 420, currentZone().h / 2);
    if (state.companionPosition) {
      state.companionPosition.x = state.player.x - 64;
      state.companionPosition.y = state.player.y + 52;
      state.companionPosition.attackFlash = 0;
    }
    state.enemies = [];
    state.hazards = [];
    state.expeditionNodes = [];
    state.expeditionNodeFloor = "";
    if (cancelEchoTrial) state.echoTrials.active = null;
    if (state.worldEvent?.zone !== zoneId) {
      state.worldEvent = null;
      state.worldEventCooldown = Math.min(state.worldEventCooldown || 80, 45);
    }
    state.drops = state.drops.filter((drop) => drop.zone === zoneId);
    toast(`${currentZone().name}에 도착했습니다.`);
  }

  function updateWorldEvent(dt) {
    if (activeExpedition()) return;
    if (activeEchoTrial()) return;
    if (activeNamedHunt()) return;
    const event = activeWorldEvent();
    if (!event) {
      state.worldEventCooldown = Math.max(
        0,
        (state.worldEventCooldown || 90) - dt,
      );
      if (state.worldEventCooldown <= 0 && state.playSeconds > 90) {
        startWorldEvent();
      }
      return;
    }
    event.ttl = Math.max(0, (event.ttl || 0) - dt);
    if (event.ttl <= 0) {
      toast(`${worldEventMeta(event.kind).title} 시간이 지나 사라졌습니다.`);
      state.worldEvent = null;
      state.worldEventCooldown = 90 + Math.random() * 110;
    }
  }

  function startWorldEvent() {
    const zone = currentZone();
    if (!zone?.enemies?.length) {
      state.worldEventCooldown = 90;
      return;
    }
    const zoneIndex = Math.max(
      0,
      ZONES.findIndex((item) => item.id === zone.id),
    );
    const type =
      WORLD_EVENT_TYPES[
        (zoneIndex + Math.floor(state.playSeconds / 180)) %
          WORLD_EVENT_TYPES.length
      ];
    const point = randomEventPoint(zone);
    const target =
      zone.enemies[
        (zoneIndex + Math.floor(state.player.level / 2)) % zone.enemies.length
      ];
    state.worldEvent = {
      active: true,
      id: `event-${Date.now()}-${Math.random()}`,
      kind: type.kind,
      zone: zone.id,
      x: point.x,
      y: point.y,
      target,
      progress: 0,
      required: type.targetKills || 1,
      ttl: type.duration,
      startedAt: new Date().toISOString(),
    };
    state.worldEventCooldown = 0;
    toast(`${type.title}: ${type.desc}`);
  }

  function randomEventPoint(zone) {
    for (let i = 0; i < 18; i += 1) {
      const x = 220 + Math.random() * (zone.w - 440);
      const y = 220 + Math.random() * (zone.h - 440);
      if (distance(x, y, state.player.x, state.player.y) > 380) return { x, y };
    }
    return { x: zone.w * 0.58, y: zone.h * 0.46 };
  }

  function nearestWorldEvent() {
    if (activeNamedHunt()) return null;
    const event = activeWorldEvent();
    if (!event || !worldEventMeta(event.kind).interactive) return null;
    return {
      ...event,
      d: distance(state.player.x, state.player.y, event.x, event.y),
    };
  }

  function completeWorldEvent(reason = "완료") {
    const event = activeWorldEvent();
    if (!event) return;
    const meta = worldEventMeta(event.kind);
    const zoneIndex = Math.max(
      0,
      ZONES.findIndex((zone) => zone.id === event.zone),
    );
    const material =
      zoneIndex >= 13
        ? "dawnPrism"
        : zoneIndex >= 8
          ? "abyssCore"
          : zoneIndex >= 4
            ? "starDust"
            : "oathSteel";
    const materialCount = Math.max(1, Math.ceil((zoneIndex + 1) / 5));
    addInventoryItem(material, materialCount);
    if (event.kind === "sanctuary") {
      state.player.hp = state.player.maxHp;
      state.player.mp = state.player.maxMp;
      state.player.invuln = Math.max(state.player.invuln || 0, 3.2);
    }
    giveReward({
      xp: Math.round((meta.reward?.xp || 0) * (1 + zoneIndex * 0.08)),
      gold: Math.round((meta.reward?.gold || 0) * (1 + zoneIndex * 0.06)),
      renown: meta.reward?.renown || 1,
    });
    addRegionStability(event.zone, event.kind === "elite" ? 7 : 6, "event");
    showEffect(
      event.x,
      event.y - 58,
      `${ITEMS[material].name} x${materialCount}`,
      meta.color,
    );
    state.worldEventLog = [
      {
        title: meta.title,
        zone: currentZone().name,
        reason,
        time: formatTime(state.playSeconds),
      },
      ...(state.worldEventLog || []),
    ].slice(0, 40);
    addJournalEntry({
      title: `${currentZone().name} ${meta.title}`,
      done: [
        `${meta.title}을 해결해 ${currentZone().name}의 불안정한 흐름을 가라앉혔습니다.`,
      ],
    });
    state.worldEvent = null;
    state.worldEventCooldown = 100 + Math.random() * 140;
    toast(`${meta.title} 해결. ${ITEMS[material].name} x${materialCount} 획득`);
  }

  function recordWorldEventKill(enemy) {
    const event = activeWorldEvent();
    if (!event || worldEventMeta(event.kind).interactive) return;
    if (enemy.type !== event.target && !enemy.eventTarget) return;
    event.progress = Math.min(event.required, (event.progress || 0) + 1);
    showEffect(
      enemy.x,
      enemy.y - 74,
      `사건 ${event.progress}/${event.required}`,
      worldEventMeta(event.kind).color,
    );
    if (event.progress >= event.required) completeWorldEvent("전투 완료");
  }

  function spawnEnemies() {
    const zone = currentZone();
    const quest = currentQuest();
    const expedition = activeExpedition();
    const expeditionHere = expedition && expedition.zone === zone.id;
    const echoTrial = activeEchoTrial();
    const echoHere = echoTrial && echoTrial.zone === zone.id;
    const namedHunt = activeNamedHunt();
    const namedHere =
      namedHunt && namedHunt.zone === zone.id && !expeditionHere && !echoHere;
    const worldEvent = activeWorldEvent();
    const combatEvent =
      worldEvent && !namedHere && !worldEventMeta(worldEvent.kind).interactive;
    const expeditionBossActive =
      expeditionHere && (expedition.kills || 0) >= expedition.required;
    const targetType = echoHere
      ? echoTrial.boss
      : expeditionHere
        ? expeditionBossActive
          ? expedition.bossType
          : expedition.target
        : namedHere
          ? namedHunt.target
          : combatEvent
            ? worldEvent.target
            : quest &&
                quest.zone === zone.id &&
                (quest.type === "hunt" ||
                  (quest.type === "boss" &&
                    (!quest.minPlaySeconds ||
                      state.playSeconds >= quest.minPlaySeconds)))
              ? quest.enemy
              : null;
    const bossActive =
      Boolean(echoHere) ||
      Boolean(namedHere) ||
      expeditionBossActive ||
      (quest?.type === "boss" && quest.zone === zone.id && targetType);
    const modifier = expeditionHere ? expeditionModifier(expedition) : null;
    const echoModifier = echoHere ? echoTrialModifier(echoTrial) : null;
    const maxEnemies = bossActive
      ? 1
      : expeditionHere
        ? Math.round(10 * (modifier?.spawn || 1))
        : combatEvent
          ? 11
          : 9;
    if (state.enemies.length >= maxEnemies) return;
    if (bossActive && state.enemies.some((enemy) => enemy.boss)) return;
    const type =
      targetType ||
      bountySpawnTarget(zone) ||
      zone.enemies[Math.floor(Math.random() * zone.enemies.length)];
    const spec = ENEMIES[type];
    const boss = bossActive;
    const point = namedHere
      ? { x: namedHunt.x, y: namedHunt.y }
      : randomSpawnPoint(zone);
    const floorScale = expeditionHere
      ? 1 + Math.max(0, (expedition.floor || 1) - 1) * 0.11
      : 1;
    const eventScale = combatEvent
      ? worldEvent.kind === "elite"
        ? 1.28
        : 1.12
      : 1;
    const affix = chooseEliteAffix({
      boss,
      expeditionHere,
      combatEvent,
      worldEvent,
    });
    const hpMult = affix?.hp || 1;
    const atkMult = affix?.atk || 1;
    const maxHp = Math.round(
      spec.hp *
        (boss ? 3.2 : 1) *
        (1 + Math.max(0, state.player.level - 1) * 0.08) *
        floorScale *
        eventScale *
        (namedHere ? 1.55 : 1) *
        (modifier?.enemyHp || 1) *
        (echoModifier?.hp || 1) *
        hpMult,
    );
    state.enemies.push({
      id: `e${Date.now()}${Math.random()}`,
      type,
      name: boss
        ? echoHere
          ? `${echoTrial.tierName} 회상 ${spec.name}`
          : namedHere
            ? namedHuntDisplayName(namedHunt)
            : expeditionBossActive
              ? `균열 수호자 ${spec.name}`
              : `결계 수호자 ${spec.name}`
        : affix
          ? `${affix.name} ${expeditionHere ? `균열 ${spec.name}` : spec.name}`
          : expeditionHere
            ? `균열 ${spec.name}`
            : spec.name,
      x: point.x,
      y: point.y,
      hp: maxHp,
      maxHp,
      atk: Math.round(
        spec.atk *
          (boss ? 1.35 : 1) *
          (1 + Math.max(0, state.player.level - 1) * 0.05) *
          floorScale *
          eventScale *
          (namedHere ? 1.18 : 1) *
          (modifier?.enemyAtk || 1) *
          (echoModifier?.atk || 1) *
          atkMult,
      ),
      def:
        spec.def +
        (boss ? 8 : 0) +
        (namedHere ? 5 + Math.floor(namedHunt.zoneIndex / 2) : 0) +
        (affix?.def || 0) +
        (echoModifier?.def || 0),
      color:
        echoModifier?.color ||
        (namedHere ? namedHunt.color : "") ||
        affix?.color ||
        (combatEvent ? worldEventMeta(worldEvent.kind).color : spec.color),
      affix: affix?.id || "",
      boss,
      hit: 0,
      attackCd: 0,
      specialCd: 0.9 + Math.random() * 2.1,
      windup: 0,
      expedition: Boolean(expeditionHere),
      expeditionBoss: Boolean(expeditionBossActive),
      echoTrial: Boolean(echoHere),
      echoTrialId: echoHere ? echoTrial.id : "",
      namedHunt: Boolean(namedHere),
      namedHuntId: namedHere ? namedHunt.id : "",
      eventTarget: Boolean(combatEvent),
      step: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function chooseEliteAffix({ boss, expeditionHere, combatEvent, worldEvent }) {
    if (boss) return null;
    const forcedEvent = combatEvent && worldEvent?.kind === "elite";
    const progressChance = Math.min(
      0.16,
      Math.max(0, state.questIndex) * 0.0018,
    );
    const stabilityChance = regionStabilityTier(state.zone) * 0.012;
    const baseChance = forcedEvent
      ? 0.5
      : expeditionHere
        ? 0.18
        : 0.045 + progressChance + stabilityChance;
    if (Math.random() > baseChance) return null;
    return ELITE_AFFIXES[Math.floor(Math.random() * ELITE_AFFIXES.length)];
  }

  function enemyEliteAffix(enemy) {
    return ELITE_AFFIXES.find((affix) => affix.id === enemy?.affix) || null;
  }

  function bountySpawnTarget(zone) {
    const entry = bountyEntry(zone.id);
    if (!entry?.target) return "";
    if (entry.progress >= bountyRequirement(zone.id)) return "";
    const baseChance = activeWorldEvent() ? 0.08 : 0.18;
    return Math.random() < baseChance ? entry.target : "";
  }

  function randomSpawnPoint(zone) {
    for (let i = 0; i < 30; i += 1) {
      const x = 160 + Math.random() * (zone.w - 320);
      const y = 160 + Math.random() * (zone.h - 320);
      if (distance(x, y, state.player.x, state.player.y) > 520) return { x, y };
    }
    return { x: zone.w * 0.7, y: zone.h * 0.5 };
  }

  function enemyRadius(enemy) {
    return enemy?.boss ? BOSS_BODY_RADIUS : ENEMY_BODY_RADIUS;
  }

  function playerEnemySeparation(enemy) {
    return PLAYER_BODY_RADIUS + enemyRadius(enemy) + PLAYER_ENEMY_BODY_PADDING;
  }

  function markEnemySeparated(enemy) {
    enemy.separateFlash = Math.max(enemy.separateFlash || 0, 0.28);
    if ((enemy.separateCueCd || 0) > 0) return;
    enemy.separateCueCd = 0.9;
    showEffect(
      enemy.x,
      enemy.y - (enemy.boss ? 86 : 64),
      "거리 확보",
      "#53e2a8",
    );
  }

  function pushEnemyOutOfPlayer(enemy, extra = 0, showCue = false) {
    const player = state.player;
    const minGap = playerEnemySeparation(enemy) + extra;
    let dx = enemy.x - player.x;
    let dy = enemy.y - player.y;
    let gap = Math.hypot(dx, dy);
    if (gap >= minGap) return false;
    if (gap < 0.001) {
      dx = Math.cos(player.facing + Math.PI);
      dy = Math.sin(player.facing + Math.PI);
      gap = 1;
    }
    const nx = dx / gap;
    const ny = dy / gap;
    const zone = currentZone();
    enemy.x = clamp(player.x + nx * minGap, 50, zone.w - 50);
    enemy.y = clamp(player.y + ny * minGap, 50, zone.h - 50);
    if (distance(enemy.x, enemy.y, player.x, player.y) < minGap) {
      const fallbackGap = minGap + 8;
      const candidates = Array.from({ length: 8 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 8;
        return {
          x: clamp(player.x + Math.cos(angle) * fallbackGap, 50, zone.w - 50),
          y: clamp(player.y + Math.sin(angle) * fallbackGap, 50, zone.h - 50),
        };
      });
      const best = candidates.sort(
        (a, b) =>
          distance(b.x, b.y, player.x, player.y) -
          distance(a.x, a.y, player.x, player.y),
      )[0];
      enemy.x = best.x;
      enemy.y = best.y;
    }
    if (showCue) markEnemySeparated(enemy);
    return true;
  }

  function nudgeEnemyFromPlayer(enemy, extra = 0) {
    const player = state.player;
    const zone = currentZone();
    const minGap = playerEnemySeparation(enemy) + extra;
    let dx = enemy.x - player.x;
    let dy = enemy.y - player.y;
    let gap = Math.hypot(dx, dy);
    if (gap < 0.001) {
      dx = Math.cos(player.facing);
      dy = Math.sin(player.facing);
      gap = 1;
    }
    const nx = dx / gap;
    const ny = dy / gap;
    const targetGap = Math.max(minGap, gap + extra);
    enemy.x = clamp(player.x + nx * targetGap, 50, zone.w - 50);
    enemy.y = clamp(player.y + ny * targetGap, 50, zone.h - 50);
    pushEnemyOutOfPlayer(enemy, 0, true);
    markEnemySeparated(enemy);
  }

  function update(dt) {
    if (!state || modalMode) return;
    state.playSeconds += dt;
    ensureExpeditionNodes();
    const player = state.player;
    player.attackCd = Math.max(0, player.attackCd - dt);
    player.skillCd = Math.max(0, player.skillCd - dt);
    if (!player.oathCooldowns)
      player.oathCooldowns = Object.fromEntries(
        OATH_ARTS.map((art) => [art.id, 0]),
      );
    OATH_ARTS.forEach((art) => {
      player.oathCooldowns[art.id] = Math.max(
        0,
        (player.oathCooldowns[art.id] || 0) - dt,
      );
    });
    player.skillCd = player.oathCooldowns.cleave || 0;
    player.dashCd = Math.max(0, (player.dashCd || 0) - dt);
    player.dashTime = Math.max(0, (player.dashTime || 0) - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.hurtFlash = Math.max(0, (player.hurtFlash || 0) - dt);
    player.oathShield = Math.max(0, (player.oathShield || 0) - dt);
    updateBuffs(dt);
    player.mp = Math.min(
      player.maxMp,
      player.mp +
        dt *
          (3.5 +
            specializationRank("surge") * 0.32 +
            itemBonus("mpRegen") +
            gearCollectionBonus("mpRegen") +
            setBonus("mpRegen") +
            runeBonus("mpRegen") +
            buffBonus("mpRegen") +
            companionBonus("mpRegen") +
            npcBondBonus("mpRegen") +
            sanctuaryBonus("mpRegen") +
            decisionBonus("mpRegen") +
            trialBonus("mpRegen") +
            patrolBonus("mpRegen") +
            armoryBonus("mpRegen") +
            campaignBonus("mpRegen") +
            tacticManualBonus("mpRegen") +
            commendationBonus("mpRegen") +
            titleBonus("mpRegen")),
    );
    player.comboTimer = Math.max(0, (player.comboTimer || 0) - dt);
    if (player.comboTimer <= 0) player.combo = 0;
    updatePlayer(dt);
    updateWorldEvent(dt);
    if (
      Math.random() <
      dt * 2.1 * (expeditionModifier(activeExpedition())?.spawn || 1)
    )
      spawnEnemies();
    updateEnemies(dt);
    updateCompanion(dt);
    updateHazards(dt);
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
    const moving = Boolean(dx || dy);
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
    player.walkPhase =
      (player.walkPhase || 0) +
      (moving || player.dashTime > 0 ? dt * 10 : dt * 2);
    state.enemies.forEach((enemy) => pushEnemyOutOfPlayer(enemy, 0, true));
  }

  function updateEnemies(dt) {
    const player = state.player;
    state.enemies.forEach((enemy) => {
      enemy.hit = Math.max(0, enemy.hit - dt);
      enemy.swing = Math.max(0, (enemy.swing || 0) - dt);
      enemy.cast = Math.max(0, (enemy.cast || 0) - dt);
      enemy.slow = Math.max(0, (enemy.slow || 0) - dt);
      enemy.separateFlash = Math.max(0, (enemy.separateFlash || 0) - dt);
      enemy.separateCueCd = Math.max(0, (enemy.separateCueCd || 0) - dt);
      enemy.attackCd = Math.max(0, enemy.attackCd - dt);
      enemy.specialCd = Math.max(0, (enemy.specialCd || 0) - dt);
      const windupBefore = enemy.windup || 0;
      enemy.windup = Math.max(0, windupBefore - dt);
      let gap = distance(enemy.x, enemy.y, player.x, player.y);
      updateEnemySpecial(enemy, gap);
      const affix = enemyEliteAffix(enemy);
      if (gap < 720) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const speed =
          (enemy.windup > 0 ? 18 : enemy.boss ? 110 : 135) *
          (enemy.slow > 0 ? 0.45 : 1) *
          (affix?.speed || 1);
        const stopGap = playerEnemySeparation(enemy);
        const travel = Math.min(speed * dt, Math.max(0, gap - stopGap));
        enemy.x += Math.cos(angle) * travel;
        enemy.y += Math.sin(angle) * travel;
        enemy.step = (enemy.step || 0) + travel * 0.08;
      }
      pushEnemyOutOfPlayer(enemy, 0, true);
      gap = distance(enemy.x, enemy.y, player.x, player.y);
      const attackGap = playerEnemySeparation(enemy) + (enemy.boss ? 18 : 12);
      if (gap <= attackGap && enemy.attackCd <= 0 && enemy.windup <= 0) {
        enemy.windup = enemy.boss ? 0.62 : 0.42;
        enemy.windupMax = enemy.windup;
        enemy.windupAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.attackCd = enemy.boss ? 1.1 : 1.35;
        showCombatSpark(
          enemy.x + Math.cos(enemy.windupAngle) * 28,
          enemy.y + Math.sin(enemy.windupAngle) * 28 - 10,
          enemy.color || "#ff5f6d",
          enemy.boss ? "bossTell" : "tell",
        );
      }
      if (windupBefore > 0 && enemy.windup <= 0 && gap <= attackGap + 12) {
        enemy.swing = 0.18;
        const dealt = Math.max(
          6,
          Math.round(enemy.atk * (1 - bestiaryDefenseBonus(enemy))) -
            totalDef(),
        );
        hurtPlayer(dealt, enemy);
        if (affix?.leech) {
          const healed = Math.max(4, Math.round(enemy.maxHp * affix.leech));
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + healed);
          showEffect(enemy.x, enemy.y - 64, `흡혈 +${healed}`, affix.color);
        }
      }
    });
    state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
  }

  function updateCompanion(dt) {
    syncCompanionUnlocks(false);
    const companion = activeCompanion();
    if (!companion) return;
    const { spec, entry } = companion;
    const player = state.player;
    const pos = state.companionPosition || {
      x: player.x - 64,
      y: player.y + 52,
      phase: 0,
      attackFlash: 0,
    };
    state.companionPosition = pos;
    const desiredAngle = player.facing + Math.PI * 0.78;
    const targetX = player.x + Math.cos(desiredAngle) * 72;
    const targetY = player.y + Math.sin(desiredAngle) * 54 + 18;
    const dx = targetX - pos.x;
    const dy = targetY - pos.y;
    const gap = Math.hypot(dx, dy);
    if (gap > 360) {
      pos.x = player.x - 64;
      pos.y = player.y + 52;
    } else if (gap > 2) {
      const speed = Math.min(gap, (230 + statValue("agi") * 2) * dt);
      pos.x += (dx / gap) * speed;
      pos.y += (dy / gap) * speed;
      pos.phase = (pos.phase || 0) + speed * 0.08;
    }
    entry.cooldown = Math.max(0, (entry.cooldown || 0) - dt);
    pos.attackFlash = Math.max(0, (pos.attackFlash || 0) - dt);
    if (entry.cooldown > 0) return;
    if (spec.heal && player.hp < player.maxHp * 0.62) {
      const heal = Math.round(spec.heal + (entry.level || 1) * 6);
      player.hp = Math.min(player.maxHp, player.hp + heal);
      entry.cooldown = Math.max(4.8, spec.cooldown - (entry.level || 1) * 0.05);
      pos.attackFlash = 0.42;
      showEffect(player.x, player.y - 58, `+${heal}`, spec.color);
      return;
    }
    const target = state.enemies
      .filter((enemy) => distance(pos.x, pos.y, enemy.x, enemy.y) <= spec.range)
      .sort(
        (a, b) =>
          distance(pos.x, pos.y, a.x, a.y) - distance(pos.x, pos.y, b.x, b.y),
      )[0];
    if (!target) return;
    const dealt = Math.max(
      3,
      Math.round(
        totalAtk() * spec.damage +
          (entry.level || 1) * 3.4 -
          target.def * (spec.melee ? 0.45 : 0.3),
      ),
    );
    target.hp -= dealt;
    target.hit = 0.16;
    entry.cooldown = Math.max(1.25, spec.cooldown - (entry.level || 1) * 0.035);
    pos.attackFlash = 0.34;
    pos.attackTarget = { x: target.x, y: target.y, ttl: 0.22 };
    showEffect(target.x, target.y - 44, `-${dealt}`, spec.color);
    if (target.hp <= 0) killEnemy(target);
  }

  function updateEnemySpecial(enemy, gap) {
    const canCast =
      enemy.specialCd <= 0 &&
      gap < (enemy.boss || enemy.expedition ? 780 : 520) &&
      !enemy.windup;
    if (!canCast) return;
    const spec = enemySpecialSpec(enemy);
    if (!spec) {
      enemy.specialCd = 2.4 + Math.random() * 2.2;
      return;
    }
    const player = state.player;
    enemy.specialCd =
      spec.cooldown *
      (enemy.boss ? 0.82 : 1) *
      (enemy.expedition ? 0.88 : 1) *
      (enemyEliteAffix(enemy)?.specialCd || 1);
    enemy.cast = 0.34;
    if (spec.kind === "circle") {
      addHazard({
        type: spec.type || "circle",
        x: player.x + (Math.random() * 120 - 60),
        y: player.y + (Math.random() * 120 - 60),
        radius: spec.radius * (enemy.boss ? 1.18 : 1),
        delay: spec.delay,
        ttl: spec.ttl,
        damage: Math.max(8, Math.round(enemy.atk * spec.damage)),
        color: spec.color || enemy.color,
        label: spec.label,
      });
    } else if (spec.kind === "line") {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      addHazard({
        type: "line",
        x: enemy.x,
        y: enemy.y,
        angle,
        length: spec.length * (enemy.boss ? 1.16 : 1),
        width: spec.width,
        delay: spec.delay,
        ttl: spec.ttl,
        damage: Math.max(8, Math.round(enemy.atk * spec.damage)),
        color: spec.color || enemy.color,
        label: spec.label,
      });
    } else if (spec.kind === "projectile") {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      addHazard({
        type: "projectile",
        x: enemy.x,
        y: enemy.y - 8,
        vx: Math.cos(angle) * spec.speed,
        vy: Math.sin(angle) * spec.speed,
        radius: spec.radius,
        delay: 0,
        ttl: spec.ttl,
        damage: Math.max(8, Math.round(enemy.atk * spec.damage)),
        color: spec.color || enemy.color,
        label: spec.label,
      });
    }
    showEffect(enemy.x, enemy.y - 72, spec.label, spec.color || enemy.color);
  }

  function enemySpecialSpec(enemy) {
    const common = {
      slime: {
        kind: "circle",
        type: "pool",
        label: "산성 웅덩이",
        radius: 52,
        delay: 0.48,
        ttl: 1.2,
        damage: 0.72,
        cooldown: 4.2,
        color: "#53e2a8",
      },
      wolf: {
        kind: "line",
        label: "그늘 돌진",
        length: 210,
        width: 36,
        delay: 0.36,
        ttl: 0.36,
        damage: 0.9,
        cooldown: 3.8,
        color: "#8be66f",
      },
      thorn: {
        kind: "circle",
        type: "snare",
        label: "가시 폭발",
        radius: 64,
        delay: 0.62,
        ttl: 0.9,
        damage: 0.88,
        cooldown: 4.4,
        color: "#9cffb4",
      },
      raider: {
        kind: "projectile",
        label: "투척 단검",
        radius: 12,
        speed: 420,
        ttl: 1.6,
        damage: 0.78,
        cooldown: 3.4,
        color: "#ffba5a",
      },
      mist: {
        kind: "circle",
        type: "mist",
        label: "안개 장막",
        radius: 78,
        delay: 0.7,
        ttl: 1.15,
        damage: 0.92,
        cooldown: 4.1,
        color: "#42d7ff",
      },
      golem: {
        kind: "line",
        label: "지진 파동",
        length: 260,
        width: 54,
        delay: 0.72,
        ttl: 0.45,
        damage: 1.05,
        cooldown: 4.8,
        color: "#d66b34",
      },
      wraith: {
        kind: "projectile",
        label: "빙혼탄",
        radius: 16,
        speed: 360,
        ttl: 2.0,
        damage: 0.94,
        cooldown: 3.7,
        color: "#b7ecff",
      },
      knight: {
        kind: "line",
        label: "성채 참격",
        length: 240,
        width: 48,
        delay: 0.48,
        ttl: 0.4,
        damage: 1.08,
        cooldown: 3.9,
        color: "#d08cff",
      },
      shade: {
        kind: "circle",
        type: "void",
        label: "월식 낙인",
        radius: 84,
        delay: 0.58,
        ttl: 1.2,
        damage: 1.08,
        cooldown: 3.6,
        color: "#ff5f6d",
      },
      archon: {
        kind: "line",
        label: "별빛 처형",
        length: 360,
        width: 58,
        delay: 0.72,
        ttl: 0.55,
        damage: 1.22,
        cooldown: 3.4,
        color: "#f8f871",
      },
      stalker: {
        kind: "line",
        label: "심연 급습",
        length: 270,
        width: 42,
        delay: 0.32,
        ttl: 0.34,
        damage: 1.02,
        cooldown: 3.3,
        color: "#7cff9b",
      },
      duelist: {
        kind: "line",
        label: "결투 찌르기",
        length: 300,
        width: 34,
        delay: 0.28,
        ttl: 0.32,
        damage: 1.08,
        cooldown: 3.2,
        color: "#ff9f6e",
      },
      siren: {
        kind: "circle",
        type: "song",
        label: "폭풍 노래",
        radius: 96,
        delay: 0.82,
        ttl: 1.4,
        damage: 1.04,
        cooldown: 4.0,
        color: "#69dcff",
      },
      automaton: {
        kind: "projectile",
        label: "태엽 포탄",
        radius: 18,
        speed: 330,
        ttl: 2.2,
        damage: 1.05,
        cooldown: 3.5,
        color: "#b987ff",
      },
      alchemist: {
        kind: "circle",
        type: "alchemy",
        label: "연금 폭발",
        radius: 88,
        delay: 0.68,
        ttl: 1.05,
        damage: 1.12,
        cooldown: 3.7,
        color: "#d08cff",
      },
      sentinel: {
        kind: "line",
        label: "성좌 광선",
        length: 390,
        width: 52,
        delay: 0.74,
        ttl: 0.5,
        damage: 1.2,
        cooldown: 3.3,
        color: "#f8f871",
      },
      seraph: {
        kind: "circle",
        type: "starfall",
        label: "별비 낙하",
        radius: 98,
        delay: 0.66,
        ttl: 1.2,
        damage: 1.16,
        cooldown: 3.3,
        color: "#d8f7ff",
      },
      voidbeast: {
        kind: "circle",
        type: "abyss",
        label: "무저갱 포식",
        radius: 112,
        delay: 0.78,
        ttl: 1.35,
        damage: 1.28,
        cooldown: 3.1,
        color: "#9f7cff",
      },
    };
    return common[enemy.type] || null;
  }

  function addHazard(hazard) {
    state.hazards.push({
      id: `h${Date.now()}${Math.random()}`,
      active: false,
      hit: false,
      ...hazard,
    });
    state.hazards = state.hazards.slice(-42);
  }

  function updateHazards(dt) {
    const player = state.player;
    state.hazards = state.hazards
      .map((hazard) => {
        const next = { ...hazard };
        if (next.delay > 0) {
          next.delay -= dt;
          if (next.delay <= 0) next.active = true;
        } else {
          next.active = true;
        }
        if (next.type === "projectile" && next.active) {
          next.x += (next.vx || 0) * dt;
          next.y += (next.vy || 0) * dt;
        }
        next.ttl -= dt;
        if (next.active && !next.hit && hazardHitsPlayer(next, player)) {
          next.hit = true;
          hurtPlayer(next.damage || 8);
          showEffect(player.x, player.y - 54, next.label || "피격", next.color);
        }
        return next;
      })
      .filter((hazard) => hazard.ttl > 0);
  }

  function hazardHitsPlayer(hazard, player) {
    if (hazard.type === "line") {
      const dx = player.x - hazard.x;
      const dy = player.y - hazard.y;
      const along = Math.cos(hazard.angle) * dx + Math.sin(hazard.angle) * dy;
      const side = Math.abs(
        -Math.sin(hazard.angle) * dx + Math.cos(hazard.angle) * dy,
      );
      return (
        along >= 0 &&
        along <= (hazard.length || 0) &&
        side <= (hazard.width || 0) / 2 + PLAYER_BODY_RADIUS
      );
    }
    return (
      distance(player.x, player.y, hazard.x, hazard.y) <=
      (hazard.radius || 20) + PLAYER_BODY_RADIUS
    );
  }

  function updateDrops() {
    const player = state.player;
    state.drops = state.drops.filter((drop) => {
      if (drop.zone !== state.zone) return true;
      if (distance(player.x, player.y, drop.x, drop.y) > 34) return true;
      if (drop.kind === "gold") player.gold += drop.value;
      if (drop.kind === "quest") addQuestProgress(1);
      if (drop.kind === "item") {
        const item = ITEMS[drop.item];
        const wasOwned =
          (player.inventory[drop.item] || 0) > 0 ||
          equippedGearIds().includes(drop.item);
        const comparison = isGearItem(item) ? gearComparison(drop.item) : null;
        player.inventory[drop.item] =
          (player.inventory[drop.item] || 0) + (drop.count || 1);
        if (isGearItem(item)) {
          const deltaText =
            comparison && comparison.currentId !== drop.item
              ? ` · 착용 대비 ${comparison.delta > 0 ? "+" : ""}${comparison.delta}`
              : "";
          toast(`${item.name} 획득${deltaText}. 가방에서 장착할 수 있습니다.`);
          showEffect(
            drop.x,
            drop.y - 36,
            wasOwned
              ? "장비 추가 획득"
              : comparison?.delta > 6
                ? "장비 추천!"
                : "신규 장비",
            rarityInfo(item).color,
          );
        } else if (item?.type === "rune") {
          toast(`${item.name} 획득. 각인 메뉴에서 장착할 수 있습니다.`);
        }
        syncTitleUnlocks(true);
      }
      showEffect(
        drop.x,
        drop.y,
        drop.kind === "gold" ? `+${drop.value}G` : drop.label,
        drop.kind === "item" ? rarityInfo(ITEMS[drop.item]).color : "#f8f871",
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
    player.invuln = Math.max(
      player.invuln,
      0.22 + specializationRank("ward") * 0.015,
    );
    showEffect(player.x, player.y - 44, "회피", "#48a5ff");
  }

  function oathArtById(id) {
    return OATH_ARTS.find((art) => art.id === id) || OATH_ARTS[0];
  }

  function oathArtUnlocked(art) {
    return (state.player.skillRank || 0) >= (art.unlock || 0);
  }

  function oathArtCost(art) {
    return Math.max(
      Math.ceil(art.cost * 0.52),
      art.cost -
        statValue("wis") -
        (state.player.skillRank || 0) -
        specializationRank("surge") -
        itemBonus("skillCost") -
        gearCollectionBonus("skillCost") -
        buffBonus("skillCost") -
        npcBondBonus("skillCost") -
        setBonus("skillCost") -
        runeBonus("skillCost") -
        decisionBonus("skillCost") -
        trialBonus("skillCost") -
        commendationBonus("skillCost"),
    );
  }

  function oathArtCooldown(art) {
    return Math.max(
      art.minCooldown || 2.6,
      art.cooldown -
        (state.player.skillRank || 0) * 0.24 -
        specializationRank("surge") * 0.08 -
        itemBonus("skillCd") -
        gearCollectionBonus("skillCd") -
        buffBonus("skillCd") -
        npcBondBonus("skillCd") -
        setBonus("skillCd") -
        runeBonus("skillCd") -
        decisionBonus("skillCd") -
        trialBonus("skillCd") -
        commendationBonus("skillCd"),
    );
  }

  function oathCooldownValue(id) {
    const player = state.player;
    if (!player.oathCooldowns)
      player.oathCooldowns = Object.fromEntries(
        OATH_ARTS.map((art) => [art.id, 0]),
      );
    return player.oathCooldowns[id] || 0;
  }

  function attack(skill = false, artId = "cleave") {
    if (modalMode || speechBubble) return;
    const player = state.player;
    let art = null;
    if (skill) {
      art = oathArtById(artId);
      if (!oathArtUnlocked(art))
        return toast(`${art.name}은 서약기 Lv.${art.unlock}에 열립니다.`);
      const cooldown = oathCooldownValue(art.id);
      if (cooldown > 0)
        return toast(`${art.name} 준비 중입니다. ${cooldown.toFixed(1)}초`);
      const cost = oathArtCost(art);
      if (player.mp < cost) return toast("마나가 부족합니다.");
      player.mp -= cost;
      player.oathCooldowns[art.id] = oathArtCooldown(art);
      player.skillCd = player.oathCooldowns.cleave || 0;
      if (art.shield) {
        player.oathShield = Math.max(
          player.oathShield || 0,
          art.shield + specializationRank("ward") * 0.08,
        );
        player.invuln = Math.max(
          player.invuln,
          0.48 + specializationRank("ward") * 0.02,
        );
      }
    } else {
      if (player.attackCd > 0) return;
      player.attackCd = Math.max(0.22, 0.34 - statValue("agi") * 0.006);
    }
    attackFlash = skill ? 0.34 : 0.18;
    const range = skill ? art.range : 92;
    const arc = skill ? art.arc : 0.9;
    const damage = Math.round(
      totalAtk() *
        (skill
          ? art.multiplier +
            (player.skillRank || 0) * 0.18 +
            specializationRank("surge") * 0.12 +
            itemBonus("skillDamage") +
            gearCollectionBonus("skillDamage") +
            setBonus("skillDamage") +
            runeBonus("skillDamage") +
            buffBonus("skillDamage") +
            companionBonus("skillDamage") +
            npcBondBonus("skillDamage") +
            sanctuaryBonus("skillDamage") +
            decisionBonus("skillDamage") +
            trialBonus("skillDamage") +
            patrolBonus("skillDamage") +
            armoryBonus("skillDamage") +
            campaignBonus("skillDamage") +
            tacticManualBonus("skillDamage") +
            relicBonus("skillDamage") +
            commendationBonus("skillDamage") +
            titleBonus("skillDamage")
          : 1 +
            specializationRank("blade") * 0.025 +
            itemBonus("basicDamage") +
            gearCollectionBonus("basicDamage") +
            setBonus("basicDamage") +
            runeBonus("basicDamage") +
            buffBonus("basicDamage") +
            companionBonus("basicDamage") +
            npcBondBonus("basicDamage") +
            sanctuaryBonus("basicDamage") +
            decisionBonus("basicDamage") +
            trialBonus("basicDamage") +
            patrolBonus("basicDamage") +
            armoryBonus("basicDamage") +
            campaignBonus("basicDamage") +
            tacticManualBonus("basicDamage") +
            commendationBonus("basicDamage") +
            titleBonus("basicDamage")) +
        Math.random() * 12,
    );
    let hitCount = 0;
    state.enemies.forEach((enemy) => {
      const gap = distance(player.x, player.y, enemy.x, enemy.y);
      const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      const delta = Math.abs(normalizeAngle(angle - player.facing));
      const bodyContact = gap <= playerEnemySeparation(enemy) + 10;
      if (bodyContact || (gap <= range + enemyRadius(enemy) && delta <= arc)) {
        const studiedDamage = Math.round(
          damage * (1 + bestiaryDamageBonus(enemy)),
        );
        const dealt = Math.max(4, studiedDamage - enemy.def);
        enemy.hp -= dealt;
        enemy.hit = 0.16;
        if (skill && art.slow) enemy.slow = Math.max(enemy.slow || 0, art.slow);
        if (bodyContact) nudgeEnemyFromPlayer(enemy, skill ? 42 : 26);
        else if (skill && art.shield && gap > 0)
          nudgeEnemyFromPlayer(enemy, 34);
        hitCount += 1;
        showCombatSpark(
          enemy.x,
          enemy.y - (enemy.boss ? 34 : 24),
          skill ? art.color : weaponHitColor(),
          skill ? "skillHit" : "slash",
        );
        showEffect(
          enemy.x,
          enemy.y - 28,
          `-${dealt}`,
          skill ? art.color : "#fffbba",
        );
        if (enemy.hp <= 0) killEnemy(enemy);
      }
    });
    if (skill) {
      showSkillEffect(art, hitCount);
      if (hitCount) showEffect(player.x, player.y - 52, art.name, art.color);
      else showEffect(player.x, player.y - 52, "빗나감", "#a8bdd5");
    }
    if (hitCount) {
      player.combo = Math.min(99, (player.combo || 0) + hitCount);
      player.comboTimer = 4.5;
      if (specializationRank("blade") && !skill)
        player.mp = Math.min(
          player.maxMp,
          player.mp + hitCount * specializationRank("blade") * 0.45,
        );
      if (player.combo >= 8)
        showEffect(player.x, player.y - 72, `${player.combo}연격`, "#53e2a8");
    }
  }

  function weaponHitColor() {
    const weapon = ITEMS[state.player.equipment?.weapon];
    return weapon ? rarityInfo(weapon).color : "#fffbba";
  }

  function killEnemy(enemy) {
    const spec = ENEMIES[enemy.type];
    const affix = enemyEliteAffix(enemy);
    const comboBonus = 1 + Math.min(0.28, (state.player.combo || 0) * 0.012);
    const xp = Math.round(
      spec.xp *
        (enemy.boss ? 4.2 : 1) *
        (affix?.reward || 1) *
        comboBonus *
        (1 +
          itemBonus("xpGain") +
          gearCollectionBonus("xpGain") +
          setBonus("xpGain") +
          regionBonus("xpGain") +
          runeBonus("xpGain") +
          buffBonus("xpGain") +
          companionBonus("xpGain") +
          npcBondBonus("xpGain") +
          sanctuaryBonus("xpGain") +
          decisionBonus("xpGain") +
          trialBonus("xpGain") +
          bestiaryRewardBonus(enemy, "xpGain") +
          huntPlanBonus(enemy, "xpGain") +
          patrolBonus("xpGain") +
          armoryBonus("xpGain") +
          campaignBonus("xpGain") +
          tacticManualBonus("xpGain") +
          relicBonus("xpGain") +
          commendationBonus("xpGain") +
          titleBonus("xpGain")),
    );
    const gold = Math.round(
      spec.gold *
        (enemy.boss ? 3.6 : 1) *
        (affix?.gold || affix?.reward || 1) *
        comboBonus *
        (1 +
          itemBonus("goldGain") +
          gearCollectionBonus("goldGain") +
          setBonus("goldGain") +
          regionBonus("goldGain") +
          runeBonus("goldGain") +
          buffBonus("goldGain") +
          companionBonus("goldGain") +
          npcBondBonus("goldGain") +
          sanctuaryBonus("goldGain") +
          decisionBonus("goldGain") +
          trialBonus("goldGain") +
          bestiaryRewardBonus(enemy, "goldGain") +
          huntPlanBonus(enemy, "goldGain") +
          patrolBonus("goldGain") +
          armoryBonus("goldGain") +
          campaignBonus("goldGain") +
          tacticManualBonus("goldGain") +
          relicBonus("goldGain") +
          commendationBonus("goldGain") +
          titleBonus("goldGain")),
    );
    giveReward({ xp, gold });
    addCompanionXp(Math.max(4, Math.round(xp * (enemy.boss ? 0.26 : 0.16))));
    addGearMasteryXp(Math.max(3, Math.round(xp * (enemy.boss ? 0.08 : 0.045))));
    recordEnemyDefeat(enemy);
    if (affix) {
      addRegionStability(state.zone, 1, "");
      showEffect(enemy.x, enemy.y - 84, `${affix.name} 정예 격파`, affix.color);
    }
    syncTitleUnlocks(true);
    handleExpeditionKill(enemy, xp, gold);
    if (!enemy.echoTrialId) recordWorldEventKill(enemy);
    rollTreasureFragment(enemy);
    const equipmentDrop = rollMonsterEquipment(enemy);
    if (equipmentDrop) {
      const item = ITEMS[equipmentDrop];
      state.drops.push({
        zone: state.zone,
        x: enemy.x + Math.random() * 44 - 22,
        y: enemy.y + Math.random() * 44 - 22,
        kind: "item",
        item: equipmentDrop,
        label: item?.name || equipmentDrop,
      });
      showEffect(enemy.x, enemy.y - 58, "장비 드롭!", rarityInfo(item).color);
    }
    const materialDrop = rollMonsterMaterial(enemy);
    if (materialDrop) {
      state.drops.push({
        zone: state.zone,
        x: enemy.x + Math.random() * 52 - 26,
        y: enemy.y + Math.random() * 52 - 26,
        kind: "item",
        item: materialDrop.item,
        count: materialDrop.count,
        label: `${ITEMS[materialDrop.item]?.name || materialDrop.item} x${materialDrop.count}`,
      });
    }
    const runeDrop = rollMonsterRune(enemy);
    if (runeDrop) {
      const item = ITEMS[runeDrop];
      state.drops.push({
        zone: state.zone,
        x: enemy.x + Math.random() * 56 - 28,
        y: enemy.y + Math.random() * 56 - 28,
        kind: "item",
        item: runeDrop,
        label: item?.name || runeDrop,
      });
      showEffect(enemy.x, enemy.y - 76, "각인 발견!", rarityInfo(item).color);
    }
    if (enemy.echoTrialId) {
      completeEchoTrial(enemy.echoTrialId, enemy, xp, gold);
      return;
    }
    if (enemy.namedHuntId) {
      completeNamedHunt(enemy.namedHuntId, enemy);
      return;
    }
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

  function addCompanionXp(amount = 0) {
    const companion = activeCompanion();
    if (!companion || amount <= 0) return;
    const { spec, entry } = companion;
    if ((entry.level || 1) >= 30) return;
    entry.xp = (entry.xp || 0) + amount;
    let leveled = false;
    while (
      (entry.level || 1) < 30 &&
      entry.xp >= companionXpForLevel(entry.level || 1)
    ) {
      entry.xp -= companionXpForLevel(entry.level || 1);
      entry.level = (entry.level || 1) + 1;
      leveled = true;
    }
    if (leveled) {
      showEffect(
        state.companionPosition?.x || state.player.x,
        (state.companionPosition?.y || state.player.y) - 56,
        `${spec.name} Lv.${entry.level}`,
        spec.color,
      );
      syncTitleUnlocks(true);
    }
  }

  function rollMonsterMaterial(enemy) {
    const rule = MONSTER_MATERIAL_DROPS[enemy.type];
    if (!rule || !ITEMS[rule.item]) return null;
    const chance =
      rule.chance +
      (enemy.boss ? 0.18 : 0) +
      (enemy.affix ? 0.035 : 0) +
      huntPlanBonus(enemy, "materialDrop") +
      patrolBonus("dropChance") * 0.35 +
      armoryBonus("dropChance") * 0.35 +
      campaignBonus("dropChance") * 0.35 +
      tacticManualBonus("dropChance") * 0.35 +
      relicBonus("dropChance") * 0.5 +
      commendationBonus("dropChance") * 0.4;
    if (Math.random() > chance) return null;
    const spread = Math.max(0, rule.max - rule.min);
    const count = rule.min + Math.floor(Math.random() * (spread + 1));
    return {
      item: rule.item,
      count: count + (enemy.boss ? 1 : 0) + (enemy.affix ? 1 : 0),
    };
  }

  function rollMonsterRune(enemy) {
    const pool = (MONSTER_RUNE_DROPS[enemy.type] || []).filter(
      (id) => ITEMS[id]?.type === "rune",
    );
    if (!pool.length) return "";
    const baseChance = enemy.boss ? 0.11 : 0.018;
    const progressBonus = Math.min(
      0.018,
      Math.floor(state.questIndex / 16) * 0.003,
    );
    if (
      Math.random() >
      baseChance +
        progressBonus +
        runeBonus("dropChance") * 0.6 +
        buffBonus("dropChance") * 0.35 +
        npcBondBonus("dropChance") * 0.4 +
        bestiaryDropBonus(enemy) * 0.5 +
        huntPlanBonus(enemy, "runeDrop") +
        patrolBonus("dropChance") * 0.35 +
        armoryBonus("dropChance") * 0.35 +
        campaignBonus("dropChance") * 0.35 +
        tacticManualBonus("dropChance") * 0.35 +
        relicBonus("dropChance") * 0.45 +
        commendationBonus("dropChance") * 0.35 +
        (enemyEliteAffix(enemy)?.drop || 0) * 0.5
    )
      return "";
    return pool[Math.floor(Math.random() * pool.length)] || "";
  }

  function monsterEquipmentDropPool(type) {
    return [
      ...new Set(
        (MONSTER_EQUIPMENT_DROPS[type] || []).filter((id) =>
          isGearItem(ITEMS[id]),
        ),
      ),
    ];
  }

  function monsterEquipmentDropChance(enemy = {}) {
    const type = enemy.type || "";
    if (!monsterEquipmentDropPool(type).length) return 0;
    const affix = enemyEliteAffix(enemy);
    const baseChance = enemy.boss ? 0.16 : 0.045;
    const renownBonus = Math.min(0.025, (state.player.renown || 0) * 0.00035);
    const expeditionBonus = enemy.expedition
      ? expeditionModifier()?.drop || 0
      : 0;
    return clamp(
      baseChance +
        renownBonus +
        expeditionBonus +
        (affix?.drop || 0) +
        bestiaryDropBonus(enemy) +
        itemBonus("dropChance") +
        gearCollectionBonus("dropChance") +
        setBonus("dropChance") +
        runeBonus("dropChance") +
        buffBonus("dropChance") +
        companionBonus("dropChance") +
        npcBondBonus("dropChance") +
        sanctuaryBonus("dropChance") +
        decisionBonus("dropChance") +
        trialBonus("dropChance") +
        huntPlanBonus(enemy, "equipmentDrop") +
        patrolBonus("dropChance") +
        armoryBonus("dropChance") +
        campaignBonus("dropChance") +
        tacticManualBonus("dropChance") +
        relicBonus("dropChance") +
        commendationBonus("dropChance") +
        titleBonus("dropChance"),
      0,
      0.85,
    );
  }

  function chanceText(value) {
    return `${Math.round(value * 1000) / 10}%`;
  }

  function monsterGearLootSummary(type) {
    const ids = monsterEquipmentDropPool(type);
    if (!ids.length) {
      return {
        names: "없음",
        status: "이 몬스터는 고유 장비 드롭이 없습니다.",
      };
    }
    const owned = new Set(gearCollectionIds());
    const ownedIds = ids.filter((id) => owned.has(id));
    const missingIds = ids.filter((id) => !owned.has(id));
    return {
      names: ids
        .map((id) => `${gearName(id)} ${owned.has(id) ? "[획득]" : "[미획득]"}`)
        .join(", "),
      status: `고유 장비 ${ownedIds.length}/${ids.length} 획득 · 미획득 ${missingIds.map(gearName).join(", ") || "없음"} · 일반 기대 ${chanceText(monsterEquipmentDropChance({ type }))} · 보스 기대 ${chanceText(monsterEquipmentDropChance({ type, boss: true }))}`,
    };
  }

  function recordEnemyDefeat(enemy) {
    const entry = state.bestiary[enemy.type] || { kills: 0 };
    const beforeKills = entry.kills || 0;
    entry.kills = (entry.kills || 0) + 1;
    entry.lastSeen = state.zone;
    if (enemy.boss) entry.bossKills = (entry.bossKills || 0) + 1;
    if (enemy.affix) entry.eliteKills = (entry.eliteKills || 0) + 1;
    state.bestiary[enemy.type] = entry;
    const stage = BESTIARY_RESEARCH_STAGES.find(
      (item) => beforeKills < item.kills && entry.kills >= item.kills,
    );
    if (stage) {
      const spec = ENEMIES[enemy.type];
      showEffect(enemy.x, enemy.y - 104, `연구: ${stage.name}`, "#b7ecff");
      addJournalEntry({
        title: `${spec.name} ${stage.name}`,
        done: [`${spec.name}의 ${stage.name}를 서고에 남겼습니다.`, stage.desc],
      });
      toast(`${spec.name} 연구 단계: ${stage.name}`);
    }
    const contract = REGIONAL_CONTRACTS[state.zone];
    const progress = state.contracts[state.zone];
    if (contract && progress && contract.target === enemy.type) {
      progress.progress = Math.min(
        contractRequirement(state.zone),
        (progress.progress || 0) + 1,
      );
      if (progress.progress >= contractRequirement(state.zone)) {
        toast(`${contract.title} 완료. 의뢰 메뉴에서 보상을 받으세요.`);
      }
    }
    recordBountyDefeat(enemy);
    recordHuntPlanDefeat(enemy);
  }

  function recordBountyDefeat(enemy) {
    const entry = bountyEntry(state.zone);
    if (!entry || entry.target !== enemy.type) return;
    const required = bountyRequirement(state.zone);
    const amount = enemy.boss ? 3 : enemy.affix ? 2 : 1;
    const before = entry.progress || 0;
    entry.progress = Math.min(required, before + amount);
    if (before < required && entry.progress >= required) {
      toast(
        `${zoneMap[state.zone].name} 현상수배 완료. 수배 메뉴에서 보상을 받으세요.`,
      );
      showEffect(enemy.x, enemy.y - 94, "수배 완료", "#ffba5a");
    }
  }

  function recordHuntPlanDefeat(enemy) {
    const plans = ensureHuntPlans();
    const active = plans.active;
    const spec = activeHuntPlanForEnemy(enemy);
    if (!active || !spec) return;
    const required = spec.required;
    let amount = enemy.boss ? 3 : enemy.affix ? 2 : 1;
    if (spec.kind === "research") amount += 1;
    if (spec.kind === "trophy" && enemy.affix) amount += 1;
    if (spec.kind === "stability" && enemy.boss) amount += 1;
    const before = active.progress || 0;
    active.progress = Math.min(required, before + amount);
    if (active.progress > before) {
      showEffect(
        enemy.x,
        enemy.y - 88,
        `계획 +${active.progress - before}`,
        spec.type.color,
      );
    }
    if (before < required && active.progress >= required) {
      showEffect(enemy.x, enemy.y - 112, "계획 완료", spec.type.color);
      toast(`${spec.title} 완료. 계획 메뉴에서 보상을 받으세요.`);
    }
  }

  function contractRequirement(zoneId) {
    const base = REGIONAL_CONTRACTS[zoneId];
    const progress = state.contracts[zoneId] || {};
    const tier = Math.max(1, progress.tier || 1);
    return (base?.required || 12) + (tier - 1) * 8;
  }

  function contractReward(zoneId) {
    const base = REGIONAL_CONTRACTS[zoneId]?.reward || {};
    const tier = Math.max(1, state.contracts[zoneId]?.tier || 1);
    return {
      xp: Math.round((base.xp || 0) * (1 + (tier - 1) * 0.42)),
      gold: Math.round((base.gold || 0) * (1 + (tier - 1) * 0.34)),
      renown: (base.renown || 1) + Math.floor((tier - 1) / 2),
      item: base.item,
    };
  }

  function rollMonsterEquipment(enemy) {
    const pool = monsterEquipmentDropPool(enemy.type);
    if (!pool.length) return "";
    if (Math.random() > monsterEquipmentDropChance(enemy)) return "";
    return pool[Math.floor(Math.random() * pool.length)] || "";
  }

  function hurtPlayer(amount, source = null) {
    const player = state.player;
    if (player.invuln > 0) return;
    const reduced = Math.max(
      1,
      Math.round(
        amount *
          (player.oathShield > 0 ? 0.55 : 1) *
          (1 -
            Math.min(
              0.42,
              specializationRank("ward") * 0.018 +
                itemBonus("damageReduce") +
                gearCollectionBonus("damageReduce") +
                setBonus("damageReduce") +
                runeBonus("damageReduce") +
                buffBonus("damageReduce") +
                companionBonus("damageReduce") +
                npcBondBonus("damageReduce") +
                sanctuaryBonus("damageReduce") +
                decisionBonus("damageReduce") +
                trialBonus("damageReduce") +
                patrolBonus("damageReduce") +
                armoryBonus("damageReduce") +
                campaignBonus("damageReduce") +
                tacticManualBonus("damageReduce") +
                relicBonus("damageReduce") +
                commendationBonus("damageReduce") +
                titleBonus("damageReduce"),
            )),
      ),
    );
    player.hp -= reduced;
    player.invuln = 0.75 + specializationRank("ward") * 0.015;
    player.hurtFlash = 0.34;
    showCombatSpark(
      player.x,
      player.y - 24,
      source?.color || "#ff5f6d",
      source?.boss ? "bossHurt" : "hurt",
    );
    showEffect(player.x, player.y - 34, `피격 -${reduced}`, "#ff5f6d");
    if (player.hp <= 0) {
      const echoTrial = activeEchoTrial();
      const namedHunt = activeNamedHunt();
      if (echoTrial) {
        echoTrialEntry().active = null;
        state.enemies = state.enemies.filter((enemy) => !enemy.echoTrialId);
      }
      if (namedHunt) {
        namedHuntEntry().active = null;
        state.enemies = state.enemies.filter((enemy) => !enemy.namedHuntId);
      }
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
        echoTrial
          ? `${echoTrial.title}에 실패하고 루멘 성소에서 다시 일어났습니다. 일부 골드를 잃었습니다.`
          : namedHunt
            ? `${namedHuntDisplayName(namedHunt)} 토벌에 실패하고 루멘 성소에서 다시 일어났습니다. 일부 골드를 잃었습니다.`
            : "쓰러졌지만 루멘 성소에서 다시 일어났습니다. 일부 골드를 잃었습니다.",
      );
    }
  }

  function interact() {
    if (modalMode) return;
    if (speechBubble) return advanceSpeechBubble();
    const target = interactionTarget();
    if (target?.type === "npc") return talkToNpc(target.npc);
    if (target?.type === "expeditionNode")
      return claimExpeditionNode(target.node);
    if (target?.type === "secret") return collectSecretLandmark(target.secret);
    if (target?.type === "treasure") return collectTreasureSite(target.site);
    if (target?.type === "camp") return restAtCampsite(target.camp);
    if (target?.type === "memory") return collectMemoryFragment(target.memory);
    if (target?.type === "forage") return collectForageNode(target.node);
    if (target?.type === "relic") return inspectRestoredRelic(target.relic);
    if (target?.type === "worldEvent") return completeWorldEvent("조사 완료");
    if (target?.type === "portal") return openTravel(target.portal.to);
    toast("가까운 대상이 없습니다.");
  }

  function interactionTarget() {
    const npc = nearestNpc();
    if (npc && npc.d < 96) return { type: "npc", npc };
    const node = nearestExpeditionNode();
    if (node && node.d < 104) return { type: "expeditionNode", node };
    const secret = nearestSecretLandmark();
    if (secret && secret.d < 112) return { type: "secret", secret };
    const treasure = nearestTreasureSite();
    if (treasure && treasure.d < 116)
      return { type: "treasure", site: treasure };
    const camp = nearestCampsite();
    if (camp && camp.d < 118) return { type: "camp", camp };
    const memory = nearestMemoryFragment();
    if (memory && memory.d < 108) return { type: "memory", memory };
    const forage = nearestForageNode();
    if (forage && forage.d < 108) return { type: "forage", node: forage };
    const relic = nearestRestoredRelic();
    if (relic && relic.d < 116) return { type: "relic", relic };
    const event = nearestWorldEvent();
    if (event && event.d < 116) return { type: "worldEvent", event };
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

  function nearestExpeditionNode() {
    const expedition = activeExpedition();
    if (!expedition || expedition.zone !== state.zone) return null;
    return (state.expeditionNodes || [])
      .map((node) => ({
        ...node,
        d: distance(state.player.x, state.player.y, node.x, node.y),
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
    const discount = shopDiscount();
    ui.modal.innerHTML = `
      <h2>${npc.name}의 상점</h2>
      <p class="rpg-muted">보유 골드: ${state.player.gold}G · 장비는 구매 후 가방에 보관되고 즉시 착용됩니다.${discount ? ` · 지역 감사 할인 ${Math.round(discount * 100)}%` : ""}</p>
      <div class="item-grid">
        ${list
          .map((id) => {
            const item = ITEMS[id];
            const price = shopItemPrice(item);
            const originalPrice =
              price < item.price
                ? ` <span class="rpg-muted">(기본 ${item.price}G)</span>`
                : "";
            return `<div class="item-card">
              <strong>${escapeHtml(item.name)} <span style="color:${rarityInfo(item).color}">[${rarityInfo(item).label}]</span></strong>
              <span>${escapeHtml(item.desc || "")}</span>
              <span class="rpg-muted">${itemStatsText(item, id)}</span>
              <button type="button" data-buy="${id}">${price}G 구매${originalPrice}</button>
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
    const setSummary = setBonusSummaryHtml();
    const loadoutSummary = gearLoadoutSummaryHtml();
    const collectionSummary = gearCollectionSummaryHtml();
    ui.modal.innerHTML = `
      <h2>가방</h2>
      <p class="rpg-muted">소모품은 사용하고, 무기/방어구/부적은 원하는 장비로 바꿔 착용할 수 있습니다. 장비 프리셋은 현재 착용 구성을 저장해 사냥, 보스전, 탐험 상황에 빠르게 전환합니다. 남는 장비는 분해해 강화 재료와 골드로 되돌릴 수 있습니다.</p>
      ${setSummary}
      <h3>장비 프리셋</h3>
      ${loadoutSummary}
      <h3>장비 수집</h3>
      ${collectionSummary}
      <div class="item-grid">
        ${
          inv.length
            ? inv
                .map(([id, count]) => {
                  const item = ITEMS[id] || { name: id, type: "misc" };
                  const level = enhancementLevel(id);
                  const suffix = level ? ` +${level}` : "";
                  const equipped =
                    state.player.equipment?.[item.type] === id
                      ? " · 착용 중"
                      : "";
                  const runeEquipped = equippedRuneIds().includes(id)
                    ? " · 각인 중"
                    : "";
                  const comparisonText = isGearItem(item)
                    ? gearComparisonText(id)
                    : "";
                  const action = ["weapon", "armor", "charm"].includes(
                    item.type,
                  )
                    ? `<button type="button" data-equip="${id}">착용</button><button type="button" data-enhance="${id}">강화</button><button type="button" data-salvage="${id}" ${salvageableGearCount(id) ? "" : "disabled"}>분해</button>`
                    : item.type === "rune"
                      ? `<button type="button" data-rune-equip="${id}">각인</button>`
                      : item.type === "material"
                        ? `<button type="button" disabled>강화 재료</button>`
                        : `<button type="button" data-use="${id}">사용</button>`;
                  return `<div class="item-card">
                    <strong>${escapeHtml(item.name)}${suffix} x${count}${equipped}${runeEquipped}</strong>
                    <span>${escapeHtml(item.desc || "")}</span>
                    <span class="rpg-muted">${itemStatsText(item, id)}</span>
                    ${
                      comparisonText
                        ? `<span class="rpg-muted">${escapeHtml(comparisonText)}</span>`
                        : ""
                    }
                    ${
                      isGearItem(item)
                        ? `<span class="rpg-muted">분해 보상: ${escapeHtml(salvageRewardText(id))}</span>`
                        : ""
                    }
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

  function openArmory() {
    modalMode = "armory";
    const claimed = new Set(armoryClaimedIds());
    const cards = state.unlockedZones
      .filter((zoneId) => zoneMap[zoneId])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const pool = regionMonsterGearIds(zoneId);
        const owned = ownedRegionGearIds(zoneId);
        const missing = pool.filter((id) => !owned.includes(id));
        const records = REGIONAL_ARMORY_RECORDS.filter(
          (record) => record.zone === zoneId,
        );
        const recordHtml = records
          .map((record) => {
            const progress = armoryRecordProgress(record);
            const done = claimed.has(record.id);
            const reward = armoryRecordReward(record);
            return `<div class="lines" style="margin-top:8px">
              <p><strong style="color:${record.color}">${escapeHtml(record.label)}</strong><br>${escapeHtml(record.text)}<br><span class="rpg-muted">${escapeHtml(progress.primaryLabel)} ${progress.primary}/${progress.primaryRequired} · ${escapeHtml(progress.secondaryLabel)} ${progress.secondary}/${progress.secondaryRequired}</span><br><span class="rpg-muted">보상 ${escapeHtml(rewardText(reward))} · 보정 ${escapeHtml(buffStatsText(record.stats))}</span></p>
              <button type="button" data-armory="${record.id}" ${progress.ready && !done ? "" : "disabled"}>${done ? "등록 완료" : progress.ready ? "장비록 등록" : "조건 필요"}</button>
            </div>`;
          })
          .join("");
        const ownedText = owned.map((id) => ITEMS[id]?.name || id).join(", ");
        const missingText = missing
          .map((id) => ITEMS[id]?.name || id)
          .join(", ");
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 장비록 ${claimedArmoryRecordCount(zoneId)}/${records.length}</strong>
          <span>${escapeHtml(zone.subtitle)}</span>
          <span class="rpg-muted">보유: ${escapeHtml(ownedText || "아직 지역 고유 장비가 없습니다.")}</span>
          <span class="rpg-muted">미등록 후보: ${escapeHtml(missingText || "지역 고유 장비 표본을 모두 보유했습니다.")}</span>
          <span class="rpg-muted">숙련/강화 점수: ${regionGearMasteryScore(zoneId)}</span>
          ${recordHtml}
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>지역 장비록 <button type="button" data-armory-help title="지역 장비록 사용법">?</button></h2>
      <p class="rpg-muted">몬스터별 낮은 확률 고유 장비를 지역 단위로 수집하고, 직접 착용해 숙련 또는 강화를 쌓으면 장비록 보상을 받을 수 있습니다. 장비 드롭이 단순 보관이 아니라 지역별 장기 파밍 목표와 전투 보정으로 이어집니다.</p>
      <p class="rpg-muted">등록 ${claimedArmoryRecordCount()}/${REGIONAL_ARMORY_RECORDS.length} · 보유 장비 ${ownedGearCount()}종 · 숙련 총합 ${totalGearMasteryLevel()}</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openArmoryHelp() {
    showDialogue("지역 장비록 사용법", [
      "각 지역에는 해당 지역 몬스터가 떨어뜨리는 고유 장비 후보가 있습니다. 전리품 표본은 지역 고유 장비를 하나 이상 보유하고 지역 도감 처치를 충분히 쌓으면 등록할 수 있습니다.",
      "전장 운용은 지역 고유 장비를 더 모은 뒤 직접 착용해 숙련을 올리거나 강화를 진행해 숙련/강화 점수를 채우면 등록할 수 있습니다.",
      "등록 보상은 경험치, 골드, 재료, 명성, 지역 안정도, 서고 기록으로 남고, 등록한 장비록 보정은 경험치, 드롭률, 공격, 방어, 피해 감소에 조금씩 누적됩니다.",
    ]);
  }

  function openCampaigns() {
    modalMode = "campaigns";
    const claimed = new Set(campaignClaimedIds());
    const visibleActs = ACTS.slice(0, Math.max(1, completedActCount()));
    const cards = visibleActs
      .map((act, index) => {
        const actNo = index + 1;
        const campaigns = OATH_CAMPAIGNS.filter(
          (campaign) => campaign.act === actNo,
        );
        const buttons = campaigns
          .map((campaign) => {
            const progress = campaignProgress(campaign);
            const done = claimed.has(campaign.id);
            const reward = campaignReward(campaign);
            const missing = progress.tasks
              .filter((task) => !task.done)
              .slice(0, 3)
              .map((task) => task.label)
              .join(", ");
            return `<div class="lines" style="margin-top:8px">
              <p><strong style="color:${campaign.color}">${escapeHtml(campaign.name)}</strong><br>${escapeHtml(campaign.desc)}<br><span class="rpg-muted">진행 ${progress.current}/${progress.required}${missing ? ` · 남은 조건 ${escapeHtml(missing)}` : ""}</span><br><span class="rpg-muted">보상 ${escapeHtml(rewardText(reward))} · 보정 ${escapeHtml(buffStatsText(campaign.stats))}</span></p>
              <button type="button" data-campaign="${campaign.id}" ${progress.ready && !done ? "" : "disabled"}>${done ? "원정 완료" : progress.ready ? "원정 완료 처리" : "조건 필요"}</button>
            </div>`;
          })
          .join("");
        return `<div class="item-card">
          <strong>${actNo}장 ${escapeHtml(act.title)} 원정 ${claimedCampaignCount(actNo)}/${campaigns.length}</strong>
          <span>${escapeHtml(zoneMap[act.zone]?.name || act.zone)} · ${escapeHtml(act.collect)}</span>
          <span class="rpg-muted">완료한 장의 야영, 순찰, 장비록, 강적, 회상전, 유물, 감사장, 균열 기록을 후반 원정 목표로 다시 묶습니다.</span>
          ${buttons}
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>서약 원정 <button type="button" data-campaign-help title="서약 원정 사용법">?</button></h2>
      <p class="rpg-muted">완료한 장을 보급 원정, 강습 원정, 서사 원정으로 다시 정리합니다. 이전 지역 콘텐츠를 서로 연결해 후반부에도 직접 목표를 고르고 보상을 회수할 수 있습니다.</p>
      <p class="rpg-muted">완료 ${claimedCampaignCount()}/${OATH_CAMPAIGNS.length} · 누적 보정 ${escapeHtml(
        buffStatsText(
          [
            "atk",
            "def",
            "xpGain",
            "goldGain",
            "dropChance",
            "damageReduce",
            "healingPower",
            "skillDamage",
            "mpRegen",
          ].reduce((stats, field) => {
            const value = campaignBonus(field);
            if (value) stats[field] = value;
            return stats;
          }, {}),
        ),
      )}</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openCampaignHelp() {
    showDialogue("서약 원정 사용법", [
      "보급 원정은 완료한 장의 첫 장 완성도, 야영 기록, 순찰 작전을 묶어 지역 보급선을 다시 정리하는 목표입니다.",
      "강습 원정은 네임드 강적, 회상전, 장비록을 요구해 보스 준비와 고유 장비 파밍이 실제 후반 전투 목표로 이어지게 합니다.",
      "서사 원정은 유물, 주민 감사장, 외전, 균열 기록을 요구해 지역 후일담과 최종 장 이후의 긴 플레이 목적을 서고에 남깁니다.",
    ]);
  }

  function openTactics() {
    modalMode = "tactics";
    const claimed = new Set(tacticManualClaimedIds());
    const cards = state.unlockedZones
      .filter((zoneId) => zoneMap[zoneId])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const manuals = TACTIC_MANUALS.filter(
          (manual) => manual.zone === zoneId,
        );
        const manualHtml = manuals
          .map((manual) => {
            const progress = tacticManualProgress(manual);
            const done = claimed.has(manual.id);
            const reward = tacticManualReward(manual);
            const rows = progress.rows
              .map(
                (row) =>
                  `${row.label} ${row.current}/${row.required}${row.ready ? "" : ""}`,
              )
              .join(" · ");
            return `<div class="lines" style="margin-top:8px">
              <p><strong style="color:${manual.color}">${escapeHtml(manual.name)}</strong><br>${escapeHtml(manual.desc)}<br><span class="rpg-muted">${escapeHtml(rows)}</span><br><span class="rpg-muted">보상 ${escapeHtml(rewardText(reward))} · 교범 보정 ${escapeHtml(tacticManualStatsText(manual))}</span></p>
              <button type="button" data-tactic="${manual.id}" ${progress.ready && !done ? "" : "disabled"}>${done ? "교범 정리 완료" : progress.ready ? "교범 정리" : "훈련 중"}</button>
            </div>`;
          })
          .join("");
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 전술 교범 ${claimedTacticManualCount(zoneId)}/${manuals.length}</strong>
          <span>${escapeHtml(zone.subtitle)}</span>
          <span class="rpg-muted">도감, 장비록, 안정도, 순찰, 시험, 연대기, 유물, 회상전, 원정 기록을 검격/수호/서약 운용 보정으로 정리합니다.</span>
          ${manualHtml}
        </div>`;
      })
      .join("");
    const summaryStats = [
      "atk",
      "def",
      "wis",
      "agi",
      "basicDamage",
      "skillDamage",
      "damageReduce",
      "healingPower",
      "mpRegen",
    ].reduce((stats, field) => {
      const value = tacticManualBonus(field);
      if (value) stats[field] = value;
      return stats;
    }, {});
    ui.modal.innerHTML = `
      <h2>전술 교범 <button type="button" data-tactic-help title="전술 교범 사용법">?</button></h2>
      <p class="rpg-muted">지역별 전투 기록을 검격, 수호, 서약 3종 교범으로 정리합니다. 단순 처치 수만 요구하지 않고 장비 운용, 지역 방어, 서고 기록, 회상전과 원정을 함께 묶어 장기 플레이 보정을 제공합니다.</p>
      <p class="rpg-muted">정리 ${claimedTacticManualCount()}/${TACTIC_MANUALS.length} · 누적 교범 보정 ${escapeHtml(buffStatsText(summaryStats))}</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openTacticHelp() {
    showDialogue("전술 교범 사용법", [
      "전술 교범은 지역별 검격, 수호, 서약 훈련 목표입니다. 도감 처치, 장비록, 지역 안정도, 순찰/야영, 수호 시험, 연대기, 유물, 외전, 회상전, 원정 기록을 조합해 완료합니다.",
      "검격 교범은 몬스터 처치와 고유 장비 운용 기록을 요구하며 기본 공격과 민첩 보정으로 이어집니다.",
      "수호 교범은 안정도, 순찰/야영, 지역 수호 시험을 요구하며 방어, 피해 감소, 회복 보정을 제공합니다.",
      "서약 교범은 지역 기록, 유물/외전, 회상전 또는 원정을 요구하며 서약 전술 피해와 MP 회복 보정을 제공합니다.",
      "교범 보정은 한 번 정리하면 전역에 누적되므로, 이전 지역의 남은 기록을 다시 챙길 이유가 생깁니다.",
    ]);
  }

  function openCrafting() {
    modalMode = "crafting";
    const crafted = craftedRecipeIds();
    const cards = CRAFTING_RECIPES.map((recipe) => {
      const item = ITEMS[recipe.output];
      const status = recipeStatusText(recipe);
      const locked = !recipeUnlocked(recipe);
      const uniqueDone = recipeAlreadyCrafted(recipe);
      const affordable = recipeAffordable(recipe);
      const countText =
        recipe.outputCount && recipe.outputCount > 1
          ? ` x${recipe.outputCount}`
          : "";
      return `<div class="item-card">
        <strong>${escapeHtml(recipe.name)} <span style="color:${rarityInfo(item).color}">[${rarityInfo(item).label}]</span></strong>
        <span>${escapeHtml(recipe.desc)}</span>
        <span class="rpg-muted">완성품: ${escapeHtml(item.name)}${countText}</span>
        <span class="rpg-muted">${itemStatsText(item, recipe.output)}</span>
        <span class="rpg-muted">해금: ${escapeHtml(status.unlockText)}</span>
        <span class="rpg-muted">비용: ${escapeHtml(status.costText)}</span>
        <button type="button" data-craft="${recipe.id}" ${
          locked || uniqueDone || !affordable ? "disabled" : ""
        }>${uniqueDone ? "제작 완료" : locked ? "조건 필요" : affordable ? "제작" : "재료 부족"}</button>
      </div>`;
    }).join("");
    ui.modal.innerHTML = `
      <h2>서약 공방</h2>
      <p class="rpg-muted">공방은 몬스터 재료, 기억 조각, 지역 연대기, 성소 재건, 균열 기록을 장비 제작으로 묶는 장기 성장 메뉴입니다. 드롭 장비가 아니어도 직접 목표를 정해 전용 장비와 보급품을 만들 수 있습니다.</p>
      <p class="rpg-muted">완성한 고유 제작식 ${crafted.length}/${CRAFTING_RECIPES.filter((recipe) => recipe.unique).length} · 전설 제작 ${craftedLegendaryRecipeCount()}</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openAlchemy() {
    modalMode = "alchemy";
    if (!state.alchemy) state.alchemy = initialAlchemy();
    const active = activeBuffs();
    const activeText = active.length
      ? active
          .map(
            (buff) =>
              `${buff.name} ${formatTime(buff.ttl)} · ${buffStatsText(buff.stats)}`,
          )
          .join("<br>")
      : "현재 적용 중인 연금/요리 효과가 없습니다.";
    const cards = ALCHEMY_RECIPES.map((recipe) => {
      const item = ITEMS[recipe.output];
      const status = recipeStatusText(recipe);
      const locked = !recipeUnlocked(recipe);
      const affordable = recipeAffordable(recipe);
      const brewed = state.alchemy.recipes?.[recipe.id] || 0;
      const countText =
        recipe.outputCount && recipe.outputCount > 1
          ? ` x${recipe.outputCount}`
          : "";
      return `<div class="item-card">
        <strong>${escapeHtml(recipe.name)} <span style="color:${rarityInfo(item).color}">[${rarityInfo(item).label}]</span></strong>
        <span>${escapeHtml(recipe.desc)}</span>
        <span class="rpg-muted">완성품: ${escapeHtml(item.name)}${countText}</span>
        <span class="rpg-muted">${itemStatsText(item, recipe.output)}</span>
        <span class="rpg-muted">해금: ${escapeHtml(status.unlockText)}</span>
        <span class="rpg-muted">비용: ${escapeHtml(status.costText)}</span>
        <span class="rpg-muted">제작 횟수: ${brewed}</span>
        <button type="button" data-alchemy="${recipe.id}" ${
          locked || !affordable ? "disabled" : ""
        }>${locked ? "조건 필요" : affordable ? "제작" : "재료 부족"}</button>
      </div>`;
    }).join("");
    ui.modal.innerHTML = `
      <h2>연금과 야영식</h2>
      <p class="rpg-muted">필드 채집 재료를 전투 준비용 음식과 영약으로 바꿉니다. 같은 계열 효과는 새로 사용한 음식으로 갱신됩니다.</p>
      <div class="lines"><p><strong>적용 중</strong><br>${activeText}</p></div>
      <p class="rpg-muted">채집 ${totalForageHarvests()}회 · 연금/요리 ${totalAlchemyBrews()}회</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openEnhance() {
    modalMode = "enhance";
    const gear = Object.entries(state.player.inventory)
      .filter(([id, count]) => count > 0 && isGearItem(ITEMS[id]))
      .map(([id]) => id);
    const equipped = Object.values(state.player.equipment || {}).filter(
      Boolean,
    );
    const list = [...new Set([...equipped, ...gear])].filter((id) => ITEMS[id]);
    const setSummary = setBonusSummaryHtml();
    ui.modal.innerHTML = `
      <h2>장비 강화</h2>
      <p class="rpg-muted">몬스터가 떨어뜨리는 강화 재료와 골드로 장비를 +10까지 성장시킵니다. 강화 수치는 저장되며 장착한 장비 능력치에 바로 반영됩니다.</p>
      ${setSummary}
      <div class="item-grid">
        ${
          list.length
            ? list
                .map((id) => {
                  const item = ITEMS[id];
                  const level = enhancementLevel(id);
                  const cost = enhancementCost(id);
                  const maxed = level >= 10;
                  const hasGold = state.player.gold >= cost.gold;
                  const hasMaterial =
                    (state.player.inventory[cost.material] || 0) >= cost.count;
                  return `<div class="item-card">
                    <strong>${escapeHtml(item.name)} +${level} <span style="color:${rarityInfo(item).color}">[${rarityInfo(item).label}]</span></strong>
                    <span>${escapeHtml(item.desc || "")}</span>
                    <span class="rpg-muted">${itemStatsText(item, id)}</span>
                    <span class="rpg-muted">다음 비용: ${maxed ? "최대 강화" : `${cost.gold}G · ${ITEMS[cost.material].name} x${cost.count}`}</span>
                    <button type="button" data-enhance="${id}" ${maxed || !hasGold || !hasMaterial ? "disabled" : ""}>강화</button>
                  </div>`;
                })
                .join("")
            : "<p>강화할 장비가 없습니다. 몬스터 드롭이나 상점 구매로 장비를 얻으세요.</p>"
        }
      </div>
      <div class="choice-grid">
        <button type="button" data-close>닫기</button>
      </div>`;
    ui.modalWrap.classList.add("show");
  }

  function isGearItem(item) {
    return ["weapon", "armor", "charm"].includes(item?.type);
  }

  function salvageableGearCount(id) {
    const item = ITEMS[id];
    if (!isGearItem(item)) return 0;
    const count = Math.max(0, Math.floor(state.player.inventory?.[id] || 0));
    const equipped = state.player.equipment?.[item.type] === id ? 1 : 0;
    return Math.max(0, count - equipped);
  }

  function gearSalvageReward(id) {
    const item = ITEMS[id] || {};
    const rarity = item.rarity || "common";
    const rarityBonus = { common: 0, rare: 1, epic: 2, legend: 3 }[rarity] || 0;
    const typeMaterial =
      item.type === "weapon"
        ? "oathSteel"
        : item.type === "armor"
          ? "guardianThread"
          : "starDust";
    const material =
      rarity === "legend"
        ? "dawnPrism"
        : rarity === "epic"
          ? "abyssCore"
          : rarity === "rare"
            ? "starDust"
            : typeMaterial;
    return {
      material,
      count: 1 + rarityBonus + Math.floor(enhancementLevel(id) / 4),
      gold: Math.round((item.price || 120) * (0.22 + rarityBonus * 0.08)),
    };
  }

  function salvageRewardText(id) {
    const reward = gearSalvageReward(id);
    return `${ITEMS[reward.material]?.name || reward.material} x${reward.count}, ${reward.gold}G`;
  }

  function enhancementLevel(id) {
    return clamp(Math.floor(state.player.enhancements?.[id] || 0), 0, 10);
  }

  function enhancementCost(id) {
    const item = ITEMS[id] || {};
    const next = enhancementLevel(id) + 1;
    const rarityMult = { common: 1, rare: 1.45, epic: 2.1, legend: 3.2 }[
      item.rarity || "common"
    ];
    const material =
      next >= 9
        ? "dawnPrism"
        : next >= 6 || item.rarity === "epic" || item.rarity === "legend"
          ? "abyssCore"
          : item.type === "weapon"
            ? "oathSteel"
            : item.type === "armor"
              ? "guardianThread"
              : "starDust";
    return {
      gold: Math.round((95 + next * 62) * next * rarityMult),
      material,
      count: Math.max(1, Math.ceil(next / 2)),
    };
  }

  function enhanceItem(id) {
    const item = ITEMS[id];
    if (!isGearItem(item)) return;
    const level = enhancementLevel(id);
    if (level >= 10) return toast("이미 최대 강화입니다.");
    const cost = enhancementCost(id);
    if (state.player.gold < cost.gold) return toast("강화 골드가 부족합니다.");
    if ((state.player.inventory[cost.material] || 0) < cost.count)
      return toast(`${ITEMS[cost.material].name} 재료가 부족합니다.`);
    state.player.gold -= cost.gold;
    state.player.inventory[cost.material] -= cost.count;
    state.player.enhancements[id] = level + 1;
    showEffect(
      state.player.x,
      state.player.y - 72,
      `${item.name} +${level + 1}`,
      rarityInfo(item).color,
    );
    toast(`${item.name}이 +${level + 1}로 강화되었습니다.`);
    if (modalMode === "enhance") openEnhance();
    if (modalMode === "inventory") openInventory();
  }

  function openRunes() {
    modalMode = "runes";
    const equipped = equippedRuneIds();
    const slots = runeSlotCount();
    const runes = Object.entries(state.player.inventory || {})
      .filter(([id, count]) => count > 0 && ITEMS[id]?.type === "rune")
      .map(([id]) => id);
    const slotCards = Array.from({ length: slots }, (_, index) => {
      const id = equipped[index];
      const item = ITEMS[id];
      return `<div class="item-card">
        <strong>${index + 1}번 각인 슬롯</strong>
        ${
          item
            ? `<span style="color:${rarityInfo(item).color}">${escapeHtml(item.name)}</span>
              <span class="rpg-muted">${escapeHtml(runeEffectText(id))}</span>
              <button type="button" data-rune-remove="${index}">해제</button>`
            : '<span class="rpg-muted">비어 있음</span>'
        }
      </div>`;
    }).join("");
    const lockedText =
      slots >= 3
        ? "모든 각인 슬롯이 열렸습니다."
        : slots === 2
          ? "메인 퀘스트 56단계 이후 마지막 슬롯이 열립니다."
          : "메인 퀘스트 28단계와 56단계에서 슬롯이 하나씩 추가됩니다.";
    const runeCards = runes.length
      ? runes
          .map((id) => {
            const item = ITEMS[id];
            const active = equipped.includes(id);
            return `<div class="item-card">
              <strong style="color:${rarityInfo(item).color}">${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(item.desc || "")}</span>
              <span class="rpg-muted">${escapeHtml(runeEffectText(id))}</span>
              <button type="button" data-rune-equip="${id}" ${active || equipped.length >= slots ? "disabled" : ""}>${active ? "각인 중" : "장착"}</button>
            </div>`;
          })
          .join("")
      : "<p>보유한 각인이 없습니다. 몬스터가 낮은 확률로 떨어뜨리거나 일부 상점에서 구매할 수 있습니다.</p>";
    ui.modal.innerHTML = `
      <h2>서약 각인</h2>
      <p class="rpg-muted">각인은 장비와 별개로 최대 3개까지 장착하는 장기 성장 보정입니다. 몬스터별 고유 각인 드롭과 지역 상점을 통해 빌드를 보완하세요. ${lockedText}</p>
      <div class="item-grid">${slotCards}</div>
      <h2>보유 각인</h2>
      <div class="item-grid">${runeCards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function equipRune(id) {
    const item = ITEMS[id];
    if (item?.type !== "rune" || (state.player.inventory[id] || 0) <= 0)
      return toast("보유하지 않은 각인입니다.");
    const equipped = equippedRuneIds();
    if (equipped.includes(id)) return toast("이미 장착 중인 각인입니다.");
    if (equipped.length >= runeSlotCount())
      return toast("비어 있는 각인 슬롯이 없습니다.");
    state.player.runes = [...equipped, id];
    syncTitleUnlocks(true);
    toast(`${item.name} 장착`);
    if (modalMode === "runes") openRunes();
    if (modalMode === "inventory") openInventory();
  }

  function removeRune(index) {
    const equipped = equippedRuneIds();
    const removed = equipped[Number(index)];
    if (!removed) return;
    state.player.runes = equipped.filter((_, i) => i !== Number(index));
    toast(`${ITEMS[removed]?.name || "각인"} 해제`);
    if (modalMode === "runes") openRunes();
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
        <p>목표 분량: 최종 장은 ${formatTime(MIN_FINAL_PLAY_SECONDS)} 이상의 플레이 기록과 모든 주요 장 완료를 요구합니다.</p>
        ${finished.length ? `<p><strong>최근 완료</strong><br>${finished.map((item) => item.title).join("<br>")}</p>` : ""}
      </div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openOathDecisions() {
    modalMode = "decisions";
    const entry = oathDecisionEntry();
    const completed = completedActCount();
    const visible = OATH_DECISIONS.filter(
      (decision) => decision.act <= Math.min(ACTS.length, completed + 1),
    );
    const pathSummary = OATH_DECISION_PATHS.map(
      (path) =>
        `<span style="color:${path.color}">${escapeHtml(path.name)} ${oathDecisionPathCount(path.key)}</span>`,
    ).join(" · ");
    const cards = visible
      .map((decision) => {
        const chosen = oathDecisionPath(entry.choices[decision.id]);
        const unlocked = decision.act <= completed;
        const zone = zoneMap[decision.zone];
        const rewardPreview = OATH_DECISION_PATHS.map((path) => {
          const reward = oathDecisionReward(decision, path);
          return `<button type="button" data-decision="${decision.id}" data-decision-path="${path.key}">
            ${escapeHtml(path.name)}
            <span class="rpg-muted">${escapeHtml(path.motive)} · ${rewardText(reward)} · ${buffStatsText(path.stats)}</span>
          </button>`;
        }).join("");
        return `<div class="item-card">
          <strong>${decision.act}장. ${escapeHtml(decision.title)}</strong>
          <span>${escapeHtml(zone?.name || decision.zone)} · ${escapeHtml(decision.desc)}</span>
          <span class="rpg-muted">${escapeHtml(decision.line)}</span>
          ${
            chosen
              ? `<span style="color:${chosen.color}">${escapeHtml(chosen.name)} 선택 완료</span>
                <span class="rpg-muted">${escapeHtml(chosen.result)} · ${buffStatsText(chosen.stats)}</span>`
              : unlocked
                ? `<div class="choice-grid">${rewardPreview}</div>`
                : `<span class="rpg-muted">${decision.act}장 보스 퀘스트 완료 후 선택할 수 있습니다.</span>`
          }
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>서약 결의</h2>
      <p class="rpg-muted">각 장의 보스 결계를 깨고 나면 수호, 진실, 개척 중 하나를 선택해 후속 이야기를 남깁니다. 선택은 저장 데이터에 남고 전투/성장/보상 보정으로 누적되므로 같은 메인 장도 어떤 방향으로 마무리했는지 의미가 달라집니다.</p>
      <p class="rpg-muted">완료 ${totalOathDecisionCount()}/${OATH_DECISIONS.length} · ${pathSummary}<br>누적 보정: ${decisionBonusText()}</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function chooseOathDecision(decisionId, pathKey) {
    const decision = OATH_DECISIONS.find((item) => item.id === decisionId);
    const path = oathDecisionPath(pathKey);
    if (!decision || !path) return;
    if (decision.act > completedActCount())
      return toast("해당 장을 완료한 뒤 결의를 남길 수 있습니다.");
    const entry = oathDecisionEntry();
    if (entry.choices[decision.id]) return toast("이미 남긴 결의입니다.");
    entry.choices[decision.id] = path.key;
    const reward = oathDecisionReward(decision, path);
    giveReward(reward);
    addRegionStability(decision.zone, 4, "decision");
    state.journal = [
      {
        title: `${decision.title} · ${path.name}`,
        text: `${path.motive} ${path.result}`,
        time: formatTime(state.playSeconds),
      },
      ...(state.journal || []),
    ].slice(0, 140);
    syncTitleUnlocks(true);
    toast(`${decision.title}: ${path.name}을 기록했습니다.`);
    openOathDecisions();
    saveGame(false);
  }

  function openSideStories() {
    modalMode = "sideStories";
    const claimed = new Set(sideStoryClaimedIds());
    const visible = SIDE_STORIES.filter((story) =>
      state.unlockedZones.includes(story.zone),
    );
    const zoneGroups = state.unlockedZones
      .filter((zoneId) => zoneMap[zoneId])
      .map((zoneId) => {
        const stories = visible.filter((story) => story.zone === zoneId);
        if (!stories.length) return "";
        return `<div class="item-card">
          <strong>${escapeHtml(zoneMap[zoneId].name)} 외전 ${zoneSideStoryClaimedCount(zoneId)}/${stories.length}</strong>
          <span>${escapeHtml(zoneMap[zoneId].subtitle)}</span>
          ${stories
            .map((story) => {
              const progress = sideStoryProgress(story);
              const done = claimed.has(story.id);
              const reward = sideStoryReward(story);
              return `<div class="lines" style="margin-top:8px">
                <p><strong style="color:${story.color}">${escapeHtml(story.title)}</strong><br>${escapeHtml(story.desc)}<br><span class="rpg-muted">${escapeHtml(story.goal)} ${progress.current}/${progress.required} · 보상 ${rewardText(reward)}</span></p>
                <button type="button" data-side-story="${story.id}" ${progress.ready && !done ? "" : "disabled"}>${done ? "기록 완료" : progress.ready ? "후일담 기록" : "진행 중"}</button>
              </div>`;
            })
            .join("")}
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>지역 외전 기록</h2>
      <p class="rpg-muted">메인 퀘스트가 지나간 지역에도 주민 인연, 보급 준비, 도감 전투, 기억/연대기/균열 후일담을 남깁니다. 외전은 단순 반복 사냥 대신 여러 성장 시스템을 엮는 장기 목표입니다.</p>
      <p class="rpg-muted">완료 ${claimedSideStoryCount()}/${SIDE_STORIES.length}</p>
      <div class="item-grid">${zoneGroups}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function claimSideStory(id) {
    const story = SIDE_STORIES.find((item) => item.id === id);
    if (!story) return;
    if (sideStoryClaimedIds().includes(id))
      return toast("이미 기록한 외전입니다.");
    const progress = sideStoryProgress(story);
    if (!progress.ready) return toast("아직 외전 조건이 충족되지 않았습니다.");
    state.sideStories.claimed.push(id);
    const reward = sideStoryReward(story);
    giveReward(reward);
    addRegionStability(story.zone, 3 + story.stageIndex, "side-story");
    addJournalEntry({
      title: `외전 기록: ${story.title}`,
      done: sideStoryEpilogue(story),
    });
    syncTitleUnlocks(true);
    toast(`${story.title} 외전을 서고에 기록했습니다.`);
    openSideStories();
  }

  function openRegionTrials() {
    modalMode = "regionTrials";
    const claimed = new Set(regionTrialClaimedIds());
    const zoneGroups = state.unlockedZones
      .filter((zoneId) => zoneMap[zoneId])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const trials = REGION_TRIALS.filter((trial) => trial.zone === zoneId);
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 시험 ${claimedRegionTrialCount(zoneId)}/${trials.length}</strong>
          <span>${escapeHtml(zone.subtitle)}</span>
          ${trials
            .map((trial) => {
              const progress = regionTrialProgress(trial);
              const done = claimed.has(trial.id);
              const reward = regionTrialReward(trial);
              return `<div class="lines" style="margin-top:8px">
                <p><strong style="color:${trial.color}">${escapeHtml(trial.name)}</strong><br>${escapeHtml(trial.desc)}<br><span class="rpg-muted">진행 ${progress.current}/${progress.required} · 효과 ${escapeHtml(buffStatsText(trial.stats))} · 보상 ${rewardText(reward)}</span></p>
                <button type="button" data-region-trial="${trial.id}" ${progress.ready && !done ? "" : "disabled"}>${done ? "시험 완료" : progress.ready ? "시험 보고" : "진행 중"}</button>
              </div>`;
            })
            .join("")}
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>지역 수호 시험</h2>
      <p class="rpg-muted">메인 장이 지나간 지역도 수호, 보급, 기록 시험을 통해 다시 정리합니다. 안정도와 토벌, 채집, 기억, 연대기, 외전, 균열 기록이 시험 조건으로 이어지고 완료 보정은 전역 장기 성장에 누적됩니다.</p>
      <p class="rpg-muted">완료 ${claimedRegionTrialCount()}/${REGION_TRIALS.length}</p>
      <div class="item-grid">${zoneGroups}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function claimRegionTrial(id) {
    const trial = REGION_TRIALS.find((item) => item.id === id);
    if (!trial) return;
    if (regionTrialClaimedIds().includes(id))
      return toast("이미 완료한 지역 시험입니다.");
    const progress = regionTrialProgress(trial);
    if (!progress.ready) return toast("지역 시험 조건이 아직 부족합니다.");
    regionTrialClaimedIds().push(id);
    const reward = regionTrialReward(trial);
    giveReward(reward);
    addRegionStability(trial.zone, 3 + trial.stageIndex, "trial");
    state.journal = [
      {
        title: `지역 시험: ${trial.title}`,
        text: `${trial.desc} ${trial.name} 보정이 서약의 연대기에 누적되었습니다.`,
        time: formatTime(state.playSeconds),
      },
      ...(state.journal || []),
    ].slice(0, 140);
    syncTitleUnlocks(true);
    toast(`${trial.title} 완료`);
    openRegionTrials();
    saveGame(false);
  }

  function openContracts() {
    modalMode = "contracts";
    const zoneIds = state.unlockedZones.filter((id) => REGIONAL_CONTRACTS[id]);
    ui.modal.innerHTML = `
      <h2>지역 의뢰</h2>
      <p class="rpg-muted">각 지역 주민 의뢰를 반복 완료하면 골드, 명성, 강화 재료를 얻습니다. 메인 퀘스트 외 장비 성장 루프입니다.</p>
      <div class="item-grid">
        ${zoneIds
          .map((zoneId) => {
            const contract = REGIONAL_CONTRACTS[zoneId];
            const progress = state.contracts[zoneId] || {};
            const required = contractRequirement(zoneId);
            const reward = contractReward(zoneId);
            const current = Math.min(required, progress.progress || 0);
            const ready = current >= required;
            return `<div class="item-card">
              <strong>${escapeHtml(contract.title)} ${progress.tier || 1}단계</strong>
              <span>${escapeHtml(contract.reason)}</span>
              <span class="rpg-muted">목표: ${ENEMIES[contract.target].name} ${current}/${required}</span>
              <span class="rpg-muted">보상: ${rewardText(reward)}</span>
              <button type="button" data-contract="${zoneId}" ${ready ? "" : "disabled"}>보상 받기</button>
            </div>`;
          })
          .join("")}
      </div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function claimContract(zoneId) {
    const contract = REGIONAL_CONTRACTS[zoneId];
    const progress = state.contracts[zoneId];
    if (!contract || !progress) return;
    const required = contractRequirement(zoneId);
    if ((progress.progress || 0) < required) return;
    giveReward(contractReward(zoneId));
    addRegionStability(
      zoneId,
      4 + Math.floor((progress.tier || 1) / 2),
      "contract",
    );
    progress.progress = 0;
    progress.tier = Math.max(1, progress.tier || 1) + 1;
    toast(`${contract.title} 보상을 받았습니다. 다음 단계가 열렸습니다.`);
    openContracts();
  }

  function openBounties() {
    modalMode = "bounties";
    const zoneIds = state.unlockedZones.filter((id) => zoneMap[id]);
    const cards = zoneIds
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const entry = bountyEntry(zoneId);
        const required = bountyRequirement(zoneId);
        const current = Math.min(required, entry.progress || 0);
        const ready = current >= required;
        const reward = bountyReward(zoneId);
        const target = ENEMIES[entry.target];
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 수배 ${entry.tier}단계</strong>
          <span>${escapeHtml(target?.name || entry.target)} 추적 요청</span>
          <span class="rpg-muted">목표: ${current}/${required} · 정예는 2, 보스는 3으로 기록됩니다.</span>
          <span class="rpg-muted">보상: ${rewardText(reward)}</span>
          <button type="button" data-bounty="${zoneId}" ${ready ? "" : "disabled"}>${ready ? "수배 보상 받기" : "추적 중"}</button>
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>현상수배</h2>
      <p class="rpg-muted">해금된 지역마다 위험 표적을 추적합니다. 해당 몬스터를 처치하면 진행도가 오르고, 정예나 보스 표적은 더 많이 기록됩니다. 완료 후 다음 단계와 새 표적이 열립니다.</p>
      <p class="rpg-muted">완료 ${totalBountyClaims()}회 · 최고 단계 ${maxBountyTier()}</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function claimBounty(zoneId) {
    const entry = bountyEntry(zoneId);
    const required = bountyRequirement(zoneId);
    if ((entry.progress || 0) < required)
      return toast("아직 현상수배 목표가 완료되지 않았습니다.");
    const oldTarget = entry.target;
    const reward = bountyReward(zoneId);
    giveReward(reward);
    entry.claimed = (entry.claimed || 0) + 1;
    entry.tier = Math.max(1, entry.tier || 1) + 1;
    entry.progress = 0;
    entry.target = bountyTarget(zoneId, entry.tier);
    addRegionStability(zoneId, 5 + Math.floor(entry.tier / 2), "bounty");
    addJournalEntry({
      title: `${zoneMap[zoneId].name} 현상수배 ${entry.tier - 1}단계 완료`,
      done: [
        `${ENEMIES[oldTarget]?.name || oldTarget} 표적을 추적해 지역의 위험을 낮췄습니다.`,
        `다음 표적은 ${ENEMIES[entry.target]?.name || entry.target}입니다.`,
      ],
    });
    syncTitleUnlocks(true);
    toast(`${zoneMap[zoneId].name} 현상수배 보상을 받았습니다.`);
    openBounties();
  }

  function openNamedHunts() {
    modalMode = "namedHunts";
    const active = activeNamedHunt();
    const activeHtml = active
      ? `<div class="item-card">
          <strong style="color:${active.color}">진행 중: ${escapeHtml(namedHuntDisplayName(active))}</strong>
          <span>${escapeHtml(zoneMap[active.zone]?.name || active.zone)} · ${escapeHtml(ENEMIES[active.target]?.name || active.target)} 변종</span>
          <span class="rpg-muted">해당 지역에서 보스 슬롯으로 등장합니다. 쓰러지면 토벌 기록과 보상을 얻고, 패배하면 토벌이 취소됩니다.</span>
          <div class="choice-grid">
            <button type="button" class="primary" data-travel="${active.zone}">토벌 지역으로 이동</button>
            <button type="button" data-named-abandon>토벌 포기</button>
          </div>
        </div>`
      : "";
    const cards = state.unlockedZones
      .filter((zoneId) => zoneMap[zoneId])
      .map((zoneId) => {
        const hunt = REGIONAL_NAMED_HUNTS.find((item) => item.zone === zoneId);
        if (!hunt) return "";
        const done = namedHuntClaimedIds().includes(hunt.id);
        const progress = namedHuntProgress(hunt);
        const reward = namedHuntReward(hunt);
        const enemyName = ENEMIES[hunt.target]?.name || hunt.target;
        return `<div class="item-card">
          <strong style="color:${hunt.color}">${escapeHtml(namedHuntDisplayName(hunt))}</strong>
          <span>${escapeHtml(hunt.title)} · 기반 몬스터 ${escapeHtml(enemyName)}</span>
          <span>${escapeHtml(hunt.desc)}</span>
          <span class="rpg-muted">조건: 지역 처치 ${progress.kills}/${progress.requiredKills} · 지도 조각 ${progress.fragments}/${progress.requiredFragments}</span>
          <span class="rpg-muted">보상: ${escapeHtml(rewardText(reward))}</span>
          <button type="button" data-named-start="${hunt.id}" ${progress.ready && !done && !active ? "" : "disabled"}>${done ? "토벌 완료" : progress.ready ? "토벌 시작" : "준비 필요"}</button>
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>네임드 강적 <button type="button" data-named-help title="네임드 강적 사용법">?</button></h2>
      <p class="rpg-muted">지역 도감 처치 기록과 보물지도 조각을 충분히 모으면 해당 지역의 네임드 강적을 직접 토벌할 수 있습니다. 강적은 일반 보스보다 체력과 공격이 높고, 완료 시 장비/재료 보상과 서고 기록, 지역 안정도, 장 완성도 조건이 쌓입니다.</p>
      <p class="rpg-muted">토벌 ${claimedNamedHuntCount()}/${REGIONAL_NAMED_HUNTS.length}</p>
      ${activeHtml}
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openNamedHuntHelp() {
    showDialogue("네임드 강적 사용법", [
      "각 지역에는 한 마리씩 네임드 강적이 있습니다. 지역 몬스터 처치 기록과 보물지도 조각 조건을 채우면 토벌 시작 버튼이 열립니다.",
      "토벌을 시작하면 해당 지역에 강적이 보스 슬롯으로 등장합니다. 메인 보스, 균열, 회상전과 동시에 진행하지 않도록 별도 토벌로 처리됩니다.",
      "강적을 쓰러뜨리면 장비 또는 희귀 재료, 서고 기록, 지역 안정도, 주민 감사장 점수, 영웅서기 장 완성도 조건이 쌓입니다. 패배하면 토벌은 취소되며 다시 시작할 수 있습니다.",
    ]);
  }

  function openHuntPlans() {
    modalMode = "huntPlans";
    const active = activeHuntPlan();
    const activeHtml = active
      ? `<div class="item-card">
          <strong style="color:${active.type.color}">${escapeHtml(active.title)}</strong>
          <span>${escapeHtml(active.enemy.name)} ${active.progress}/${active.required}</span>
          <span class="rpg-muted">${escapeHtml(active.type.desc)}</span>
          <span class="rpg-muted">보상: ${rewardText(huntPlanReward(active))}</span>
          <div class="choice-grid">
            <button type="button" data-hunt-claim="${active.id}" ${active.ready ? "" : "disabled"}>${active.ready ? "계획 보상 받기" : "진행 중"}</button>
            <button type="button" data-hunt-abandon>포기</button>
          </div>
        </div>`
      : `<div class="item-card">
          <strong>활성 계획 없음</strong>
          <span class="rpg-muted">아래 계획 중 하나를 골라 현재 사냥 목표로 지정하세요. 계획은 하나만 진행됩니다.</span>
        </div>`;
    const cards = huntPlanCandidates()
      .map((spec) => {
        const required = huntPlanRequirement(spec);
        const reward = huntPlanReward(spec);
        const trophyNames = (MONSTER_EQUIPMENT_DROPS[spec.target] || [])
          .map((id) => ITEMS[id]?.name || id)
          .join(", ");
        const disabled = active ? "disabled" : "";
        const label = active?.id === spec.id ? "진행 중" : "계획 시작";
        return `<div class="item-card">
          <strong style="color:${spec.type.color}">${escapeHtml(spec.zone.name)} · ${escapeHtml(spec.type.name)}</strong>
          <span>${escapeHtml(spec.enemy.name)} ${required}마리 추적</span>
          <span class="rpg-muted">${escapeHtml(spec.type.desc)}</span>
          <span class="rpg-muted">분류: ${escapeHtml(spec.type.label)} · 보상: ${rewardText(reward)}</span>
          ${
            trophyNames
              ? `<span class="rpg-muted">고유 전리품 후보: ${escapeHtml(trophyNames)}</span>`
              : ""
          }
          <button type="button" data-hunt-select="${escapeHtml(spec.id)}" ${disabled}>${label}</button>
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>서약 사냥 계획</h2>
      <p class="rpg-muted">도감 연구, 고유 장비 파밍, 지역 안정화 중 지금 할 목표를 하나 골라 사냥합니다. 수배와 의뢰 사이에 짧게 끝나는 목표를 만들어 장기 성장 루프를 끊기지 않게 합니다.</p>
      <p class="rpg-muted">완료 ${totalHuntPlanClaims()}회 · 활성 계획은 현재 지역에서 지정 표적을 처치해야 진행됩니다.</p>
      <h3>진행 중</h3>
      <div class="item-grid">${activeHtml}</div>
      <h3>선택 가능한 계획</h3>
      <div class="item-grid">${cards || '<p class="rpg-muted">선택 가능한 계획이 없습니다.</p>'}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function selectHuntPlan(id) {
    const plans = ensureHuntPlans();
    if (activeHuntPlan())
      return toast(
        "이미 진행 중인 사냥 계획이 있습니다. 보상을 받거나 포기한 뒤 새 계획을 시작하세요.",
      );
    const spec = huntPlanSpec(id);
    if (!spec) return toast("선택할 수 없는 사냥 계획입니다.");
    plans.active = {
      id: spec.id,
      progress: 0,
      startedAt: Math.max(0, Math.floor(state.playSeconds || 0)),
    };
    toast(`${spec.enemy.name} ${spec.type.name} 계획을 시작했습니다.`);
    openHuntPlans();
    saveGame(false);
  }

  function abandonHuntPlan() {
    const plans = ensureHuntPlans();
    if (!plans.active) return;
    plans.active = null;
    toast("진행 중인 사냥 계획을 포기했습니다.");
    openHuntPlans();
    saveGame(false);
  }

  function claimHuntPlan(id) {
    const active = activeHuntPlan();
    if (!active || (id && active.id !== id))
      return toast("완료된 사냥 계획이 없습니다.");
    if (!active.ready)
      return toast("아직 사냥 계획 목표가 완료되지 않았습니다.");
    const reward = huntPlanReward(active);
    giveReward(reward);
    addRegionStability(
      active.zoneId,
      active.kind === "stability" ? 6 : 3,
      "huntPlan",
    );
    ensureHuntPlans().completed += 1;
    ensureHuntPlans().active = null;
    addJournalEntry({
      title: `${active.title} 완료`,
      done: [
        `${active.enemy.name} 사냥 계획을 끝내고 ${active.zone.name}의 기록을 보강했습니다.`,
        `${active.type.label} 목표가 다음 성장 방향을 정하는 단서가 되었습니다.`,
      ],
    });
    syncTitleUnlocks(true);
    toast(`${active.title} 보상을 받았습니다.`);
    openHuntPlans();
    saveGame(false);
  }

  function openChronicles() {
    modalMode = "chronicles";
    const claimed = new Set(chronicleClaimedIds());
    const visible = REGIONAL_CHRONICLES.filter(
      (entry) =>
        state.unlockedZones.includes(entry.zone) && zoneMap[entry.zone],
    );
    const cards = visible
      .map((entry) => {
        const progress = chronicleProgress(entry);
        const done = claimed.has(entry.id);
        const reward = chronicleReward(entry);
        return `<div class="item-card">
          <strong>${escapeHtml(entry.title)}</strong>
          <span>${escapeHtml(entry.desc)}</span>
          <span class="rpg-muted">목표: ${escapeHtml(entry.goal)} · ${progress.current}/${progress.required}</span>
          <span class="rpg-muted">보상: ${rewardText(reward)}</span>
          <button type="button" data-chronicle="${entry.id}" ${progress.ready && !done ? "" : "disabled"}>${done ? "기록 완료" : progress.ready ? "보상 받기" : "진행 중"}</button>
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>지역 연대기</h2>
      <p class="rpg-muted">각 지역마다 기억 회수, 주민 의뢰, 균열 기록, 안정화 목표를 따로 엮습니다. 메인 퀘스트와 별개로 지역을 다시 방문할 이유를 만들고, 완료 기록은 서고와 칭호에 반영됩니다.</p>
      <p class="rpg-muted">완료 ${claimed.size}/${REGIONAL_CHRONICLES.length} · 현재 해금 지역 ${state.unlockedZones.length}</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function claimChronicle(id) {
    const entry = REGIONAL_CHRONICLES.find((item) => item.id === id);
    if (!entry) return;
    const claimed = chronicleClaimedIds();
    if (claimed.includes(id)) return toast("이미 완료한 지역 연대기입니다.");
    const progress = chronicleProgress(entry);
    if (!progress.ready)
      return toast("아직 지역 연대기 목표가 완료되지 않았습니다.");
    claimed.push(id);
    const reward = chronicleReward(entry);
    giveReward(reward);
    addRegionStability(entry.zone, 3 + entry.stageIndex, "chronicle");
    addJournalEntry({
      title: `지역 연대기: ${entry.title}`,
      done: [
        `${entry.desc} ${entry.goal} 목표를 완료해 ${zoneMap[entry.zone].name}의 기록을 서고에 묶었습니다.`,
        `보상: ${rewardText(reward)}`,
      ],
    });
    syncTitleUnlocks(true);
    toast(`${entry.title} 기록 완료`);
    openChronicles();
  }

  function openRelics() {
    modalMode = "relics";
    const claimed = new Set(relicClaimedIds());
    const zoneGroups = state.unlockedZones
      .filter((zoneId) => zoneMap[zoneId])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const relics = REGION_RELICS.filter((relic) => relic.zone === zoneId);
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 유물 ${zoneRelicRestoredCount(zoneId)}/${relics.length}</strong>
          <span>${escapeHtml(zone.subtitle)}</span>
          ${relics
            .map((relic) => {
              const progress = relicProgress(relic);
              const done = claimed.has(relic.id);
              const cost = relicCost(relic);
              const reward = relicReward(relic);
              const costReady = relicCostReady(cost);
              const costText = `${cost.gold}G · ${ITEMS[cost.material]?.name || cost.material} ${cost.count}`;
              const buttonText = done
                ? "복원 완료"
                : !progress.ready
                  ? "기록 부족"
                  : !costReady
                    ? "재료 부족"
                    : "유물 복원";
              return `<div class="lines" style="margin-top:8px">
                <p><strong style="color:${relic.color}">${escapeHtml(relic.title)}</strong><br>${escapeHtml(relic.desc)}<br><span class="rpg-muted">목표: ${escapeHtml(relic.goal)} ${progress.current}/${progress.required} · 비용 ${escapeHtml(costText)}</span><br><span class="rpg-muted">복원 보정: ${escapeHtml(buffStatsText(relic.stats))} · 보상 ${rewardText(reward)}</span></p>
                <button type="button" data-relic="${relic.id}" ${progress.ready && costReady && !done ? "" : "disabled"}>${buttonText}</button>
              </div>`;
            })
            .join("")}
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>지역 유물 복원</h2>
      <p class="rpg-muted">기억 조각, 지역 안정도, 외전, 시험, 의뢰, 연대기, 균열, 수배 기록을 지역 유물로 복원합니다. 복원한 유물은 영구 보정과 서고 기록으로 남아 이전 지역을 다시 찾을 이유를 만듭니다.</p>
      <p class="rpg-muted">복원 ${restoredRelicCount()}/${REGION_RELICS.length} · 유물 보정 ${escapeHtml(buffStatsText(relicTotalStats()))}</p>
      <div class="item-grid">${zoneGroups}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function relicTotalStats() {
    const claimed = new Set(relicClaimedIds());
    return REGION_RELICS.filter((relic) => claimed.has(relic.id)).reduce(
      (stats, relic) => {
        Object.entries(relic.stats || {}).forEach(([field, value]) => {
          stats[field] = (stats[field] || 0) + (Number(value) || 0);
        });
        return stats;
      },
      {},
    );
  }

  function claimRelic(id) {
    const relic = REGION_RELICS.find((item) => item.id === id);
    if (!relic) return;
    const claimed = relicClaimedIds();
    if (claimed.includes(id)) return toast("이미 복원한 지역 유물입니다.");
    const progress = relicProgress(relic);
    if (!progress.ready) return toast("아직 유물 복원 조건이 부족합니다.");
    const cost = relicCost(relic);
    if (!relicCostReady(cost))
      return toast(
        `유물 복원 비용이 부족합니다. ${ITEMS[cost.material]?.name || cost.material} ${cost.count}개와 ${cost.gold}G가 필요합니다.`,
      );
    state.player.gold -= cost.gold;
    state.player.inventory[cost.material] =
      (state.player.inventory[cost.material] || 0) - cost.count;
    claimed.push(id);
    const reward = relicReward(relic);
    giveReward(reward);
    addRegionStability(relic.zone, 4 + relic.stageIndex, "relic");
    addJournalEntry({
      title: `유물 복원: ${relic.title}`,
      done: [
        relicLore(relic),
        `${relic.goal} 기록을 묶어 ${buffStatsText(relic.stats)} 보정을 남겼습니다.`,
      ],
    });
    syncTitleUnlocks(true);
    toast(`${relic.title} 복원 완료`);
    openRelics();
    saveGame(false);
  }

  function openBestiary() {
    modalMode = "bestiary";
    const visibleEnemies = Object.keys(ENEMIES).filter((type) => {
      const seen = state.bestiary[type]?.kills > 0;
      const inUnlockedZone = ZONES.some(
        (zone) =>
          state.unlockedZones.includes(zone.id) && zone.enemies.includes(type),
      );
      return seen || inUnlockedZone;
    });
    ui.modal.innerHTML = `
      <h2>몬스터 도감</h2>
      <p class="rpg-muted">몬스터별 처치 수, 고유 장비 드롭, 생태 연구 단계, 도감 보상을 확인합니다. 생태 연구는 해당 몬스터에게 주는 피해, 받는 피해, 전리품 기대값을 조금씩 보정합니다.</p>
      <div class="item-grid">
        ${visibleEnemies
          .map((type) => {
            const enemy = ENEMIES[type];
            const entry = state.bestiary[type] || { kills: 0 };
            const kills = entry.kills || 0;
            const gearLoot = monsterGearLootSummary(type);
            const runeNames = (MONSTER_RUNE_DROPS[type] || [])
              .map((id) => ITEMS[id]?.name || id)
              .join(", ");
            const researchStage = bestiaryResearchStage(type);
            const nextResearch = bestiaryNextResearchStage(type);
            const nextMilestone =
              BESTIARY_MILESTONES.find((milestone) => kills < milestone) ||
              BESTIARY_MILESTONES[BESTIARY_MILESTONES.length - 1];
            const claimable = BESTIARY_MILESTONES.filter(
              (milestone) =>
                kills >= milestone &&
                !state.bestiaryRewards.includes(
                  bestiaryRewardId(type, milestone),
                ),
            )[0];
            return `<div class="item-card">
              <strong>${escapeHtml(enemy.name)} <span style="color:${enemy.color}">●</span></strong>
              <span class="rpg-muted">처치 ${kills} · 보스 ${entry.bossKills || 0} · 정예 ${entry.eliteKills || 0}</span>
              <span>고유 장비: ${escapeHtml(gearLoot.names)}</span>
              <span class="rpg-muted">${escapeHtml(gearLoot.status)}</span>
              <span>고유 각인: ${escapeHtml(runeNames || "없음")}</span>
              <span class="rpg-muted">생태 연구 ${bestiaryResearchTier(type)}/${BESTIARY_RESEARCH_STAGES.length}: ${escapeHtml(researchStage?.name || "미기록")}</span>
              <span class="rpg-muted">${escapeHtml(bestiaryResearchBonusText(type))}</span>
              <span>${escapeHtml(bestiaryLore(type))}</span>
              <span class="rpg-muted">${
                nextResearch
                  ? `다음 연구: ${Math.min(kills, nextResearch.kills)}/${nextResearch.kills} · ${escapeHtml(nextResearch.name)}`
                  : "생태 연구 완료"
              }</span>
              <span class="rpg-muted">다음 도감 목표: ${Math.min(kills, nextMilestone)}/${nextMilestone}</span>
              <button type="button" data-bestiary="${type}" data-milestone="${claimable || ""}" ${claimable ? "" : "disabled"}>${claimable ? `${claimable}마리 보상` : "보상 대기"}</button>
            </div>`;
          })
          .join("")}
      </div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function bestiaryRewardId(type, milestone) {
    return `${type}:${milestone}`;
  }

  function claimBestiaryReward(type, milestone) {
    const entry = state.bestiary[type];
    const enemy = ENEMIES[type];
    const count = Number(milestone);
    const rewardId = bestiaryRewardId(type, count);
    if (!entry || !enemy || (entry.kills || 0) < count) return;
    if (state.bestiaryRewards.includes(rewardId)) return;
    state.bestiaryRewards.push(rewardId);
    const player = state.player;
    const xp = Math.round(enemy.xp * count * 0.55);
    const gold = Math.round(enemy.gold * count * 0.38);
    giveReward({
      xp,
      gold,
      renown: Math.max(1, Math.floor(count / 18)),
      item: count >= 75 ? MONSTER_MATERIAL_DROPS[type]?.item : "",
    });
    if (count >= 30) player.statPoints += 1;
    if (count >= 75) player.skillPoints += 1;
    toast(`${enemy.name} 도감 ${count}마리 보상을 받았습니다.`);
    openBestiary();
  }

  function openSpecializations() {
    modalMode = "specializations";
    const player = state.player;
    ui.modal.innerHTML = `
      <h2>서약 전문화</h2>
      <p class="rpg-muted">서약 포인트를 공용 서약기 레벨 또는 세 가지 전문화에 나누어 투자합니다. 전문화는 전투 감각을 다르게 만들어 장기 플레이 빌드를 구성합니다.</p>
      <div class="item-grid">
        ${Object.entries(OATH_SPECIALIZATIONS)
          .map(([id, spec]) => {
            const rank = specializationRank(id);
            return `<div class="item-card">
              <strong style="color:${spec.color}">${spec.name} Lv.${rank}</strong>
              <span>${escapeHtml(spec.desc)}</span>
              <span class="rpg-muted">${specializationEffectText(id, rank)}</span>
              <button type="button" data-specialization="${id}" ${(player.skillPoints || 0) <= 0 || rank >= 15 ? "disabled" : ""}>서약 포인트 투자</button>
            </div>`;
          })
          .join("")}
      </div>
      <div class="choice-grid">
        <button type="button" data-close>닫기</button>
      </div>`;
    ui.modalWrap.classList.add("show");
  }

  function specializationEffectText(id, rank = specializationRank(id)) {
    if (id === "blade")
      return `공격 +${rank * 2}, 기본 공격 피해 +${Math.round(rank * 2.5)}%, 기본 공격 적중 시 MP 회복`;
    if (id === "ward")
      return `방어 +${rank * 2}, 받는 피해 -${Math.round(Math.min(28, rank * 1.8))}%, 회피 무적 증가`;
    if (id === "surge")
      return `MP 회복 +${(rank * 0.32).toFixed(1)}/초, 서약기 피해/재사용/소모 개선`;
    return "";
  }

  function investSpecialization(id) {
    const player = state.player;
    if (!OATH_SPECIALIZATIONS[id]) return;
    if ((player.skillPoints || 0) <= 0)
      return toast("서약 포인트가 부족합니다.");
    if (specializationRank(id) >= 15) return toast("이미 최대 전문화입니다.");
    player.skillPoints -= 1;
    player.specializations[id] = specializationRank(id) + 1;
    toast(`${OATH_SPECIALIZATIONS[id].name} 전문화가 강화되었습니다.`);
    openSpecializations();
  }

  function openCompanions() {
    syncCompanionUnlocks(false);
    modalMode = "companions";
    const claimed = new Set(companionMissionClaimedIds());
    const cards = COMPANIONS.map((companion) => {
      const entry = companionEntry(companion.id);
      const active = state.activeCompanion === companion.id;
      const xpNeed = companionXpForLevel(entry.level || 1);
      const missions = companionMissionsFor(companion.id)
        .map((mission) => {
          const progress = companionMissionProgress(mission);
          const done = claimed.has(mission.id);
          return `<div class="lines" style="margin-top:8px">
            <p><strong>${mission.stage}. ${escapeHtml(mission.title)}</strong><br>${escapeHtml(mission.desc)}<br><span class="rpg-muted">${escapeHtml(mission.goal)} ${progress.current}/${progress.required} · 효과 ${escapeHtml(buffStatsText(mission.stats))} · 보상 ${rewardText(mission.reward)}</span></p>
            <button type="button" data-companion-mission="${mission.id}" ${entry.unlocked && progress.ready && !done ? "" : "disabled"}>${done ? "임무 완료" : progress.ready ? "임무 보고" : entry.unlocked ? "진행 중" : "잠김"}</button>
          </div>`;
        })
        .join("");
      return `<div class="item-card">
        <strong style="color:${companion.color}">${escapeHtml(companion.name)} Lv.${entry.level || 1}</strong>
        <span>${escapeHtml(companion.role)}</span>
        <span>${escapeHtml(companion.story)}</span>
        <span class="rpg-muted">${escapeHtml(companion.passive)}</span>
        <span class="rpg-muted">${entry.unlocked ? `숙련 ${Math.floor(entry.xp || 0)}/${xpNeed} · 임무 ${claimedCompanionMissionCount(companion.id)}/${companionMissionsFor(companion.id).length}` : `메인 퀘스트 ${companion.unlockQuest} 이후 합류`}</span>
        <button type="button" data-companion="${companion.id}" ${entry.unlocked && !active ? "" : "disabled"}>${active ? "동행 중" : entry.unlocked ? "동행 선택" : "잠김"}</button>
        ${missions}
      </div>`;
    }).join("");
    ui.modal.innerHTML = `
      <h2>서약 동료</h2>
      <p class="rpg-muted">동료는 이야기 진행에 따라 합류하고, 동행 중 전투를 보조하며 처치 경험 일부로 숙련도가 오릅니다. 동료 임무는 수집, 전투, 외전, 균열 같은 장기 목표를 각 동료의 이야기와 연결합니다.</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function claimCompanionMission(id) {
    const mission = COMPANION_MISSIONS.find((item) => item.id === id);
    if (!mission) return;
    const spec = companionSpec(mission.companion);
    const entry = companionEntry(mission.companion);
    if (!entry.unlocked) return toast("아직 합류하지 않은 동료의 임무입니다.");
    if (companionMissionClaimedIds().includes(id))
      return toast("이미 완료한 동료 임무입니다.");
    const progress = companionMissionProgress(mission);
    if (!progress.ready) return toast("동료 임무 조건이 아직 부족합니다.");
    companionMissionEntry().claimed.push(id);
    giveReward(mission.reward);
    addCompanionXp(Math.max(80, Math.round((mission.reward.xp || 300) * 0.22)));
    state.journal = [
      {
        title: `${spec.name} 임무: ${mission.title}`,
        text: `${mission.desc} ${spec.name}의 동행 보정이 강화되었습니다.`,
        time: formatTime(state.playSeconds),
      },
      ...(state.journal || []),
    ].slice(0, 140);
    syncTitleUnlocks(true);
    toast(`${spec.name} 임무 완료: ${mission.title}`);
    openCompanions();
    saveGame(false);
  }

  function selectCompanion(id) {
    const entry = companionEntry(id);
    const spec = companionSpec(id);
    if (!entry.unlocked || !spec)
      return toast("아직 합류하지 않은 동료입니다.");
    state.activeCompanion = id;
    state.companionPosition = {
      x: state.player.x - 64,
      y: state.player.y + 52,
      phase: 0,
      attackFlash: 0,
    };
    toast(`${spec.name}이 동행합니다.`);
    openCompanions();
  }

  function openBonds() {
    modalMode = "bonds";
    const visible = NPC_BONDS.filter((bond) => npcBondUnlocked(bond));
    const total = totalNpcBondLevel();
    const cards = visible
      .map((bond) => {
        const entry = npcBondEntry(bond.id);
        const cost = npcBondGiftCost(bond);
        const material = ITEMS[cost.material];
        const maxed = entry.level >= 5;
        const affordable =
          state.player.gold >= cost.gold &&
          (state.player.inventory[cost.material] || 0) >= cost.count;
        const nextStory =
          bond.stories[Math.min(entry.level, bond.stories.length - 1)] || "";
        return `<div class="item-card">
          <strong style="color:${bond.color}">${escapeHtml(bond.name)} 인연 ${entry.level}/5</strong>
          <span>${escapeHtml(bond.zoneName)} · ${escapeHtml(bond.role)}</span>
          <span>${escapeHtml(nextStory)}</span>
          <span class="rpg-muted">현재 보정: ${escapeHtml(entry.level ? npcBondEffectText(bond, entry.level) : "아직 없음")}</span>
          <span class="rpg-muted">다음 선물: ${cost.gold}G · ${material?.name || cost.material} ${state.player.inventory[cost.material] || 0}/${cost.count}</span>
          <button type="button" data-bond-gift="${bond.id}" ${maxed || !affordable ? "disabled" : ""}>${maxed ? "인연 완성" : affordable ? "선물하고 이야기 듣기" : "재료 부족"}</button>
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>NPC 인연</h2>
      <p class="rpg-muted">해금된 지역의 NPC에게 몬스터 재료와 골드를 선물해 사이드 스토리를 열고 지역 신뢰 보정을 얻습니다. 인연은 전투, 보상, 회복, 서약기 운용에 누적 반영됩니다.</p>
      <p class="rpg-muted">인연 단계 합계 ${total}/${NPC_BONDS.length * 5} · 완성 ${completedNpcBondCount()}명</p>
      <div class="item-grid">${cards || "<p>아직 인연을 쌓을 수 있는 NPC가 없습니다.</p>"}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function improveNpcBond(id) {
    const bond = npcBondSpec(id);
    if (!bond) return;
    if (!npcBondUnlocked(bond)) return toast("아직 만난 적 없는 NPC입니다.");
    const entry = npcBondEntry(id);
    if (entry.level >= 5) return toast("이미 인연이 완성되었습니다.");
    const cost = npcBondGiftCost(bond);
    if (state.player.gold < cost.gold)
      return toast("인연 선물에 필요한 골드가 부족합니다.");
    if ((state.player.inventory[cost.material] || 0) < cost.count)
      return toast(
        `${ITEMS[cost.material]?.name || cost.material}이 부족합니다.`,
      );
    state.player.gold -= cost.gold;
    state.player.inventory[cost.material] -= cost.count;
    entry.level += 1;
    entry.gifts += 1;
    const story =
      bond.stories[Math.min(entry.level - 1, bond.stories.length - 1)];
    const xp = Math.round(120 + (bond.zoneIndex + 1) * 38 + entry.level * 72);
    state.player.xp += xp;
    state.player.renown += 1;
    addRegionStability(bond.zone, entry.level >= 5 ? 4 : 2, "bond");
    addJournalEntry({
      title: `인연 ${entry.level}/5: ${bond.name}`,
      done: [
        story,
        `${bond.zoneName}의 ${bond.role}와 신뢰를 쌓아 ${npcBondEffectText(bond, entry.level)} 보정을 얻었습니다.`,
      ],
    });
    while (state.player.xp >= xpForLevel(state.player.level)) {
      state.player.xp -= xpForLevel(state.player.level);
      state.player.level += 1;
      state.player.maxHp += 38;
      state.player.maxMp += 14;
      state.player.atk += 4;
      state.player.def += 2;
      state.player.statPoints += 3;
      state.player.skillPoints += 1;
      state.player.hp = state.player.maxHp;
      state.player.mp = state.player.maxMp;
    }
    showEffect(
      state.player.x,
      state.player.y - 86,
      `${bond.name} 인연 ${entry.level}`,
      bond.color,
    );
    syncTitleUnlocks(true);
    toast(`${bond.name} 인연 ${entry.level}/5`);
    openBonds();
  }

  function openSanctuary() {
    modalMode = "sanctuary";
    const cards = SANCTUARY_FACILITIES.map((facility) => {
      const level = sanctuaryLevel(facility.id);
      const cost = sanctuaryCost(facility);
      const material = cost ? ITEMS[cost.material] : null;
      const extra = cost?.extraMaterial ? ITEMS[cost.extraMaterial] : null;
      const enough =
        cost &&
        state.player.gold >= cost.gold &&
        (state.player.inventory[cost.material] || 0) >= cost.count &&
        (!cost.extraMaterial ||
          (state.player.inventory[cost.extraMaterial] || 0) >= cost.extraCount);
      const costText = cost
        ? `비용: ${cost.gold}G · ${material?.name || cost.material} ${cost.count}${extra ? ` · ${extra.name} ${cost.extraCount}` : ""}`
        : "최대 재건 완료";
      return `<div class="item-card">
        <strong style="color:${facility.color}">${escapeHtml(facility.name)} ${level}/4</strong>
        <span>${escapeHtml(facility.desc)}</span>
        <span class="rpg-muted">현재 효과: ${escapeHtml(sanctuaryFacilityEffectText(facility))}</span>
        <span class="rpg-muted">${escapeHtml(costText)}</span>
        <button type="button" data-sanctuary="${facility.id}" ${cost && enough ? "" : "disabled"}>${cost ? `${cost.next}단계 재건` : "완료"}</button>
      </div>`;
    }).join("");
    ui.modal.innerHTML = `
      <h2>서약 성소 재건</h2>
      <p class="rpg-muted">몬스터 재료와 골드를 봉헌해 성소 시설을 복구합니다. 재건 보정은 저장되며 전투, 보상, 회복, 서약 전술에 장기적으로 적용됩니다.</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function upgradeSanctuary(id) {
    const facility = SANCTUARY_FACILITIES.find((item) => item.id === id);
    if (!facility) return;
    const cost = sanctuaryCost(facility);
    if (!cost) return toast("이미 최대 단계입니다.");
    const inventory = state.player.inventory;
    if (state.player.gold < cost.gold)
      return toast("성소 재건에 필요한 골드가 부족합니다.");
    if ((inventory[cost.material] || 0) < cost.count)
      return toast(
        `${ITEMS[cost.material]?.name || cost.material}이 부족합니다.`,
      );
    if (
      cost.extraMaterial &&
      (inventory[cost.extraMaterial] || 0) < cost.extraCount
    )
      return toast(
        `${ITEMS[cost.extraMaterial]?.name || cost.extraMaterial}이 부족합니다.`,
      );
    state.player.gold -= cost.gold;
    inventory[cost.material] -= cost.count;
    if (cost.extraMaterial) inventory[cost.extraMaterial] -= cost.extraCount;
    state.sanctuary[facility.id] = cost.next;
    syncTitleUnlocks(true);
    addJournalEntry({
      title: `${facility.name} ${cost.next}단계 재건`,
      done: [
        `${facility.name}이 ${cost.next}단계로 복구되어 성소의 힘이 강해졌습니다.`,
        facility.desc,
      ],
    });
    toast(`${facility.name} ${cost.next}단계 재건 완료`);
    openSanctuary();
  }

  function openTitles() {
    syncTitleUnlocks(false);
    modalMode = "titles";
    const unlocked = unlockedTitleIds();
    const cards = OATH_TITLES.map((title) => {
      const owned = unlocked.includes(title.id);
      const equipped = state.titles.equipped === title.id;
      return `<div class="item-card">
        <strong style="color:${title.color}">${escapeHtml(title.name)}</strong>
        <span>${escapeHtml(title.desc)}</span>
        <span class="rpg-muted">조건: ${escapeHtml(title.requirement)}</span>
        <span class="rpg-muted">효과: ${escapeHtml(titleEffectText(title))}</span>
        <button type="button" data-title="${title.id}" ${owned && !equipped ? "" : "disabled"}>${equipped ? "장착 중" : owned ? "칭호 장착" : "미달성"}</button>
      </div>`;
    }).join("");
    ui.modal.innerHTML = `
      <h2>서약 칭호</h2>
      <p class="rpg-muted">칭호는 장기 목표 달성으로 열리고 하나만 장착할 수 있습니다. 장착한 칭호의 보정은 전투, 보상, 회복에 적용됩니다.</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function equipTitle(id) {
    const title = titleSpec(id);
    if (!title || !unlockedTitleIds().includes(id))
      return toast("아직 획득하지 않은 칭호입니다.");
    state.titles.equipped = id;
    toast(`${title.name} 칭호 장착`);
    openTitles();
  }

  function openEchoTrials() {
    modalMode = "echoTrials";
    const active = activeEchoTrial();
    const cleared = new Set(clearedEchoTrialIds());
    const completedActs = completedActCount();
    const visibleTrials = ECHO_TRIALS.filter(
      (trial) => trial.act <= Math.max(1, completedActs + 1),
    );
    const activeHtml = active
      ? `<div class="item-card">
          <strong style="color:${active.color}">진행 중: ${escapeHtml(active.title)}</strong>
          <span>${escapeHtml(zoneMap[active.zone]?.name || active.zone)} · ${escapeHtml(ENEMIES[active.boss]?.name || active.boss)} 수호자</span>
          <span class="rpg-muted">경과 ${formatTime(Math.max(0, state.playSeconds - active.startedAt))} · 지역을 벗어나거나 쓰러지면 중단됩니다.</span>
          <button type="button" data-travel="${active.zone}">회상전 지역으로 이동</button>
          <button type="button" data-echo-abandon>회상전 포기</button>
        </div>`
      : "";
    const cards = visibleTrials
      .map((trial) => {
        const unlocked = echoTrialUnlocked(trial);
        const done = cleared.has(trial.id);
        const tier = echoTrialTierInfo(trial);
        const reward = echoTrialReward(trial, done);
        return `<div class="item-card">
          <strong style="color:${tier.color}">${trial.act}장 ${escapeHtml(trial.tierName)} · ${escapeHtml(ACTS[trial.act - 1]?.title || trial.title)}</strong>
          <span>${escapeHtml(zoneMap[trial.zone]?.name || trial.zone)} · ${escapeHtml(ENEMIES[trial.boss]?.name || trial.boss)} 재전투</span>
          <span>${escapeHtml(trial.desc)}</span>
          <span class="rpg-muted">해금: ${escapeHtml(echoTrialUnlockText(trial))}</span>
          <span class="rpg-muted">보상: ${escapeHtml(rewardText(reward))}${done ? " · 재도전 보상" : ""}</span>
          <button type="button" data-echo-start="${trial.id}" ${unlocked && !active ? "" : "disabled"}>${done ? "재도전 시작" : unlocked ? "도전 시작" : "잠김"}</button>
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>서약 회상전</h2>
      <p class="rpg-muted">완료한 장의 보스전을 기억/맹세/균열 3단계로 다시 도전합니다. 장비 강화, 각인, 음식, 성소, 동료 보정이 필요한 준비형 전투 콘텐츠이며 클리어 기록은 서고와 칭호, 지역 안정도에 남습니다.</p>
      ${activeHtml}
      <div class="item-grid">${cards || '<div class="item-card"><strong>아직 열린 회상전이 없습니다.</strong><span>메인 1장 보스를 먼저 클리어하세요.</span></div>'}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function startEchoTrial(id) {
    const trial = echoTrialSpec(id);
    if (!trial) return;
    if (activeExpedition())
      return toast("균열 던전 진행 중에는 회상전을 시작할 수 없습니다.");
    if (activeEchoTrial())
      return toast(
        "이미 진행 중인 회상전이 있습니다. 먼저 포기하거나 클리어하세요.",
      );
    if (!echoTrialUnlocked(trial))
      return toast(`아직 해금되지 않았습니다: ${echoTrialUnlockText(trial)}`);
    closeModal();
    changeZone(trial.zone);
    state.worldEvent = null;
    state.worldEventCooldown = Math.max(state.worldEventCooldown || 80, 90);
    state.enemies = [];
    state.hazards = [];
    echoTrialEntry().active = {
      id: trial.id,
      startedAt: state.playSeconds,
    };
    spawnEnemies();
    toast(
      `${trial.title}을 시작했습니다. ${ENEMIES[trial.boss]?.name || trial.boss} 수호자를 쓰러뜨리세요.`,
    );
    saveGame(false);
  }

  function abandonEchoTrial() {
    const trial = activeEchoTrial();
    if (!trial) return;
    echoTrialEntry().active = null;
    state.enemies = state.enemies.filter((enemy) => !enemy.echoTrialId);
    state.hazards = [];
    toast(`${trial.title}을 포기했습니다.`);
    saveGame(false);
    openEchoTrials();
  }

  function completeEchoTrial(id, enemy, xp, gold) {
    const trial = echoTrialSpec(id);
    if (!trial) return;
    const entry = echoTrialEntry();
    const repeat = entry.cleared.includes(trial.id);
    if (!repeat) entry.cleared.push(trial.id);
    const reward = echoTrialReward(trial, repeat);
    giveReward(reward);
    addRegionStability(
      trial.zone,
      repeat ? 2 : 5 + trial.tierIndex * 3,
      "echo",
    );
    addJournalEntry({
      title: `회상전: ${trial.title}`,
      done: [
        `${zoneMap[trial.zone]?.name || trial.zone}에서 ${ENEMIES[trial.boss]?.name || trial.boss}의 ${trial.tierName} 회상을 돌파했습니다.`,
        `기본 전리품 ${xp}XP/${gold}G 외에 ${rewardText(reward)}을 얻었습니다.`,
      ],
    });
    showEffect(
      enemy.x,
      enemy.y - 96,
      repeat ? "회상 재돌파" : "회상 클리어",
      trial.color,
    );
    entry.active = null;
    state.hazards = [];
    state.enemies = state.enemies.filter((item) => !item.echoTrialId);
    syncTitleUnlocks(true);
    toast(`${trial.title} 클리어. 서고에 기록했습니다.`);
    saveGame(false);
  }

  function openExpedition() {
    modalMode = "expedition";
    const expedition = activeExpedition();
    if (expedition) {
      const zone = zoneMap[expedition.zone] || currentZone();
      const modifier = expeditionModifier(expedition);
      ui.modal.innerHTML = `
        <h2>균열 던전</h2>
        <div class="lines">
          <p><strong>${zone.name}</strong> · ${modifier?.name || "균열"}</p>
          <p>${modifier?.desc || ""}</p>
          <p>층 진행: ${expedition.floor}/${expedition.maxFloor} · 목표 ${ENEMIES[expedition.target]?.name || expedition.target} ${Math.min(expedition.required, expedition.kills || 0)}/${expedition.required}</p>
          <p>목표를 채우면 ${ENEMIES[expedition.bossType]?.name || expedition.bossType} 균열 수호자가 나타납니다.</p>
        </div>
        <div class="choice-grid">
          <button type="button" class="primary" data-travel="${expedition.zone}">던전 지역으로 이동</button>
          <button type="button" data-expedition-abandon>탐험 포기</button>
          <button type="button" data-close>닫기</button>
        </div>`;
      ui.modalWrap.classList.add("show");
      return;
    }

    const zoneIds = state.unlockedZones.filter((id) => zoneMap[id]);
    ui.modal.innerHTML = `
      <h2>균열 던전</h2>
      <p class="rpg-muted">해금된 지역에서 3~8층 던전을 시작합니다. 층마다 토벌 목표, 균열 수호자, 보급함·성소·기록·봉인석 탐험 노드가 있으며 강화 재료·명성·도감 진행을 함께 얻습니다.</p>
      <div class="item-grid">
        ${zoneIds
          .map((zoneId) => {
            const zone = zoneMap[zoneId];
            const depth = expeditionDepth(zoneId);
            const target = ENEMIES[zone.enemies[0]]?.name || zone.enemies[0];
            return `<div class="item-card">
              <strong>${escapeHtml(zone.name)} 균열</strong>
              <span>${escapeHtml(zone.subtitle)}</span>
              <span class="rpg-muted">권장 진행: ${depth}층 · 주 목표 ${target}</span>
              <button type="button" data-expedition-start="${zoneId}">탐험 시작</button>
            </div>`;
          })
          .join("")}
      </div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function expeditionDepth(zoneId) {
    const index = Math.max(
      0,
      ZONES.findIndex((zone) => zone.id === zoneId),
    );
    return clamp(3 + Math.floor(index / 3), 3, 8);
  }

  function expeditionFloorKey(expedition = activeExpedition()) {
    return expedition
      ? `${expedition.zone}:${expedition.floor}:${expedition.modifier}`
      : "";
  }

  function ensureExpeditionNodes() {
    const expedition = activeExpedition();
    if (!expedition || expedition.zone !== state.zone) {
      state.expeditionNodes = [];
      state.expeditionNodeFloor = "";
      return;
    }
    if (
      state.expeditionNodeFloor !== expeditionFloorKey(expedition) ||
      !Array.isArray(state.expeditionNodes)
    ) {
      placeExpeditionNodes();
    }
  }

  function placeExpeditionNodes() {
    const expedition = activeExpedition();
    if (!expedition || expedition.zone !== state.zone) {
      state.expeditionNodes = [];
      state.expeditionNodeFloor = "";
      return;
    }
    state.expeditionNodeFloor = expeditionFloorKey(expedition);
    state.expeditionNodes = createExpeditionNodes(expedition);
  }

  function createExpeditionNodes(expedition) {
    const zone = currentZone();
    const zoneIndex = Math.max(
      0,
      ZONES.findIndex((item) => item.id === zone.id),
    );
    const floor = expedition.floor || 1;
    const count = clamp(3 + Math.floor(floor / 3), 3, 5);
    return Array.from({ length: count }, (_, index) => {
      const meta =
        EXPEDITION_NODE_TYPES[
          (zoneIndex + floor + index) % EXPEDITION_NODE_TYPES.length
        ];
      const px = zone.w * (0.2 + (((index + 1) * 0.23 + floor * 0.07) % 0.56));
      const py = zone.h * (0.22 + (((index + 2) * 0.19 + floor * 0.11) % 0.54));
      let x = clamp(
        px + Math.sin(floor + index * 1.7) * 120,
        180,
        zone.w - 180,
      );
      let y = clamp(
        py + Math.cos(floor * 1.3 + index) * 130,
        180,
        zone.h - 180,
      );
      if (distance(x, y, state.player.x, state.player.y) < 260) {
        x = clamp(x + 280, 180, zone.w - 180);
        y = clamp(y + 180, 180, zone.h - 180);
      }
      return {
        id: `node-${zone.id}-${floor}-${index}`,
        zone: zone.id,
        floor,
        kind: meta.kind,
        x,
        y,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }

  function startExpedition(zoneId) {
    const zone = zoneMap[zoneId];
    if (!zone || !state.unlockedZones.includes(zoneId)) return;
    const modifier =
      EXPEDITION_MODIFIERS[
        Math.floor(Math.random() * EXPEDITION_MODIFIERS.length)
      ];
    state.expedition = {
      active: true,
      zone: zoneId,
      floor: 1,
      maxFloor: expeditionDepth(zoneId),
      target: zone.enemies[0],
      bossType: zone.enemies[1] || zone.enemies[0],
      kills: 0,
      required: 8 + Math.floor(expeditionDepth(zoneId) * 1.5),
      modifier: modifier.id,
      startedAt: new Date().toISOString(),
    };
    closeModal();
    changeZone(zoneId);
    state.enemies = [];
    placeExpeditionNodes();
    toast(`${zone.name} ${modifier.name} 탐험을 시작했습니다.`);
  }

  function abandonExpedition() {
    if (!state.expedition) return;
    state.enemies = state.enemies.filter((enemy) => !enemy.expedition);
    state.expedition = null;
    state.expeditionNodes = [];
    state.expeditionNodeFloor = "";
    toast("균열 탐험을 포기했습니다.");
    closeModal();
  }

  function claimExpeditionNode(node) {
    const expedition = activeExpedition();
    if (!expedition || expedition.zone !== state.zone || !node) return;
    const meta = expeditionNodeMeta(node.kind);
    state.expeditionNodes = (state.expeditionNodes || []).filter(
      (item) => item.id !== node.id,
    );
    const floor = expedition.floor || 1;
    const rewardMult = expeditionModifier(expedition)?.reward || 1;
    const player = state.player;

    if (node.kind === "cache") {
      const material =
        floor >= 6 ? "abyssCore" : floor >= 3 ? "starDust" : "oathSteel";
      const count = Math.max(1, Math.ceil(floor / 3));
      const gold = Math.round((85 + floor * 38) * rewardMult);
      addInventoryItem(material, count);
      player.gold += gold;
      showEffect(
        node.x,
        node.y - 42,
        `${ITEMS[material].name} x${count}`,
        meta.color,
      );
      toast(`${meta.title}: ${ITEMS[material].name} x${count}, ${gold}G 획득`);
      return;
    }

    if (node.kind === "shrine") {
      player.hp = player.maxHp;
      player.mp = player.maxMp;
      player.invuln = Math.max(player.invuln || 0, 3.5 + floor * 0.25);
      showEffect(node.x, node.y - 42, "완전 회복", meta.color);
      toast(`${meta.title}: HP/MP 회복, 짧은 보호막 활성화`);
      return;
    }

    if (node.kind === "lore") {
      const xp = Math.round((100 + floor * 72) * rewardMult);
      giveReward({ xp, gold: 0, renown: 1 });
      addJournalEntry({
        title: `${currentZone().name} ${floor}층 기록`,
        done: [
          `${meta.title}에서 균열의 흐름과 다음 수호자의 약점을 기록했습니다.`,
        ],
      });
      showEffect(node.x, node.y - 42, `경험치 ${xp}`, meta.color);
      toast(`${meta.title}: 경험치와 명성, 여정 기록 획득`);
      return;
    }

    if (node.kind === "seal") {
      const progress = 2 + Math.floor(floor / 2);
      expedition.kills = Math.min(
        expedition.required,
        (expedition.kills || 0) + progress,
      );
      showEffect(node.x, node.y - 42, `진행 +${progress}`, meta.color);
      if (expedition.kills >= expedition.required) {
        state.enemies = [];
        toast(`${meta.title}: 봉인이 풀려 수호자가 모습을 드러냅니다.`);
      } else {
        toast(`${meta.title}: 수호자 소환 진행도 +${progress}`);
      }
    }
  }

  function handleExpeditionKill(enemy, xp, gold) {
    const expedition = activeExpedition();
    if (!expedition || !enemy.expedition || expedition.zone !== state.zone)
      return;
    if (enemy.expeditionBoss) {
      completeExpeditionFloor(enemy, xp, gold);
      return;
    }
    expedition.kills = Math.min(
      expedition.required,
      (expedition.kills || 0) + 1,
    );
    if (expedition.kills >= expedition.required) {
      toast("균열 수호자가 모습을 드러냅니다.");
      state.enemies = [];
    }
  }

  function completeExpeditionFloor(enemy, xp, gold) {
    const expedition = activeExpedition();
    if (!expedition) return;
    const modifier = expeditionModifier(expedition);
    const rewardMult = modifier?.reward || 1;
    const material =
      expedition.floor >= expedition.maxFloor - 1
        ? "dawnPrism"
        : expedition.floor >= 4
          ? "abyssCore"
          : expedition.floor % 2
            ? "oathSteel"
            : "starDust";
    const materialCount = Math.max(1, Math.ceil(expedition.floor / 2));
    addInventoryItem(material, materialCount);
    giveReward({
      xp: Math.round(xp * rewardMult * 0.75),
      gold: Math.round(gold * rewardMult * 0.65),
      renown: (modifier?.renown || 0) + 1,
    });
    showEffect(
      enemy.x,
      enemy.y - 74,
      `${ITEMS[material].name} x${materialCount}`,
      rarityInfo(ITEMS[material]).color,
    );
    if (expedition.floor >= expedition.maxFloor) {
      completeExpedition();
      return;
    }
    expedition.floor += 1;
    expedition.kills = 0;
    expedition.required += 3;
    const zone = zoneMap[expedition.zone];
    expedition.target =
      zone.enemies[(expedition.floor - 1) % zone.enemies.length];
    expedition.bossType = zone.enemies[expedition.floor % zone.enemies.length];
    state.enemies = [];
    placeExpeditionNodes();
    toast(`균열 ${expedition.floor}층으로 내려갑니다.`);
  }

  function completeExpedition() {
    const expedition = activeExpedition();
    if (!expedition) return;
    const zone = zoneMap[expedition.zone] || currentZone();
    const modifier = expeditionModifier(expedition);
    const title = `${zone.name} ${modifier?.name || "균열"} 정복`;
    state.expeditionLog = [
      {
        title,
        zone: expedition.zone,
        zoneName: zone.name,
        floor: expedition.maxFloor,
        time: formatTime(state.playSeconds),
      },
      ...(state.expeditionLog || []),
    ].slice(0, 40);
    addJournalEntry({
      title,
      done: [
        `${zone.name}의 균열을 ${expedition.maxFloor}층까지 돌파해 지역 결계를 안정시켰습니다.`,
      ],
    });
    addRegionStability(expedition.zone, 9 + expedition.maxFloor, "expedition");
    syncTitleUnlocks(true);
    state.expedition = null;
    state.expeditionNodes = [];
    state.expeditionNodeFloor = "";
    state.enemies = [];
    toast(`${title}. 탐험 기록이 서고에 남았습니다.`);
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
        ${OATH_ARTS.map(
          (art) => `<div class="item-card">
            <strong style="color:${art.color}">${art.key} ${escapeHtml(art.name)}</strong>
            <span>${escapeHtml(art.desc)}</span>
            <span class="rpg-muted">${oathArtUnlocked(art) ? `사용 가능 · ${oathArtCost(art)}MP · 재사용 ${oathArtCooldown(art).toFixed(1)}초` : `서약기 Lv.${art.unlock} 필요`}</span>
          </div>`,
        ).join("")}
      </div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openJournal() {
    modalMode = "journal";
    const entries = (state.journal || []).slice(0, 12);
    const collected = new Set(collectedMemoryIds());
    const masteryClaimed = new Set(actMasteryClaimedIds());
    const visibleActCount = Math.max(1, completedActCount());
    const timelineActCount = Math.min(ACTS.length, visibleActCount + 1);
    const actTimelineCards = ACTS.slice(0, timelineActCount)
      .map((act, index) => {
        const actNo = index + 1;
        const zone = zoneMap[act.zone];
        const mainDone = completedActCount() >= actNo;
        const active = currentQuest()?.act === actNo;
        const decisionDone = Boolean(
          oathDecisionEntry().choices?.[`act${actNo}`],
        );
        const metrics = [
          {
            label: "메인",
            current: mainDone ? 1 : 0,
            total: 1,
          },
          {
            label: "결의",
            current: decisionDone ? 1 : 0,
            total: 1,
          },
          {
            label: "기억",
            current: zoneMemoryCount(act.zone),
            total: MEMORY_FRAGMENTS.filter(
              (fragment) => fragment.zone === act.zone,
            ).length,
          },
          {
            label: "탐색",
            current: zoneSecretDiscoveryCount(act.zone),
            total: REGION_SECRETS.filter((secret) => secret.zone === act.zone)
              .length,
          },
          {
            label: "외전",
            current: zoneSideStoryClaimedCount(act.zone),
            total: SIDE_STORIES.filter((story) => story.zone === act.zone)
              .length,
          },
          {
            label: "회상",
            current: clearedEchoTrialCount(act.zone),
            total: ECHO_TRIALS.filter((trial) => trial.zone === act.zone)
              .length,
          },
          {
            label: "장비록",
            current: claimedArmoryRecordCount(act.zone),
            total: REGIONAL_ARMORY_RECORDS.filter(
              (record) => record.zone === act.zone,
            ).length,
          },
          {
            label: "전술",
            current: claimedTacticManualCount(act.zone),
            total: TACTIC_MANUALS.filter((manual) => manual.zone === act.zone)
              .length,
          },
          {
            label: "감사장",
            current: claimedCommendationCount(act.zone),
            total: REGION_COMMENDATIONS.filter(
              (entry) => entry.zone === act.zone,
            ).length,
          },
        ].filter((metric) => metric.total > 0);
        const completeCount = metrics.filter(
          (metric) => metric.current >= metric.total,
        ).length;
        const missing = metrics
          .filter((metric) => metric.current < metric.total)
          .slice(0, 4)
          .map(
            (metric) =>
              `${metric.label} ${Math.min(metric.current, metric.total)}/${metric.total}`,
          )
          .join(" · ");
        const status = mainDone
          ? missing
            ? "후일담 회수 중"
            : "장 기록 완성"
          : active
            ? "현재 진행 중"
            : "다음 장";
        return `<div class="item-card">
          <strong>${actNo}장 ${escapeHtml(act.title)} · ${escapeHtml(status)}</strong>
          <span>${escapeHtml(zone?.name || act.zone)} · ${escapeHtml(act.collect)}</span>
          <span>${escapeHtml(act.line)}</span>
          <span class="rpg-muted">기록 완성 ${completeCount}/${metrics.length}${missing ? ` · 남은 기록 ${escapeHtml(missing)}` : ""}</span>
          <div class="choice-grid">
            <button type="button" data-travel="${act.zone}" ${state.unlockedZones.includes(act.zone) ? "" : "disabled"}>${state.zone === act.zone ? "현재 지역" : state.unlockedZones.includes(act.zone) ? "지역 이동" : "미해금"}</button>
          </div>
        </div>`;
      })
      .join("");
    const actMasteryCards = ACTS.slice(0, visibleActCount)
      .map((act, index) => {
        const actNo = index + 1;
        const tasks = actMasteryTaskStatus(actNo);
        const doneTasks = tasks.filter((task) => task.done);
        const missing = tasks
          .filter((task) => !task.done)
          .slice(0, 3)
          .map((task) => task.label)
          .join(", ");
        const buttons = ACT_MASTERY_STAGES.map((stage) => {
          const id = actMasteryId(actNo, stage.key);
          const progress = actMasteryProgress(actNo, stage);
          const done = masteryClaimed.has(id);
          const reward = actMasteryReward(actNo, stage);
          const label = done
            ? `${stage.name} 완료`
            : progress.ready
              ? `${stage.name} 보상 받기`
              : `${stage.name} ${progress.current}/${progress.required}`;
          return `<button type="button" data-act-mastery="${id}" ${progress.ready && !done ? "" : "disabled"}>${label}<br><small>${escapeHtml(rewardText(reward))}</small></button>`;
        }).join("");
        return `<div class="item-card">
          <strong>${actNo}장 ${escapeHtml(act.title)} 완성도 ${doneTasks.length}/${tasks.length}</strong>
          <span>${escapeHtml(zoneMap[act.zone]?.name || act.zone)} · ${escapeHtml(act.collect)}</span>
          <span class="rpg-muted">${missing ? `남은 기록: ${escapeHtml(missing)}` : "이 장의 주요 기록을 모두 정리했습니다."}</span>
          <div class="choice-grid">${buttons}</div>
        </div>`;
      })
      .join("");
    const memoryCards = state.unlockedZones
      .filter((id) => zoneMap[id])
      .map((zoneId) => {
        const fragments = MEMORY_FRAGMENTS.filter(
          (fragment) => fragment.zone === zoneId,
        );
        const current = fragments.filter((fragment) =>
          collected.has(fragment.id),
        );
        return `<div class="item-card">
          <strong>${escapeHtml(zoneMap[zoneId].name)} 기억 ${current.length}/${fragments.length}</strong>
          <span>${escapeHtml(current.map((fragment) => fragment.label).join(", ") || "아직 수집한 기억이 없습니다.")}</span>
          <span class="rpg-muted">필드에서 푸른 기억 조각을 찾아 Space/E로 조사합니다.</span>
        </div>`;
      })
      .join("");
    const secretCards = state.unlockedZones
      .filter((id) => zoneMap[id])
      .map((zoneId) => {
        const claimed = new Set(secretDiscoveryClaimedIds());
        const secrets = REGION_SECRETS.filter(
          (secret) => secret.zone === zoneId,
        );
        const found = secrets.filter((secret) => claimed.has(secret.id));
        const missing = secrets.filter((secret) => !claimed.has(secret.id));
        return `<div class="item-card">
          <strong>${escapeHtml(zoneMap[zoneId].name)} 탐색 ${found.length}/${secrets.length}</strong>
          <span>${escapeHtml(found.map((secret) => secret.label).join(", ") || "아직 조사한 지역 표식이 없습니다.")}</span>
          <span class="rpg-muted">${missing.length ? `${missing[0].label} 단서가 필드와 미니맵에 남아 있습니다.` : "이 지역의 숨은 표식을 모두 조사했습니다."}</span>
        </div>`;
      })
      .join("");
    const treasureCards = state.unlockedZones
      .filter((id) => zoneMap[id])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const fragments = treasureFragmentCount(zoneId);
        const sites = treasureSitesForZone(zoneId);
        const claimed = sites.filter((site) => site.claimed);
        const nextSite = sites.find((site) => !site.claimed);
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 보물지도 ${claimed.length}/${sites.length}</strong>
          <span>${escapeHtml(claimed.map((site) => site.label).join(", ") || "아직 발굴한 보물지도가 없습니다.")}</span>
          <span class="rpg-muted">${nextSite ? `${nextSite.label}: 지도 조각 ${Math.min(fragments, nextSite.required)}/${nextSite.required}` : "이 지역의 보물지도를 모두 발굴했습니다."}</span>
        </div>`;
      })
      .join("");
    const namedCards = state.unlockedZones
      .filter((id) => zoneMap[id])
      .map((zoneId) => {
        const hunt = REGIONAL_NAMED_HUNTS.find((item) => item.zone === zoneId);
        if (!hunt) return "";
        const done = namedHuntClaimedIds().includes(hunt.id);
        const progress = namedHuntProgress(hunt);
        return `<div class="item-card">
          <strong>${escapeHtml(zoneMap[zoneId].name)} 네임드 강적</strong>
          <span>${escapeHtml(namedHuntDisplayName(hunt))} · ${done ? "토벌 완료" : "미토벌"}</span>
          <span class="rpg-muted">지역 처치 ${progress.kills}/${progress.requiredKills} · 지도 조각 ${progress.fragments}/${progress.requiredFragments}</span>
        </div>`;
      })
      .join("");
    const armoryCards = state.unlockedZones
      .filter((id) => zoneMap[id])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const records = REGIONAL_ARMORY_RECORDS.filter(
          (record) => record.zone === zoneId,
        );
        const claimed = new Set(armoryClaimedIds());
        const done = records.filter((record) => claimed.has(record.id));
        const nextRecord = records.find((record) => !claimed.has(record.id));
        const progress = nextRecord ? armoryRecordProgress(nextRecord) : null;
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 장비록 ${done.length}/${records.length}</strong>
          <span>${escapeHtml(done.map((record) => record.label).join(", ") || "아직 등록한 장비록이 없습니다.")}</span>
          <span class="rpg-muted">${
            nextRecord && progress
              ? `${nextRecord.label}: ${progress.primaryLabel} ${progress.primary}/${progress.primaryRequired} · ${progress.secondaryLabel} ${progress.secondary}/${progress.secondaryRequired}`
              : "이 지역의 장비록을 모두 등록했습니다."
          }</span>
        </div>`;
      })
      .join("");
    const tacticCards = state.unlockedZones
      .filter((id) => zoneMap[id])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const manuals = TACTIC_MANUALS.filter(
          (manual) => manual.zone === zoneId,
        );
        const claimed = new Set(tacticManualClaimedIds());
        const done = manuals.filter((manual) => claimed.has(manual.id));
        const nextManual = manuals.find((manual) => !claimed.has(manual.id));
        const progress = nextManual ? tacticManualProgress(nextManual) : null;
        const missing = progress
          ? progress.rows
              .filter((row) => !row.ready)
              .slice(0, 2)
              .map((row) => `${row.label} ${row.current}/${row.required}`)
              .join(" · ")
          : "";
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 전술 교범 ${done.length}/${manuals.length}</strong>
          <span>${escapeHtml(done.map((manual) => manual.label).join(", ") || "아직 정리한 전술 교범이 없습니다.")}</span>
          <span class="rpg-muted">${nextManual ? `${nextManual.name}: ${escapeHtml(missing || "정리 가능")}` : "이 지역의 전술 교범을 모두 정리했습니다."}</span>
        </div>`;
      })
      .join("");
    const campCards = state.unlockedZones
      .filter((id) => zoneMap[id])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const camps = campsitesForZone(zoneId);
        const rested = camps.filter((camp) => camp.claimed);
        const nextCamp = camps.find((camp) => !camp.claimed);
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 야영지 ${rested.length}/${camps.length}</strong>
          <span>${escapeHtml(rested.map((camp) => camp.label).join(", ") || "아직 휴식한 야영지가 없습니다.")}</span>
          <span class="rpg-muted">${nextCamp ? `${nextCamp.title}: 필드와 미니맵의 모닥불 표식에서 Space/E 휴식` : "이 지역의 야영 기록을 정리했습니다."}</span>
        </div>`;
      })
      .join("");
    const campaignCards = ACTS.slice(0, Math.max(1, completedActCount()))
      .map((act, index) => {
        const actNo = index + 1;
        const campaigns = OATH_CAMPAIGNS.filter(
          (campaign) => campaign.act === actNo,
        );
        const claimed = new Set(campaignClaimedIds());
        const done = campaigns.filter((campaign) => claimed.has(campaign.id));
        const nextCampaign = campaigns.find(
          (campaign) => !claimed.has(campaign.id),
        );
        const progress = nextCampaign ? campaignProgress(nextCampaign) : null;
        return `<div class="item-card">
          <strong>${actNo}장 원정 ${done.length}/${campaigns.length}</strong>
          <span>${escapeHtml(act.title)} · ${escapeHtml(zoneMap[act.zone]?.name || act.zone)}</span>
          <span class="rpg-muted">${
            nextCampaign && progress
              ? `${nextCampaign.name}: ${progress.current}/${progress.required}`
              : "이 장의 서약 원정을 모두 정리했습니다."
          }</span>
        </div>`;
      })
      .join("");
    const patrolCards = state.unlockedZones
      .filter((id) => zoneMap[id])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const operations = REGIONAL_PATROL_OPERATIONS.filter(
          (operation) => operation.zone === zoneId,
        );
        const claimed = new Set(patrolClaimedIds());
        const done = operations.filter((operation) =>
          claimed.has(operation.id),
        );
        const nextOperation = operations.find(
          (operation) => !claimed.has(operation.id),
        );
        const nextProgress = nextOperation
          ? patrolOperationProgress(nextOperation)
          : null;
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 순찰 ${done.length}/${operations.length}</strong>
          <span>${escapeHtml(done.map((operation) => operation.label).join(", ") || "아직 완료한 순찰 작전이 없습니다.")}</span>
          <span class="rpg-muted">${
            nextOperation && nextProgress
              ? `${nextOperation.label}: ${nextProgress.primaryLabel} ${nextProgress.primary}/${nextProgress.primaryRequired} · ${nextProgress.secondaryLabel} ${nextProgress.secondary}/${nextProgress.secondaryRequired}`
              : "이 지역의 순찰 작전을 모두 정리했습니다."
          }</span>
        </div>`;
      })
      .join("");
    const echoCleared = new Set(clearedEchoTrialIds());
    const echoCards = ACTS.slice(0, Math.max(1, completedActCount()))
      .map((act, index) => {
        const actNo = index + 1;
        const trials = ECHO_TRIALS.filter((trial) => trial.act === actNo);
        const done = trials.filter((trial) => echoCleared.has(trial.id));
        const nextTrial =
          trials.find(
            (trial) => echoTrialUnlocked(trial) && !echoCleared.has(trial.id),
          ) || trials.find((trial) => !echoCleared.has(trial.id));
        return `<div class="item-card">
          <strong>${actNo}장 회상전 ${done.length}/${trials.length}</strong>
          <span>${escapeHtml(act.title)} · ${escapeHtml(zoneMap[act.zone]?.name || act.zone)}</span>
          <span class="rpg-muted">${nextTrial ? `다음 목표: ${nextTrial.tierName} 회상전` : "이 장의 회상전을 모두 정리했습니다."}</span>
        </div>`;
      })
      .join("");
    const regionCards = state.unlockedZones
      .filter((id) => zoneMap[id])
      .map((zoneId) => {
        const entry = regionStabilityEntry(zoneId);
        const value = regionStabilityValue(zoneId);
        const claimed = entry.claimed || [];
        const rewards = REGION_STABILITY_THRESHOLDS.map((threshold) => {
          const ready = value >= threshold;
          const done = claimed.includes(threshold);
          const reward = regionReward(zoneId, threshold);
          return `<button type="button" data-region-reward="${zoneId}" data-region-threshold="${threshold}" ${ready && !done ? "" : "disabled"}>${threshold} ${done ? "수령 완료" : ready ? "보상 받기" : rewardText(reward)}</button>`;
        }).join("");
        return `<div class="item-card">
          <strong>${escapeHtml(zoneMap[zoneId].name)} 안정도 ${Math.floor(value)}/100</strong>
          <span>${escapeHtml(regionPassiveText(zoneId))}</span>
          <span class="rpg-muted">메인 퀘스트, 의뢰, 돌발 사건, 균열 던전으로 상승합니다.</span>
          ${rewards}
        </div>`;
      })
      .join("");
    const commendationCards = state.unlockedZones
      .filter((id) => zoneMap[id])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const score = regionCommendationScore(zoneId);
        const zoneStats = commendationTotalStats(zoneId);
        const claimed = new Set(commendationClaimedIds());
        const buttons = REGION_COMMENDATIONS.filter(
          (entry) => entry.zone === zoneId,
        )
          .map((entry) => {
            const progress = commendationProgress(entry);
            const done = claimed.has(entry.id);
            const reward = commendationReward(entry);
            const label = done
              ? `${entry.label} 감사 완료`
              : progress.ready
                ? `${entry.label} 감사장 받기`
                : `${entry.label} ${progress.current}/${progress.required}`;
            return `<button type="button" data-commendation="${entry.id}" ${progress.ready && !done ? "" : "disabled"}>${label}<br><small>${escapeHtml(rewardText(reward))} · ${escapeHtml(buffStatsText(entry.stats))}</small></button>`;
          })
          .join("");
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 감사 점수 ${score}/140</strong>
          <span>${escapeHtml(zone.subtitle)}</span>
          <span class="rpg-muted">안정도, NPC 인연, 외전, 시험, 의뢰, 수배, 도감, 채집, 탐색, 보물지도, 강적, 야영, 순찰, 장비록, 원정, 연대기, 유물, 균열 기록을 합쳐 주민 감사장을 받습니다.</span>
          <span class="rpg-muted">지역 보정: ${escapeHtml(buffStatsText(zoneStats))}</span>
          <div class="choice-grid">${buttons}</div>
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>서약 서고</h2>
      <p class="rpg-muted">완료한 장의 기록과 지금까지 왜 싸워왔는지 확인합니다.</p>
      <h2>장별 서사 연표 ${Math.min(state.questIndex + 1, QUESTS.length)}/${QUESTS.length}</h2>
      <div class="item-grid">${actTimelineCards}</div>
      <h2>영웅서기 장 완성 ${claimedActMasteryCount()}/${ACTS.length * ACT_MASTERY_STAGES.length}</h2>
      <div class="item-grid">${actMasteryCards}</div>
      <h2>기억 조각 ${collected.size}/${MEMORY_FRAGMENTS.length}</h2>
      <div class="item-grid">${memoryCards}</div>
      <h2>지역 탐색 ${discoveredSecretCount()}/${REGION_SECRETS.length}</h2>
      <div class="item-grid">${secretCards}</div>
      <h2>보물지도 ${claimedTreasureCount()}/${REGION_TREASURE_SITES.length}</h2>
      <div class="item-grid">${treasureCards}</div>
      <h2>네임드 강적 ${claimedNamedHuntCount()}/${REGIONAL_NAMED_HUNTS.length}</h2>
      <div class="item-grid">${namedCards}</div>
      <h2>지역 장비록 ${claimedArmoryRecordCount()}/${REGIONAL_ARMORY_RECORDS.length}</h2>
      <div class="item-grid">${armoryCards}</div>
      <h2>전술 교범 ${claimedTacticManualCount()}/${TACTIC_MANUALS.length}</h2>
      <div class="item-grid">${tacticCards}</div>
      <h2>서약 원정 ${claimedCampaignCount()}/${OATH_CAMPAIGNS.length}</h2>
      <div class="item-grid">${campaignCards}</div>
      <h2>야영지 ${claimedCampsiteCount()}/${REGIONAL_CAMPSITES.length}</h2>
      <div class="item-grid">${campCards}</div>
      <h2>지역 순찰 ${claimedPatrolOperationCount()}/${REGIONAL_PATROL_OPERATIONS.length}</h2>
      <div class="item-grid">${patrolCards}</div>
      <h2>서약 회상전 ${clearedEchoTrialCount()}/${ECHO_TRIALS.length}</h2>
      <div class="item-grid">${echoCards}</div>
      <h2>지역 안정도</h2>
      <div class="item-grid">${regionCards}</div>
      <h2>주민 감사장 ${claimedCommendationCount()}/${REGION_COMMENDATIONS.length}</h2>
      <div class="item-grid">${commendationCards}</div>
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

  function auditCard(title, stateText, detail, color = "#48a5ff") {
    return `<div class="item-card" style="border-color:${color}66">
      <strong style="color:${color}">${escapeHtml(title)}</strong>
      <span>${escapeHtml(stateText)}</span>
      <span class="rpg-muted">${escapeHtml(detail)}</span>
    </div>`;
  }

  function longPlayRouteCardsHtml() {
    const zone = currentZone();
    const quest = currentQuest();
    const zoneMetrics = zoneProgressMetrics(state.zone);
    const nextZoneMetric =
      zoneMetrics.find((metric) => metric.current < metric.total) ||
      zoneMetrics[0];
    const missingGear = regionMonsterGearIds(state.zone).filter(
      (id) => !gearCollectionIds().includes(id),
    );
    const huntPlan = activeHuntPlan();
    const echoReady = ECHO_TRIALS.find(
      (trial) =>
        echoTrialUnlocked(trial) && !clearedEchoTrialIds().includes(trial.id),
    );
    const namedReady = REGIONAL_NAMED_HUNTS.find((hunt) => {
      if (namedHuntClaimedIds().includes(hunt.id)) return false;
      return namedHuntProgress(hunt).ready;
    });
    const routes = [
      {
        title: "서사 회수 루트",
        stateText: quest
          ? `${quest.act}장 ${quest.title}`
          : "모든 메인 장 완료",
        detail:
          "메인 퀘스트를 밀고, 열린 지역에서 기억 조각, 연대기, 외전, 장별 서사 연표를 차례로 정리합니다.",
        color: zone.accent,
      },
      {
        title: "장비 파밍 루트",
        stateText: missingGear.length
          ? `${gearName(missingGear[0])}${missingGear.length > 1 ? ` 외 ${missingGear.length - 1}종` : ""}`
          : huntPlan
            ? `${huntPlan.enemy.name} ${huntPlan.progress}/${huntPlan.required}`
            : "현재 지역 고유 장비 확인 완료",
        detail:
          "사냥 계획을 켜고 도감의 고유 장비 확률을 확인한 뒤 장비록, 강화, 세트 효과, 분해 재료로 이어갑니다.",
        color: "#d08cff",
      },
      {
        title: "보스 준비 루트",
        stateText: namedReady
          ? `${namedHuntDisplayName(namedReady)} 준비 완료`
          : echoReady
            ? `${echoReady.tierName} 회상전 대기`
            : "야영/연금/각인/동료 보정 점검",
        detail:
          "야영과 연금 버프, 각인 슬롯, 동료, 성소 보정을 확인하고 회상전, 네임드 강적, 균열 수호자로 넘어갑니다.",
        color: "#ffba5a",
      },
      {
        title: "지역 안정화 루트",
        stateText: nextZoneMetric
          ? `${nextZoneMetric.label} ${Math.min(nextZoneMetric.current, nextZoneMetric.total)}/${nextZoneMetric.total}`
          : `${zone.name} 정리 완료`,
        detail:
          "의뢰, 수배, 순찰, 보물지도, 탐색 표식을 돌며 안정도와 주민 감사장 점수를 같이 올립니다.",
        color: "#53e2a8",
      },
    ];
    return routes
      .map((route) =>
        auditCard(route.title, route.stateText, route.detail, route.color),
      )
      .join("");
  }

  function openGoalAudit() {
    modalMode = "goalAudit";
    const gearIds = Object.keys(ITEMS).filter((id) => isGearItem(ITEMS[id]));
    const shopGearIds = [
      ...new Set(
        Object.values(SHOPS)
          .flat()
          .filter((id) => isGearItem(ITEMS[id])),
      ),
    ];
    const contentTotal =
      QUESTS.length +
      SIDE_STORIES.length +
      REGION_TRIALS.length +
      REGIONAL_CHRONICLES.length +
      REGION_RELICS.length +
      ECHO_TRIALS.length +
      ACTS.length * ACT_MASTERY_STAGES.length +
      REGIONAL_ARMORY_RECORDS.length +
      TACTIC_MANUALS.length +
      OATH_CAMPAIGNS.length +
      REGION_COMMENDATIONS.length +
      REGION_SECRETS.length +
      REGION_TREASURE_SITES.length +
      REGIONAL_NAMED_HUNTS.length +
      REGIONAL_CAMPSITES.length +
      REGIONAL_PATROL_OPERATIONS.length;
    const contentDone =
      Math.min(state.questIndex, QUESTS.length) +
      claimedSideStoryCount() +
      claimedRegionTrialCount() +
      claimedChronicleCount() +
      restoredRelicCount() +
      clearedEchoTrialCount() +
      claimedActMasteryCount() +
      claimedArmoryRecordCount() +
      claimedTacticManualCount() +
      claimedCampaignCount() +
      claimedCommendationCount() +
      discoveredSecretCount() +
      claimedTreasureCount() +
      claimedNamedHuntCount() +
      claimedCampsiteCount() +
      claimedPatrolOperationCount();
    const visualSystems = [
      "플레이어 장비 문양",
      "무기별 공격 궤적",
      "NPC 상태 말풍선",
      "몬스터 계열별 실루엣",
      "회상전/강적 오라",
      "전리품 미니맵 표식",
    ];
    const cards = [
      auditCard(
        "몬스터 겹침/전투 판정",
        `몸통 여유 ${PLAYER_ENEMY_BODY_PADDING}px · 접촉 공격 보정 적용`,
        "몬스터끼리는 분리하지 않고, 플레이어와 겹친 몬스터만 8방향 후보 위치로 밀어내며 거리 확보 이펙트를 표시합니다.",
        "#53e2a8",
      ),
      auditCard(
        "30시간 장기 플레이 조건",
        `${formatTime(state.playSeconds)} / ${formatTime(MIN_FINAL_PLAY_SECONDS)}`,
        "최종 장 보스는 30시간 기록과 주요 장 진행이 쌓여야 열립니다. 이 수치는 플레이 품질 검증을 대체하지 않고 조건 달성 여부만 보여줍니다.",
        "#f8f871",
      ),
      auditCard(
        "스토리/장기 콘텐츠 규모",
        `${ACTS.length}장 · ${QUESTS.length}개 메인 퀘스트 · 장기 항목 ${contentDone}/${contentTotal}`,
        "외전, 시험, 연대기, 유물, 회상전, 장 완성, 장비록, 전술, 원정, 감사장, 탐색, 보물, 강적, 야영, 순찰이 메인 진행과 연결됩니다.",
        "#48a5ff",
      ),
      auditCard(
        "장비 드롭/장착/상점",
        `장비 ${ownedGearCount()}/${gearIds.length}종 보유 · 상점 장비 ${shopGearIds.length}종`,
        "몬스터 고유 장비, 보스 보상, 상점 장비, 강화, 분해, 프리셋, 세트 효과, 장비 수집 보정과 가방 평가가 연결됩니다.",
        "#d08cff",
      ),
      auditCard(
        "인게임 UI/UX",
        "다음 행동 · 여정 현황 · 장별 서사 연표 · 상태 말풍선",
        "첫 사용자도 현재 목표, 장기 진행, NPC 역할, 장비 후보, 고유 장비 추적을 화면 안에서 확인할 수 있도록 정리했습니다.",
        "#ffba5a",
      ),
      auditCard(
        "시각 표현",
        `${visualSystems.length}개 핵심 표현 축 적용`,
        visualSystems.join(" · "),
        "#b7ecff",
      ),
      auditCard(
        "브라우저/EXE 폴백",
        "로컬 서버 저장 API + 직접 HTML localStorage 폴백",
        "EXE/로컬 서버에서는 사용자 데이터 폴더에 저장하고, 브라우저 HTML 직접 실행에서는 localStorage를 사용합니다.",
        "#a8bdd5",
      ),
    ].join("");
    ui.modal.innerHTML = `
      <h2>RPG 목표 달성 진단</h2>
      <p class="rpg-muted">이 화면은 현재 구현 근거를 빠르게 확인하기 위한 점검판입니다. 최종 complete 판단은 실제 플레이 흐름, 밸런스, 브라우저/EXE 표시 검증까지 마친 뒤에만 가능합니다.</p>
      <div class="item-grid">${cards}</div>
      <h2>추천 장기 루트</h2>
      <div class="item-grid">${longPlayRouteCardsHtml()}</div>
      <div class="lines">
        <p><strong>남은 검증 초점</strong><br>후반부 보상 속도, 장비 드롭 체감, 30시간 조건까지의 목표 다양성, 작은 화면에서 UI 겹침, EXE와 브라우저 간 저장/표시 차이를 더 확인해야 합니다.</p>
      </div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openCamps() {
    modalMode = "camps";
    const total = REGIONAL_CAMPSITES.length;
    const claimed = claimedCampsiteCount();
    const nearest = nearestCampsite();
    const cards = state.unlockedZones
      .filter((id) => zoneMap[id])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const camp = campsitesForZone(zoneId)[0];
        if (!camp) return "";
        const reward = campsiteReward(camp);
        const near = nearest?.id === camp.id && nearest.d < 118;
        const status = camp.claimed
          ? "휴식 완료"
          : state.zone === zoneId
            ? near
              ? "현재 위치에서 휴식 가능"
              : "필드와 미니맵의 모닥불 표식으로 이동"
            : "지역 이동 후 야영지 방문";
        return `<div class="item-card">
          <strong style="color:${camp.color}">${escapeHtml(camp.title)}</strong>
          <span>${escapeHtml(zone.subtitle)}</span>
          <span>${escapeHtml(camp.text)}</span>
          <span class="rpg-muted">상태: ${escapeHtml(status)} · 보상 ${escapeHtml(rewardText(reward))}</span>
          <span class="rpg-muted">휴식 효과: ${escapeHtml(buffStatsText(camp.stats))} · 15분 유지</span>
          <div class="choice-grid">
            <button type="button" data-travel="${zoneId}" ${state.zone === zoneId ? "disabled" : ""}>${state.zone === zoneId ? "현재 지역" : "이 지역으로 이동"}</button>
            <button type="button" data-camp-rest="${camp.id}" ${near && !camp.claimed ? "" : "disabled"}>${camp.claimed ? "휴식 완료" : near ? "지금 휴식" : "야영지 근처 필요"}</button>
          </div>
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>지역 야영지 <button type="button" data-camp-help title="지역 야영지 사용법">?</button></h2>
      <p class="rpg-muted">해금된 지역마다 한 번씩 휴식할 수 있는 야영지가 있습니다. 필드와 미니맵의 모닥불 표식으로 이동해 Space/E를 누르면 체력과 MP를 회복하고, 지역별 야영 대화와 15분 전투 준비 효과를 얻습니다.</p>
      <p class="rpg-muted">휴식 ${claimed}/${total} · 야영 기록은 서고, 주민 감사장, 영웅서기 장 완성도, 전용 칭호 조건으로 누적됩니다.</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openCampHelp() {
    showDialogue("지역 야영지 사용법", [
      "각 지역에는 감시, 보급, 서약 성격을 가진 야영지가 하나씩 있습니다. 해금된 지역의 필드와 미니맵에 모닥불 표식으로 표시됩니다.",
      "야영지 가까이에서 Space/E를 누르면 한 번만 휴식할 수 있습니다. 휴식은 HP/MP를 회복하고 경험치, 골드, 재료, 명성, 동료 경험치, 지역 안정도와 서고 기록을 제공합니다.",
      "야영 효과는 15분 동안 유지되며 감시 야영지는 방어, 보급 야영지는 회복과 경험치, 서약 야영지는 서약 전술과 골드 보정을 제공합니다. 완료 기록은 주민 감사장과 영웅서기 장 완성도에도 반영됩니다.",
    ]);
  }

  function openPatrols() {
    modalMode = "patrols";
    const claimed = new Set(patrolClaimedIds());
    const cards = state.unlockedZones
      .filter((zoneId) => zoneMap[zoneId])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const operations = REGIONAL_PATROL_OPERATIONS.filter(
          (operation) => operation.zone === zoneId,
        );
        const operationHtml = operations
          .map((operation) => {
            const progress = patrolOperationProgress(operation);
            const done = claimed.has(operation.id);
            const reward = patrolOperationReward(operation);
            return `<div class="lines" style="margin-top:8px">
              <p><strong style="color:${operation.color}">${escapeHtml(operation.label)}</strong><br>${escapeHtml(operation.text)}<br><span class="rpg-muted">${escapeHtml(progress.primaryLabel)} ${progress.primary}/${progress.primaryRequired} · ${escapeHtml(progress.secondaryLabel)} ${progress.secondary}/${progress.secondaryRequired}</span><br><span class="rpg-muted">보상 ${escapeHtml(rewardText(reward))} · 작전 보정 ${escapeHtml(patrolStatsText(operation))}</span></p>
              <button type="button" data-patrol="${operation.id}" ${progress.ready && !done ? "" : "disabled"}>${done ? "작전 완료" : progress.ready ? "작전 보고" : "준비 중"}</button>
            </div>`;
          })
          .join("");
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 순찰 ${claimedPatrolOperationCount(zoneId)}/${operations.length}</strong>
          <span>${escapeHtml(zone.subtitle)}</span>
          ${operationHtml}
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>지역 순찰 작전 <button type="button" data-patrol-help title="지역 순찰 작전 사용법">?</button></h2>
      <p class="rpg-muted">해금된 지역마다 정찰, 보급, 수호 순찰을 진행합니다. 도감 처치, 기억/탐색, 채집/야영, 의뢰, 안정도, 수배, 균열, 시험, 강적 기록을 묶어 이전 지역을 다시 정리하는 장기 목표입니다.</p>
      <p class="rpg-muted">완료 ${claimedPatrolOperationCount()}/${REGIONAL_PATROL_OPERATIONS.length}</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openPatrolHelp() {
    showDialogue("지역 순찰 작전 사용법", [
      "순찰 작전은 지역별 정찰, 보급, 수호 3종으로 구성됩니다. 새 몬스터만 반복해서 잡는 목표가 아니라 도감 처치, 기억 조각, 탐색 표식, 야영, 채집, 의뢰, 수배, 균열, 시험, 강적 기록을 함께 요구합니다.",
      "정찰 순찰은 지역 도감 처치와 기억/탐색 기록을 묶습니다. 보급 순찰은 채집, 야영, 지역 의뢰를 연결합니다. 수호 순찰은 안정도와 수배, 균열, 시험, 강적 기록을 확인합니다.",
      "완료하면 경험치, 골드, 재료, 명성, 지역 안정도, 서고 기록, 주민 감사장 점수, 영웅서기 장 완성도 조건과 전용 칭호 진행도가 누적됩니다.",
    ]);
  }

  function openTreasures() {
    modalMode = "treasures";
    const total = REGION_TREASURE_SITES.length;
    const claimed = claimedTreasureCount();
    const cards = state.unlockedZones
      .filter((id) => zoneMap[id])
      .map((zoneId) => {
        const zone = zoneMap[zoneId];
        const fragments = treasureFragmentCount(zoneId);
        const sites = treasureSitesForZone(zoneId)
          .map((site) => {
            const reward = treasureReward(site);
            const status = site.claimed
              ? "발굴 완료"
              : site.ready
                ? state.zone === zoneId
                  ? "필드에 위치 표시"
                  : "지역 이동 후 발굴"
                : `지도 조각 ${fragments}/${site.required}`;
            return `<p><strong style="color:${site.color}">${escapeHtml(site.title)}</strong><br>${escapeHtml(site.clue)}<br><span class="rpg-muted">${escapeHtml(status)} · 보상 ${escapeHtml(rewardText(reward))}</span></p>`;
          })
          .join("");
        return `<div class="item-card">
          <strong>${escapeHtml(zone.name)} 보물지도 ${claimedTreasureCount(zoneId)}/${TREASURE_SITE_TEMPLATES.length}</strong>
          <span>${escapeHtml(zone.subtitle)}</span>
          <span class="rpg-muted">지도 조각 ${fragments}개 · 이 지역 몬스터, 정예, 보스에게서 낮은 확률로 얻습니다.</span>
          <div class="lines">${sites}</div>
          <button type="button" data-travel="${zoneId}" ${state.zone === zoneId ? "disabled" : ""}>${state.zone === zoneId ? "현재 지역" : "이 지역으로 이동"}</button>
        </div>`;
      })
      .join("");
    ui.modal.innerHTML = `
      <h2>보물지도 <button type="button" data-treasure-help title="보물지도 사용법">?</button></h2>
      <p class="rpg-muted">지역 몬스터가 낮은 확률로 떨어뜨리는 지도 조각을 모으면 필드와 미니맵에 발굴 위치가 나타납니다. 가까이 가서 Space/E로 발굴하면 장비, 재료, 서고 기록, 지역 안정도를 얻습니다.</p>
      <p class="rpg-muted">발굴 ${claimed}/${total} · 보유 지도 조각 ${totalTreasureFragments()}</p>
      <div class="item-grid">${cards}</div>
      <div class="choice-grid"><button type="button" data-close>닫기</button></div>`;
    ui.modalWrap.classList.add("show");
  }

  function openTreasureHelp() {
    showDialogue("보물지도 사용법", [
      "몬스터, 정예, 보스를 처치하면 지역별 지도 조각을 낮은 확률로 얻습니다. 보스와 정예는 조금 더 높은 확률을 가집니다.",
      "지도 조각이 충분하면 해당 지역 필드와 미니맵에 낡은 지도함, 묻힌 장비고, 비밀 서고문이 표시됩니다.",
      "발굴 위치에 가까이 가서 Space/E를 누르면 보상과 서고 기록을 얻고, 주민 감사장과 영웅서기 장 완성도 조건에도 반영됩니다.",
    ]);
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
      "좌측 상태 패널, 우측 정보 패널, 하단 조작 패널은 각 패널의 접기 버튼으로 접었다가 다시 펼 수 있습니다. 접힘 상태는 브라우저와 EXE 실행 환경 모두에서 다음 실행까지 유지됩니다.",
      "우측 정보 패널의 다음 행동 영역은 가까운 상호작용, 메인 목표, 체력 경고, 성장 포인트, 장비/각인 빈 슬롯, 보스전 음식 준비, 착용 대비 좋은 장비 후보, 현재 지역 미획득 고유 장비, 완료 가능한 전술/장비록/원정/순찰 같은 항목을 우선순위로 보여줍니다. 여정 현황 영역은 메인 서사, 30시간 최종 장 조건, 현재 지역 기록, 장비 수집, 장기 기록 진행도를 막대로 요약하고 관련 메뉴를 바로 엽니다.",
      "진단 버튼은 현재 구현 근거를 점검하는 화면입니다. 몬스터 겹침 보정, 30시간 조건, 스토리/장기 콘텐츠 규모, 장비 드롭/상점/장착, 인게임 UI/UX, 시각 표현, 브라우저/EXE 저장 폴백을 한곳에서 확인할 수 있고, 추천 장기 루트에서 서사 회수, 장비 파밍, 보스 준비, 지역 안정화 방향을 고를 수 있습니다.",
      "WASD/방향키로 이동하고 J로 공격합니다. NPC 가까이에서는 Space 또는 E로 말풍선 대화를 진행하고, K/2/3/4는 서약 전술, O는 동료, Shift는 짧은 회피 대시입니다.",
      "퀘스트에는 왜 해야 하는지와 예상 보상이 표시됩니다. 화면의 방향선과 미니맵을 보고 NPC, 수집품, 보스 위치로 이동하세요.",
      "결의 버튼에서는 완료한 장마다 수호/진실/개척 중 하나를 선택합니다. 선택은 되돌릴 수 없고 서고 기록, 지역 안정도, 영구 보정, 칭호 조건으로 남아 장기 진행의 방향을 만듭니다.",
      "외전 버튼에서는 지역별 후일담을 확인합니다. 주민 인연, 보급 준비, 도감 전투, 기억/연대기/균열 기록을 엮어 메인 장 이후에도 지역별 이야기를 이어갑니다.",
      "시험 버튼에서는 해금된 지역마다 수호/보급/기록 시험을 진행합니다. 안정도, 토벌, 채집, 기억, 연대기, 외전, 균열 기록을 요구하므로 이전 지역에도 다시 돌아갈 이유가 생깁니다.",
      "상점에서 물약과 장비를 구매하고, 보스 보상으로 얻은 무기/방어구/부적을 가방에서 바꿔 착용하세요. 성장 메뉴에서 레벨업 포인트를 힘/체력/지혜/민첩과 서약기에 투자할 수 있고, 서약기 레벨이 오르면 별빛 투창, 수호 결계, 균열 폭쇄가 차례로 열립니다.",
      "가방의 장비 프리셋은 현재 착용 중인 무기/방어구/부적 조합을 사냥, 수호, 탐험 슬롯에 저장합니다. 보스전이나 파밍 전에 저장한 프리셋을 눌러 빠르게 장비 구성을 바꿀 수 있습니다.",
      "가방의 분해 버튼은 착용 중인 마지막 장비를 제외한 장비를 강화 재료와 골드로 되돌립니다. 중복 드롭은 보관하거나 분해해 다음 강화와 제작 준비에 사용할 수 있습니다.",
      "동료 메뉴에서는 이야기 진행에 따라 합류한 서약 동료를 선택합니다. 동료는 전투 중 직접 따라다니며 공격, 회복, 보상 보정 같은 역할을 수행하고 동행 중 숙련도가 오릅니다.",
      "동료 메뉴의 임무는 각 동료별 3단계 장기 목표입니다. 기억, 수배, 채집, 장비, 균열, 외전 같은 기존 콘텐츠를 동료 서사와 묶고, 완료하면 해당 동료의 동행 보정이 강화됩니다.",
      "인연 메뉴는 X 키로 열 수 있습니다. 해금된 지역 NPC에게 몬스터 재료와 골드를 선물하면 사이드 스토리가 서고에 남고, 지역별 신뢰 보정이 전투와 보상에 누적됩니다.",
      "성소 메뉴에서는 몬스터가 떨어뜨린 강화 재료와 골드를 사용해 기록관, 대장간, 병영, 약초원, 균열 관측문, 새벽 제단을 재건합니다. 재건 보정은 경험치, 골드, 드롭률, 회복, 전투 능력에 누적 적용됩니다.",
      "칭호 메뉴에서는 메인 진행, 도감, 균열, 성소, 동료, 장비 수집 같은 장기 목표로 열린 칭호를 장착합니다. 칭호 하나가 전투와 보상 보정을 제공합니다.",
      "각 지역에는 푸른 기억 조각이 2개씩 숨겨져 있습니다. 가까이 가서 Space/E로 조사하면 서고에 지역 이야기가 기록되고, 누적 수집 보상과 기억 관련 칭호가 열립니다.",
      "필드의 지역 탐색 표식은 전망대, 숨은 보급함, 영웅 비문입니다. 가까이 가서 Space/E로 조사하면 보상과 서고 기록을 얻고 주민 감사장 점수도 올라갑니다.",
      "보물 버튼에서는 지역별 보물지도 진행도를 확인합니다. 몬스터가 낮은 확률로 떨어뜨리는 지도 조각을 모으면 필드와 미니맵에 발굴 위치가 나타나고, Space/E로 발굴해 장비, 재료, 서고 기록, 지역 안정도를 얻습니다.",
      "야영 버튼에서는 지역별 야영지 상태를 확인합니다. 필드와 미니맵의 모닥불 표식으로 이동해 Space/E로 휴식하면 체력/MP 회복, 야영 대화, 재료 보상, 15분 전투 준비 효과, 서고 기록과 지역 안정도를 얻습니다.",
      "순찰 버튼에서는 지역별 정찰/보급/수호 작전을 확인합니다. 도감 처치, 기억/탐색, 채집/야영, 의뢰, 안정도, 수배, 균열, 시험, 강적 기록을 묶어 이전 지역을 다시 정리하는 장기 목표입니다.",
      "지역 연대기 메뉴는 V 키로 열 수 있습니다. 지역마다 기억 회수, 주민 의뢰, 균열 기록, 안정화 목표가 따로 있어 메인 퀘스트가 지나간 지역도 탐색, 의뢰, 던전, 안정도 회복을 이어갈 이유가 생깁니다.",
      "유물 메뉴에서는 지역별 기억 성물, 수호 표장, 균열 성핵을 복원합니다. 기억 조각, 안정도, 외전, 시험, 의뢰, 연대기, 균열, 수배 기록과 재료를 함께 요구하며, 복원한 유물은 영구 보정과 서고 기록으로 남고 현재 지역 필드와 미니맵에도 표식으로 나타납니다.",
      "모든 몬스터는 자신만의 고유 장비를 낮은 확률로 떨어뜨립니다. 일반 사냥 중에는 희귀 장비를, 보스전에서는 더 높은 확률로 영웅/전설 장비를 노릴 수 있습니다.",
      "일부 몬스터는 철갑, 흡혈, 폭풍, 균열, 황금 정예 속성을 달고 등장합니다. 정예는 전투 패턴과 능력치가 달라지고 경험치, 골드, 재료, 장비 드롭 기대값이 더 좋습니다.",
      "강화 메뉴에서는 몬스터가 떨어뜨린 서약 강철, 수호 실타래, 별가루, 심연 핵, 새벽 프리즘으로 장비를 +10까지 올립니다.",
      "공방 메뉴는 C 키로 열 수 있습니다. 몬스터 재료, 지역 안정도, 기억 조각, 지역 연대기, 성소 재건, 균열 기록을 조건으로 전용 장비와 보급품을 제작합니다.",
      "필드의 약초 군락, 광물 더미, 유적 화초는 가까이 가서 Space/E로 채집합니다. 채집 재료는 Z 키의 연금과 야영식 메뉴에서 전투 준비용 음식과 영약으로 바꿀 수 있습니다.",
      "연금 음식과 영약은 일정 시간 공격, 방어, 서약 전술, 드롭률, 경험치 같은 보정을 제공합니다. 같은 음식 효과는 새로 사용한 것으로 갱신됩니다.",
      "착용 중인 무기, 방어구, 부적은 몬스터를 처치할 때마다 숙련 경험을 얻습니다. 숙련 레벨은 장비 능력치에 더해지고, 오래 사용한 장비는 관련 칭호도 열어 줍니다.",
      "보유한 장비 종류가 늘어나면 장비 수집 보정이 전역으로 누적됩니다. 희귀도 높은 장비를 많이 모으면 경험치, 골드, 장비 드롭률과 전투 보정이 조금씩 올라 장기 파밍 목표가 됩니다.",
      "장비록 버튼에서는 지역별 몬스터 고유 장비 표본과 전장 운용 기록을 등록합니다. 고유 장비를 모으고 직접 사용하거나 강화하면 경험치, 드롭률, 공격, 방어, 피해 감소 보정이 누적됩니다.",
      "원정 버튼에서는 완료한 장을 보급 원정, 강습 원정, 서사 원정으로 다시 정리합니다. 야영, 순찰, 강적, 회상전, 장비록, 유물, 감사장, 균열 기록이 후반 장기 목표로 연결됩니다.",
      "전술 버튼에서는 지역별 검격/수호/서약 교범을 정리합니다. 도감 처치, 장비록, 안정도, 순찰/야영, 시험, 연대기, 유물, 외전, 회상전, 원정 기록을 조합해 기본 공격, 방어, 회복, 서약 전술 보정을 누적합니다.",
      "같은 계열 장비 2개 이상을 착용하면 장비 세트 효과가 열립니다. 세트는 공격, 방어, 서약기 운용, 보상 획득률을 바꾸며 활성화된 세트는 가방과 HUD에 표시됩니다.",
      "각인 메뉴에서는 장비와 별개로 몬스터별 희귀 각인이나 상점 각인을 최대 3개까지 장착합니다. Y 키로 열 수 있고, 메인 퀘스트 진행에 따라 2번째와 3번째 슬롯이 열립니다. 각인은 기본 공격, 방어, 회복, 드롭률, 서약 전술 피해처럼 빌드 방향을 보완합니다.",
      "필드에 오래 머무르면 지역 돌발 사건이 발생합니다. 정예 추적과 균열 잔재는 표식 몬스터를 처치하고, 유실 보급품과 서약 성역은 표식 위치에서 Space/E로 조사해 보상을 얻습니다.",
      "메인 퀘스트, 의뢰, 돌발 사건, 균열 던전을 완료하면 지역 안정도가 오릅니다. 안정도가 쌓인 지역에서는 전투 보정과 보상 보너스가 생기고, 서고에서 단계 보상을 받을 수 있습니다.",
      "회상전 버튼에서는 완료한 장의 보스전을 기억/맹세/균열 3단계로 다시 도전합니다. 회상전은 메인 퀘스트를 다시 진행하지 않으며, 장비 강화, 각인, 음식, 성소, 동료 보정을 준비해 보상과 칭호, 서고 기록을 얻는 전투 콘텐츠입니다.",
      "서고의 주민 감사장은 안정도, NPC 인연, 외전, 시험, 의뢰, 수배, 도감, 채집, 탐색, 보물, 강적, 야영, 순찰, 장비록, 원정, 연대기, 유물, 균열 기록을 합산한 지역별 장기 목표입니다. 감사장을 받으면 해당 지역 전투 보정과 상점 할인이 열립니다.",
      "서고의 장별 서사 연표는 각 장의 제목, 핵심 수집품, 이야기 문장, 남은 기록을 한눈에 보여 주고 지역 이동 버튼을 제공합니다. 영웅서기 장 완성도는 완료한 메인 장마다 결의, 기억, 탐색, 보물, 강적, 야영, 순찰, 장비록, 외전, 시험, 연대기, 유물, 회상전, 감사장, 의뢰, 수배, 균열, 도감 기록을 한 장으로 묶습니다. 장의 기록, 전선 정리, 영웅서기 주석 보상을 받으며 이전 지역을 다시 찾는 장기 목표로 활용하세요.",
      "의뢰 메뉴는 지역별 반복 토벌 계약을 제공하고, 현상수배 메뉴는 F 키로 열어 지역별 위험 표적을 추적합니다. 도감 메뉴는 몬스터 처치 누적 보상과 고유 드롭 정보를 보여줍니다.",
      "계획 버튼에서는 도감 연구, 고유 장비 파밍, 지역 안정화 중 지금 집중할 사냥 목표를 하나 선택합니다. 활성 계획은 사이드 패널에 표시되고, 표적 몬스터에는 계획 표식이 붙으며 계획 종류에 따라 경험치, 골드, 장비/각인/재료 드롭 기대값이 달라집니다.",
      "강적 버튼에서는 지역별 네임드 강적을 확인합니다. 지역 처치 기록과 보물지도 조각 조건을 채우고 토벌을 시작하면 해당 지역에 강한 보스가 등장하며, 완료 시 장비/재료 보상과 서고 기록, 지역 안정도, 장 완성도 조건이 쌓입니다.",
      "도감의 생태 연구는 몬스터별 조우, 습성, 약점, 전리품 흔적을 단계별로 기록합니다. 연구가 쌓인 몬스터에게는 피해, 받는 피해, 고유 장비/각인 기대값, 보상 보정이 적용됩니다. 각 몬스터의 고유 장비는 획득/미획득 상태와 일반/보스 드롭 기대 확률까지 함께 표시됩니다.",
      "전문화 메뉴에서는 검격/수호/서약 빌드를 골라 기본 공격, 생존력, 서약기 운용을 다르게 성장시킬 수 있습니다.",
      "던전 메뉴의 균열 탐험은 해금된 지역마다 여러 층을 돌파하는 후반 콘텐츠입니다. 층마다 토벌 목표와 수호자 보스가 있고, 강화 재료와 명성을 안정적으로 얻습니다.",
      "균열 층 안의 보급함, 성소, 기록, 봉인석은 가까이 가서 Space/E로 조사합니다. 보급함은 재료와 골드, 성소는 회복과 보호막, 기록은 경험치와 여정 기록, 봉인석은 수호자 소환 진행도를 줍니다.",
      "강한 몬스터와 보스는 장판, 직선 광선, 투사체 같은 예고 공격을 사용합니다. 바닥 표시가 진해지기 전에 회피하거나 이동해 피해를 줄이세요.",
      "몬스터가 플레이어와 겹치면 8방향 후보 위치로 몸통 밖에 자동 분리되고 `거리 확보` 표시와 초록 분리 링이 잠깐 나타납니다. 초근접 상태의 기본 공격과 서약 전술은 방향 계산 흔들림 때문에 빗나가지 않도록 접촉 판정으로 처리됩니다.",
      "플레이 화면에서는 플레이어 이동 잔상과 장비 희귀도 문양, 복원 유물 오라, 무기별 공격 궤적, 어깨/발걸음 자세, 몬스터 계열별 실루엣, 몸통 명암, 팔다리 움직임, 이동 잔상, 공격 무기 표식, 회상전 보스 아우라, 생태 연구 분석 링과 약점 표식, 사냥 계획 표식, 초근접 분리 링, NPC 얼굴 방향, 발걸음, 손짓, 상태 말풍선, 역할 복장과 상호작용 아이콘, 동료 숙련 문양, 장비 색상, 각인/부적/연금 버프 오라가 함께 표시되므로 적과 보상을 화면에서 구분할 수 있습니다. 장비/각인/퀘스트 아이템 같은 주요 드롭은 미니맵에 별도 표식으로 표시되고, 장비 획득 시 착용 대비 평가가 즉시 안내됩니다.",
      "서고에는 완료한 장의 기록이 쌓여 다음에 이어 할 때도 이야기의 목적을 다시 확인할 수 있습니다.",
      "EXE 또는 로컬 서버에서 실행하면 저장 파일은 사용자 데이터 폴더의 Good_ETC/saves/rpg_save.json에 저장됩니다. 파일로 직접 열면 브라우저 localStorage에 저장됩니다.",
      `최종 장은 ${formatTime(MIN_FINAL_PLAY_SECONDS)} 이상의 플레이 기록과 모든 주요 장 완료를 요구하므로, 단순 반복보다 지역 해금·장비 수집·보스전 준비를 이어가는 장기 플레이를 전제로 합니다.`,
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
    const price = shopItemPrice(item);
    if (state.player.gold < price) return toast("골드가 부족합니다.");
    state.player.gold -= price;
    state.player.inventory[id] = Math.max(
      state.player.inventory[id] || 0,
      ["weapon", "armor", "charm"].includes(item.type)
        ? 1
        : (state.player.inventory[id] || 0) + 1,
    );
    if (["weapon", "armor", "charm"].includes(item.type)) equipItem(id);
    syncTitleUnlocks(true);
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

  function saveGearLoadout(index) {
    const loadouts = gearLoadouts();
    const slot = loadouts[Number(index)];
    if (!slot) return;
    slot.equipment = cleanGearEquipment(state.player.equipment || {});
    toast(`${slot.name} 프리셋을 현재 장비로 저장했습니다.`);
    saveGame(false);
    if (modalMode === "inventory") openInventory();
  }

  function applyGearLoadout(index) {
    const loadouts = gearLoadouts();
    const slot = loadouts[Number(index)];
    if (!slot) return;
    const requested = cleanGearEquipment(slot.equipment || {});
    const valid = cleanGearEquipment(requested, true);
    const requestedIds = Object.values(requested).filter(Boolean);
    const validIds = Object.values(valid).filter(Boolean);
    if (!requestedIds.length) return toast("저장된 장비가 없는 프리셋입니다.");
    if (!validIds.length)
      return toast("프리셋 장비가 현재 가방에 없어 착용할 수 없습니다.");
    state.player.equipment = { ...state.player.equipment, ...valid };
    toast(
      validIds.length === requestedIds.length
        ? `${slot.name} 프리셋을 착용했습니다.`
        : `${slot.name} 프리셋 일부 장비가 가방에 없어 제외했습니다.`,
    );
    syncTitleUnlocks(true);
    saveGame(false);
    if (modalMode === "inventory") openInventory();
  }

  function clearGearLoadout(index) {
    const loadouts = gearLoadouts();
    const slot = loadouts[Number(index)];
    if (!slot) return;
    slot.equipment = { weapon: "", armor: "", charm: "" };
    toast(`${slot.name} 프리셋을 비웠습니다.`);
    saveGame(false);
    if (modalMode === "inventory") openInventory();
  }

  function salvageGearItem(id) {
    const item = ITEMS[id];
    if (!isGearItem(item)) return;
    if (salvageableGearCount(id) <= 0)
      return toast("착용 중인 마지막 장비는 분해할 수 없습니다.");
    const reward = gearSalvageReward(id);
    state.player.inventory[id] -= 1;
    if (state.player.inventory[id] <= 0) delete state.player.inventory[id];
    state.player.inventory[reward.material] =
      (state.player.inventory[reward.material] || 0) + reward.count;
    state.player.gold += reward.gold;
    state.player.salvagedGear = salvagedGearCount() + 1;
    showEffect(
      state.player.x,
      state.player.y - 78,
      `${item.name} 분해`,
      rarityInfo(item).color,
    );
    toast(
      `${item.name} 분해: ${ITEMS[reward.material]?.name || reward.material} x${reward.count}, ${reward.gold}G`,
    );
    syncTitleUnlocks(true);
    saveGame(false);
    if (modalMode === "inventory") openInventory();
  }

  function useItem(id) {
    const item = ITEMS[id];
    if (!item || (state.player.inventory[id] || 0) <= 0) return;
    if (item.type === "material")
      return toast("재료는 강화, 성소 재건, 공방, 연금 메뉴에서 사용합니다.");
    const player = state.player;
    const healingScale =
      1 +
      itemBonus("healingPower") +
      gearCollectionBonus("healingPower") +
      runeBonus("healingPower") +
      buffBonus("healingPower") +
      npcBondBonus("healingPower") +
      sanctuaryBonus("healingPower") +
      decisionBonus("healingPower") +
      trialBonus("healingPower") +
      patrolBonus("healingPower") +
      armoryBonus("healingPower") +
      campaignBonus("healingPower") +
      tacticManualBonus("healingPower") +
      commendationBonus("healingPower") +
      titleBonus("healingPower");
    if (item.heal)
      player.hp = Math.min(
        player.maxHp,
        player.hp + Math.round(item.heal * healingScale),
      );
    if (item.mana)
      player.mp = Math.min(
        player.maxMp,
        player.mp + Math.round(item.mana * healingScale),
      );
    if (item.type === "buff") {
      player.hp = Math.min(
        player.maxHp,
        player.hp + Math.round(180 * healingScale),
      );
      player.mp = Math.min(
        player.maxMp,
        player.mp + Math.round(120 * healingScale),
      );
      player.invuln = Math.max(player.invuln, 2.5);
    }
    if (item.buff) applyConsumableBuff(id, item);
    player.inventory[id] -= 1;
    toast(`${item.name} 사용`);
    if (modalMode === "inventory") openInventory();
    if (modalMode === "alchemy") openAlchemy();
  }

  function applyConsumableBuff(id, item) {
    const buff = item.buff || {};
    if (!buff.stats) return;
    const ttl = clamp(Number(buff.duration) || 300, 30, 1800);
    state.player.activeBuffs = activeBuffs().filter((entry) => entry.id !== id);
    state.player.activeBuffs.push({
      id,
      name: item.name,
      color: rarityInfo(item).color,
      ttl,
      stats: { ...buff.stats },
    });
    showEffect(
      state.player.x,
      state.player.y - 76,
      `${item.name} 효과`,
      rarityInfo(item).color,
    );
  }

  function activeBuffs() {
    state.player.activeBuffs = Array.isArray(state.player.activeBuffs)
      ? state.player.activeBuffs
          .filter((buff) => buff?.ttl > 0)
          .map((buff) => ({
            ...buff,
            stats:
              buff.stats && typeof buff.stats === "object" ? buff.stats : {},
          }))
      : [];
    return state.player.activeBuffs;
  }

  function updateBuffs(dt) {
    state.player.activeBuffs = activeBuffs()
      .map((buff) => ({ ...buff, ttl: Math.max(0, (buff.ttl || 0) - dt) }))
      .filter((buff) => buff.ttl > 0);
  }

  function buffBonus(field) {
    return activeBuffs().reduce(
      (sum, buff) => sum + (Number(buff.stats?.[field]) || 0),
      0,
    );
  }

  function patrolBonus(field) {
    const claimed = new Set(patrolClaimedIds());
    return REGIONAL_PATROL_OPERATIONS.reduce(
      (sum, operation) =>
        sum +
        (claimed.has(operation.id) ? Number(operation.stats?.[field]) || 0 : 0),
      0,
    );
  }

  function buffStatsText(stats = {}) {
    const parts = Object.entries(stats)
      .map(([field, value]) => statLabel(field, Number(value) || 0))
      .filter(Boolean);
    return parts.join(" · ") || "효과 없음";
  }

  function statValue(stat) {
    return (
      (state.player.baseStats?.[stat] || 0) +
      itemBonus(stat) +
      gearCollectionBonus(stat) +
      setBonus(stat) +
      runeBonus(stat) +
      buffBonus(stat) +
      companionBonus(stat) +
      npcBondBonus(stat) +
      sanctuaryBonus(stat) +
      decisionBonus(stat) +
      trialBonus(stat) +
      patrolBonus(stat) +
      armoryBonus(stat) +
      campaignBonus(stat) +
      tacticManualBonus(stat) +
      relicBonus(stat) +
      commendationBonus(stat) +
      titleBonus(stat)
    );
  }

  function specializationRank(id) {
    return Math.max(0, state.player.specializations?.[id] || 0);
  }

  function activeEquipmentSets() {
    const equipped = new Set(
      Object.values(state.player.equipment || {}).filter(Boolean),
    );
    return EQUIPMENT_SETS.map((set) => {
      const count = set.items.filter((id) => equipped.has(id)).length;
      const activeBonuses = set.bonuses.filter((bonus) => count >= bonus.count);
      return { ...set, count, activeBonuses };
    }).filter((set) => set.count > 0);
  }

  function activeSetBonuses() {
    return activeEquipmentSets().flatMap((set) =>
      set.activeBonuses.map((bonus) => ({ ...bonus, set })),
    );
  }

  function setBonus(field) {
    return activeSetBonuses().reduce(
      (sum, bonus) => sum + (bonus.stats?.[field] || 0),
      0,
    );
  }

  function gearSetForItem(id) {
    return EQUIPMENT_SETS.find((set) => set.items.includes(id)) || null;
  }

  function setBonusSummaryHtml() {
    const sets = activeEquipmentSets().filter((set) => set.count >= 2);
    if (!sets.length)
      return '<p class="rpg-muted">장비 세트 효과: 같은 계열 장비 2개 이상을 착용하면 활성화됩니다.</p>';
    return `<div class="lines">${sets
      .map((set) => {
        const bonuses = set.activeBonuses
          .map((bonus) => `${bonus.count}세트: ${bonus.text}`)
          .join(" / ");
        return `<p><strong style="color:${set.color}">${escapeHtml(set.name)} ${set.count}개</strong><br>${escapeHtml(bonuses)}</p>`;
      })
      .join("")}</div>`;
  }

  function gearTypeLabel(type) {
    return { weapon: "무기", armor: "방어구", charm: "부적" }[type] || type;
  }

  function gearName(id) {
    return id && ITEMS[id] ? ITEMS[id].name : "미지정";
  }

  function gearScore(id) {
    const item = ITEMS[id];
    if (!isGearItem(item)) return 0;
    const rarityBase = { common: 0, rare: 8, epic: 20, legend: 38 }[
      item.rarity || "common"
    ];
    const weights = {
      atk: 2.4,
      def: 2.2,
      str: 5,
      vit: 4.8,
      wis: 4.6,
      agi: 4.6,
      basicDamage: 125,
      skillDamage: 125,
      damageReduce: 150,
      healingPower: 95,
      mpRegen: 10,
      dropChance: 210,
      xpGain: 52,
      goldGain: 52,
      skillCost: 7,
      skillCd: 16,
    };
    const statScore = Object.entries(weights).reduce(
      (sum, [field, weight]) =>
        sum +
        ((Number(item[field]) || 0) +
          enhancementBonus(id, field) +
          gearMasteryBonus(id, field)) *
          weight,
      0,
    );
    const set = gearSetForItem(id) ? 5 : 0;
    return Math.round((rarityBase + statScore + set) * 10) / 10;
  }

  function gearComparison(id) {
    const item = ITEMS[id];
    if (!isGearItem(item)) return null;
    const currentId = state.player.equipment?.[item.type] || "";
    const score = gearScore(id);
    const currentScore = currentId ? gearScore(currentId) : 0;
    return {
      id,
      item,
      type: item.type,
      score,
      currentId,
      currentScore,
      delta: Math.round((score - currentScore) * 10) / 10,
    };
  }

  function gearComparisonText(id) {
    const comparison = gearComparison(id);
    if (!comparison) return "";
    const slot = gearTypeLabel(comparison.type);
    if (comparison.currentId === id)
      return `장비 평가 ${comparison.score} · ${slot} 현재 착용 중`;
    if (!comparison.currentId)
      return `장비 평가 ${comparison.score} · ${slot} 빈 슬롯 대비 추천`;
    const sign = comparison.delta > 0 ? "+" : "";
    const label =
      comparison.delta > 6
        ? "추천"
        : comparison.delta > 0
          ? "소폭 상승"
          : comparison.delta === 0
            ? "동급"
            : "현재 착용 장비가 우세";
    return `장비 평가 ${comparison.score} · ${slot} 착용 대비 ${sign}${comparison.delta} (${label})`;
  }

  function bestGearUpgradeCandidates(limit = 3) {
    return Object.entries(state.player.inventory || {})
      .filter(([id, count]) => count > 0 && isGearItem(ITEMS[id]))
      .map(([id]) => gearComparison(id))
      .filter(
        (comparison) =>
          comparison &&
          comparison.currentId !== comparison.id &&
          comparison.delta > 6,
      )
      .sort((a, b) => b.delta - a.delta || b.score - a.score)
      .slice(0, limit);
  }

  function gearLoadoutSummaryHtml() {
    return `<div class="item-grid">${gearLoadouts()
      .map((entry, index) => {
        const spec = GEAR_LOADOUT_SLOTS[index] || {};
        const equipment = cleanGearEquipment(entry.equipment || {});
        const ids = Object.values(equipment).filter(Boolean);
        const missing = ids.filter((id) => !gearItemAvailable(id));
        const summary = Object.entries(equipment)
          .map(([type, id]) => {
            const missingText =
              id && !gearItemAvailable(id) ? " (가방 없음)" : "";
            return `${gearTypeLabel(type)}: ${gearName(id)}${missingText}`;
          })
          .join("<br>");
        return `<div class="item-card">
          <strong>${escapeHtml(entry.name || spec.name || "프리셋")}</strong>
          <span>${escapeHtml(spec.desc || "현재 장비 구성을 저장합니다.")}</span>
          <span class="rpg-muted">${summary}</span>
          <button type="button" data-loadout-apply="${index}" ${ids.length && !missing.length ? "" : "disabled"}>착용</button>
          <button type="button" data-loadout-save="${index}">현재 장비 저장</button>
          <button type="button" data-loadout-clear="${index}" ${ids.length ? "" : "disabled"}>비우기</button>
        </div>`;
      })
      .join("")}</div>`;
  }

  function gearCollectionStatsText() {
    return [
      "atk",
      "def",
      "str",
      "vit",
      "wis",
      "agi",
      "xpGain",
      "goldGain",
      "dropChance",
      "skillDamage",
      "basicDamage",
    ]
      .map((field) => {
        const value = gearCollectionBonus(field);
        return value ? statLabel(field, value) : "";
      })
      .filter(Boolean)
      .join(" · ");
  }

  function gearCollectionSummaryHtml() {
    const count = ownedGearCount();
    const nextTier = GEAR_COLLECTION_TIERS.find((tier) => count < tier.count);
    const activeTiers = GEAR_COLLECTION_TIERS.filter(
      (tier) => count >= tier.count,
    );
    const rarityText = `희귀 ${ownedGearRarityCount("rare")} · 영웅 ${ownedGearRarityCount("epic")} · 전설 ${ownedGearRarityCount("legend")}`;
    return `<div class="lines">
      <p><strong>장비 수집 ${count}종</strong><br>${escapeHtml(rarityText)}</p>
      <p class="rpg-muted">${gearCollectionStatsText() || "장비 6종부터 수집 보정이 열립니다."}</p>
      <p class="rpg-muted">활성 단계: ${activeTiers.length ? activeTiers.map((tier) => `${tier.count}종`).join(", ") : "없음"}${nextTier ? ` · 다음 ${nextTier.count}종: ${nextTier.text}` : " · 모든 수집 단계 활성화"}</p>
    </div>`;
  }

  function itemBonus(field) {
    const equipment = state.player.equipment || {};
    return Object.values(equipment).reduce(
      (sum, id) =>
        sum +
        (ITEMS[id]?.[field] || 0) +
        enhancementBonus(id, field) +
        gearMasteryBonus(id, field),
      0,
    );
  }

  function enhancementBonus(id, field) {
    const item = ITEMS[id];
    const level = enhancementLevel(id);
    if (!item || !level) return 0;
    if (field === "atk" && item.type === "weapon") return level * 2;
    if (field === "atk" && item.type === "charm") return level;
    if (field === "def" && item.type === "armor") return level * 2;
    if (field === "def" && item.type === "charm") return level;
    if (["str", "vit", "wis", "agi"].includes(field) && item[field])
      return Math.floor(level / 3);
    return 0;
  }

  function totalAtk() {
    return (
      state.player.atk +
      itemBonus("atk") +
      gearCollectionBonus("atk") +
      setBonus("atk") +
      runeBonus("atk") +
      buffBonus("atk") +
      companionBonus("atk") +
      npcBondBonus("atk") +
      sanctuaryBonus("atk") +
      decisionBonus("atk") +
      trialBonus("atk") +
      patrolBonus("atk") +
      armoryBonus("atk") +
      campaignBonus("atk") +
      tacticManualBonus("atk") +
      relicBonus("atk") +
      commendationBonus("atk") +
      titleBonus("atk") +
      regionBonus("atk") +
      specializationRank("blade") * 2 +
      Math.floor(statValue("str") * 1.8) +
      Math.floor(statValue("agi") * 0.6)
    );
  }

  function totalDef() {
    return (
      state.player.def +
      itemBonus("def") +
      gearCollectionBonus("def") +
      setBonus("def") +
      runeBonus("def") +
      buffBonus("def") +
      companionBonus("def") +
      npcBondBonus("def") +
      sanctuaryBonus("def") +
      decisionBonus("def") +
      trialBonus("def") +
      patrolBonus("def") +
      armoryBonus("def") +
      campaignBonus("def") +
      tacticManualBonus("def") +
      relicBonus("def") +
      commendationBonus("def") +
      titleBonus("def") +
      regionBonus("def") +
      specializationRank("ward") * 2 +
      Math.floor(statValue("vit") * 1.4)
    );
  }

  function rarityInfo(item) {
    return RARITY[item?.rarity || "common"] || RARITY.common;
  }

  function itemStatsText(item = {}, id = "") {
    const level = id ? enhancementLevel(id) : 0;
    const enhanced = (field) => enhancementBonus(id, field);
    const mastered = (field) => gearMasteryBonus(id, field);
    const text = [
      level ? `강화 +${level}` : "",
      gearMasteryText(id),
      item.atk || enhanced("atk")
        ? `공격 +${(item.atk || 0) + enhanced("atk") + mastered("atk")}`
        : mastered("atk")
          ? `공격 +${mastered("atk")}`
          : "",
      item.def || enhanced("def")
        ? `방어 +${(item.def || 0) + enhanced("def") + mastered("def")}`
        : mastered("def")
          ? `방어 +${mastered("def")}`
          : "",
      item.str || enhanced("str")
        ? `힘 +${(item.str || 0) + enhanced("str") + mastered("str")}`
        : "",
      item.vit || enhanced("vit")
        ? `체력 +${(item.vit || 0) + enhanced("vit") + mastered("vit")}`
        : "",
      item.wis || enhanced("wis")
        ? `지혜 +${(item.wis || 0) + enhanced("wis") + mastered("wis")}`
        : "",
      item.agi || enhanced("agi")
        ? `민첩 +${(item.agi || 0) + enhanced("agi") + mastered("agi")}`
        : "",
      item.heal ? `HP +${item.heal}` : "",
      item.mana ? `MP +${item.mana}` : "",
      item.buff
        ? `${formatTime(item.buff.duration || 0)} 효과: ${buffStatsText(item.buff.stats)}`
        : "",
      ...(item.type === "rune"
        ? []
        : [
            "xpGain",
            "goldGain",
            "dropChance",
            "damageReduce",
            "mpRegen",
            "healingPower",
            "skillDamage",
            "basicDamage",
            "skillCost",
            "skillCd",
          ]
            .map((field) => (item[field] ? statLabel(field, item[field]) : ""))
            .filter(Boolean)),
      item.type === "rune" ? runeEffectText(id) : "",
      gearSetForItem(id) ? `세트: ${gearSetForItem(id).name}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    if (text) return text;
    if (item.type === "material") return "강화 재료";
    if (
      item.type === "potion" ||
      item.type === "mana" ||
      item.type === "buff" ||
      item.type === "food"
    )
      return "소모품";
    return "";
  }

  function rewardText(reward = {}) {
    return [
      reward.xp ? `경험치 ${reward.xp}` : "",
      reward.gold ? `골드 ${reward.gold}` : "",
      reward.item
        ? `${ITEMS[reward.item]?.name || reward.item}${reward.itemCount ? ` x${reward.itemCount}` : ""}`
        : "",
      reward.renown ? `명성 ${reward.renown}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function quickGuideItemHtml(item) {
    const action = item.action
      ? `<button type="button" data-quick-action="${escapeHtml(item.action)}">${escapeHtml(item.actionLabel || "열기")}</button>`
      : "";
    return `<div class="rpg-focus-item ${item.ready ? "is-ready" : ""}" style="--focus-color:${item.color || "#48a5ff"}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.text)}</span>
      ${action}
    </div>`;
  }

  function interactionLabel(target) {
    if (!target) return "";
    if (target.type === "npc") return `${target.npc.name} 대화`;
    if (target.type === "expeditionNode")
      return target.node.label || target.node.title || "균열 노드";
    if (target.type === "secret")
      return target.secret.title || target.secret.label || "지역 탐색";
    if (target.type === "treasure")
      return target.site.title || target.site.label || "보물 발굴";
    if (target.type === "camp")
      return target.camp.title || target.camp.label || "야영지";
    if (target.type === "memory")
      return target.memory.title || target.memory.label || "기억 조각";
    if (target.type === "forage")
      return target.node.title || target.node.label || "채집";
    if (target.type === "relic")
      return target.relic.name || target.relic.title || "복원 유물";
    if (target.type === "worldEvent")
      return worldEventMeta(target.event.kind).label || "돌발 사건";
    if (target.type === "portal")
      return `${zoneMap[target.portal.to]?.name || "다음 지역"} 이동`;
    return "상호작용";
  }

  function quickGuidePrepItems(context, player, hpRate) {
    const items = [];
    const seriousCombat = Boolean(
      context.echoTrial ||
        context.namedHunt ||
        context.expedition ||
        context.quest?.type === "boss",
    );
    const statPoints = Math.max(0, Math.floor(Number(player.statPoints) || 0));
    const skillPoints = Math.max(
      0,
      Math.floor(Number(player.skillPoints) || 0),
    );
    if (statPoints || skillPoints) {
      items.push({
        title: "성장 가능",
        text: `성장 ${statPoints}P · 서약 ${skillPoints}P를 아직 투자하지 않았습니다.`,
        color: "#f8f871",
        ready: true,
        action: "stats",
        actionLabel: "성장",
      });
    }

    const slotLabels = { weapon: "무기", armor: "방어구", charm: "부적" };
    const missingSlots = Object.keys(slotLabels).filter(
      (slot) => !isGearItem(ITEMS[player.equipment?.[slot]]),
    );
    if (missingSlots.length) {
      items.push({
        title: "장비 슬롯 확인",
        text: `${missingSlots.map((slot) => slotLabels[slot]).join(", ")} 슬롯이 비어 있습니다. 상점 장비나 드롭 장비를 착용하세요.`,
        color: "#ffba5a",
        ready: true,
        action: "bag",
        actionLabel: "가방",
      });
    }
    const upgrade = bestGearUpgradeCandidates(1)[0];
    if (upgrade) {
      items.push({
        title: "장비 추천",
        text: `${gearName(upgrade.id)}이 현재 ${gearTypeLabel(upgrade.type)}보다 평가 ${upgrade.delta > 0 ? "+" : ""}${upgrade.delta} 높습니다.`,
        color: rarityInfo(upgrade.item).color,
        ready: true,
        action: "bag",
        actionLabel: "가방",
      });
    }
    const ownedGear = new Set(gearCollectionIds());
    const missingMonsterGear = regionMonsterGearIds(state.zone).filter(
      (id) => !ownedGear.has(id),
    );
    if (missingMonsterGear.length && state.questIndex >= 4) {
      items.push({
        title: "고유 장비 추적",
        text: `${currentZone().name}에서 ${gearName(missingMonsterGear[0])}${missingMonsterGear.length > 1 ? ` 외 ${missingMonsterGear.length - 1}종` : ""}을 아직 얻지 못했습니다. 도감에서 드롭 몬스터와 기대 확률을 확인하세요.`,
        color: "#d08cff",
        action: "bestiary",
        actionLabel: "도감",
      });
    }

    const runes = equippedRuneIds();
    const openRuneSlots = runeSlotCount() - runes.length;
    if (openRuneSlots > 0 && ownedRuneCount() > runes.length) {
      items.push({
        title: "각인 슬롯 여유",
        text: `비어 있는 각인 슬롯 ${openRuneSlots}개가 있습니다. 보유 각인을 장착해 빌드를 보완하세요.`,
        color: "#d08cff",
        ready: true,
        action: "runes",
        actionLabel: "각인",
      });
    }

    const potionCount = Math.max(
      0,
      Math.floor(Number(player.inventory?.smallPotion) || 0),
    );
    if (potionCount < 3 && (seriousCombat || hpRate < 0.65)) {
      items.push({
        title: "회복약 보급",
        text: `회복약 ${potionCount}개 보유 중입니다. 보스전이나 균열 전에는 여유분을 준비하세요.`,
        color: "#ff8f6b",
        ready: potionCount <= 0,
        action: "shop",
        actionLabel: "상점",
      });
    }

    const hasBuff = activeBuffs().length > 0;
    const hasBuffItem = Object.entries(player.inventory || {}).some(
      ([id, count]) => count > 0 && ["buff", "food"].includes(ITEMS[id]?.type),
    );
    if (seriousCombat && !hasBuff) {
      items.push({
        title: "전투 음식 없음",
        text: hasBuffItem
          ? "음식/영약 효과가 없습니다. 가방에서 버프 소모품을 사용하면 보스 준비가 안정됩니다."
          : "음식/영약 효과가 없습니다. 연금과 야영식으로 공격, 방어, 드롭 보정을 준비하세요.",
        color: "#53e2a8",
        ready: true,
        action: hasBuffItem ? "bag" : "alchemy",
        actionLabel: hasBuffItem ? "가방" : "연금",
      });
    }

    if (!context.huntPlan && !seriousCombat && state.questIndex >= 8) {
      items.push({
        title: "사냥 계획 없음",
        text: "도감 연구, 고유 장비 파밍, 지역 안정화 중 하나를 선택하면 사냥 보상이 방향성을 가집니다.",
        color: "#48a5ff",
        action: "hunt",
        actionLabel: "계획",
      });
    }

    return items;
  }

  function renderQuickGuide(context = {}) {
    const player = state.player;
    const hpRate = player.maxHp ? player.hp / player.maxHp : 1;
    const hasPotion = (player.inventory?.smallPotion || 0) > 0;
    const focusItems = [];
    let primary = "";
    if (context.interaction) {
      const label = interactionLabel(context.interaction);
      primary = `Space/E · ${label}`;
      focusItems.push({
        title: "상호작용 가능",
        text: `${label} 위치입니다. Space 또는 E로 진행하세요.`,
        color: "#53e2a8",
        ready: true,
        action: "interact",
        actionLabel: "진행",
      });
    }
    if (!primary && context.echoTrial) {
      primary = `${context.echoTrial.title} 진행 중`;
      focusItems.push({
        title: "회상전 목표",
        text: `${ENEMIES[context.echoTrial.boss]?.name || context.echoTrial.boss} 수호자를 쓰러뜨리세요.`,
        color: context.echoTrial.color,
        action: "echo",
        actionLabel: "회상전",
      });
    }
    if (!primary && context.namedHunt) {
      primary = `${namedHuntDisplayName(context.namedHunt)} 토벌`;
      focusItems.push({
        title: "네임드 강적",
        text: "전용 보스가 등장했습니다. 음식, 각인, 동료 보정을 확인하세요.",
        color: context.namedHunt.color,
        action: "named",
        actionLabel: "강적",
      });
    }
    if (!primary && context.quest) {
      primary = context.quest.title;
      focusItems.push({
        title: "메인 목표",
        text: questObjectiveText(context.quest),
        color: currentZone().accent,
        action:
          context.quest.zone && context.quest.zone !== state.zone
            ? "travelQuest"
            : "quest",
        actionLabel:
          context.quest.zone && context.quest.zone !== state.zone
            ? "지역 이동"
            : "퀘스트",
      });
    }
    if (hpRate < 0.35) {
      focusItems.push({
        title: "체력 낮음",
        text: hasPotion
          ? "회복약을 바로 사용하거나 수호 결계, 회피 대시로 먼저 생존을 확보하세요."
          : "회복약이 없습니다. 가방/상점 보급을 확인하고 수호 결계, 회피 대시로 거리를 벌리세요.",
        color: "#ff5f6d",
        ready: true,
        action: hasPotion ? "potion" : "bag",
        actionLabel: hasPotion ? "회복약" : "가방",
      });
    }
    if (context.event) {
      const meta = worldEventMeta(context.event.kind);
      focusItems.push({
        title: meta.title,
        text: meta.interactive
          ? "표식 위치에서 Space/E로 조사하면 보상이 들어옵니다."
          : `${ENEMIES[context.event.target]?.name || context.event.target} ${context.event.progress || 0}/${context.event.required}`,
        color: meta.color,
        ready: meta.interactive,
        action: meta.interactive ? "interact" : "quest",
        actionLabel: meta.interactive ? "조사" : "목표",
      });
    }
    if (context.huntPlan) {
      focusItems.push({
        title: "사냥 계획",
        text: `${context.huntPlan.enemy.name} ${context.huntPlan.progress}/${context.huntPlan.required} · ${context.huntPlan.type.label}`,
        color: context.huntPlan.type.color,
        action: "hunt",
        actionLabel: "계획",
      });
    }
    quickGuidePrepItems(context, player, hpRate).forEach((item) =>
      focusItems.push(item),
    );
    [
      context.localPatrol && {
        title: "보고 가능",
        text: `${context.localPatrol.title} · 순찰 메뉴에서 보상`,
        color: context.localPatrol.color,
        action: "patrol",
        actionLabel: "순찰",
      },
      context.localArmory && {
        title: "등록 가능",
        text: `${context.localArmory.title} · 장비록 메뉴에서 등록`,
        color: context.localArmory.color,
        action: "armory",
        actionLabel: "장비록",
      },
      context.localTactic && {
        title: "정리 가능",
        text: `${context.localTactic.title} · 전술 메뉴에서 교범 정리`,
        color: context.localTactic.color,
        action: "tactics",
        actionLabel: "전술",
      },
      context.localCampaign && {
        title: "완료 가능",
        text: `${context.localCampaign.title} · 원정 메뉴에서 완료`,
        color: context.localCampaign.color,
        action: "campaign",
        actionLabel: "원정",
      },
      context.localCommendation?.ready && {
        title: "감사장 준비",
        text: `${context.localCommendation.entry.title} · 서고에서 수령`,
        color: context.localCommendation.entry.color,
        action: "journal",
        actionLabel: "서고",
      },
    ]
      .filter(Boolean)
      .forEach((item) => focusItems.push({ ...item, ready: true }));
    if (!primary) primary = "서고에서 다음 장기 목표를 확인하세요.";
    const uniqueItems = focusItems
      .filter(
        (item, index, array) =>
          array.findIndex(
            (candidate) =>
              candidate.title === item.title && candidate.text === item.text,
          ) === index,
      )
      .slice(0, 4);
    ui.quickGuide.innerHTML = `
      <div class="rpg-focus-head">
        <div>
          <span>다음 행동</span>
          <strong>${escapeHtml(primary)}</strong>
        </div>
        <span>${escapeHtml(currentZone().name)}</span>
      </div>
      <div class="rpg-focus-list">
        ${uniqueItems.length ? uniqueItems.map(quickGuideItemHtml).join("") : quickGuideItemHtml({ title: "자유 탐색", text: "메인 퀘스트, 의뢰, 전술 교범, 보물지도 중 하나를 골라 진행하세요.", color: currentZone().accent })}
      </div>`;
  }

  function totalGearCatalogCount() {
    return Object.values(ITEMS).filter((item) => isGearItem(item)).length;
  }

  function zoneProgressMetrics(zoneId = state.zone) {
    const byZoneCount = (list) =>
      list.filter((entry) => entry.zone === zoneId).length;
    return [
      {
        label: "안정도",
        current: Math.floor(regionStabilityValue(zoneId)),
        total: 100,
      },
      {
        label: "기억",
        current: zoneMemoryCount(zoneId),
        total: byZoneCount(MEMORY_FRAGMENTS),
      },
      {
        label: "연대기",
        current: zoneChronicleCount(zoneId),
        total: byZoneCount(REGIONAL_CHRONICLES),
      },
      {
        label: "유물",
        current: zoneRelicRestoredCount(zoneId),
        total: byZoneCount(REGION_RELICS),
      },
      {
        label: "외전",
        current: zoneSideStoryClaimedCount(zoneId),
        total: byZoneCount(SIDE_STORIES),
      },
      {
        label: "시험",
        current: claimedRegionTrialCount(zoneId),
        total: byZoneCount(REGION_TRIALS),
      },
      {
        label: "탐색",
        current: zoneSecretDiscoveryCount(zoneId),
        total: byZoneCount(REGION_SECRETS),
      },
      {
        label: "보물",
        current: claimedTreasureCount(zoneId),
        total: byZoneCount(REGION_TREASURE_SITES),
      },
      {
        label: "강적",
        current: claimedNamedHuntCount(zoneId),
        total: byZoneCount(REGIONAL_NAMED_HUNTS),
      },
      {
        label: "야영",
        current: claimedCampsiteCount(zoneId),
        total: byZoneCount(REGIONAL_CAMPSITES),
      },
      {
        label: "순찰",
        current: claimedPatrolOperationCount(zoneId),
        total: byZoneCount(REGIONAL_PATROL_OPERATIONS),
      },
      {
        label: "장비록",
        current: claimedArmoryRecordCount(zoneId),
        total: byZoneCount(REGIONAL_ARMORY_RECORDS),
      },
      {
        label: "전술",
        current: claimedTacticManualCount(zoneId),
        total: byZoneCount(TACTIC_MANUALS),
      },
      {
        label: "원정",
        current: claimedCampaignCount(zoneId),
        total: byZoneCount(OATH_CAMPAIGNS),
      },
      {
        label: "감사장",
        current: claimedCommendationCount(zoneId),
        total: byZoneCount(REGION_COMMENDATIONS),
      },
    ].filter((metric) => metric.total > 0);
  }

  function averageProgressPercent(metrics) {
    if (!metrics.length) return 0;
    const total = metrics.reduce(
      (sum, metric) =>
        sum + clamp((metric.current / metric.total) * 100, 0, 100),
      0,
    );
    return Math.round(total / metrics.length);
  }

  function incompleteMetricText(metrics, limit = 3) {
    const missing = metrics
      .filter((metric) => metric.current < metric.total)
      .slice(0, limit)
      .map(
        (metric) =>
          `${metric.label} ${Math.min(metric.current, metric.total)}/${metric.total}`,
      );
    return missing.length ? `다음: ${missing.join(" · ")}` : "현재 항목 완료";
  }

  function journeyProgressRows(context = {}) {
    const quest = context.quest || currentQuest();
    const completedQuests = clamp(state.questIndex, 0, QUESTS.length);
    const storyPercent = Math.round((completedQuests / QUESTS.length) * 100);
    const zoneMetrics = zoneProgressMetrics(state.zone);
    const zonePercent = averageProgressPercent(zoneMetrics);
    const gearTotal = Math.max(1, totalGearCatalogCount());
    const gearOwned = ownedGearCount();
    const recordCurrent =
      claimedActMasteryCount() +
      clearedEchoTrialCount() +
      claimedArmoryRecordCount() +
      claimedTacticManualCount() +
      claimedCampaignCount() +
      claimedCommendationCount() +
      claimedSideStoryCount() +
      restoredRelicCount() +
      claimedChronicleCount();
    const recordTotal =
      ACTS.length * ACT_MASTERY_STAGES.length +
      ECHO_TRIALS.length +
      REGIONAL_ARMORY_RECORDS.length +
      TACTIC_MANUALS.length +
      OATH_CAMPAIGNS.length +
      REGION_COMMENDATIONS.length +
      SIDE_STORIES.length +
      REGION_RELICS.length +
      REGIONAL_CHRONICLES.length;
    return [
      {
        title: "메인 서사",
        text: quest
          ? `${quest.act}장 · ${questObjectiveText(quest)}`
          : "모든 메인 장 완료",
        value: `${completedQuests}/${QUESTS.length}`,
        percent: storyPercent,
        color: currentZone().accent,
        action: "quest",
        actionLabel: "퀘스트",
      },
      {
        title: "최종 장 조건",
        text: `30시간 장기 플레이 기록 · 현재 ${formatTime(state.playSeconds)}`,
        value: `${Math.min(100, Math.round((state.playSeconds / MIN_FINAL_PLAY_SECONDS) * 100))}%`,
        percent: (state.playSeconds / MIN_FINAL_PLAY_SECONDS) * 100,
        color: "#f8f871",
        action: "journal",
        actionLabel: "서고",
      },
      {
        title: `${currentZone().name} 지역 기록`,
        text: incompleteMetricText(zoneMetrics),
        value: `${zonePercent}%`,
        percent: zonePercent,
        color: "#53e2a8",
        action: "chronicles",
        actionLabel: "연대기",
      },
      {
        title: "장비 수집",
        text: `희귀 ${ownedGearRarityCount("rare")} · 영웅 ${ownedGearRarityCount("epic")} · 전설 ${ownedGearRarityCount("legend")}`,
        value: `${gearOwned}/${gearTotal}`,
        percent: (gearOwned / gearTotal) * 100,
        color: "#d08cff",
        action: "bag",
        actionLabel: "가방",
      },
      {
        title: "장기 기록",
        text: "장 완성, 회상전, 장비록, 전술, 원정, 감사장, 외전, 유물, 연대기",
        value: `${recordCurrent}/${recordTotal}`,
        percent: (recordCurrent / Math.max(1, recordTotal)) * 100,
        color: "#48a5ff",
        action: "journal",
        actionLabel: "서고",
      },
    ];
  }

  function journeyProgressRowHtml(row) {
    const percent = clamp(row.percent || 0, 0, 100);
    const action = row.action
      ? `<button type="button" data-quick-action="${escapeHtml(row.action)}">${escapeHtml(row.actionLabel || "열기")}</button>`
      : "";
    return `<div class="rpg-journey-row" style="--journey-color:${row.color || "#48a5ff"};--journey-progress:${percent}%">
      <div>
        <strong>${escapeHtml(row.title)}</strong>
        <small>${escapeHtml(row.text)}</small>
      </div>
      <em>${escapeHtml(row.value)}</em>
      ${action}
      <div class="rpg-journey-bar"><span></span></div>
    </div>`;
  }

  function renderJourneySummary(context = {}) {
    const rows = journeyProgressRows(context);
    ui.journey.innerHTML = `
      <div class="rpg-journey-head">
        <strong>여정 현황</strong>
        <span>${escapeHtml(formatTime(state.playSeconds))}</span>
      </div>
      ${rows.map(journeyProgressRowHtml).join("")}`;
  }

  function runQuickGuideAction(action) {
    const quest = currentQuest();
    const handlers = {
      interact: () => interact(),
      potion: () => useItem("smallPotion"),
      bag: () => openInventory(),
      stats: () => openStats(),
      runes: () => openRunes(),
      alchemy: () => openAlchemy(),
      shop: () =>
        openShop(
          (currentZone().npc || []).find((npc) => npc.shop) || {
            name: "보급 상점",
            shop: "apothecary",
          },
        ),
      quest: () => openQuestLog(),
      travelQuest: () => openTravel(quest?.zone || ""),
      echo: () => openEchoTrials(),
      named: () => openNamedHunts(),
      hunt: () => openHuntPlans(),
      bestiary: () => openBestiary(),
      patrol: () => openPatrols(),
      armory: () => openArmory(),
      tactics: () => openTactics(),
      campaign: () => openCampaigns(),
      chronicles: () => openChronicles(),
      relics: () => openRelics(),
      journal: () => openJournal(),
    };
    const handler = handlers[action] || handlers.journal;
    handler();
  }

  function renderHud() {
    const player = state.player;
    const quest = currentQuest();
    ui.location.textContent = `${currentZone().name} · ${currentZone().subtitle}`;
    ui.heroName.textContent = `${player.name} Lv.${player.level}`;
    ui.hp.style.width = `${clamp((player.hp / player.maxHp) * 100, 0, 100)}%`;
    ui.mp.style.width = `${clamp((player.mp / player.maxMp) * 100, 0, 100)}%`;
    ui.xp.style.width = `${clamp((player.xp / xpForLevel(player.level)) * 100, 0, 100)}%`;
    ui.oathArts.innerHTML = OATH_ARTS.map((art) => {
      const locked = !oathArtUnlocked(art);
      const cooldown = oathCooldownValue(art.id);
      const cost = oathArtCost(art);
      const disabled = locked || cooldown > 0 || player.mp < cost;
      const stateText = locked
        ? `Lv.${art.unlock}`
        : cooldown > 0
          ? `${cooldown.toFixed(1)}초`
          : `${cost}MP`;
      return `<button type="button" data-oath-art="${art.id}" style="border-color:${art.color}88" title="${escapeHtml(art.desc)}" ${disabled ? "disabled" : ""}>${art.key} ${escapeHtml(art.name)}<br><small>${stateText}</small></button>`;
    }).join("");
    const activeContract = REGIONAL_CONTRACTS[state.zone];
    const contractProgress = activeContract
      ? state.contracts[state.zone]
      : null;
    const bounty = bountyEntry(state.zone);
    const bountyRequired = bountyRequirement(state.zone);
    const huntPlan = activeHuntPlan();
    const namedHunt = activeNamedHunt();
    const expedition = activeExpedition();
    const echoTrial = activeEchoTrial();
    const stability = regionStabilityValue(state.zone);
    const companion = activeCompanion();
    const equippedTitle = titleSpec();
    const runes = equippedRuneIds();
    const chronicleCount = claimedChronicleCount();
    const relicCount = restoredRelicCount();
    const commendationCount = claimedCommendationCount();
    const discoveryCount = discoveredSecretCount();
    const treasureCount = claimedTreasureCount();
    const namedCount = claimedNamedHuntCount();
    const campCount = claimedCampsiteCount();
    const patrolCount = claimedPatrolOperationCount();
    const armoryCount = claimedArmoryRecordCount();
    const campaignCount = claimedCampaignCount();
    const tacticCount = claimedTacticManualCount();
    const echoTrialCount = clearedEchoTrialCount();
    const actMasteryCount = claimedActMasteryCount();
    const sideStoryCount = claimedSideStoryCount();
    const craftCount = craftedRecipeCount();
    const bondLevel = totalNpcBondLevel();
    const knownBestiary = Object.values(state.bestiary || {}).reduce(
      (sum, entry) => sum + (entry.kills || 0),
      0,
    );
    const eliteKills = totalEliteKills();
    const forageCount = totalForageHarvests();
    const alchemyCount = totalAlchemyBrews();
    const buffs = activeBuffs();
    ui.stats.innerHTML = `
      <span>HP<br><strong>${Math.round(player.hp)}/${player.maxHp}</strong></span>
      <span>MP<br><strong>${Math.round(player.mp)}/${player.maxMp}</strong></span>
      <span>골드<br><strong>${player.gold}G</strong></span>
      <span>공격<br><strong>${totalAtk()}</strong></span>
      <span>방어<br><strong>${totalDef()}</strong></span>
      <span>연격<br><strong>${player.combo || 0}</strong></span>
      <span>성장<br><strong>${player.statPoints || 0}P</strong></span>
      <span>서약기<br><strong>Lv.${player.skillRank || 0}</strong></span>
      <span>전문화<br><strong>검${specializationRank("blade")} 수${specializationRank("ward")} 약${specializationRank("surge")}</strong></span>
      <span>던전<br><strong>${expedition ? `${expedition.floor}/${expedition.maxFloor}층` : "-"}</strong></span>
      <span>회상전<br><strong>${echoTrial ? echoTrial.tierName : `${echoTrialCount}/${ECHO_TRIALS.length}`}</strong></span>
      <span>의뢰<br><strong>${contractProgress ? `${Math.min(contractRequirement(state.zone), contractProgress.progress || 0)}/${contractRequirement(state.zone)}` : "-"}</strong></span>
      <span>수배<br><strong>${bounty ? `${Math.min(bountyRequired, bounty.progress || 0)}/${bountyRequired}` : "-"}</strong></span>
      <span>장비록<br><strong>${armoryCount}/${REGIONAL_ARMORY_RECORDS.length}</strong></span>
      <span>전술<br><strong>${tacticCount}/${TACTIC_MANUALS.length}</strong></span>
      <span>원정<br><strong>${campaignCount}/${OATH_CAMPAIGNS.length}</strong></span>
      <span>계획<br><strong>${huntPlan ? `${huntPlan.progress}/${huntPlan.required}` : "-"}</strong></span>
      <span>강적<br><strong>${namedHunt ? "진행" : `${namedCount}/${REGIONAL_NAMED_HUNTS.length}`}</strong></span>
      <span>야영<br><strong>${campCount}/${REGIONAL_CAMPSITES.length}</strong></span>
      <span>순찰<br><strong>${patrolCount}/${REGIONAL_PATROL_OPERATIONS.length}</strong></span>
      <span>채집<br><strong>${forageCount}</strong></span>
      <span>연금<br><strong>${alchemyCount}</strong></span>
      <span>동료<br><strong>${companion ? `${companion.spec.name} ${companion.entry.level}` : "-"}</strong></span>
      <span>인연<br><strong>${bondLevel}/${NPC_BONDS.length * 5}</strong></span>
      <span>성소<br><strong>${sanctuaryTotalLevel()}/24</strong></span>
      <span>공방<br><strong>${craftCount}/${CRAFTING_RECIPES.length}</strong></span>
      <span>각인<br><strong>${runes.length}/${runeSlotCount()}</strong></span>
      <span>연대기<br><strong>${chronicleCount}/${REGIONAL_CHRONICLES.length}</strong></span>
      <span>유물<br><strong>${relicCount}/${REGION_RELICS.length}</strong></span>
      <span>감사장<br><strong>${commendationCount}/${REGION_COMMENDATIONS.length}</strong></span>
      <span>장완성<br><strong>${actMasteryCount}/${ACTS.length * ACT_MASTERY_STAGES.length}</strong></span>
      <span>탐색<br><strong>${discoveryCount}/${REGION_SECRETS.length}</strong></span>
      <span>보물<br><strong>${treasureCount}/${REGION_TREASURE_SITES.length}</strong></span>
      <span>외전<br><strong>${sideStoryCount}/${SIDE_STORIES.length}</strong></span>
      <span>칭호<br><strong>${equippedTitle ? equippedTitle.name : "-"}</strong></span>
      <span>기억<br><strong>${collectedMemoryCount()}/${MEMORY_FRAGMENTS.length}</strong></span>
      <span>도감<br><strong>${knownBestiary}</strong></span>
      <span>정예<br><strong>${eliteKills}</strong></span>
      <span>안정<br><strong>${Math.floor(stability)}</strong></span>
      <span>기록<br><strong>${formatTime(state.playSeconds)}</strong></span>`;
    ui.quest.innerHTML = quest
      ? `<h2>${quest.title}</h2><p>${questObjectiveText(quest)}</p><p class="rpg-muted">${quest.reason || quest.intro[0]}</p><p class="rpg-muted">보상: ${rewardText(quest.reward)}</p>`
      : "<h2>완료</h2><p>모든 장을 완료했습니다.</p>";
    if (echoTrial) {
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${echoTrial.color}">서약 회상전</strong><br>${escapeHtml(echoTrial.title)} · ${escapeHtml(ENEMIES[echoTrial.boss]?.name || echoTrial.boss)} 수호자 처치</p>`;
    }
    const event = activeWorldEvent();
    if (event && !activeNamedHunt()) {
      const meta = worldEventMeta(event.kind);
      const eventText = meta.interactive
        ? "표식 위치에서 Space/E로 조사"
        : `${ENEMIES[event.target]?.name || event.target} ${event.progress || 0}/${event.required}`;
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${meta.color}">${meta.title}</strong><br>${eventText} · 남은 시간 ${Math.ceil((event.ttl || 0) / 60)}분</p>`;
    }
    if (bounty?.target && (bounty.progress || 0) < bountyRequired) {
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:#ffba5a">현상수배</strong><br>${ENEMIES[bounty.target]?.name || bounty.target} ${Math.min(bountyRequired, bounty.progress || 0)}/${bountyRequired}</p>`;
    }
    if (huntPlan) {
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${huntPlan.type.color}">사냥 계획</strong><br>${huntPlan.enemy.name} ${huntPlan.progress}/${huntPlan.required} · ${huntPlan.type.label}</p>`;
    }
    if (namedHunt) {
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${namedHunt.color}">네임드 강적</strong><br>${escapeHtml(namedHuntDisplayName(namedHunt))} 토벌 진행 중</p>`;
    }
    const localSideStory = SIDE_STORIES.find((story) => {
      if (story.zone !== state.zone || sideStoryClaimedIds().includes(story.id))
        return false;
      const progress = sideStoryProgress(story);
      return progress.current > 0 || progress.ready;
    });
    if (localSideStory) {
      const progress = sideStoryProgress(localSideStory);
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${localSideStory.color}">외전 기록</strong><br>${escapeHtml(localSideStory.title)} ${progress.current}/${progress.required}</p>`;
    }
    const localSecret = visibleSecretLandmarks()[0];
    if (localSecret) {
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${localSecret.color}">지역 탐색</strong><br>${escapeHtml(localSecret.title)} · 미발견 표식</p>`;
    }
    const localTreasure = visibleTreasureSites()[0];
    if (localTreasure) {
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${localTreasure.color}">보물지도</strong><br>${escapeHtml(localTreasure.title)} · Space/E 발굴</p>`;
    }
    const localCamp = visibleCampsites()[0];
    if (localCamp) {
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${localCamp.color}">지역 야영지</strong><br>${escapeHtml(localCamp.title)} · Space/E 휴식</p>`;
    }
    const localPatrol = REGIONAL_PATROL_OPERATIONS.find((operation) => {
      if (
        operation.zone !== state.zone ||
        patrolClaimedIds().includes(operation.id)
      )
        return false;
      return patrolOperationProgress(operation).ready;
    });
    if (localPatrol) {
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${localPatrol.color}">순찰 작전</strong><br>${escapeHtml(localPatrol.title)} 보고 가능</p>`;
    }
    const localArmory = REGIONAL_ARMORY_RECORDS.find((record) => {
      if (record.zone !== state.zone || armoryClaimedIds().includes(record.id))
        return false;
      return armoryRecordProgress(record).ready;
    });
    if (localArmory) {
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${localArmory.color}">지역 장비록</strong><br>${escapeHtml(localArmory.title)} 등록 가능</p>`;
    }
    const localTactic = TACTIC_MANUALS.find((manual) => {
      if (
        manual.zone !== state.zone ||
        tacticManualClaimedIds().includes(manual.id)
      )
        return false;
      return tacticManualProgress(manual).ready;
    });
    if (localTactic) {
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${localTactic.color}">전술 교범</strong><br>${escapeHtml(localTactic.title)} 정리 가능</p>`;
    }
    const localCampaign = OATH_CAMPAIGNS.find((campaign) => {
      if (
        campaign.zone !== state.zone ||
        campaignClaimedIds().includes(campaign.id)
      )
        return false;
      return campaignProgress(campaign).ready;
    });
    if (localCampaign) {
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${localCampaign.color}">서약 원정</strong><br>${escapeHtml(localCampaign.title)} 완료 가능</p>`;
    }
    const localCommendation = REGION_COMMENDATIONS.find(
      (entry) =>
        entry.zone === state.zone &&
        !commendationClaimedIds().includes(entry.id),
    );
    let localCommendationProgress = null;
    if (localCommendation) {
      const progress = commendationProgress(localCommendation);
      localCommendationProgress = progress;
      ui.quest.innerHTML += `<p class="rpg-muted"><strong style="color:${localCommendation.color}">주민 감사장</strong><br>${escapeHtml(localCommendation.title)} ${progress.current}/${progress.required}</p>`;
    }
    const hudContext = {
      quest,
      echoTrial,
      expedition,
      namedHunt,
      event,
      huntPlan,
      interaction: interactionTarget(),
      localPatrol,
      localArmory,
      localTactic,
      localCampaign,
      localCommendation: localCommendation
        ? {
            entry: localCommendation,
            ready: Boolean(localCommendationProgress?.ready),
          }
        : null,
    };
    renderQuickGuide(hudContext);
    renderJourneySummary(hudContext);
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
      .map((slot) => {
        const id = player.equipment?.[slot];
        if (!id) return "";
        const enhance = enhancementLevel(id);
        const mastery = gearMasteryLevel(id);
        return `${ITEMS[id]?.name || id}${enhance ? `+${enhance}` : ""}${mastery ? ` 숙련${mastery}` : ""}`;
      })
      .filter(Boolean)
      .join(" · ");
    if (equipped)
      ui.inventory.innerHTML += `<span class="rpg-pill">착용: ${equipped}</span>`;
    const activeSets = activeEquipmentSets().filter(
      (set) => set.activeBonuses.length,
    );
    if (activeSets.length)
      ui.inventory.innerHTML += `<span class="rpg-pill">세트: ${activeSets
        .map((set) => set.name)
        .join(", ")}</span>`;
    if (companion)
      ui.inventory.innerHTML += `<span class="rpg-pill">동료: ${companion.spec.name} Lv.${companion.entry.level}</span>`;
    if (bondLevel)
      ui.inventory.innerHTML += `<span class="rpg-pill">NPC 인연: ${bondLevel}</span>`;
    if (buffs.length)
      ui.inventory.innerHTML += `<span class="rpg-pill">연금 효과: ${buffs
        .map((buff) => `${buff.name} ${formatTime(buff.ttl)}`)
        .join(", ")}</span>`;
    if (runes.length)
      ui.inventory.innerHTML += `<span class="rpg-pill">각인: ${runes
        .map((id) => ITEMS[id]?.name || id)
        .join(", ")}</span>`;
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
    drawExpeditionNodes();
    drawMemoryFragments();
    drawForageNodes();
    drawSecretLandmarks();
    drawTreasureSites();
    drawCampsites();
    drawRestoredRelics();
    drawWorldEvent();
    drawHazards();
    drawPortals();
    drawNpcs();
    drawEnemies();
    drawCompanion();
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
    drawExpeditionRift(zone);
    drawEchoTrialRift(zone);
  }

  function drawExpeditionRift(zone) {
    const expedition = activeExpedition();
    if (!expedition || expedition.zone !== zone.id) return;
    const modifier = expeditionModifier(expedition);
    const now = performance.now() / 1000;
    ctx.save();
    ctx.globalAlpha = 0.68;
    ctx.strokeStyle = modifier?.color || zone.accent;
    ctx.fillStyle = `${modifier?.color || zone.accent}22`;
    ctx.lineWidth = 5;
    for (let i = 0; i < 7; i += 1) {
      const x = zone.w * (0.18 + ((i * 0.13) % 0.64));
      const y = zone.h * (0.22 + ((i * 0.19) % 0.56));
      const r = 42 + ((i * 17 + expedition.floor * 9) % 46);
      ctx.beginPath();
      ctx.ellipse(
        x + Math.sin(now + i) * 18,
        y + Math.cos(now * 0.8 + i) * 18,
        r,
        r * 0.42,
        now * 0.2 + i,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();
    }
    ctx.setLineDash([24, 18]);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(zone.w * 0.12, zone.h * 0.18);
    ctx.bezierCurveTo(
      zone.w * 0.36,
      zone.h * 0.12,
      zone.w * 0.55,
      zone.h * 0.84,
      zone.w * 0.88,
      zone.h * 0.58,
    );
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawEchoTrialRift(zone) {
    const trial = activeEchoTrial();
    if (!trial || trial.zone !== zone.id) return;
    const modifier = echoTrialModifier(trial);
    const now = performance.now() / 1000;
    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.strokeStyle = modifier.color;
    ctx.fillStyle = `${modifier.color}22`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i += 1) {
      const x = zone.w * (0.26 + ((i * 0.17) % 0.48));
      const y = zone.h * (0.24 + ((i * 0.23) % 0.52));
      const radius = 68 + i * 18 + Math.sin(now * 1.8 + i) * 9;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = `${modifier.color}11`;
    }
    ctx.restore();
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
      const idlePhase = performance.now() / 620 + npc.x * 0.01;
      const bob = Math.sin(idlePhase) * 2;
      drawShadow(0, 20, 28);
      ctx.translate(0, bob);
      const near = distance(state.player.x, state.player.y, npc.x, npc.y) < 96;
      const bodyColor = npc.shop ? "#ffba5a" : currentZone().accent;
      const roleColor = npcRoleColor(npc, bodyColor);
      const bondLevel = npcBondEntry(npc.id).level || 0;
      const status = npcFieldStatus(npc, near);
      if (bondLevel) {
        ctx.strokeStyle = `${bodyColor}99`;
        ctx.fillStyle = `${bodyColor}16`;
        ctx.lineWidth = 2 + Math.min(3, bondLevel);
        ctx.beginPath();
        ctx.ellipse(
          0,
          -10,
          34 + bondLevel * 3,
          18 + bondLevel,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
      }
      drawNpcFootwork(roleColor, idlePhase, near, bondLevel);
      const npcGrad = ctx.createLinearGradient(-18, -36, 18, 22);
      npcGrad.addColorStop(0, bodyColor);
      npcGrad.addColorStop(1, "rgba(17,24,39,.86)");
      ctx.fillStyle = npcGrad;
      ctx.beginPath();
      ctx.roundRect(-18, -36, 36, 58, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.34)";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.2)";
      ctx.fillRect(-14, -28, 28, 9);
      ctx.fillStyle = "#f8dcc4";
      ctx.beginPath();
      ctx.arc(0, -44, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = npc.shop ? "#7a4218" : "#263a4d";
      ctx.fillRect(-12, -56, 24, 7);
      drawNpcFace(npc, roleColor, idlePhase, near);
      ctx.fillStyle = npc.shop ? "#6b3516" : "#1d2838";
      ctx.fillRect(-20, -8, 6, 24);
      ctx.fillRect(14, -8, 6, 24);
      if (npc.shop) {
        ctx.fillStyle = "#fff7b3";
        ctx.fillRect(12, 8, 18, 14);
      }
      drawNpcOutfitDetails(npc, roleColor, bob, bondLevel);
      drawNpcAmbientGesture(npc, roleColor, idlePhase, status);
      drawNpcRoleGlyph(npc, roleColor, bondLevel);
      drawNpcInteractionCue(npc, roleColor, near, bondLevel);
      drawNpcStatusBanner(status, near, bondLevel);
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
      ctx.fillText(
        `${npc.shop ? "상점" : npc.role}${bondLevel ? ` · 인연${bondLevel}` : ""}`,
        0,
        38,
      );
      if (near) {
        ctx.fillStyle = "#fff7b3";
        ctx.font = "900 12px Malgun Gothic, sans-serif";
        ctx.fillText("Space/E", 0, 56);
      }
      ctx.restore();
    });
  }

  function npcFieldStatus(npc, near = false) {
    const quest = currentQuest();
    if (quest?.npc === npc.id) {
      const ready = questReady(quest);
      return {
        glyph: ready ? "!" : "?",
        label: ready
          ? "완료 보고"
          : quest.type === "talk"
            ? "첫 단서"
            : "의뢰인",
        color: ready ? "#f8f871" : "#48a5ff",
        important: true,
      };
    }
    const bond = npcBondSpec(npc.id);
    const entry = bond ? npcBondEntry(npc.id) : null;
    if (bond && npcBondUnlocked(bond) && entry.level < 5) {
      const cost = npcBondGiftCost(bond);
      const ready =
        state.player.gold >= cost.gold &&
        (state.player.inventory?.[cost.material] || 0) >= cost.count;
      if (ready) {
        return {
          glyph: "인",
          label: "인연 선물",
          color: "#fff7b3",
          important: true,
        };
      }
    }
    if (npc.shop) {
      return {
        glyph: "상",
        label: "상점",
        color: "#ffba5a",
        important: near,
      };
    }
    return {
      glyph: near ? "E" : "말",
      label: near ? "대화 가능" : npc.role || "주민",
      color: npcRoleColor(npc, currentZone().accent),
      important: near,
    };
  }

  function drawNpcFootwork(color, idlePhase, near, bondLevel) {
    const step = Math.sin(idlePhase * 1.4);
    ctx.save();
    ctx.strokeStyle = `${color}88`;
    ctx.fillStyle = near ? "rgba(255,247,179,.16)" : `${color}12`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 24, 28 + bondLevel * 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(17,24,39,.68)";
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.roundRect(side * 9 - 6, 15 + step * side * 1.4, 12, 13, 4);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawNpcFace(npc, color, idlePhase, near) {
    const lookAngle = Math.atan2(
      state.player.y - npc.y,
      state.player.x - npc.x,
    );
    const eyeShift = near ? clamp(Math.cos(lookAngle) * 2.2, -2.2, 2.2) : 0;
    const blink = Math.sin(idlePhase * 0.55 + npc.y * 0.01) > 0.96;
    ctx.save();
    ctx.fillStyle = "#111827";
    if (blink) {
      ctx.fillRect(-7 + eyeShift, -45, 5, 1.6);
      ctx.fillRect(4 + eyeShift, -45, 5, 1.6);
    } else {
      ctx.beginPath();
      ctx.arc(-5 + eyeShift, -45, 2, 0, Math.PI * 2);
      ctx.arc(7 + eyeShift, -45, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = `${color}cc`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(1 + eyeShift * 0.3, -39, 4, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.restore();
  }

  function drawNpcAmbientGesture(npc, color, idlePhase, status) {
    const sway = Math.sin(idlePhase * 1.2);
    ctx.save();
    ctx.strokeStyle = `${color}bb`;
    ctx.fillStyle = `${color}44`;
    ctx.lineWidth = 2;
    if (status.important) {
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, -14, 40 + Math.abs(sway) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (npc.shop) {
      ctx.fillStyle = "#fff7b3";
      ctx.beginPath();
      ctx.moveTo(-27, -26 + sway * 2);
      ctx.lineTo(-18, -32 + sway * 2);
      ctx.lineTo(-10, -26 + sway * 2);
      ctx.lineTo(-18, -20 + sway * 2);
      ctx.closePath();
      ctx.fill();
    } else if (/기록|사제|영웅|서고/.test(npc.role || "")) {
      ctx.beginPath();
      ctx.roundRect(20, -36 + sway * 2, 15, 20, 3);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.42)";
      ctx.beginPath();
      ctx.moveTo(24, -30 + sway * 2);
      ctx.lineTo(31, -30 + sway * 2);
      ctx.moveTo(24, -25 + sway * 2);
      ctx.lineTo(30, -25 + sway * 2);
      ctx.stroke();
    } else if (/파수|순찰|추적|정찰|방패|기사|선장/.test(npc.role || "")) {
      ctx.beginPath();
      ctx.moveTo(-27, -22);
      ctx.quadraticCurveTo(-40, -14 + sway * 3, -34, 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawNpcStatusBanner(status, near, bondLevel) {
    if (!status.important && !near && bondLevel <= 0) return;
    const width = Math.max(44, status.label.length * 10 + 20);
    const y = near ? -103 : -95;
    const pulse = 1 + Math.sin(performance.now() / 180) * 0.04;
    ctx.save();
    ctx.globalAlpha = near || status.important ? 0.96 : 0.68;
    ctx.fillStyle = "rgba(9,18,31,.88)";
    ctx.strokeStyle = `${status.color}cc`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect((-width / 2) * pulse, y, width * pulse, 22, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = status.color;
    ctx.font = "900 11px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${status.glyph} ${status.label}`, 0, y + 15);
    ctx.restore();
  }

  function drawNpcOutfitDetails(npc, color, bob, bondLevel) {
    const role = npc.role || "";
    const sway = Math.sin(performance.now() / 520 + npc.x * 0.015);
    ctx.save();
    ctx.strokeStyle = "rgba(17,24,39,.54)";
    ctx.lineWidth = 2;
    ctx.fillStyle = `${color}88`;
    if (npc.shop || /상|보급|시장/.test(role)) {
      ctx.beginPath();
      ctx.moveTo(-15, -18);
      ctx.lineTo(15, -18);
      ctx.lineTo(11, 12);
      ctx.lineTo(-11, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff7b3";
      ctx.beginPath();
      ctx.arc(20 + sway * 2, 12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(17 + sway * 2, 14, 6, 10);
    } else if (/기록|사제|영웅/.test(role)) {
      ctx.fillStyle = `${color}55`;
      ctx.beginPath();
      ctx.moveTo(-17, -30);
      ctx.quadraticCurveTo(-31, -4 + bob, -22, 24);
      ctx.lineTo(0, 15 + bob * 0.4);
      ctx.lineTo(22, 24);
      ctx.quadraticCurveTo(31, -4 - bob, 17, -30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = `${color}bb`;
      ctx.beginPath();
      ctx.arc(0, -52, 18, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    } else if (/대장|장인|광부|무기|장비/.test(role)) {
      ctx.fillStyle = "rgba(255,255,255,.24)";
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.roundRect(side * 11 - 5, -30, 10, 13, 3);
        ctx.fill();
        ctx.stroke();
      });
      ctx.strokeStyle = `${color}dd`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(23, -12);
      ctx.lineTo(35, -28 + sway * 3);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(32, -32 + sway * 3, 8, 9);
    } else if (/파수|순찰|추적|정찰|방패|기사|선장/.test(role)) {
      ctx.fillStyle = `${color}66`;
      ctx.beginPath();
      ctx.moveTo(-22, -15);
      ctx.lineTo(-34, -5);
      ctx.lineTo(-30, 17);
      ctx.lineTo(-17, 21);
      ctx.lineTo(-12, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = `${color}cc`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(18, -8);
      ctx.lineTo(34, -24 + sway * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = `${color}44`;
      ctx.beginPath();
      ctx.ellipse(0, -19, 19, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (bondLevel >= 4) {
      ctx.strokeStyle = "#fff7b3";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(0, -11, 31 + bondLevel, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawNpcInteractionCue(npc, color, near, bondLevel) {
    const pulse = 1 + Math.sin(performance.now() / 240 + npc.x * 0.01) * 0.08;
    const active = near || bondLevel > 0;
    if (!active) return;
    ctx.save();
    ctx.globalAlpha = near ? 0.96 : 0.62;
    ctx.strokeStyle = near ? "#fff7b3" : `${color}aa`;
    ctx.fillStyle = near ? "rgba(255,247,179,.18)" : `${color}16`;
    ctx.lineWidth = near ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(-18 * pulse, -84 * pulse, 36 * pulse, 22 * pulse, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = near ? "#fff7b3" : color;
    ctx.font = "900 12px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    const role = npc.role || "";
    const glyph = npc.shop
      ? "상"
      : /기록|사제|영웅/.test(role)
        ? "서"
        : /대장|장인|광부|무기|장비/.test(role)
          ? "공"
          : /파수|순찰|추적|정찰|방패|기사|선장/.test(role)
            ? "수"
            : /연금|정보|밀상|시장/.test(role)
              ? "약"
              : "말";
    ctx.fillText(glyph, 0, -69 * pulse);
    if (bondLevel >= 3) {
      ctx.fillStyle = `${color}cc`;
      ctx.beginPath();
      ctx.arc(23, -80, 3 + Math.min(3, bondLevel), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function npcRoleColor(npc, fallback) {
    if (npc.shop) return "#ffba5a";
    const role = npc.role || "";
    if (/기록|사제|영웅/.test(role)) return "#d8f7ff";
    if (/대장|장인|광부|무기|장비/.test(role)) return "#f8f871";
    if (/파수|순찰|추적|정찰|방패|기사|선장/.test(role)) return "#53e2a8";
    if (/연금|정보|밀상|시장/.test(role)) return "#d08cff";
    return fallback;
  }

  function drawNpcRoleGlyph(npc, color, bondLevel) {
    const role = npc.role || "";
    ctx.save();
    ctx.strokeStyle = "rgba(17,24,39,.56)";
    ctx.lineWidth = 3;
    ctx.fillStyle = color;
    if (npc.shop || /상|보급|무기|장비/.test(role)) {
      ctx.beginPath();
      ctx.roundRect(15, 2, 18, 20, 5);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(24, 2, 6, Math.PI, Math.PI * 2);
      ctx.stroke();
    } else if (/기록|사제|영웅/.test(role)) {
      ctx.beginPath();
      ctx.roundRect(-30, -12, 18, 24, 3);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.52)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-25, -6);
      ctx.lineTo(-17, -6);
      ctx.moveTo(-25, 0);
      ctx.lineTo(-18, 0);
      ctx.stroke();
    } else if (/연금|정보|밀상|시장/.test(role)) {
      ctx.beginPath();
      ctx.moveTo(-27, 12);
      ctx.lineTo(-20, -12);
      ctx.lineTo(-13, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.38)";
      ctx.fillRect(-23, 1, 7, 4);
    } else {
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.quadraticCurveTo(-22, -16, -14, 0);
      ctx.quadraticCurveTo(-20, 12, -28, 0);
      ctx.fill();
      ctx.stroke();
    }
    if (bondLevel) {
      ctx.fillStyle = "#fff7b3";
      ctx.beginPath();
      ctx.arc(0, -64, 3 + Math.min(5, bondLevel), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawDrops() {
    state.drops
      .filter((drop) => drop.zone === state.zone)
      .forEach((drop) => {
        ctx.save();
        ctx.translate(drop.x, drop.y);
        const item = ITEMS[drop.item];
        const pulse = 10 + Math.sin(performance.now() / 160) * 2;
        const color =
          drop.kind === "quest"
            ? "#f8f871"
            : drop.kind === "item"
              ? rarityInfo(item).color
              : "#ffba5a";
        drawLootBeam(drop, item, color, pulse);
        drawDropGlyph(drop, item, color, pulse);
        if (drop.count > 1) {
          ctx.fillStyle = "#eef6ff";
          ctx.font = "900 11px Malgun Gothic, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`x${drop.count}`, 0, 24);
        }
        if (
          drop.kind === "quest" ||
          isGearItem(item) ||
          item?.type === "rune" ||
          item?.rarity === "legend"
        ) {
          ctx.fillStyle = "#eef6ff";
          ctx.font = "900 11px Malgun Gothic, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(drop.label || item?.name || "", 0, -32);
        }
        ctx.restore();
      });
  }

  function drawLootBeam(drop, item, color, pulse) {
    if (drop.kind !== "quest" && drop.kind !== "item") return;
    const strong =
      drop.kind === "quest" ||
      isGearItem(item) ||
      item?.type === "rune" ||
      ["epic", "legend"].includes(item?.rarity);
    if (!strong) return;
    const beam = ctx.createLinearGradient(0, -86, 0, 18);
    beam.addColorStop(0, `${color}00`);
    beam.addColorStop(0.45, `${color}66`);
    beam.addColorStop(1, `${color}00`);
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.ellipse(0, -34, pulse * 1.45, 64, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `${color}88`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, pulse * 1.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawDropGlyph(drop, item, color, pulse) {
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(255,255,255,.36)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (item?.type === "material") {
      ctx.moveTo(0, -pulse);
      ctx.lineTo(pulse, 0);
      ctx.lineTo(0, pulse);
      ctx.lineTo(-pulse, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.28)";
      ctx.fillRect(-3, -pulse * 0.62, 6, pulse * 1.24);
      return;
    }
    if (item?.type === "rune") {
      for (let i = 0; i < 6; i += 1) {
        const angle = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * pulse;
        const y = Math.sin(angle) * pulse;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.42)";
      ctx.beginPath();
      ctx.moveTo(-pulse * 0.45, 0);
      ctx.lineTo(0, -pulse * 0.5);
      ctx.lineTo(pulse * 0.45, 0);
      ctx.lineTo(0, pulse * 0.5);
      ctx.closePath();
      ctx.stroke();
      return;
    }
    if (item?.type === "weapon") {
      ctx.roundRect(-pulse * 0.18, -pulse * 1.35, pulse * 0.36, pulse * 2.2, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.34)";
      ctx.fillRect(-pulse * 0.9, pulse * 0.32, pulse * 1.8, 4);
      return;
    }
    if (item?.type === "armor") {
      ctx.moveTo(0, -pulse * 1.18);
      ctx.lineTo(pulse * 0.9, -pulse * 0.48);
      ctx.lineTo(pulse * 0.6, pulse * 0.96);
      ctx.lineTo(0, pulse * 1.32);
      ctx.lineTo(-pulse * 0.6, pulse * 0.96);
      ctx.lineTo(-pulse * 0.9, -pulse * 0.48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    if (item?.type === "charm") {
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.32)";
      ctx.beginPath();
      ctx.arc(0, -pulse * 0.08, pulse * 0.45, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.arc(0, 0, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawExpeditionNodes() {
    const expedition = activeExpedition();
    if (!expedition || expedition.zone !== state.zone) return;
    const nearest = nearestExpeditionNode();
    const now = performance.now();
    (state.expeditionNodes || []).forEach((node) => {
      const meta = expeditionNodeMeta(node.kind);
      const pulse = 1 + Math.sin(now / 260 + (node.phase || 0)) * 0.12;
      const near = nearest?.id === node.id && nearest.d < 104;
      ctx.save();
      ctx.translate(node.x, node.y);
      drawShadow(0, 20, 30);
      ctx.globalAlpha = 0.96;
      ctx.strokeStyle = near ? "#fff7b3" : `${meta.color}dd`;
      ctx.fillStyle = `${meta.color}42`;
      ctx.lineWidth = near ? 4 : 2;
      ctx.beginPath();
      if (node.kind === "cache") {
        ctx.roundRect(-22 * pulse, -18 * pulse, 44 * pulse, 34 * pulse, 6);
      } else if (node.kind === "shrine") {
        ctx.moveTo(0, -30 * pulse);
        ctx.lineTo(26 * pulse, 12 * pulse);
        ctx.lineTo(0, 30 * pulse);
        ctx.lineTo(-26 * pulse, 12 * pulse);
        ctx.closePath();
      } else if (node.kind === "seal") {
        ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
      } else {
        ctx.moveTo(0, -26 * pulse);
        ctx.lineTo(22 * pulse, 0);
        ctx.lineTo(0, 26 * pulse);
        ctx.lineTo(-22 * pulse, 0);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#eef6ff";
      ctx.font = "900 13px Malgun Gothic, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(meta.label, 0, -40);
      ctx.fillStyle = "#a8bdd5";
      ctx.font = "12px Malgun Gothic, sans-serif";
      ctx.fillText(meta.title, 0, 48);
      if (near) {
        ctx.fillStyle = "#fff7b3";
        ctx.font = "900 12px Malgun Gothic, sans-serif";
        ctx.fillText("Space/E", 0, 66);
      }
      ctx.restore();
    });
  }

  function drawMemoryFragments() {
    const fragments = visibleMemoryFragments();
    if (!fragments.length) return;
    const nearest = nearestMemoryFragment();
    const now = performance.now();
    fragments.forEach((fragment) => {
      const pulse = 1 + Math.sin(now / 280 + fragment.x * 0.01) * 0.12;
      const near = nearest?.id === fragment.id && nearest.d < 108;
      ctx.save();
      ctx.translate(fragment.x, fragment.y);
      drawShadow(0, 20, 26);
      ctx.strokeStyle = near ? "#fff7b3" : "rgba(183,236,255,.86)";
      ctx.fillStyle = near ? "rgba(248,248,113,.22)" : "rgba(72,165,255,.2)";
      ctx.lineWidth = near ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(0, -26 * pulse);
      ctx.lineTo(22 * pulse, -4 * pulse);
      ctx.lineTo(12 * pulse, 24 * pulse);
      ctx.lineTo(-14 * pulse, 22 * pulse);
      ctx.lineTo(-22 * pulse, -4 * pulse);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#b7ecff";
      ctx.font = "900 13px Malgun Gothic, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(fragment.label, 0, -38);
      if (near) {
        ctx.fillStyle = "#fff7b3";
        ctx.font = "900 12px Malgun Gothic, sans-serif";
        ctx.fillText("Space/E", 0, 48);
      }
      ctx.restore();
    });
  }

  function drawForageNodes() {
    forageNodesForZone().forEach((node) => {
      const ready = forageNodeReady(node);
      const near =
        distance(state.player.x, state.player.y, node.x, node.y) < 108;
      const pulse =
        1 + Math.sin(performance.now() / 420 + node.x * 0.01) * 0.08;
      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.globalAlpha = ready ? 1 : 0.42;
      drawShadow(0, 18, 24);
      ctx.fillStyle = `${node.color}24`;
      ctx.strokeStyle = `${node.color}${ready ? "dd" : "77"}`;
      ctx.lineWidth = ready ? 3 : 2;
      ctx.beginPath();
      if (node.kind === "ore") {
        ctx.moveTo(-24 * pulse, 10);
        ctx.lineTo(-8, -28 * pulse);
        ctx.lineTo(18 * pulse, -18);
        ctx.lineTo(26, 12 * pulse);
        ctx.closePath();
      } else if (node.kind === "relic") {
        ctx.ellipse(0, -6, 24 * pulse, 32 * pulse, 0.2, 0, Math.PI * 2);
      } else {
        ctx.ellipse(0, 0, 34 * pulse, 18 * pulse, -0.25, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = node.color;
      if (node.kind === "ore") {
        ctx.fillRect(-6, -20, 12, 34);
        ctx.fillRect(-18, -4, 36, 9);
      } else {
        for (let i = 0; i < 5; i += 1) {
          const a = (Math.PI * 2 * i) / 5 + performance.now() / 1800;
          ctx.beginPath();
          ctx.ellipse(
            Math.cos(a) * 13,
            Math.sin(a) * 9 - 7,
            7,
            13,
            a,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      ctx.fillStyle = "#eef6ff";
      ctx.font = "800 12px Malgun Gothic, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(node.label, 0, -42);
      ctx.fillStyle = "#a8bdd5";
      ctx.font = "11px Malgun Gothic, sans-serif";
      ctx.fillText(ITEMS[node.item]?.name || node.item, 0, 38);
      if (near) {
        ctx.fillStyle = ready ? "#fff7b3" : "#a8bdd5";
        ctx.font = "900 12px Malgun Gothic, sans-serif";
        ctx.fillText(ready ? "Space/E 채집" : "재생성 중", 0, 56);
      }
      ctx.restore();
    });
  }

  function drawSecretLandmarks() {
    const secrets = visibleSecretLandmarks();
    if (!secrets.length) return;
    const nearest = nearestSecretLandmark();
    const now = performance.now();
    secrets.forEach((secret) => {
      const near = nearest?.id === secret.id && nearest.d < 112;
      const pulse = 1 + Math.sin(now / 300 + secret.zoneIndex) * 0.1;
      ctx.save();
      ctx.translate(secret.x, secret.y);
      drawShadow(0, 22, 28);
      ctx.globalAlpha = 0.94;
      ctx.strokeStyle = near ? "#fff7b3" : `${secret.color}dd`;
      ctx.fillStyle = `${secret.color}${near ? "38" : "24"}`;
      ctx.lineWidth = near ? 4 : 2.4;
      ctx.beginPath();
      if (secret.key === "cache") {
        ctx.roundRect(-26 * pulse, -18 * pulse, 52 * pulse, 36 * pulse, 7);
      } else if (secret.key === "inscription") {
        ctx.moveTo(0, -34 * pulse);
        ctx.lineTo(26 * pulse, -8 * pulse);
        ctx.lineTo(18 * pulse, 30 * pulse);
        ctx.lineTo(-18 * pulse, 30 * pulse);
        ctx.lineTo(-26 * pulse, -8 * pulse);
        ctx.closePath();
      } else {
        ctx.moveTo(0, -34 * pulse);
        ctx.lineTo(30 * pulse, 4 * pulse);
        ctx.lineTo(8 * pulse, 30 * pulse);
        ctx.lineTo(-28 * pulse, 16 * pulse);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.24)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, 2);
      ctx.lineTo(16, 2);
      ctx.moveTo(0, -18);
      ctx.lineTo(0, 22);
      ctx.stroke();
      ctx.fillStyle = secret.color;
      ctx.font = "900 13px Malgun Gothic, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(secret.label, 0, -46);
      ctx.fillStyle = "#a8bdd5";
      ctx.font = "11px Malgun Gothic, sans-serif";
      ctx.fillText("지역 탐색", 0, 44);
      if (near) {
        ctx.fillStyle = "#fff7b3";
        ctx.font = "900 12px Malgun Gothic, sans-serif";
        ctx.fillText("Space/E 조사", 0, 62);
      }
      ctx.restore();
    });
  }

  function drawTreasureSites() {
    const sites = visibleTreasureSites();
    if (!sites.length) return;
    const nearest = nearestTreasureSite();
    const now = performance.now();
    sites.forEach((site) => {
      const near = nearest?.id === site.id && nearest.d < 116;
      const pulse = 1 + Math.sin(now / 260 + site.stageIndex) * 0.12;
      ctx.save();
      ctx.translate(site.x, site.y);
      drawShadow(0, 24, 32);
      ctx.globalAlpha = 0.96;
      ctx.strokeStyle = near ? "#fff7b3" : `${site.color}dd`;
      ctx.fillStyle = `${site.color}${near ? "3d" : "24"}`;
      ctx.lineWidth = near ? 4.5 : 2.6;
      ctx.beginPath();
      if (site.key === "cache") {
        ctx.roundRect(-30 * pulse, -18 * pulse, 60 * pulse, 36 * pulse, 7);
      } else if (site.key === "relic") {
        ctx.moveTo(0, -36 * pulse);
        ctx.lineTo(32 * pulse, -4 * pulse);
        ctx.lineTo(18 * pulse, 30 * pulse);
        ctx.lineTo(-18 * pulse, 30 * pulse);
        ctx.lineTo(-32 * pulse, -4 * pulse);
        ctx.closePath();
      } else {
        ctx.arc(0, 0, 32 * pulse, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-18, -2);
      ctx.lineTo(-2, 12);
      ctx.lineTo(20, -14);
      ctx.stroke();
      ctx.fillStyle = site.color;
      ctx.font = "900 13px Malgun Gothic, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(site.label, 0, -48);
      ctx.fillStyle = "#a8bdd5";
      ctx.font = "11px Malgun Gothic, sans-serif";
      ctx.fillText(`지도 ${site.fragments}/${site.required}`, 0, 46);
      if (near) {
        ctx.fillStyle = "#fff7b3";
        ctx.font = "900 12px Malgun Gothic, sans-serif";
        ctx.fillText("Space/E 발굴", 0, 64);
      }
      ctx.restore();
    });
  }

  function drawCampsites() {
    const camps = visibleCampsites();
    if (!camps.length) return;
    const nearest = nearestCampsite();
    const now = performance.now();
    camps.forEach((camp) => {
      const near = nearest?.id === camp.id && nearest.d < 118;
      const flame = 1 + Math.sin(now / 180 + camp.zoneIndex) * 0.12;
      ctx.save();
      ctx.translate(camp.x, camp.y);
      drawShadow(0, 24, 40);
      ctx.globalAlpha = 0.98;
      ctx.strokeStyle = near ? "#fff7b3" : `${camp.color}dd`;
      ctx.fillStyle = "rgba(9,18,31,.58)";
      ctx.lineWidth = near ? 4.5 : 2.5;
      ctx.beginPath();
      ctx.roundRect(-46, -24, 92, 52, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = `${camp.color}22`;
      ctx.beginPath();
      ctx.ellipse(0, 4, 60, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `${camp.color}99`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-38, 20);
      ctx.lineTo(-18, -12);
      ctx.lineTo(2, 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(18, 18);
      ctx.lineTo(38, -8);
      ctx.lineTo(48, 18);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,186,90,.92)";
      ctx.beginPath();
      ctx.ellipse(0, -2, 12 * flame, 22 * flame, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = camp.color;
      ctx.beginPath();
      ctx.ellipse(0, 2, 7 * flame, 14 * flame, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.32)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-18, 18);
      ctx.lineTo(18, -12);
      ctx.moveTo(-16, -12);
      ctx.lineTo(20, 18);
      ctx.stroke();
      ctx.fillStyle = camp.color;
      ctx.font = "900 13px Malgun Gothic, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(camp.label, 0, -48);
      ctx.fillStyle = "#a8bdd5";
      ctx.font = "11px Malgun Gothic, sans-serif";
      ctx.fillText("지역 야영지", 0, 46);
      if (near) {
        ctx.fillStyle = "#fff7b3";
        ctx.font = "900 12px Malgun Gothic, sans-serif";
        ctx.fillText("Space/E 휴식", 0, 64);
      }
      ctx.restore();
    });
  }

  function drawRestoredRelics() {
    const relics = restoredRelicsForZone();
    if (!relics.length) return;
    const nearest = nearestRestoredRelic();
    const now = performance.now();
    relics.forEach((relic) => {
      const near = nearest?.id === relic.id && nearest.d < 116;
      const pulse = 1 + Math.sin(now / 260 + relic.stageIndex) * 0.1;
      const glow = near ? 0.96 : 0.72;
      ctx.save();
      ctx.translate(relic.x, relic.y);
      ctx.globalAlpha = glow;
      drawShadow(0, 24, 34);
      ctx.strokeStyle = near ? "#fff7b3" : `${relic.color}dd`;
      ctx.fillStyle = `${relic.color}${near ? "36" : "22"}`;
      ctx.lineWidth = near ? 5 : 3;
      ctx.setLineDash(near ? [] : [9, 7]);
      ctx.beginPath();
      if (relic.key === "memory") {
        ctx.moveTo(0, -34 * pulse);
        ctx.lineTo(28 * pulse, -4 * pulse);
        ctx.lineTo(12 * pulse, 32 * pulse);
        ctx.lineTo(-20 * pulse, 24 * pulse);
        ctx.lineTo(-30 * pulse, -6 * pulse);
      } else if (relic.key === "ward") {
        ctx.moveTo(0, -38 * pulse);
        ctx.lineTo(32 * pulse, -16 * pulse);
        ctx.lineTo(24 * pulse, 26 * pulse);
        ctx.lineTo(0, 42 * pulse);
        ctx.lineTo(-24 * pulse, 26 * pulse);
        ctx.lineTo(-32 * pulse, -16 * pulse);
      } else {
        ctx.ellipse(0, 0, 34 * pulse, 40 * pulse, 0.18, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = `${relic.color}99`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 48 * pulse, now / 1200, now / 1200 + Math.PI * 1.4);
      ctx.stroke();
      ctx.fillStyle = "#eef6ff";
      ctx.font = "900 13px Malgun Gothic, sans-serif";
      ctx.textAlign = "center";
      const glyph =
        relic.key === "memory"
          ? "기억"
          : relic.key === "ward"
            ? "수호"
            : "균열";
      ctx.fillText(glyph, 0, 4);
      ctx.fillStyle = relic.color;
      ctx.font = "900 12px Malgun Gothic, sans-serif";
      ctx.fillText(relic.name, 0, -54);
      if (near) {
        ctx.fillStyle = "#fff7b3";
        ctx.font = "900 12px Malgun Gothic, sans-serif";
        ctx.fillText("Space/E", 0, 62);
      }
      ctx.restore();
    });
  }

  function drawWorldEvent() {
    if (activeNamedHunt()) return;
    const event = activeWorldEvent();
    if (!event) return;
    const meta = worldEventMeta(event.kind);
    const interactive = Boolean(meta.interactive);
    const near = interactive
      ? distance(state.player.x, state.player.y, event.x, event.y) < 116
      : false;
    const pulse = 1 + Math.sin(performance.now() / 230) * 0.12;
    ctx.save();
    ctx.translate(event.x, event.y);
    drawShadow(0, 24, 42);
    ctx.strokeStyle = near ? "#fff7b3" : `${meta.color}dd`;
    ctx.fillStyle = `${meta.color}36`;
    ctx.lineWidth = near ? 5 : 3;
    ctx.beginPath();
    if (interactive) {
      ctx.roundRect(-34 * pulse, -26 * pulse, 68 * pulse, 52 * pulse, 8);
    } else {
      ctx.arc(0, 0, 38 * pulse, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = meta.color;
    ctx.font = "900 15px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(meta.label, 0, -52);
    ctx.fillStyle = "#eef6ff";
    ctx.font = "800 13px Malgun Gothic, sans-serif";
    ctx.fillText(meta.title, 0, 48);
    ctx.fillStyle = "#a8bdd5";
    ctx.font = "12px Malgun Gothic, sans-serif";
    const progress = interactive
      ? "Space/E"
      : `${event.progress || 0}/${event.required}`;
    ctx.fillText(progress, 0, 66);
    ctx.restore();
  }

  function drawHazards() {
    state.hazards.forEach((hazard) => {
      ctx.save();
      const armed = hazard.delay <= 0;
      const color = hazard.color || "#ff5f6d";
      ctx.globalAlpha = armed ? 0.72 : 0.44;
      ctx.strokeStyle = color;
      ctx.fillStyle = armed ? `${color}44` : `${color}18`;
      ctx.lineWidth = armed ? 5 : 3;
      if (hazard.type === "line") {
        ctx.translate(hazard.x, hazard.y);
        ctx.rotate(hazard.angle || 0);
        ctx.beginPath();
        ctx.roundRect(
          0,
          -(hazard.width || 32) / 2,
          hazard.length || 120,
          hazard.width || 32,
          8,
        );
        ctx.fill();
        ctx.stroke();
        if (!armed) {
          ctx.strokeStyle = "rgba(255,255,255,.45)";
          ctx.setLineDash([12, 10]);
          ctx.strokeRect(
            0,
            -(hazard.width || 32) / 2,
            hazard.length || 120,
            hazard.width || 32,
          );
        }
      } else if (hazard.type === "projectile") {
        ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, hazard.radius || 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.38)";
        ctx.beginPath();
        ctx.arc(
          hazard.x - (hazard.vx || 0) * 0.018,
          hazard.y - (hazard.vy || 0) * 0.018,
          (hazard.radius || 14) * 0.45,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else {
        const pulse = 1 + Math.sin(performance.now() / 120) * 0.08;
        ctx.beginPath();
        ctx.arc(
          hazard.x,
          hazard.y,
          (hazard.radius || 40) * pulse,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
        if (!armed) {
          ctx.strokeStyle = "rgba(255,255,255,.52)";
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.arc(hazard.x, hazard.y, hazard.radius || 40, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }

  function drawEnemies() {
    state.enemies.forEach((enemy) => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      const bob = Math.sin((enemy.step || 0) + (enemy.phase || 0)) * 3;
      const profile = enemyVisualProfile(enemy);
      const affix = enemyEliteAffix(enemy);
      drawShadow(0, profile.shadowY, profile.shadowRadius);
      drawEnemyGroundAura(enemy, profile);
      drawEnemySeparationCue(enemy);
      drawEnemyResearchAura(enemy, profile);
      drawEnemyHuntPlanMark(enemy, profile);
      drawEnemyEchoTrialAura(enemy, profile);
      drawEnemyNamedHuntAura(enemy, profile);
      ctx.translate(0, bob);
      drawEnemyMotionLines(enemy, profile);
      if (affix) {
        const pulse =
          1 + Math.sin(performance.now() / 180 + enemy.phase) * 0.08;
        ctx.strokeStyle = `${affix.color}aa`;
        ctx.fillStyle = `${affix.color}18`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.ellipse(0, -8, 34 * pulse, 48 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = affix.color;
        ctx.font = "900 12px Malgun Gothic, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(affix.name, 0, -66);
      }
      if (enemy.windup > 0) drawEnemyAttackIntent(enemy, profile);
      if (enemy.swing > 0) {
        ctx.strokeStyle = "rgba(255,245,180,.78)";
        ctx.lineWidth = enemy.boss ? 9 : 6;
        ctx.beginPath();
        ctx.arc(0, -8, enemy.boss ? 82 : 58, -0.4, Math.PI * 0.8);
        ctx.stroke();
      }
      if (enemy.cast > 0) {
        ctx.strokeStyle = `${enemy.color}dd`;
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, -8, enemy.boss ? 68 : 48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = enemy.hit > 0 ? "#fff" : profile.bodyColor;
      ctx.beginPath();
      ctx.roundRect(
        enemy.boss ? -30 : -20,
        enemy.boss ? -46 : -32,
        enemy.boss ? 60 : 40,
        enemy.boss ? 72 : 52,
        12,
      );
      ctx.fill();
      const shine = ctx.createLinearGradient(-24, -46, 24, 18);
      shine.addColorStop(0, "rgba(255,255,255,.28)");
      shine.addColorStop(0.55, "rgba(255,255,255,.04)");
      shine.addColorStop(1, "rgba(0,0,0,.18)");
      ctx.fillStyle = shine;
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
      drawEnemyBodyDepth(enemy, profile);
      drawEnemyLimbMotion(enemy, profile, bob);
      drawEnemyDetail(enemy, profile, bob);
      drawEnemyWeaponCue(enemy, profile);
      drawEnemyResearchWeakpoint(enemy, profile);
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
      if (enemy.boss || affix) {
        ctx.fillStyle = "#eef6ff";
        ctx.font = enemy.boss
          ? "800 14px Malgun Gothic, sans-serif"
          : "800 12px Malgun Gothic, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(enemy.name, 0, enemy.boss ? -72 : -82);
      }
      ctx.restore();
    });
  }

  function enemyVisualProfile(enemy) {
    const boss = !!enemy.boss;
    const profiles = {
      slime: { bodyColor: "#55e6b4", accent: "#b9ffe5", family: "beast" },
      wolf: { bodyColor: "#78d661", accent: "#d6ff93", family: "beast" },
      thorn: { bodyColor: "#7fe597", accent: "#fff7b3", family: "spirit" },
      raider: { bodyColor: "#dd8a3d", accent: "#fff0b8", family: "soldier" },
      mist: { bodyColor: "#56d7ff", accent: "#d8f7ff", family: "spirit" },
      golem: { bodyColor: "#b96035", accent: "#ffba5a", family: "construct" },
      wraith: { bodyColor: "#a8dfff", accent: "#e9fbff", family: "spirit" },
      knight: { bodyColor: "#a875df", accent: "#f0d7ff", family: "soldier" },
      shade: { bodyColor: "#d94b68", accent: "#ffd0dc", family: "spirit" },
      archon: { bodyColor: "#e9df73", accent: "#ffffff", family: "celestial" },
      stalker: { bodyColor: "#66dc88", accent: "#d3ffdd", family: "beast" },
      duelist: { bodyColor: "#df845e", accent: "#fff0dc", family: "soldier" },
      siren: { bodyColor: "#53cdeb", accent: "#dcf9ff", family: "celestial" },
      automaton: {
        bodyColor: "#9873df",
        accent: "#eadcff",
        family: "construct",
      },
      alchemist: { bodyColor: "#bf77de", accent: "#ffe6a8", family: "soldier" },
      sentinel: {
        bodyColor: "#ded36b",
        accent: "#ffffff",
        family: "construct",
      },
      seraph: { bodyColor: "#d4eff6", accent: "#fff7b3", family: "celestial" },
      voidbeast: { bodyColor: "#8969db", accent: "#f0d7ff", family: "spirit" },
    };
    const profile = profiles[enemy.type] || {
      bodyColor: enemy.color,
      accent: "#eef6ff",
      family: "beast",
    };
    return {
      ...profile,
      shadowY: boss ? 30 : profile.family === "spirit" ? 28 : 24,
      shadowRadius: boss ? 54 : profile.family === "construct" ? 38 : 32,
    };
  }

  function drawEnemySeparationCue(enemy) {
    if (!enemy.separateFlash) return;
    const ratio = clamp(enemy.separateFlash / 0.28, 0, 1);
    const radius = enemyRadius(enemy) + 14 + (1 - ratio) * 12;
    ctx.save();
    ctx.globalAlpha = 0.24 + ratio * 0.46;
    ctx.strokeStyle = "#53e2a8";
    ctx.fillStyle = "rgba(83,226,168,.08)";
    ctx.lineWidth = enemy.boss ? 4 : 3;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.ellipse(
      0,
      enemy.boss ? 31 : 25,
      radius * 1.18,
      radius * 0.36,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawEnemyAttackIntent(enemy, profile) {
    const progress = 1 - enemy.windup / (enemy.windupMax || enemy.windup || 1);
    const pulse = 1 + progress * 0.16;
    const radius = (enemy.boss ? 76 : 54) * pulse;
    const angle =
      enemy.windupAngle ||
      Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    const fillColor = enemy.boss
      ? "rgba(255,95,109,.24)"
      : "rgba(255,95,109,.16)";
    ctx.save();
    ctx.strokeStyle = enemy.boss
      ? "rgba(255,186,90,.88)"
      : "rgba(255,95,109,.76)";
    ctx.fillStyle = fillColor;
    ctx.lineWidth = enemy.boss ? 5 : 3;
    ctx.beginPath();
    ctx.arc(0, -8, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(angle);
    ctx.fillStyle = enemy.boss
      ? "rgba(255,186,90,.2)"
      : `${profile.bodyColor}22`;
    ctx.strokeStyle = enemy.boss
      ? "rgba(255,245,180,.9)"
      : "rgba(255,245,180,.72)";
    ctx.beginPath();
    ctx.moveTo(20, -16);
    ctx.lineTo(radius + (enemy.boss ? 64 : 42), 0);
    ctx.lineTo(20, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawEnemyGroundAura(enemy, profile) {
    const healthRate = enemy.maxHp ? enemy.hp / enemy.maxHp : 1;
    const pulse = 1 + Math.sin(performance.now() / 240 + enemy.phase) * 0.08;
    ctx.save();
    ctx.fillStyle = `${profile.bodyColor}12`;
    ctx.strokeStyle = `${profile.accent}55`;
    ctx.lineWidth = enemy.boss ? 3 : 2;
    ctx.setLineDash(profile.family === "spirit" ? [6, 8] : []);
    ctx.beginPath();
    ctx.ellipse(
      0,
      enemy.boss ? 30 : 24,
      (enemy.boss ? 58 : 38) * pulse,
      (enemy.boss ? 18 : 12) * pulse,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if (healthRate < 0.35) {
      ctx.strokeStyle = "rgba(255,95,109,.62)";
      ctx.beginPath();
      ctx.arc(0, enemy.boss ? 3 : 0, enemy.boss ? 48 : 34, 0.15, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemyResearchAura(enemy, profile) {
    const tier = bestiaryResearchTier(enemy.type);
    if (!tier) return;
    const color = tier >= 4 ? "#f8f871" : tier >= 3 ? "#b7ecff" : "#53e2a8";
    const pulse = 1 + Math.sin(performance.now() / 210 + enemy.phase) * 0.08;
    const radius = enemy.boss ? 64 : 42;
    ctx.save();
    ctx.globalAlpha = 0.42 + tier * 0.08;
    ctx.strokeStyle = color;
    ctx.fillStyle = `${color}14`;
    ctx.lineWidth = 1.5 + tier * 0.35;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.ellipse(
      0,
      enemy.boss ? 30 : 25,
      radius * pulse,
      (enemy.boss ? 22 : 15) * pulse,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < tier; i += 1) {
      const angle = performance.now() / 640 + i * ((Math.PI * 2) / tier);
      const x = Math.cos(angle) * (radius * 0.72);
      const y = (enemy.boss ? 30 : 25) + Math.sin(angle) * 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 2.5 + tier * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEnemyHuntPlanMark(enemy, profile) {
    const plan = activeHuntPlanForEnemy(enemy);
    if (!plan) return;
    const color = plan.type.color;
    const pulse = 1 + Math.sin(performance.now() / 170 + enemy.phase) * 0.09;
    const radius = enemy.boss ? 72 : 48;
    const y = enemy.boss ? 32 : 27;
    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.strokeStyle = color;
    ctx.fillStyle = `${color}18`;
    ctx.lineWidth = enemy.boss ? 4 : 3;
    ctx.setLineDash([12, 7]);
    ctx.beginPath();
    ctx.ellipse(
      0,
      y,
      radius * pulse,
      (enemy.boss ? 25 : 17) * pulse,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(performance.now() / 720 + enemy.phase);
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(Math.PI / 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(radius * 0.52, y * 0.12);
      ctx.lineTo(radius * 0.82, y * 0.12);
      ctx.stroke();
    }
    ctx.rotate(-(performance.now() / 720 + enemy.phase));
    ctx.fillStyle = "#101827";
    ctx.strokeStyle = `${color}dd`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-23, enemy.boss ? -94 : -76, 46, 18, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "900 11px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(plan.type.label, 0, enemy.boss ? -81 : -63);
    ctx.restore();
  }

  function drawEnemyEchoTrialAura(enemy, profile) {
    if (!enemy.echoTrial) return;
    const color = enemy.color || profile.accent;
    const pulse = 1 + Math.sin(performance.now() / 180 + enemy.phase) * 0.08;
    const radius = enemy.boss ? 86 : 58;
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = `${color}cc`;
    ctx.fillStyle = `${color}12`;
    ctx.lineWidth = enemy.boss ? 4 : 3;
    ctx.setLineDash([16, 8]);
    ctx.beginPath();
    ctx.ellipse(
      0,
      enemy.boss ? 32 : 26,
      radius * pulse,
      (enemy.boss ? 29 : 20) * pulse,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 3; i += 1) {
      const angle = performance.now() / 520 + enemy.phase + i * 2.094;
      const x = Math.cos(angle) * radius * 0.54;
      const y = (enemy.boss ? 30 : 24) + Math.sin(angle) * 14;
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(17,24,39,.62)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x + 6, y);
      ctx.lineTo(x, y + 7);
      ctx.lineTo(x - 6, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "#101827";
    ctx.strokeStyle = `${color}dd`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-15, enemy.boss ? -104 : -86, 30, 20, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "900 12px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("회", 0, enemy.boss ? -90 : -72);
    ctx.restore();
  }

  function drawEnemyNamedHuntAura(enemy, profile) {
    if (!enemy.namedHuntId) return;
    const hunt = namedHuntSpec(enemy.namedHuntId);
    const color = hunt?.color || profile.accent;
    const pulse = 1 + Math.sin(performance.now() / 150 + enemy.phase) * 0.08;
    const radius = enemy.boss ? 92 : 62;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = `${color}dd`;
    ctx.fillStyle = `${color}16`;
    ctx.lineWidth = enemy.boss ? 5 : 3;
    ctx.setLineDash([6, 5, 18, 5]);
    ctx.beginPath();
    ctx.ellipse(
      0,
      enemy.boss ? 34 : 26,
      radius * pulse,
      31 * pulse,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#101827";
    ctx.strokeStyle = `${color}ee`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-18, enemy.boss ? -112 : -92, 36, 22, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "900 12px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("강", 0, enemy.boss ? -97 : -77);
    ctx.beginPath();
    ctx.moveTo(-22, enemy.boss ? -118 : -98);
    ctx.lineTo(0, enemy.boss ? -134 : -112);
    ctx.lineTo(22, enemy.boss ? -118 : -98);
    ctx.stroke();
    ctx.restore();
  }

  function drawEnemyMotionLines(enemy, profile) {
    if (enemy.windup > 0 || enemy.cast > 0 || enemy.swing > 0) return;
    const gap = distance(enemy.x, enemy.y, state.player.x, state.player.y);
    if (gap < 120 || gap > 720) return;
    const angle = Math.atan2(
      state.player.y - enemy.y,
      state.player.x - enemy.x,
    );
    const lines = profile.family === "beast" ? 4 : 3;
    ctx.save();
    ctx.rotate(angle + Math.PI);
    ctx.strokeStyle = `${profile.accent}55`;
    ctx.lineWidth = profile.family === "construct" ? 3 : 2;
    for (let i = 0; i < lines; i += 1) {
      const y = -22 + i * 13;
      ctx.beginPath();
      ctx.moveTo(22 + i * 4, y);
      ctx.lineTo(44 + i * 7, y + Math.sin(enemy.step || 0) * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemyBodyDepth(enemy, profile) {
    const boss = !!enemy.boss;
    const w = boss ? 60 : 40;
    const h = boss ? 72 : 52;
    const x = boss ? -30 : -20;
    const y = boss ? -46 : -32;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(255,255,255,.18)";
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 7, w * 0.36, h * 0.52, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath();
    ctx.roundRect(x + w * 0.58, y + 10, w * 0.28, h * 0.64, 7);
    ctx.fill();
    ctx.strokeStyle = `${profile.accent}66`;
    ctx.lineWidth = boss ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + h - 9);
    ctx.quadraticCurveTo(0, y + h + 4, x + w - 7, y + h - 9);
    ctx.stroke();
    if (enemy.boss) {
      ctx.strokeStyle = `${profile.accent}88`;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.ellipse(0, -10, 42, 54, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawEnemyLimbMotion(enemy, profile, bob = 0) {
    const boss = !!enemy.boss;
    const swing = Math.sin((enemy.step || 0) + enemy.phase);
    const armLength = boss ? 40 : 28;
    const legLength = boss ? 30 : 22;
    const active = enemy.windup > 0 || enemy.swing > 0 || enemy.cast > 0;
    ctx.save();
    ctx.strokeStyle = "rgba(17,24,39,.58)";
    ctx.lineCap = "round";
    ctx.lineWidth = boss ? 8 : 6;
    [-1, 1].forEach((side) => {
      const armY = boss ? -22 : -14;
      const attackReach = active && side > 0 ? 14 : 0;
      ctx.beginPath();
      ctx.moveTo(side * (boss ? 28 : 18), armY);
      ctx.quadraticCurveTo(
        side * (34 + attackReach),
        armY + 10 + swing * side * 5,
        side * armLength,
        armY + 27 + swing * side * 4,
      );
      ctx.stroke();
    });
    ctx.strokeStyle = `${profile.accent}99`;
    ctx.lineWidth = boss ? 4 : 3;
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(side * (boss ? 15 : 10), boss ? 24 : 18);
      ctx.quadraticCurveTo(
        side * (18 + Math.abs(swing) * 4),
        legLength + bob * 0.4,
        side * (boss ? 25 : 17),
        legLength + 10 - swing * side * 4,
      );
      ctx.stroke();
    });
    if (profile.family === "construct") {
      ctx.fillStyle = `${profile.accent}66`;
      [-1, 1].forEach((side) => {
        ctx.fillRect(side * (boss ? 33 : 23) - 4, boss ? 2 : 4, 8, 16);
      });
    }
    ctx.restore();
  }

  function drawEnemyWeaponCue(enemy, profile) {
    if (
      ![
        "raider",
        "knight",
        "duelist",
        "alchemist",
        "sentinel",
        "archon",
      ].includes(enemy.type)
    )
      return;
    const bossReach = enemy.boss ? 1.25 : 1;
    ctx.save();
    ctx.strokeStyle = "rgba(17,24,39,.62)";
    ctx.lineWidth = enemy.type === "duelist" ? 4 : 6;
    ctx.beginPath();
    if (enemy.type === "alchemist") {
      ctx.moveTo(18, -24);
      ctx.lineTo(28, 16);
      ctx.stroke();
      ctx.fillStyle = profile.accent;
      ctx.beginPath();
      ctx.arc(30, 18, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(18, -8);
      ctx.lineTo((enemy.type === "duelist" ? 58 : 48) * bossReach, -22);
      ctx.stroke();
      ctx.strokeStyle = profile.accent;
      ctx.lineWidth = enemy.type === "duelist" ? 2 : 3;
      ctx.beginPath();
      ctx.moveTo(22, -9);
      ctx.lineTo((enemy.type === "duelist" ? 60 : 50) * bossReach, -23);
      ctx.stroke();
    }
    if (["knight", "sentinel", "archon"].includes(enemy.type)) {
      ctx.fillStyle = `${profile.accent}88`;
      ctx.beginPath();
      ctx.moveTo(-26, -15);
      ctx.lineTo(-40, -5);
      ctx.lineTo(-34, 16);
      ctx.lineTo(-20, 18);
      ctx.lineTo(-16, -6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEnemyResearchWeakpoint(enemy, profile) {
    const tier = bestiaryResearchTier(enemy.type);
    if (tier < 3) return;
    const color = tier >= 4 ? "#f8f871" : "#b7ecff";
    const y = enemy.boss ? -18 : -12;
    const size = enemy.boss ? 10 : 8;
    const pulse = 1 + Math.sin(performance.now() / 160 + enemy.phase) * 0.12;
    ctx.save();
    ctx.fillStyle = `${color}dd`;
    ctx.strokeStyle = "rgba(17,24,39,.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y - size * pulse);
    ctx.lineTo(size * pulse, y);
    ctx.lineTo(0, y + size * pulse);
    ctx.lineTo(-size * pulse, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (tier >= 4) {
      ctx.fillStyle = "#111827";
      ctx.font = "900 9px Malgun Gothic, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("약", 0, y + 3);
    }
    ctx.restore();
  }

  function drawEnemyDetail(
    enemy,
    profile = enemyVisualProfile(enemy),
    bob = 0,
  ) {
    ctx.save();
    ctx.strokeStyle = "rgba(17,24,39,.58)";
    ctx.lineWidth = enemy.boss ? 7 : 5;
    ctx.fillStyle = `${profile.accent}44`;
    if (enemy.type === "slime") {
      ctx.fillStyle = "rgba(255,255,255,.28)";
      [-12, 4, 17].forEach((x, index) => {
        ctx.beginPath();
        ctx.arc(
          x,
          -4 + index * 5 + Math.sin(bob + index) * 2,
          5 + index,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      });
      ctx.fillStyle = "#fff7b3";
      ctx.beginPath();
      ctx.moveTo(-10, -38);
      ctx.lineTo(-4, -50);
      ctx.lineTo(2, -38);
      ctx.lineTo(9, -50);
      ctx.lineTo(14, -37);
      ctx.closePath();
      ctx.fill();
    } else if (["wolf", "stalker"].includes(enemy.type)) {
      ctx.fillStyle = "rgba(255,255,255,.2)";
      ctx.beginPath();
      ctx.moveTo(-18, -34);
      ctx.lineTo(-6, -54);
      ctx.lineTo(2, -32);
      ctx.moveTo(18, -34);
      ctx.lineTo(8, -54);
      ctx.lineTo(-2, -32);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(18, 10);
      ctx.quadraticCurveTo(48, 8, 42, -18);
      ctx.stroke();
      if (enemy.type === "stalker") {
        ctx.strokeStyle = `${profile.accent}99`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-20, 14);
        ctx.quadraticCurveTo(-44, 4, -36, -18);
        ctx.stroke();
      }
    } else if (enemy.type === "thorn") {
      ctx.strokeStyle = `${profile.accent}aa`;
      ctx.lineWidth = 3;
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(side * 12, 16);
        ctx.lineTo(side * 28, -32);
        ctx.lineTo(side * 18, -20);
        ctx.moveTo(side * 22, -14);
        ctx.lineTo(side * 38, -24);
        ctx.stroke();
      });
    } else if (["golem", "automaton", "sentinel"].includes(enemy.type)) {
      ctx.strokeStyle = "rgba(255,255,255,.28)";
      ctx.beginPath();
      ctx.moveTo(-16, -18);
      ctx.lineTo(18, 16);
      ctx.moveTo(18, -18);
      ctx.lineTo(-14, 18);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.22)";
      ctx.fillRect(-8, 2, 16, 12);
      if (enemy.type === "automaton") {
        ctx.strokeStyle = profile.accent;
        ctx.lineWidth = 2;
        [-11, 11].forEach((x) => {
          ctx.beginPath();
          ctx.arc(x, -4, 8, 0, Math.PI * 2);
          ctx.stroke();
        });
      }
      if (enemy.type === "sentinel") {
        ctx.fillStyle = `${profile.accent}aa`;
        ctx.beginPath();
        for (let i = 0; i < 5; i += 1) {
          const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
          const x = Math.cos(a) * 17;
          const y = -18 + Math.sin(a) * 17;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }
    } else if (["mist", "wraith", "shade", "voidbeast"].includes(enemy.type)) {
      ctx.strokeStyle = `${profile.accent}aa`;
      ctx.beginPath();
      ctx.arc(0, -10, enemy.boss ? 42 : 30, 0.2, Math.PI * 1.45);
      ctx.stroke();
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = profile.bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 20, enemy.boss ? 40 : 28, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `${profile.accent}88`;
      [-1, 0, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(side * 9, 12);
        ctx.quadraticCurveTo(side * 30, 34, side * 15, 45);
        ctx.stroke();
      });
    } else if (["siren", "seraph", "archon"].includes(enemy.type)) {
      ctx.fillStyle = "rgba(255,255,255,.24)";
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(side * 12, -18);
        ctx.quadraticCurveTo(side * 58, -40, side * 34, 12);
        ctx.quadraticCurveTo(side * 22, 2, side * 12, -18);
        ctx.fill();
      });
      ctx.strokeStyle = `${profile.accent}aa`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -52, enemy.boss ? 24 : 17, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (
      ["raider", "knight", "duelist", "alchemist"].includes(enemy.type)
    ) {
      ctx.strokeStyle = `${profile.accent}aa`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-13, -24);
      ctx.lineTo(13, -24);
      ctx.moveTo(-10, -14);
      ctx.lineTo(10, -14);
      ctx.stroke();
      if (enemy.type === "alchemist") {
        ctx.fillStyle = "#53e2a8";
        ctx.fillRect(-17, 6, 8, 14);
        ctx.fillStyle = "#ffba5a";
        ctx.fillRect(9, 8, 8, 12);
      }
    } else {
      ctx.strokeStyle = "rgba(255,255,255,.24)";
      ctx.beginPath();
      ctx.moveTo(-22, 6);
      ctx.lineTo(22, 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCompanion() {
    const companion = activeCompanion();
    const pos = state.companionPosition;
    if (!companion || !pos) return;
    const { spec, entry } = companion;
    const bob = Math.sin(pos.phase || 0) * 2.4;
    ctx.save();
    ctx.translate(pos.x, pos.y + bob);
    drawShadow(0, 22, 26);
    if (pos.attackFlash > 0 && pos.attackTarget) {
      ctx.strokeStyle = `${spec.color}cc`;
      ctx.lineWidth = spec.melee ? 8 : 5;
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(pos.attackTarget.x - pos.x, pos.attackTarget.y - pos.y - 24);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.beginPath();
    ctx.roundRect(-15, -30, 30, 44, 8);
    ctx.fill();
    const robe = ctx.createLinearGradient(-14, -34, 14, 18);
    robe.addColorStop(0, spec.color);
    robe.addColorStop(1, "rgba(17,24,39,.88)");
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.roundRect(-12, -32, 24, 42, 8);
    ctx.fill();
    drawCompanionMotionDetails(spec, entry, bob);
    drawCompanionSigil(spec, entry);
    ctx.fillStyle = "#e8c19a";
    ctx.beginPath();
    ctx.arc(0, -42, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.arc(0, -47, 11, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = spec.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (spec.melee) {
      ctx.moveTo(14, -18);
      ctx.lineTo(33, -34);
    } else {
      ctx.moveTo(14, -20);
      ctx.lineTo(30, 4);
    }
    ctx.stroke();
    ctx.fillStyle = "#eef6ff";
    ctx.font = "800 11px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${spec.name} Lv.${entry.level || 1}`, 0, -58);
    ctx.restore();
  }

  function drawCompanionMotionDetails(spec, entry, bob = 0) {
    const rank = Math.min(5, entry.level || 1);
    const sway = Math.sin((state.playSeconds || 0) * 3 + rank);
    ctx.save();
    ctx.strokeStyle = `${spec.accent}99`;
    ctx.fillStyle = `${spec.color}33`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -27);
    ctx.quadraticCurveTo(-25, -2 + bob, -16, 18);
    ctx.lineTo(0, 9 + bob * 0.4);
    ctx.lineTo(16, 18);
    ctx.quadraticCurveTo(25, -2 - bob, 12, -27);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = spec.melee ? `${spec.color}dd` : `${spec.accent}dd`;
    ctx.lineWidth = spec.melee ? 4 : 3;
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(side * 11, -17);
      ctx.quadraticCurveTo(
        side * (21 + rank),
        -5 + sway * side * 2,
        side * (21 + rank * 2),
        11 + sway * side * 2,
      );
      ctx.stroke();
    });
    if (rank >= 4) {
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.arc(0, -55, 3 + rank * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCompanionSigil(spec, entry) {
    const rank = Math.min(5, entry.level || 1);
    ctx.save();
    ctx.strokeStyle = `${spec.accent}aa`;
    ctx.fillStyle = `${spec.color}44`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -12, 17, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = spec.accent;
    for (let i = 0; i < rank; i += 1) {
      const x = -8 + i * 4;
      ctx.beginPath();
      ctx.arc(x, -12, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!spec.melee) {
      ctx.strokeStyle = `${spec.color}cc`;
      ctx.beginPath();
      ctx.arc(0, -45, 17, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = state.player;
    const weapon = ITEMS[p.equipment?.weapon];
    const armor = ITEMS[p.equipment?.armor];
    const charm = ITEMS[p.equipment?.charm];
    const armorColor = armor ? rarityInfo(armor).color : currentZone().accent;
    const weaponColor = weapon ? rarityInfo(weapon).color : "#eef6ff";
    const walk = Math.sin(p.walkPhase || 0);
    ctx.save();
    ctx.translate(p.x, p.y);
    drawShadow(0, 25, 36);
    drawPlayerActiveBuffAuras();
    drawPlayerRelicAura();
    drawPlayerHurtFlash(p.hurtFlash || 0);
    drawPlayerMotionAfterimage(p, armorColor, weaponColor);
    const setAura = activeEquipmentSets().filter(
      (set) => set.activeBonuses.length,
    );
    if (setAura.length) {
      const now = performance.now() / 1000;
      setAura.slice(0, 2).forEach((set, index) => {
        ctx.save();
        ctx.rotate(now * (index % 2 ? -0.7 : 0.7));
        ctx.strokeStyle = `${set.color}88`;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.ellipse(0, -6, 46 + index * 9, 22 + index * 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    }
    const craftedGlow = [
      p.equipment?.weapon,
      p.equipment?.armor,
      p.equipment?.charm,
    ].filter(isCraftedGear);
    if (craftedGlow.length) {
      const now = performance.now() / 1000;
      ctx.save();
      ctx.strokeStyle = "rgba(255,186,90,.72)";
      ctx.fillStyle = "rgba(255,248,113,.78)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        0,
        -7,
        36 + craftedGlow.length * 5,
        16 + craftedGlow.length * 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      craftedGlow.slice(0, 3).forEach((_, index) => {
        const angle = now * 1.4 + (index / craftedGlow.length) * Math.PI * 2;
        const x = Math.cos(angle) * (28 + index * 7);
        const y = Math.sin(angle) * 13 - 14;
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x + 5, y);
        ctx.lineTo(x, y + 6);
        ctx.lineTo(x - 5, y);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }
    drawPlayerRuneOrbit();
    drawPlayerCharmOrbit(charm);
    ctx.translate(0, walk * 2);
    if (p.invuln > 0) {
      ctx.strokeStyle = "rgba(255,255,255,.72)";
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -10, 42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (p.oathShield > 0) {
      ctx.strokeStyle = "rgba(83,226,168,.72)";
      ctx.fillStyle = "rgba(83,226,168,.08)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(
        0,
        -10,
        48 + Math.sin(performance.now() / 120) * 4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();
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
    drawPlayerFootwork(walk, p.dashTime > 0, armorColor);
    drawPlayerCloak(armor, armorColor, walk);
    ctx.strokeStyle = "rgba(0,0,0,.34)";
    ctx.lineWidth = 5;
    ctx.fillStyle = "#1c293d";
    ctx.beginPath();
    ctx.roundRect(-18, -28, 36, 54, 8);
    ctx.fill();
    ctx.stroke();
    const armorGrad = ctx.createLinearGradient(-16, -32, 16, 24);
    armorGrad.addColorStop(0, armorColor);
    armorGrad.addColorStop(1, "rgba(17,24,39,.82)");
    ctx.fillStyle = armorGrad;
    ctx.fillRect(-10, -34, 20, 23);
    drawArmorPanels(armor, armorColor);
    ctx.fillStyle = "#d08cff";
    ctx.fillRect(-20, -10 + walk * 2, 7, 26);
    ctx.fillRect(13, -10 - walk * 2, 7, 26);
    ctx.fillStyle = "#263a4d";
    ctx.fillRect(-12, 18 - walk * 2, 8, 18);
    ctx.fillRect(4, 18 + walk * 2, 8, 18);
    drawPlayerStanceDetails(
      p,
      weapon,
      armor,
      charm,
      armorColor,
      weaponColor,
      walk,
    );
    ctx.fillStyle = "#d9b08c";
    ctx.beginPath();
    ctx.arc(0, -42, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2c1f31";
    ctx.beginPath();
    ctx.arc(0, -47, 14, Math.PI, Math.PI * 2);
    ctx.fill();
    drawPlayerFaceHighlights(weaponColor, armorColor, charm);
    drawPlayerEquipmentCrest(weapon, armor, charm, weaponColor, armorColor);
    drawPlayerWeapon(weapon, weaponColor);
    if (attackFlash > 0) {
      drawPlayerAttackTrail(weapon, weaponColor);
    }
    ctx.restore();
  }

  function drawPlayerHurtFlash(flash) {
    if (flash <= 0) return;
    const alpha = Math.max(0, Math.min(1, flash / 0.34));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(255,95,109,.88)";
    ctx.fillStyle = "rgba(255,95,109,.16)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -12, 44 + (1 - alpha) * 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.68)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-24, -38);
    ctx.lineTo(20, 20);
    ctx.moveTo(24, -34);
    ctx.lineTo(-18, 16);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayerMotionAfterimage(player, armorColor, weaponColor) {
    const moving = Math.abs(Math.sin(player.walkPhase || 0)) > 0.74;
    const dashing = player.dashTime > 0;
    if (!moving && !dashing) return;
    const vx = Math.cos(player.facing || 0);
    const vy = Math.sin(player.facing || 0);
    const copies = dashing ? 4 : 2;
    ctx.save();
    for (let index = copies; index >= 1; index -= 1) {
      const distanceBack = index * (dashing ? 19 : 9);
      ctx.save();
      ctx.globalAlpha = (dashing ? 0.2 : 0.08) * (copies - index + 1);
      ctx.translate(-vx * distanceBack, -vy * distanceBack);
      ctx.rotate(player.facing || 0);
      ctx.fillStyle = index % 2 ? `${armorColor}88` : `${weaponColor}77`;
      ctx.beginPath();
      ctx.roundRect(-15, -32, 30, 50, 8);
      ctx.fill();
      ctx.strokeStyle = `${weaponColor}66`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(12, -2);
      ctx.lineTo(46, -2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPlayerStanceDetails(
    player,
    weapon,
    armor,
    charm,
    armorColor,
    weaponColor,
    walk,
  ) {
    const moving = Math.abs(walk) > 0.2 || player.dashTime > 0;
    const legendary = [weapon, armor, charm].some(
      (item) => item?.rarity === "legend",
    );
    ctx.save();
    ctx.strokeStyle = "rgba(17,24,39,.58)";
    ctx.fillStyle = `${armorColor}aa`;
    ctx.lineWidth = 2;
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.roundRect(side * 12 - 5, -31 + walk * side, 10, 13, 3);
      ctx.fill();
      ctx.stroke();
    });
    ctx.strokeStyle = `${weaponColor}aa`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-16, 7 + walk * 1.5);
    ctx.quadraticCurveTo(-29, 16 + walk * 2, -25, 31);
    ctx.moveTo(16, 7 - walk * 1.5);
    ctx.quadraticCurveTo(29, 16 - walk * 2, 25, 31);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.26)";
    ctx.fillRect(-7, -28, 14, 4);
    ctx.fillStyle = `${weaponColor}88`;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(8, 1);
    ctx.lineTo(0, 10);
    ctx.lineTo(-8, 1);
    ctx.closePath();
    ctx.fill();
    if (moving) {
      ctx.strokeStyle = `${armorColor}77`;
      ctx.lineWidth = 2;
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.ellipse(
          side * 11,
          39 + walk * side,
          11,
          4,
          side * 0.18,
          0,
          Math.PI,
        );
        ctx.stroke();
      });
    }
    if (legendary) {
      ctx.strokeStyle = "rgba(248,248,113,.72)";
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.ellipse(0, -38, 23, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawPlayerRelicAura() {
    const relics = restoredRelicsForZone().slice(0, 3);
    if (!relics.length) return;
    const now = performance.now() / 1000;
    ctx.save();
    ctx.setLineDash([7, 8]);
    relics.forEach((relic, index) => {
      const angle = now * (0.45 + index * 0.12) + index * ((Math.PI * 2) / 3);
      const radius = 40 + index * 9;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * 15 - 16;
      ctx.strokeStyle = `${relic.color}66`;
      ctx.fillStyle = `${relic.color}aa`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -16, radius, 15 + index * 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      if (relic.key === "ward") {
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + 7, y - 2);
        ctx.lineTo(x + 5, y + 8);
        ctx.lineTo(x, y + 12);
        ctx.lineTo(x - 5, y + 8);
        ctx.lineTo(x - 7, y - 2);
      } else if (relic.key === "rift") {
        ctx.arc(x, y, 7, 0, Math.PI * 2);
      } else {
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + 7, y);
        ctx.lineTo(x, y + 8);
        ctx.lineTo(x - 7, y);
      }
      ctx.closePath();
      ctx.fill();
    });
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawPlayerActiveBuffAuras() {
    const buffs = activeBuffs();
    if (!buffs.length) return;
    const now = performance.now() / 1000;
    buffs.slice(0, 3).forEach((buff, index) => {
      const stats = buff.stats || {};
      const color = stats.dropChance
        ? "#f8f871"
        : stats.atk || stats.basicDamage || stats.skillDamage
          ? "#ff5f6d"
          : stats.def || stats.damageReduce
            ? "#53e2a8"
            : stats.xpBonus
              ? "#b7ecff"
              : "#d08cff";
      ctx.save();
      ctx.rotate(now * (index % 2 ? -0.9 : 0.9) + index);
      ctx.strokeStyle = `${color}77`;
      ctx.fillStyle = `${color}10`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5 + index * 2, 8]);
      ctx.beginPath();
      ctx.ellipse(0, -8, 34 + index * 9, 15 + index * 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    });
  }

  function drawPlayerFootwork(walk, dashing, armorColor) {
    ctx.save();
    ctx.strokeStyle = dashing ? "rgba(72,165,255,.75)" : `${armorColor}66`;
    ctx.lineWidth = dashing ? 4 : 2;
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.ellipse(
        side * 10,
        31 + walk * side * 2,
        dashing ? 18 : 12,
        5,
        side * 0.25,
        0,
        Math.PI * 1.55,
      );
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawPlayerFaceHighlights(weaponColor, armorColor, charm) {
    ctx.fillStyle = "#101827";
    ctx.beginPath();
    ctx.arc(-5, -42, 2, 0, Math.PI * 2);
    ctx.arc(6, -42, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `${weaponColor}bb`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -32);
    ctx.quadraticCurveTo(0, -25, 11, -32);
    ctx.stroke();
    ctx.fillStyle = `${armorColor}99`;
    ctx.beginPath();
    ctx.moveTo(-15, -46);
    ctx.lineTo(0, -62);
    ctx.lineTo(15, -46);
    ctx.lineTo(8, -49);
    ctx.lineTo(0, -42);
    ctx.lineTo(-8, -49);
    ctx.closePath();
    ctx.fill();
    if (charm) {
      const color = rarityInfo(charm).color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(-17, -28, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayerEquipmentCrest(
    weapon,
    armor,
    charm,
    weaponColor,
    armorColor,
  ) {
    const items = [weapon, armor, charm].filter(Boolean);
    if (!items.length) return;
    const legendaryCount = items.filter(
      (item) => item.rarity === "legend",
    ).length;
    const epicCount = items.filter((item) => item.rarity === "epic").length;
    ctx.save();
    ctx.strokeStyle = "rgba(17,24,39,.68)";
    ctx.lineWidth = 2;
    items.slice(0, 3).forEach((item, index) => {
      const color = rarityInfo(item).color;
      const x = -12 + index * 12;
      const y = -7 + Math.sin(performance.now() / 240 + index) * 1.5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x + 5, y);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x - 5, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (item.rarity === "legend") {
        ctx.strokeStyle = `${color}aa`;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(17,24,39,.68)";
      }
    });
    if (legendaryCount || epicCount >= 2) {
      const haloColor = legendaryCount ? "#f8f871" : "#d08cff";
      ctx.strokeStyle = `${haloColor}88`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.ellipse(0, -37, 27, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = `${weaponColor}aa`;
    ctx.fillStyle = `${armorColor}55`;
    ctx.beginPath();
    ctx.arc(0, -18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayerRuneOrbit() {
    const runes = equippedRuneIds();
    if (!runes.length) return;
    const now = performance.now() / 1000;
    ctx.save();
    runes.forEach((id, index) => {
      const item = ITEMS[id];
      const color = rarityInfo(item).color;
      const angle =
        now * (0.9 + index * 0.12) + (index / runes.length) * Math.PI * 2;
      const x = Math.cos(angle) * 48;
      const y = Math.sin(angle) * 18 - 18;
      ctx.fillStyle = `${color}cc`;
      ctx.strokeStyle = "rgba(255,255,255,.34)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        const px = x + Math.cos(a) * 7;
        const py = y + Math.sin(a) * 7;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawPlayerCharmOrbit(charm) {
    if (!charm) return;
    const color = rarityInfo(charm).color;
    const now = performance.now() / 1000;
    const x = Math.cos(now * 1.3) * 38;
    const y = Math.sin(now * 1.3) * 10 - 16;
    ctx.save();
    ctx.strokeStyle = `${color}88`;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.ellipse(0, -16, 40, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.38)";
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayerCloak(armor, armorColor, walk) {
    if (!armor) return;
    ctx.fillStyle = `${armorColor}44`;
    ctx.strokeStyle = `${armorColor}88`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, -26);
    ctx.quadraticCurveTo(-32, 6 + walk * 2, -20, 38);
    ctx.lineTo(0, 28 + walk * 2);
    ctx.lineTo(20, 38);
    ctx.quadraticCurveTo(32, 6 - walk * 2, 14, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawArmorPanels(armor, armorColor) {
    if (!armor) return;
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.fillRect(-8, -29, 16, 4);
    ctx.strokeStyle = `${armorColor}dd`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -20);
    ctx.lineTo(12, -20);
    ctx.moveTo(-9, -12);
    ctx.lineTo(9, -12);
    ctx.stroke();
    if (armor.rarity === "legend") {
      ctx.fillStyle = `${armorColor}55`;
      ctx.beginPath();
      ctx.arc(0, -22, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayerWeapon(weapon, weaponColor) {
    const legendary = weapon?.rarity === "legend";
    const reach = legendary ? 62 : weapon?.rarity === "epic" ? 54 : 46;
    ctx.strokeStyle = "rgba(17,24,39,.55)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(18 + reach, -1);
    ctx.stroke();
    ctx.strokeStyle = weaponColor;
    ctx.lineWidth = legendary ? 6 : 5;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(18 + reach, -1);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.fillRect(26, -5, Math.min(30, reach - 12), 2);
    ctx.fillStyle = "#111827";
    ctx.fillRect(10, -8, 9, 16);
    if (legendary) {
      ctx.strokeStyle = `${weaponColor}aa`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(18 + reach * 0.72, -1, 18, -0.4, 0.4);
      ctx.stroke();
    }
  }

  function drawPlayerAttackTrail(weapon, weaponColor) {
    const power = clamp(attackFlash / 0.34, 0, 1);
    const legendary = weapon?.rarity === "legend";
    const epic = weapon?.rarity === "epic";
    const outer = legendary ? 186 : epic ? 176 : 164;
    const inner = legendary ? 104 : 94;
    ctx.save();
    ctx.globalAlpha = 0.55 + power * 0.35;
    const trail = ctx.createRadialGradient(18, 0, inner * 0.25, 18, 0, outer);
    trail.addColorStop(0, `${weaponColor}22`);
    trail.addColorStop(0.55, `${weaponColor}99`);
    trail.addColorStop(1, "rgba(248,248,113,0)");
    ctx.strokeStyle = trail;
    ctx.lineWidth = legendary ? 13 : epic ? 11 : 9;
    ctx.beginPath();
    ctx.arc(8, 0, attackFlash > 0.24 ? outer : inner, -0.72, 0.72);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.66)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      12,
      0,
      attackFlash > 0.24 ? outer * 0.82 : inner * 0.82,
      -0.58,
      0.58,
    );
    ctx.stroke();
    if (legendary || epic) {
      ctx.fillStyle = legendary ? "#f8f871" : weaponColor;
      for (let i = 0; i < 4; i += 1) {
        const angle = -0.52 + i * 0.35 + power * 0.18;
        const radius = (attackFlash > 0.24 ? outer : inner) * (0.62 + i * 0.08);
        const x = Math.cos(angle) * radius + 8;
        const y = Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x + 4, y);
        ctx.lineTo(x, y + 5);
        ctx.lineTo(x - 4, y);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    attackFlash = Math.max(0, attackFlash - 0.04);
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
    const expedition = activeExpedition();
    if (expedition) {
      if (expedition.zone !== state.zone) {
        const direct = currentZone().portals.find(
          (portal) => portal.to === expedition.zone,
        );
        const portal = direct || currentZone().portals[0];
        return portal
          ? {
              x: portal.x,
              y: portal.y,
              label: "균열 방향",
            }
          : null;
      }
      const node = nearestExpeditionNode();
      if (node) {
        const meta = expeditionNodeMeta(node.kind);
        return { x: node.x, y: node.y, label: meta.label };
      }
      const expeditionEnemy =
        state.enemies.find((enemy) => enemy.expeditionBoss) ||
        state.enemies.find((enemy) => enemy.expedition);
      if (expeditionEnemy)
        return {
          x: expeditionEnemy.x,
          y: expeditionEnemy.y,
          label: expeditionEnemy.expeditionBoss ? "수호자" : "균열 목표",
        };
    }
    const namedHunt = activeNamedHunt();
    if (namedHunt) {
      if (namedHunt.zone !== state.zone) {
        const direct = currentZone().portals.find(
          (portal) => portal.to === namedHunt.zone,
        );
        const portal = direct || currentZone().portals[0];
        return portal
          ? {
              x: portal.x,
              y: portal.y,
              label: "강적 방향",
            }
          : null;
      }
      const namedEnemy = state.enemies.find(
        (enemy) => enemy.namedHuntId === namedHunt.id,
      );
      return namedEnemy
        ? { x: namedEnemy.x, y: namedEnemy.y, label: "네임드 강적" }
        : { x: namedHunt.x, y: namedHunt.y, label: "강적 소환지" };
    }
    const event = activeWorldEvent();
    if (event && !namedHunt) {
      const meta = worldEventMeta(event.kind);
      if (meta.interactive)
        return { x: event.x, y: event.y, label: meta.label };
      const eventEnemy = state.enemies.find((enemy) => enemy.eventTarget);
      return eventEnemy
        ? { x: eventEnemy.x, y: eventEnemy.y, label: meta.label }
        : { x: event.x, y: event.y, label: meta.label };
    }
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
      const alpha = Math.max(0, Math.min(1, effect.ttl / (effect.maxTtl || 1)));
      ctx.globalAlpha = alpha;
      if (effect.kind === "oath") {
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle || 0);
        ctx.strokeStyle = effect.color;
        ctx.fillStyle = `${effect.color}24`;
        ctx.lineWidth = effect.effectKind === "line" ? 10 : 5;
        if (effect.effectKind === "line") {
          ctx.beginPath();
          ctx.moveTo(18, -12);
          ctx.lineTo(effect.range || 280, 0);
          ctx.lineTo(18, 12);
          ctx.stroke();
        } else if (effect.effectKind === "ring") {
          ctx.beginPath();
          ctx.arc(
            0,
            -6,
            (effect.range || 160) * (1 - alpha * 0.25),
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.stroke();
        } else if (effect.effectKind === "burst") {
          const radius = (effect.range || 220) * (1 - alpha * 0.2);
          ctx.beginPath();
          for (let i = 0; i < 12; i += 1) {
            const a = (Math.PI * 2 * i) / 12;
            const r = i % 2 ? radius * 0.72 : radius;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, effect.range || 180, -0.74, 0.74);
          ctx.stroke();
        }
        ctx.restore();
        return;
      }
      if (effect.kind === "combatSpark") {
        const progress = 1 - alpha;
        const heavy =
          effect.sparkKind === "skillHit" ||
          effect.sparkKind === "bossHurt" ||
          effect.sparkKind === "bossTell";
        ctx.translate(effect.x, effect.y);
        ctx.rotate(effect.angle || 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (effect.sparkKind === "tell" || effect.sparkKind === "bossTell") {
          const radius = (heavy ? 38 : 26) + progress * (heavy ? 24 : 16);
          ctx.strokeStyle = heavy
            ? "rgba(255,186,90,.9)"
            : "rgba(255,95,109,.86)";
          ctx.fillStyle = heavy
            ? "rgba(255,186,90,.14)"
            : "rgba(255,95,109,.12)";
          ctx.lineWidth = heavy ? 5 : 3;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, -radius - 12);
          ctx.lineTo(radius + 12, 0);
          ctx.lineTo(0, radius + 12);
          ctx.lineTo(-radius - 12, 0);
          ctx.closePath();
          ctx.stroke();
        } else if (
          effect.sparkKind === "hurt" ||
          effect.sparkKind === "bossHurt"
        ) {
          const radius = (heavy ? 34 : 24) + progress * 20;
          ctx.strokeStyle = "rgba(255,95,109,.9)";
          ctx.fillStyle = "rgba(255,95,109,.14)";
          ctx.lineWidth = heavy ? 6 : 4;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,.78)";
          ctx.beginPath();
          ctx.moveTo(-radius * 0.56, -radius * 0.38);
          ctx.lineTo(radius * 0.5, radius * 0.44);
          ctx.moveTo(radius * 0.46, -radius * 0.42);
          ctx.lineTo(-radius * 0.5, radius * 0.38);
          ctx.stroke();
        } else {
          const length = heavy ? 54 : 38;
          ctx.strokeStyle = effect.color;
          ctx.lineWidth = heavy ? 7 : 5;
          for (let i = 0; i < (heavy ? 5 : 3); i += 1) {
            const offset = (i - 2) * 10 * (effect.spread || 1);
            ctx.beginPath();
            ctx.moveTo(-length * 0.35, offset - progress * 8);
            ctx.quadraticCurveTo(0, offset - 18, length * 0.58, offset + 4);
            ctx.stroke();
          }
          ctx.fillStyle = "#ffffff";
          for (let i = 0; i < (heavy ? 8 : 5); i += 1) {
            const angle = (Math.PI * 2 * i) / (heavy ? 8 : 5);
            const dotRadius = 18 + progress * (heavy ? 28 : 18);
            ctx.beginPath();
            ctx.arc(
              Math.cos(angle) * dotRadius,
              Math.sin(angle) * dotRadius * 0.55,
              heavy ? 3.2 : 2.4,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
        ctx.restore();
        return;
      }
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
    if (activeExpedition()?.zone === state.zone) {
      ctx.fillStyle = "#53e2a8";
      (state.expeditionNodes || []).forEach((node) => {
        ctx.beginPath();
        ctx.arc(x + node.x * sx, y + node.y * sy, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    restoredRelicsForZone(zone.id).forEach((relic) => {
      ctx.fillStyle = relic.color;
      ctx.beginPath();
      ctx.arc(x + relic.x * sx, y + relic.y * sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#b7ecff";
    visibleMemoryFragments().forEach((fragment) => {
      ctx.beginPath();
      ctx.arc(x + fragment.x * sx, y + fragment.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#ffba5a";
    visibleSecretLandmarks(zone.id).forEach((secret) => {
      ctx.beginPath();
      ctx.arc(x + secret.x * sx, y + secret.y * sy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#f8f871";
    visibleTreasureSites(zone.id).forEach((site) => {
      ctx.beginPath();
      ctx.arc(x + site.x * sx, y + site.y * sy, 3.6, 0, Math.PI * 2);
      ctx.fill();
    });
    visibleCampsites(zone.id).forEach((camp) => {
      ctx.fillStyle = camp.color;
      ctx.beginPath();
      ctx.arc(x + camp.x * sx, y + camp.y * sy, 3.8, 0, Math.PI * 2);
      ctx.fill();
    });
    const namedHunt = activeNamedHunt();
    if (namedHunt?.zone === zone.id) {
      ctx.fillStyle = namedHunt.color;
      ctx.beginPath();
      ctx.arc(x + namedHunt.x * sx, y + namedHunt.y * sy, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#53e2a8";
    forageNodesForZone(zone)
      .filter((node) => forageNodeReady(node))
      .forEach((node) => {
        ctx.beginPath();
        ctx.arc(x + node.x * sx, y + node.y * sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    const event = activeWorldEvent();
    if (event) {
      ctx.fillStyle = worldEventMeta(event.kind).color;
      ctx.beginPath();
      ctx.arc(x + event.x * sx, y + event.y * sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    state.drops
      .filter((drop) => drop.zone === zone.id)
      .forEach((drop) => {
        const item = ITEMS[drop.item];
        const strong =
          drop.kind === "quest" ||
          isGearItem(item) ||
          item?.type === "rune" ||
          ["epic", "legend"].includes(item?.rarity);
        const color =
          drop.kind === "quest"
            ? "#f8f871"
            : drop.kind === "item"
              ? rarityInfo(item).color
              : "#ffba5a";
        const px = x + drop.x * sx;
        const py = y + drop.y * sy;
        ctx.fillStyle = color;
        ctx.strokeStyle = strong ? "#eef6ff" : "rgba(255,255,255,.42)";
        ctx.lineWidth = strong ? 1.8 : 1;
        ctx.beginPath();
        if (strong) {
          ctx.moveTo(px, py - 4.8);
          ctx.lineTo(px + 4.8, py);
          ctx.lineTo(px, py + 4.8);
          ctx.lineTo(px - 4.8, py);
          ctx.closePath();
        } else {
          ctx.arc(px, py, 2.8, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
      });
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

  function showCombatSpark(x, y, color = "#fffbba", sparkKind = "slash") {
    const heavy =
      sparkKind === "skillHit" ||
      sparkKind === "bossHurt" ||
      sparkKind === "bossTell";
    const ttl = heavy ? 0.58 : 0.42;
    state.effects.push({
      kind: "combatSpark",
      sparkKind,
      x,
      y,
      color,
      ttl,
      maxTtl: ttl,
      angle: Math.random() * Math.PI * 2,
      spread: heavy ? 1.25 : 1,
    });
    state.effects = state.effects.slice(-80);
  }

  function showSkillEffect(art, hitCount = 0) {
    const player = state.player;
    state.effects.push({
      kind: "oath",
      effectKind: art.effectKind || "arc",
      x: player.x,
      y: player.y,
      angle: player.facing,
      range: art.range,
      color: hitCount ? art.color : "#a8bdd5",
      ttl: 0.42,
      maxTtl: 0.42,
    });
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
    if (h) return `${h}시간 ${m}분`;
    if (m) return `${m}분`;
    return `${total}초`;
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
      if (key === "k") attack(true, "cleave");
      if (key === "2") attack(true, "spear");
      if (key === "3") attack(true, "ward");
      if (key === "4") attack(true, "rupture");
      if (key === "e") interact();
      if (key === "shift") dash();
      if (key === "1") useItem("smallPotion");
      if (key === "i") openInventory();
      if (key === "q") openQuestLog();
      if (key === "g") openStats();
      if (key === "p") openSpecializations();
      if (key === "l") openExpedition();
      if (key === "c") openCrafting();
      if (key === "z") openAlchemy();
      if (key === "u") openEnhance();
      if (key === "b") openBestiary();
      if (key === "n") openContracts();
      if (key === "f") openBounties();
      if (key === "o") openCompanions();
      if (key === "x") openBonds();
      if (key === "r") openSanctuary();
      if (key === "y") openRunes();
      if (key === "v") openChronicles();
      if (key === "t") openTitles();
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
    ui.oathArts.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-oath-art]");
      if (button) attack(true, button.dataset.oathArt);
    });
    ui.quickGuide.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-quick-action]");
      if (button) runQuickGuideAction(button.dataset.quickAction);
    });
    ui.journey.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-quick-action]");
      if (button) runQuickGuideAction(button.dataset.quickAction);
    });
    document.querySelectorAll("[data-rpg-panel-toggle]").forEach((button) => {
      button.addEventListener("click", () =>
        toggleInfoPanel(button.dataset.rpgPanelToggle),
      );
    });
    document.getElementById("rpgSave").onclick = () => saveGame(true);
    document.getElementById("rpgQuest").onclick = openQuestLog;
    document.getElementById("rpgDecisions").onclick = openOathDecisions;
    document.getElementById("rpgSideStories").onclick = openSideStories;
    document.getElementById("rpgTrials").onclick = openRegionTrials;
    document.getElementById("rpgBag").onclick = openInventory;
    document.getElementById("rpgStatsButton").onclick = openStats;
    document.getElementById("rpgSpecialize").onclick = openSpecializations;
    document.getElementById("rpgTactics").onclick = openTactics;
    document.getElementById("rpgExpedition").onclick = openExpedition;
    document.getElementById("rpgEchoTrials").onclick = openEchoTrials;
    document.getElementById("rpgCrafting").onclick = openCrafting;
    document.getElementById("rpgAlchemy").onclick = openAlchemy;
    document.getElementById("rpgEnhance").onclick = openEnhance;
    document.getElementById("rpgContracts").onclick = openContracts;
    document.getElementById("rpgBounties").onclick = openBounties;
    document.getElementById("rpgArmory").onclick = openArmory;
    document.getElementById("rpgCampaigns").onclick = openCampaigns;
    document.getElementById("rpgHuntPlans").onclick = openHuntPlans;
    document.getElementById("rpgNamedHunts").onclick = openNamedHunts;
    document.getElementById("rpgCamps").onclick = openCamps;
    document.getElementById("rpgPatrols").onclick = openPatrols;
    document.getElementById("rpgTreasures").onclick = openTreasures;
    document.getElementById("rpgBestiary").onclick = openBestiary;
    document.getElementById("rpgCompanions").onclick = openCompanions;
    document.getElementById("rpgBonds").onclick = openBonds;
    document.getElementById("rpgSanctuary").onclick = openSanctuary;
    document.getElementById("rpgRunes").onclick = openRunes;
    document.getElementById("rpgChronicles").onclick = openChronicles;
    document.getElementById("rpgRelics").onclick = openRelics;
    document.getElementById("rpgTitles").onclick = openTitles;
    document.getElementById("rpgJournal").onclick = openJournal;
    document.getElementById("rpgGoalAudit").onclick = openGoalAudit;
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
      if (button.dataset.loadoutApply !== undefined)
        applyGearLoadout(button.dataset.loadoutApply);
      if (button.dataset.loadoutSave !== undefined)
        saveGearLoadout(button.dataset.loadoutSave);
      if (button.dataset.loadoutClear !== undefined)
        clearGearLoadout(button.dataset.loadoutClear);
      if (button.dataset.salvage) salvageGearItem(button.dataset.salvage);
      if (button.dataset.enhance) enhanceItem(button.dataset.enhance);
      if (button.dataset.armory) claimArmoryRecord(button.dataset.armory);
      if (button.dataset.armoryHelp !== undefined) openArmoryHelp();
      if (button.dataset.campaign) claimCampaign(button.dataset.campaign);
      if (button.dataset.campaignHelp !== undefined) openCampaignHelp();
      if (button.dataset.tactic) claimTacticManual(button.dataset.tactic);
      if (button.dataset.tacticHelp !== undefined) openTacticHelp();
      if (button.dataset.craft) craftRecipe(button.dataset.craft);
      if (button.dataset.alchemy) brewAlchemyRecipe(button.dataset.alchemy);
      if (button.dataset.runeEquip) equipRune(button.dataset.runeEquip);
      if (button.dataset.runeRemove !== undefined)
        removeRune(button.dataset.runeRemove);
      if (button.dataset.specialization)
        investSpecialization(button.dataset.specialization);
      if (button.dataset.expeditionStart)
        startExpedition(button.dataset.expeditionStart);
      if (button.dataset.expeditionAbandon !== undefined) abandonExpedition();
      if (button.dataset.echoStart) startEchoTrial(button.dataset.echoStart);
      if (button.dataset.echoAbandon !== undefined) abandonEchoTrial();
      if (button.dataset.contract) claimContract(button.dataset.contract);
      if (button.dataset.bounty) claimBounty(button.dataset.bounty);
      if (button.dataset.namedStart) startNamedHunt(button.dataset.namedStart);
      if (button.dataset.namedAbandon !== undefined) abandonNamedHunt();
      if (button.dataset.namedHelp !== undefined) openNamedHuntHelp();
      if (button.dataset.campHelp !== undefined) openCampHelp();
      if (button.dataset.campRest) {
        const camp = nearestCampsite();
        if (camp?.id === button.dataset.campRest) restAtCampsite(camp);
      }
      if (button.dataset.patrol) claimPatrolOperation(button.dataset.patrol);
      if (button.dataset.patrolHelp !== undefined) openPatrolHelp();
      if (button.dataset.huntSelect) selectHuntPlan(button.dataset.huntSelect);
      if (button.dataset.huntClaim) claimHuntPlan(button.dataset.huntClaim);
      if (button.dataset.huntAbandon !== undefined) abandonHuntPlan();
      if (button.dataset.decision)
        chooseOathDecision(
          button.dataset.decision,
          button.dataset.decisionPath,
        );
      if (button.dataset.regionTrial)
        claimRegionTrial(button.dataset.regionTrial);
      if (button.dataset.chronicle) claimChronicle(button.dataset.chronicle);
      if (button.dataset.relic) claimRelic(button.dataset.relic);
      if (button.dataset.companion) selectCompanion(button.dataset.companion);
      if (button.dataset.companionMission)
        claimCompanionMission(button.dataset.companionMission);
      if (button.dataset.bondGift) improveNpcBond(button.dataset.bondGift);
      if (button.dataset.sideStory) claimSideStory(button.dataset.sideStory);
      if (button.dataset.sanctuary) upgradeSanctuary(button.dataset.sanctuary);
      if (button.dataset.title) equipTitle(button.dataset.title);
      if (button.dataset.bestiary)
        claimBestiaryReward(button.dataset.bestiary, button.dataset.milestone);
      if (button.dataset.regionReward)
        claimRegionReward(
          button.dataset.regionReward,
          button.dataset.regionThreshold,
        );
      if (button.dataset.commendation)
        claimCommendation(button.dataset.commendation);
      if (button.dataset.actMastery) claimActMastery(button.dataset.actMastery);
      if (button.dataset.treasureHelp !== undefined) openTreasureHelp();
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
    syncTitleUnlocks(false);
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
