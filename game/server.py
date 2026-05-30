#!/usr/bin/env python3
"""Dependency-free LAN Arena HTTP/WebSocket server."""

from __future__ import annotations

import argparse
import asyncio
import base64
import hashlib
import json
import math
import mimetypes
import os
import random
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse


GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
ROOT = Path(__file__).resolve().parent
ARENA_WIDTH = 2600
ARENA_HEIGHT = 1600
PLAYER_RADIUS = 18
PLAYER_SPEED = 260
BULLET_RADIUS = 5
BULLET_SPEED = 650
BULLET_TTL = 1.6
FIRE_COOLDOWN = 0.22
RESPAWN_DELAY = 1.8
TICK_RATE = 30
ARENA_PICKUP_TARGET = 15
ARENA_WEAPONS: dict[str, dict[str, Any]] = {
    "blaster": {
        "damage": 25,
        "speed": BULLET_SPEED,
        "radius": BULLET_RADIUS,
        "ttl": BULLET_TTL,
        "cooldown": FIRE_COOLDOWN,
        "count": 1,
        "spread": 0.0,
        "splash": 0.0,
    },
    "spread": {
        "damage": 14,
        "speed": 610,
        "radius": 4.6,
        "ttl": 1.08,
        "cooldown": 0.42,
        "count": 5,
        "spread": 0.34,
        "splash": 0.0,
        "ammo": 12,
        "duration": 10.0,
    },
    "rail": {
        "damage": 42,
        "speed": 930,
        "radius": 4.0,
        "ttl": 1.22,
        "cooldown": 0.62,
        "count": 1,
        "spread": 0.0,
        "splash": 0.0,
        "ammo": 7,
        "duration": 11.0,
    },
    "rocket": {
        "damage": 34,
        "speed": 430,
        "radius": 8.0,
        "ttl": 1.85,
        "cooldown": 0.66,
        "count": 1,
        "spread": 0.0,
        "splash": 82.0,
        "ammo": 5,
        "duration": 12.0,
    },
}
ARENA_CONTROL_POINT_SPECS = [
    {"id": "alpha", "x": 650, "y": 520, "radius": 118, "label": "A"},
    {"id": "bravo", "x": 1300, "y": 800, "radius": 132, "label": "B"},
    {"id": "charlie", "x": 1990, "y": 1080, "radius": 118, "label": "C"},
]
ARENA_OBSTACLES = [
    {"x": 320, "y": 260, "w": 210, "h": 76},
    {"x": 760, "y": 460, "w": 170, "h": 92},
    {"x": 1230, "y": 245, "w": 240, "h": 82},
    {"x": 1740, "y": 420, "w": 210, "h": 96},
    {"x": 2160, "y": 675, "w": 250, "h": 86},
    {"x": 410, "y": 845, "w": 230, "h": 82},
    {"x": 990, "y": 930, "w": 190, "h": 105},
    {"x": 1540, "y": 1120, "w": 255, "h": 76},
    {"x": 2020, "y": 1180, "w": 210, "h": 120},
    {"x": 1830, "y": 250, "w": 118, "h": 220},
    {"x": 680, "y": 1270, "w": 240, "h": 90},
]
COLORS = [
    "#53e2a8",
    "#48a5ff",
    "#ffbc54",
    "#ff5f6d",
    "#b987ff",
    "#f8f871",
    "#55d6ff",
    "#ff8fd4",
]

FORTRESS_WIDTH = 2600
FORTRESS_HEIGHT = 980
FORTRESS_GRAVITY = 300
FORTRESS_TICK_RATE = 30
FORTRESS_MOVE_BUDGET_MAX = 130
FORTRESS_MOVE_COST = 10
FORTRESS_DEFAULT_WEAPON = "standard"
FORTRESS_WEAPONS: dict[str, dict[str, Any]] = {
    "standard": {
        "name": "표준탄",
        "speed": 1.0,
        "radius": 52,
        "damage": 34,
        "carve": 1.0,
        "color": "#111827",
    },
    "impact": {
        "name": "강타탄",
        "speed": 0.95,
        "radius": 42,
        "damage": 50,
        "carve": 0.82,
        "color": "#ff5f6d",
    },
    "burst": {
        "name": "광역탄",
        "speed": 0.92,
        "radius": 78,
        "damage": 26,
        "carve": 1.05,
        "color": "#69dcff",
    },
    "split": {
        "name": "분열탄",
        "speed": 1.02,
        "radius": 36,
        "damage": 22,
        "carve": 0.68,
        "color": "#b987ff",
        "splitAt": 0.72,
        "childRadius": 30,
        "childDamage": 17,
        "childCarve": 0.56,
    },
    "drill": {
        "name": "굴착탄",
        "speed": 1.05,
        "radius": 48,
        "damage": 30,
        "carve": 1.55,
        "color": "#8b5a2b",
    },
}

DEFENSE_WIDTH = 1536
DEFENSE_HEIGHT = 960
DEFENSE_CELL = 24
DEFENSE_COLUMNS = DEFENSE_WIDTH // DEFENSE_CELL
DEFENSE_ROWS = DEFENSE_HEIGHT // DEFENSE_CELL
DEFENSE_MAX_WAVE = 15
DEFENSE_BASE_HEALTH = 20
DEFENSE_START_RESOURCES = 180
DEFENSE_AUTO_START_SECONDS = 25
DEFENSE_BOSS_WAVES = {5, 10, 15}
DEFENSE_DEFAULT_MAP_ID = "classic"
DEFENSE_MAPS: dict[str, dict[str, Any]] = {
    "classic": {
        "name": "기본 우회로",
        "baseHealth": 20,
        "startResources": 180,
        "pathPoints": [(0, 19), (10, 19), (10, 8), (25, 8), (25, 30), (43, 30), (43, 14), (63, 14)],
    },
    "harbor": {
        "name": "항구 지그재그",
        "baseHealth": 22,
        "startResources": 170,
        "pathPoints": [(0, 9), (11, 9), (11, 32), (24, 32), (24, 12), (40, 12), (40, 27), (63, 27)],
    },
    "lava": {
        "name": "용암 협곡",
        "baseHealth": 18,
        "startResources": 200,
        "pathPoints": [(0, 29), (8, 29), (8, 6), (21, 6), (21, 35), (36, 35), (36, 16), (51, 16), (51, 24), (63, 24)],
    },
}
DEFENSE_PATH_POINTS = list(DEFENSE_MAPS[DEFENSE_DEFAULT_MAP_ID]["pathPoints"])
DEFENSE_TOWERS: dict[str, dict[str, Any]] = {
    "basic": {
        "name": "기본탄",
        "cost": 60,
        "range": 140,
        "damage": 17,
        "cooldown": 0.48,
        "color": "#62e6ff",
        "desc": "빠른 단일 공격",
    },
    "slow": {
        "name": "감속",
        "cost": 85,
        "range": 130,
        "damage": 8,
        "cooldown": 0.72,
        "slow": 1.4,
        "color": "#8be66f",
        "desc": "적 이동 속도 감소",
    },
    "blast": {
        "name": "폭발",
        "cost": 110,
        "range": 125,
        "damage": 13,
        "cooldown": 1.15,
        "splash": 58,
        "burn": 2.4,
        "burnDps": 8,
        "color": "#ffba5a",
        "desc": "범위 피해와 화상",
    },
    "sniper": {
        "name": "저격",
        "cost": 135,
        "range": 230,
        "damage": 55,
        "cooldown": 1.7,
        "mark": 2.6,
        "markBonus": 0.22,
        "color": "#c8f7ff",
        "desc": "긴 사거리와 취약 표식",
    },
    "boost": {
        "name": "증폭기",
        "cost": 95,
        "range": 115,
        "damage": 0,
        "cooldown": 9.9,
        "boost": 1.18,
        "color": "#d08cff",
        "desc": "주변 타워 강화",
    },
}
DEFENSE_ENEMY_TYPES: dict[str, dict[str, Any]] = {
    "normal": {
        "name": "일반",
        "health": 48,
        "healthGrowth": 17,
        "speed": 42,
        "speedGrowth": 2.8,
        "reward": 11,
        "rewardGrowth": 2,
        "damage": 1,
        "color": "#ff5f6d",
    },
    "runner": {
        "name": "질주",
        "healthScale": 0.72,
        "speedScale": 1.42,
        "rewardBonus": 2,
        "damage": 1,
        "color": "#ff8b52",
    },
    "tank": {
        "name": "중장갑",
        "healthScale": 1.75,
        "speedScale": 0.72,
        "rewardBonus": 7,
        "damage": 2,
        "color": "#b58cff",
    },
    "shield": {
        "name": "보호막",
        "healthScale": 1.12,
        "speedScale": 0.94,
        "shieldScale": 0.55,
        "rewardBonus": 9,
        "damage": 1,
        "color": "#6fe8ff",
    },
    "boss": {
        "name": "보스",
        "health": 620,
        "healthGrowth": 86,
        "speed": 28,
        "reward": 95,
        "rewardGrowth": 5,
        "damage": 4,
        "color": "#ffd166",
    },
}
DEFENSE_SKILLS: dict[str, dict[str, Any]] = {
    "airstrike": {
        "name": "포격 지원",
        "cost": 90,
        "cooldown": 18.0,
        "radius": 104.0,
        "damage": 145.0,
        "color": "#ffba5a",
        "desc": "전방 적 주변에 범위 피해",
    },
    "freeze": {
        "name": "빙결장",
        "cost": 70,
        "cooldown": 16.0,
        "radius": 118.0,
        "duration": 3.5,
        "color": "#69dcff",
        "desc": "전방 적 주변을 감속",
    },
    "repair": {
        "name": "긴급 수리",
        "cost": 55,
        "cooldown": 20.0,
        "heal": 4,
        "color": "#8be66f",
        "desc": "기지 체력 회복",
    },
}


def defense_cell_center(cell_x: int, cell_y: int) -> tuple[float, float]:
    return ((cell_x + 0.5) * DEFENSE_CELL, (cell_y + 0.5) * DEFENSE_CELL)


def build_defense_path_cells(points: list[tuple[int, int]]) -> set[tuple[int, int]]:
    cells: set[tuple[int, int]] = set()
    for (x1, y1), (x2, y2) in zip(points, points[1:]):
        step_x = 0 if x1 == x2 else (1 if x2 > x1 else -1)
        step_y = 0 if y1 == y2 else (1 if y2 > y1 else -1)
        x, y = x1, y1
        cells.add((x, y))
        while (x, y) != (x2, y2):
            x += step_x
            y += step_y
            cells.add((x, y))
    return cells


DEFENSE_PATH_CELLS = build_defense_path_cells(DEFENSE_PATH_POINTS)
DEFENSE_PATH_PIXELS = [defense_cell_center(x, y) for x, y in DEFENSE_PATH_POINTS]

PARTY_WIDTH = 2600
PARTY_HEIGHT = 1600
PARTY_PLAYER_RADIUS = 18
PARTY_GAME_TYPES = {"kart", "bomb", "snake", "coin"}
PARTY_GAME_CONFIGS: dict[str, dict[str, Any]] = {
    "kart": {
        "name": "카트 랠리",
        "goal": "3바퀴를 가장 먼저 완주하고 드리프트 미니부스터를 활용하세요.",
        "duration": 240,
        "laps": 3,
        "speed": 360,
        "track": [
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
    "bomb": {
        "name": "폭탄 그리드",
        "goal": "폭탄을 설치해 상대를 맞히고 오래 살아남으세요.",
        "duration": 180,
        "speed": 245,
    },
    "snake": {
        "name": "스네이크 배틀",
        "goal": "먹이를 모아 길어지고 벽과 꼬리를 피하며 순간 질주로 빈틈을 빠져나가세요.",
        "duration": 180,
        "speed": 205,
    },
    "coin": {
        "name": "코인 러시",
        "goal": "위험 구역을 피해 코인과 보석을 모으고 실드로 위기를 버티세요.",
        "duration": 150,
        "speed": 270,
    },
}


def party_clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def party_distance(ax: float, ay: float, bx: float, by: float) -> float:
    return math.hypot(ax - bx, ay - by)


def party_distance_to_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    abx = bx - ax
    aby = by - ay
    length_sq = abx * abx + aby * aby
    if length_sq <= 0:
        return party_distance(px, py, ax, ay)
    ratio = party_clamp(((px - ax) * abx + (py - ay) * aby) / length_sq, 0.0, 1.0)
    return party_distance(px, py, ax + abx * ratio, ay + aby * ratio)


def party_distance_to_polyline(px: float, py: float, points: list[list[int]]) -> float:
    if len(points) < 2:
        return 0.0
    distances: list[float] = []
    pairs = list(zip(points, points[1:])) + [(points[-1], points[0])]
    for start, end in pairs:
        distances.append(
            party_distance_to_segment(
                px,
                py,
                float(start[0]),
                float(start[1]),
                float(end[0]),
                float(end[1]),
            )
        )
    return min(distances)


def party_in_bomb_blast(px: float, py: float, bx: float, by: float, radius: float) -> bool:
    lane = 26.0
    if party_distance(px, py, bx, by) <= 34:
        return True
    horizontal = abs(py - by) <= lane and abs(px - bx) <= radius
    vertical = abs(px - bx) <= lane and abs(py - by) <= radius
    return horizontal or vertical


@dataclass
class Client:
    id: str
    writer: asyncio.StreamWriter
    room_id: str = "MAIN"
    name: str = "Player"
    color: str = "#53e2a8"
    x: float = 0
    y: float = 0
    angle: float = 0
    health: int = 100
    score: int = 0
    alive: bool = True
    respawn_at: float = 0
    last_fire: float = 0
    shield_until: float = 0
    haste_until: float = 0
    rapid_until: float = 0
    weapon: str = "blaster"
    weapon_until: float = 0
    weapon_ammo: int = 0
    input: dict[str, Any] = field(default_factory=dict)
    write_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


@dataclass
class Bullet:
    id: int
    owner_id: str
    x: float
    y: float
    vx: float
    vy: float
    color: str
    ttl: float = BULLET_TTL
    kind: str = "blaster"
    damage: int = 25
    radius: float = BULLET_RADIUS
    splash: float = 0.0


@dataclass
class ArenaPickup:
    id: int
    x: float
    y: float
    kind: str


@dataclass
class ArenaEffect:
    x: float
    y: float
    kind: str
    color: str
    ttl: float = 0.7
    text: str = ""


def create_arena_control_points() -> list[dict[str, Any]]:
    return [
        {
            **spec,
            "ownerId": "",
            "ownerName": "",
            "ownerColor": "",
            "capture": 0.0,
            "nextScoreAt": 0.0,
        }
        for spec in ARENA_CONTROL_POINT_SPECS
    ]


@dataclass
class ArenaRoom:
    id: str
    clients: dict[str, Client] = field(default_factory=dict)
    bullets: list[Bullet] = field(default_factory=list)
    pickups: list[ArenaPickup] = field(default_factory=list)
    effects: list[ArenaEffect] = field(default_factory=list)
    control_points: list[dict[str, Any]] = field(default_factory=create_arena_control_points)
    next_client_id: int = 1
    next_bullet_id: int = 1
    next_pickup_id: int = 1
    created_at: float = field(default_factory=time.time)


@dataclass
class FortressClient:
    id: str
    writer: asyncio.StreamWriter
    room_id: str = "MAIN"
    slot: int = -1
    connected_at: float = field(default_factory=time.time)
    write_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


@dataclass
class DefenseClient:
    id: str
    writer: asyncio.StreamWriter
    room_id: str = "MAIN"
    name: str = "Player"
    color: str = "#62e6ff"
    resources: int = DEFENSE_START_RESOURCES
    kills: int = 0
    score: int = 0
    skill_cooldowns: dict[str, float] = field(default_factory=dict)
    connected_at: float = field(default_factory=time.time)
    write_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


@dataclass
class DefenseTower:
    id: int
    owner_id: str
    tower_type: str
    cell_x: int
    cell_y: int
    level: int = 1
    cooldown_left: float = 0.0


@dataclass
class DefenseEnemy:
    id: int
    x: float
    y: float
    segment: int
    health: float
    max_health: float
    speed: float
    reward: int
    enemy_type: str = "normal"
    shield: float = 0.0
    max_shield: float = 0.0
    base_damage: int = 1
    slow_until: float = 0.0
    burn_until: float = 0.0
    burn_dps: float = 0.0
    burn_owner_id: str = ""
    marked_until: float = 0.0
    mark_bonus: float = 0.0
    enraged: bool = False


@dataclass
class DefenseShot:
    id: int
    x: float
    y: float
    target_x: float
    target_y: float
    color: str
    ttl: float = 0.18


@dataclass
class DefenseEffect:
    x: float
    y: float
    kind: str
    color: str
    ttl: float = 0.8
    text: str = ""


@dataclass
class PartyClient:
    id: str
    writer: asyncio.StreamWriter
    room_id: str
    game_type: str
    name: str = "Player"
    color: str = "#53e2a8"
    x: float = 0.0
    y: float = 0.0
    vx: float = 0.0
    vy: float = 0.0
    angle: float = 0.0
    score: int = 0
    lap: int = 0
    checkpoint: int = 0
    alive: bool = True
    input: dict[str, Any] = field(default_factory=dict)
    trail: list[tuple[float, float]] = field(default_factory=list)
    respawn_at: float = 0.0
    cooldown_until: float = 0.0
    boosted_until: float = 0.0
    shield_until: float = 0.0
    drift_charge: float = 0.0
    drifting: bool = False
    bomb_power: int = 0
    bomb_limit: int = 1
    coin_combo: int = 0
    coin_combo_until: float = 0.0
    magnet_until: float = 0.0
    frenzy_until: float = 0.0
    kart_pad_cooldowns: dict[str, float] = field(default_factory=dict)
    action_latched: bool = False
    connected_at: float = field(default_factory=time.time)
    write_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


@dataclass
class PartyPickup:
    id: int
    x: float
    y: float
    kind: str = "coin"
    value: int = 1


@dataclass
class PartyBomb:
    id: int
    owner_id: str
    x: float
    y: float
    ttl: float = 1.9
    blast_ttl: float = 0.0
    radius: float = 96.0


@dataclass
class PartyBlock:
    id: int
    x: float
    y: float
    size: float = 46.0


@dataclass
class PartyEffect:
    x: float
    y: float
    kind: str
    color: str
    ttl: float = 0.8
    text: str = ""


@dataclass
class HubClient:
    id: str
    writer: asyncio.StreamWriter
    name: str = "Guest"
    room_id: str = ""
    peer: str = ""
    runtime: str = ""
    page_host: str = ""
    page_port: str = ""
    game_host: str = ""
    game_port: str = ""
    connected_at: float = field(default_factory=time.time)
    write_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


@dataclass
class HubRoom:
    id: str
    name: str
    feature: str
    pin: str = ""
    host_id: str = ""
    created_at: float = field(default_factory=time.time)


class FortressMatch:
    def __init__(self, room_id: str = "MAIN") -> None:
        self.room_id = room_id
        self.clients: dict[str, FortressClient] = {}
        self.slots: list[str | None] = [None, None]
        self.next_client_id = 1
        self.terrain: list[int] = []
        self.players: list[dict[str, Any]] = []
        self.turn = 0
        self.wind = 0
        self.projectiles: list[dict[str, Any]] = []
        self.projectile: dict[str, Any] | None = None
        self.explosion: dict[str, Any] | None = None
        self.impact_marks: list[dict[str, Any]] = []
        self.supply_crates: list[dict[str, Any]] = []
        self.next_supply_id = 1
        self.turn_count = 1
        self.game_over = False
        self.status = ""
        self.turn_delay_at = 0.0
        self.reset()

    def create_client(self, writer: asyncio.StreamWriter) -> FortressClient:
        client = FortressClient(
            id=f"f{self.next_client_id}",
            writer=writer,
            room_id=self.room_id,
        )
        self.next_client_id += 1
        return client

    def add_client(self, client: FortressClient, role: str) -> None:
        self.clients[client.id] = client
        if role == "spectator":
            client.slot = -1
            return
        if role == "host" and self.slots[0] is None:
            self.reset()
            self.assign_slot(client, 0)
            return
        if self.slots[1] is None:
            self.assign_slot(client, 1)
            return
        if self.slots[0] is None:
            self.assign_slot(client, 0)

    def assign_slot(self, client: FortressClient, slot: int) -> None:
        previous = self.slots[slot]
        if previous and previous in self.clients:
            self.clients[previous].slot = -1
        self.slots[slot] = client.id
        client.slot = slot

    def remove_client(self, client: FortressClient) -> None:
        vacated_slot: int | None = None
        for index, client_id in enumerate(self.slots):
            if client_id == client.id:
                self.slots[index] = None
                vacated_slot = index
        self.clients.pop(client.id, None)
        if vacated_slot is not None:
            self.promote_spectator(vacated_slot)
        if not self.ready():
            self.set_projectiles([])
            self.turn_delay_at = 0.0

    def promote_spectator(self, slot: int) -> None:
        spectator = min(
            (client for client in self.clients.values() if client.slot < 0),
            key=lambda client: client.connected_at,
            default=None,
        )
        if not spectator:
            return
        self.assign_slot(spectator, slot)
        self.status = f"관전자가 P{slot + 1}로 참여했습니다."

    def ready(self) -> bool:
        return all(self.slots)

    def summary(self) -> dict[str, Any]:
        player_count = sum(1 for slot in self.slots if slot)
        spectator_count = sum(1 for client in self.clients.values() if client.slot < 0)
        return {
            "gameCount": len(self.clients),
            "playerCount": player_count,
            "spectatorCount": spectator_count,
            "ready": self.ready(),
        }

    def reset(self) -> None:
        self.players = [
            self.create_player("P1", "#53e2a8", 260, 45, 8, 82),
            self.create_player("P2", "#ffbc54", 2340, 135, 98, 172),
        ]
        self.build_terrain()
        self.place_players()
        self.turn = 0
        self.wind = self.random_wind()
        self.set_projectiles([])
        self.explosion = None
        self.impact_marks = []
        self.supply_crates = []
        self.next_supply_id = 1
        self.turn_count = 1
        self.spawn_supply_crate(force=True)
        self.game_over = False
        self.turn_delay_at = 0.0
        self.status = "P1 턴. 이동, 포각, 파워를 조절하세요."

    def create_player(
        self,
        name: str,
        color: str,
        x: int,
        angle: int,
        min_angle: int,
        max_angle: int,
    ) -> dict[str, Any]:
        return {
            "name": name,
            "color": color,
            "x": x,
            "y": 0,
            "angle": angle,
            "minAngle": min_angle,
            "maxAngle": max_angle,
            "power": 60,
            "moveLeft": FORTRESS_MOVE_BUDGET_MAX,
            "weapon": FORTRESS_DEFAULT_WEAPON,
            "health": 100,
            "shield": False,
            "fallDamage": 0,
            "fallFlash": 0.0,
            "activeItem": "",
            "items": {"repair": 1, "shield": 1, "power": 1},
        }

    def random_wind(self) -> int:
        return round((random.random() * 2 - 1) * 70)

    def build_terrain(self) -> None:
        self.terrain = []
        for x in range(FORTRESS_WIDTH + 1):
            y = (
                700
                + math.sin(x / 135) * 62
                + math.sin(x / 57) * 28
                + math.sin(x / 310) * 48
            )
            self.terrain.append(self.clamp(round(y), 520, FORTRESS_HEIGHT - 85))
        for _ in range(4):
            for x in range(1, len(self.terrain) - 1):
                self.terrain[x] = round(
                    (self.terrain[x - 1] + self.terrain[x] * 2 + self.terrain[x + 1])
                    / 4
                )

    def terrain_at(self, x: float) -> int:
        return self.terrain[self.clamp(round(x), 0, FORTRESS_WIDTH)]

    def place_players(self) -> None:
        for player in self.players:
            player["y"] = self.terrain_at(player["x"]) - 18
        self.place_supply_crates()

    def place_supply_crates(self) -> None:
        for crate in self.supply_crates:
            crate["y"] = self.terrain_at(float(crate["x"])) - 27

    def spawn_supply_crate(self, force: bool = False) -> None:
        if not force and (len(self.supply_crates) >= 3 or random.random() > 0.58):
            return
        for _ in range(40):
            x = random.uniform(360, FORTRESS_WIDTH - 360)
            if all(abs(x - player["x"]) > 170 for player in self.players):
                break
        else:
            x = FORTRESS_WIDTH / 2
        kind = random.choices(
            ["repair", "shield", "power"],
            weights=[0.46, 0.28, 0.26],
            k=1,
        )[0]
        self.supply_crates.append(
            {
                "id": self.next_supply_id,
                "x": round(x, 1),
                "y": self.terrain_at(x) - 27,
                "kind": kind,
            }
        )
        self.next_supply_id += 1

    def current_player(self) -> dict[str, Any]:
        return self.players[self.turn]

    def set_projectiles(self, projectiles: list[dict[str, Any]]) -> None:
        self.projectiles = projectiles
        self.projectile = projectiles[0] if projectiles else None

    def has_projectiles(self) -> bool:
        return bool(self.projectiles)

    def weapon_config(self, key: str | None) -> dict[str, Any]:
        return FORTRESS_WEAPONS.get(str(key or ""), FORTRESS_WEAPONS[FORTRESS_DEFAULT_WEAPON])

    def weapon_key(self, key: str | None) -> str:
        return str(key or "") if str(key or "") in FORTRESS_WEAPONS else FORTRESS_DEFAULT_WEAPON

    def handle_message(self, client: FortressClient, raw: str) -> None:
        try:
            message = json.loads(raw)
        except json.JSONDecodeError:
            return
        if message.get("type") != "fortress_action":
            return
        self.handle_action(client, message)

    def handle_action(self, client: FortressClient, message: dict[str, Any]) -> None:
        action = str(message.get("action") or "")
        if action == "reset" and client.slot in (0, 1):
            self.reset()
            return
        if (
            client.slot != self.turn
            or not self.ready()
            or self.game_over
            or self.has_projectiles()
            or self.turn_delay_at
        ):
            return
        if action == "move":
            self.move_player(self.safe_float(message.get("delta"), 0))
        elif action == "angle":
            self.adjust_angle(self.safe_float(message.get("delta"), 0))
        elif action == "power":
            self.adjust_power(self.safe_float(message.get("delta"), 0))
        elif action == "weapon":
            self.select_weapon(str(message.get("weapon") or ""))
        elif action == "fire":
            self.fire()
        elif action == "item":
            self.use_item(str(message.get("item") or ""))

    def move_player(self, delta: float) -> None:
        player = self.current_player()
        other = self.players[1 - self.turn]
        if int(player.get("moveLeft", 0)) < FORTRESS_MOVE_COST:
            self.status = f"{player['name']} 이동 게이지가 부족합니다."
            return
        delta = self.clamp(delta, -20, 20)
        next_x = self.clamp(player["x"] + delta, 50, FORTRESS_WIDTH - 50)
        if abs(next_x - other["x"]) < 72:
            return
        player["x"] = next_x
        player["y"] = self.terrain_at(player["x"]) - 18
        player["moveLeft"] = max(0, int(player.get("moveLeft", 0)) - FORTRESS_MOVE_COST)
        self.collect_supply_crates(player)

    def adjust_angle(self, delta: float) -> None:
        player = self.current_player()
        player["angle"] = self.clamp(
            player["angle"] + delta,
            player["minAngle"],
            player["maxAngle"],
        )

    def adjust_power(self, delta: float) -> None:
        player = self.current_player()
        player["power"] = self.clamp(player["power"] + delta, 20, 100)

    def select_weapon(self, weapon: str) -> None:
        weapon = self.weapon_key(weapon)
        player = self.current_player()
        player["weapon"] = weapon
        self.status = f"{player['name']} {self.weapon_config(weapon)['name']} 선택."

    def use_item(self, item: str) -> None:
        player = self.current_player()
        items = player["items"]
        if item not in items or items[item] <= 0:
            return
        if item == "repair":
            items["repair"] -= 1
            player["health"] = min(100, player["health"] + 25)
            self.status = f"{player['name']} 체력 25 회복."
            self.finish_turn_soon()
            return
        if item == "shield":
            items["shield"] -= 1
            player["shield"] = True
            self.status = f"{player['name']} 보호막 사용."
            self.finish_turn_soon()
            return
        player["activeItem"] = "" if player["activeItem"] == "power" else "power"
        self.status = (
            f"{player['name']} 강화탄 장전."
            if player["activeItem"]
            else f"{player['name']} 강화탄 취소."
        )

    def collect_supply_crates(self, player: dict[str, Any]) -> None:
        remaining: list[dict[str, Any]] = []
        collected: dict[str, Any] | None = None
        for crate in self.supply_crates:
            if collected is None and math.hypot(player["x"] - crate["x"], player["y"] - crate["y"]) < 42:
                collected = crate
                continue
            remaining.append(crate)
        self.supply_crates = remaining
        if not collected:
            return
        kind = str(collected.get("kind") or "")
        if kind not in player["items"]:
            kind = "repair"
        player["items"][kind] = int(player["items"].get(kind, 0)) + 1
        label = {"repair": "수리", "shield": "보호막", "power": "강화탄"}[kind]
        self.status = f"{player['name']} 보급상자 획득: {label} +1"

    def fire(self) -> None:
        player = self.current_player()
        weapon_key = self.weapon_key(player.get("weapon"))
        weapon = self.weapon_config(weapon_key)
        radians = (player["angle"] * math.pi) / 180
        speed = (145 + player["power"] * 5.1) * float(weapon["speed"])
        power_shot = player["activeItem"] == "power" and player["items"]["power"] > 0
        if power_shot:
            player["items"]["power"] -= 1
        player["activeItem"] = ""
        self.set_projectiles(
            [
                self.create_projectile(
                    owner=self.turn,
                    x=player["x"] + math.cos(radians) * 31,
                    y=player["y"] - 21 - math.sin(radians) * 31,
                    vx=math.cos(radians) * speed,
                    vy=-math.sin(radians) * speed,
                    weapon_key=weapon_key,
                    powered=power_shot,
                )
            ]
        )
        self.status = f"{player['name']} {weapon['name']} 발사."

    def create_projectile(
        self,
        owner: int,
        x: float,
        y: float,
        vx: float,
        vy: float,
        weapon_key: str,
        powered: bool = False,
        split_done: bool = False,
        radius: float | None = None,
        damage: float | None = None,
        carve: float | None = None,
        age: float = 0.0,
    ) -> dict[str, Any]:
        weapon_key = self.weapon_key(weapon_key)
        weapon = self.weapon_config(weapon_key)
        boost = 1.22 if powered else 1.0
        return {
            "owner": owner,
            "x": x,
            "y": y,
            "vx": vx,
            "vy": vy,
            "weapon": weapon_key,
            "color": weapon["color"],
            "radius": radius if radius is not None else round(float(weapon["radius"]) * boost),
            "damage": damage if damage is not None else round(float(weapon["damage"]) * boost),
            "carve": carve if carve is not None else float(weapon["carve"]) * (1.14 if powered else 1.0),
            "splitAt": weapon.get("splitAt", 0),
            "splitDone": split_done,
            "age": age,
            "trail": [(x, y)],
        }

    def finish_turn_soon(self) -> None:
        self.turn_delay_at = time.monotonic() + 0.65

    def next_turn(self) -> None:
        self.current_player()["activeItem"] = ""
        self.turn = 1 - self.turn
        self.turn_count += 1
        self.current_player()["moveLeft"] = FORTRESS_MOVE_BUDGET_MAX
        self.wind = self.random_wind()
        if self.turn_count % 2 == 0:
            self.spawn_supply_crate()
        self.turn_delay_at = 0.0
        self.status = f"{self.current_player()['name']} 턴. 이동, 포각, 파워를 조절하세요."

    def update(self, dt: float, now: float) -> None:
        if self.turn_delay_at and now >= self.turn_delay_at and not self.projectile:
            self.next_turn()
        if self.ready():
            self.update_projectiles(dt)
        for player in self.players:
            player["fallFlash"] = max(0.0, float(player.get("fallFlash", 0.0)) - dt)
        if self.explosion:
            self.explosion["age"] += dt
            if self.explosion["age"] > 0.55:
                self.explosion = None

    def update_projectiles(self, dt: float) -> None:
        active: list[dict[str, Any]] = []
        exploded = False
        for shot in list(self.projectiles):
            shot["age"] += dt
            trail = list(shot.get("trail") or [])
            trail.append((shot["x"], shot["y"]))
            shot["trail"] = trail[-22:]
            shot["vx"] += self.wind * 0.22 * dt
            shot["vy"] += FORTRESS_GRAVITY * dt
            shot["x"] += shot["vx"] * dt
            shot["y"] += shot["vy"] * dt

            if self.should_split_projectile(shot):
                active.extend(self.split_projectile(shot))
                continue

            if self.projectile_hit_player(shot):
                exploded = True
                continue

            if shot["x"] < 0 or shot["x"] > FORTRESS_WIDTH or shot["y"] > FORTRESS_HEIGHT:
                self.explode_projectile(
                    shot,
                    self.clamp(shot["x"], 0, FORTRESS_WIDTH),
                    self.clamp(shot["y"], 0, FORTRESS_HEIGHT),
                )
                exploded = True
                continue

            if shot["y"] >= self.terrain_at(shot["x"]):
                self.explode_projectile(shot, shot["x"], shot["y"])
                exploded = True
                continue

            active.append(shot)

        self.set_projectiles([] if self.game_over else active)
        if exploded and not self.game_over and not self.projectiles:
            self.finish_turn_soon()

    def should_split_projectile(self, shot: dict[str, Any]) -> bool:
        return bool(shot.get("splitAt")) and not shot.get("splitDone") and shot["age"] >= shot["splitAt"]

    def split_projectile(self, shot: dict[str, Any]) -> list[dict[str, Any]]:
        speed = math.hypot(shot["vx"], shot["vy"]) * 0.92
        angle = math.atan2(shot["vy"], shot["vx"])
        weapon = self.weapon_config("split")
        self.status = "분열탄이 갈라졌습니다."
        return [
            self.create_projectile(
                owner=shot["owner"],
                x=shot["x"],
                y=shot["y"],
                vx=math.cos(angle + offset) * speed,
                vy=math.sin(angle + offset) * speed,
                weapon_key="split",
                split_done=True,
                radius=float(weapon["childRadius"]),
                damage=float(weapon["childDamage"]),
                carve=float(weapon["childCarve"]),
                age=shot["age"],
            )
            for offset in (-0.18, 0, 0.18)
        ]

    def projectile_hit_player(self, shot: dict[str, Any]) -> bool:
        for index, player in enumerate(self.players):
            if index == shot["owner"] and shot["age"] < 0.18:
                continue
            if math.hypot(shot["x"] - player["x"], shot["y"] - player["y"]) <= 24:
                self.explode_projectile(shot, shot["x"], shot["y"])
                return True
        return False

    def explode_projectile(self, shot: dict[str, Any], x: float, y: float) -> None:
        previous_y = [float(player["y"]) for player in self.players]
        self.explosion = {"x": x, "y": y, "radius": shot["radius"], "age": 0.0}
        self.impact_marks.append(
            {
                "x": x,
                "y": y,
                "radius": shot["radius"],
                "weapon": self.weapon_key(shot.get("weapon")),
                "color": shot.get("color")
                or self.weapon_config(str(shot.get("weapon") or ""))["color"],
            }
        )
        self.impact_marks = self.impact_marks[-18:]
        self.carve_terrain(x, y, shot["radius"], shot.get("carve", 1.0))
        self.apply_explosion_damage(x, y, shot["radius"], shot["damage"])
        self.place_players()
        self.apply_fall_damage(previous_y)

    def carve_terrain(self, cx: float, cy: float, radius: float, carve: float = 1.0) -> None:
        start = self.clamp(math.floor(cx - radius), 0, FORTRESS_WIDTH)
        end = self.clamp(math.ceil(cx + radius), 0, FORTRESS_WIDTH)
        for x in range(start, end + 1):
            dx = x - cx
            depth = math.sqrt(max(0, radius * radius - dx * dx)) * 0.72 * carve
            self.terrain[x] = self.clamp(
                max(self.terrain[x], round(cy + depth)),
                0,
                FORTRESS_HEIGHT - 30,
            )

    def apply_explosion_damage(
        self, cx: float, cy: float, radius: float, max_damage: float
    ) -> None:
        hits: list[str] = []
        for player in self.players:
            distance = math.hypot(player["x"] - cx, player["y"] - cy)
            if distance > radius + 24:
                continue
            damage = round(max_damage * (1 - min(distance, radius) / radius))
            damage = max(8, damage)
            if player["shield"]:
                damage = math.ceil(damage * 0.45)
                player["shield"] = False
            player["health"] = max(0, player["health"] - damage)
            hits.append(f"{player['name']} -{damage}")

        self.status = ", ".join(hits) if hits else "빗나감."
        loser = next((player for player in self.players if player["health"] <= 0), None)
        if loser:
            self.game_over = True
            winner = next(player for player in self.players if player is not loser)
            self.status = f"{winner['name']} 승리. R 키로 다시 시작."

    def apply_fall_damage(self, previous_y: list[float]) -> None:
        if self.game_over:
            return
        hits: list[str] = []
        for index, player in enumerate(self.players):
            fall = float(player["y"]) - previous_y[index]
            if fall < 42 or player["health"] <= 0:
                player["fallDamage"] = 0
                continue
            damage = min(28, max(4, round((fall - 32) / 6)))
            if player["shield"]:
                damage = math.ceil(damage * 0.45)
                player["shield"] = False
            player["health"] = max(0, player["health"] - damage)
            player["fallDamage"] = damage
            player["fallFlash"] = 1.05
            hits.append(f"{player['name']} 낙하 -{damage}")
        if hits:
            self.status = (
                f"{self.status} · {', '.join(hits)}"
                if self.status
                else ", ".join(hits)
            )
        loser = next((player for player in self.players if player["health"] <= 0), None)
        if loser:
            self.game_over = True
            winner = next(player for player in self.players if player is not loser)
            self.status = f"{winner['name']} 승리. R 키로 다시 시작."

    def status_text(self) -> str:
        if not self.ready():
            return "상대를 기다리는 중입니다."
        return self.status

    def state(self) -> dict[str, Any]:
        return {
            "type": "fortress_state",
            "world": {"width": FORTRESS_WIDTH, "height": FORTRESS_HEIGHT},
            "terrain": self.terrain,
            "players": [
                {
                    **player,
                    "connected": self.slots[index] is not None,
                    "x": round(player["x"], 2),
                    "y": round(player["y"], 2),
                    "angle": round(player["angle"], 2),
                    "power": round(player["power"], 2),
                    "moveLeft": int(player.get("moveLeft", FORTRESS_MOVE_BUDGET_MAX)),
                    "weapon": self.weapon_key(player.get("weapon")),
                    "items": dict(player["items"]),
                }
                for index, player in enumerate(self.players)
            ],
            "turn": self.turn,
            "wind": self.wind,
            "projectile": self.visible_projectile(),
            "projectiles": self.visible_projectiles(),
            "explosion": self.visible_explosion(),
            "impactMarks": self.visible_impact_marks(),
            "supplyCrates": self.visible_supply_crates(),
            "gameOver": self.game_over,
            "ready": self.ready(),
            "turnLocked": bool(self.turn_delay_at),
            "status": self.status_text(),
        }

    def visible_projectile(self) -> dict[str, Any] | None:
        projectiles = self.visible_projectiles()
        return projectiles[0] if projectiles else None

    def visible_projectiles(self) -> list[dict[str, Any]]:
        return [
            {
                "owner": shot["owner"],
                "x": round(shot["x"], 2),
                "y": round(shot["y"], 2),
                "vx": round(shot["vx"], 2),
                "vy": round(shot["vy"], 2),
                "radius": shot["radius"],
                "damage": shot["damage"],
                "weapon": self.weapon_key(shot.get("weapon")),
                "color": shot.get("color"),
                "age": round(shot["age"], 3),
                "trail": [
                    [round(float(x), 2), round(float(y), 2)]
                    for x, y in shot.get("trail", [])[-22:]
                ],
            }
            for shot in self.projectiles
        ]

    def visible_explosion(self) -> dict[str, Any] | None:
        if not self.explosion:
            return None
        return {
            "x": round(self.explosion["x"], 2),
            "y": round(self.explosion["y"], 2),
            "radius": self.explosion["radius"],
            "age": round(self.explosion["age"], 3),
        }

    def visible_impact_marks(self) -> list[dict[str, Any]]:
        return [
            {
                "x": round(mark["x"], 2),
                "y": round(mark["y"], 2),
                "radius": round(mark["radius"], 2),
                "weapon": self.weapon_key(mark.get("weapon")),
                "color": mark.get("color"),
            }
            for mark in self.impact_marks[-18:]
        ]

    def visible_supply_crates(self) -> list[dict[str, Any]]:
        return [
            {
                "id": int(crate["id"]),
                "x": round(float(crate["x"]), 2),
                "y": round(float(crate["y"]), 2),
                "kind": str(crate.get("kind") or "repair"),
            }
            for crate in self.supply_crates
        ]

    def safe_float(self, value: Any, fallback: float) -> float:
        try:
            result = float(value)
        except (TypeError, ValueError):
            return fallback
        return result if math.isfinite(result) else fallback

    def clamp(self, value: float, minimum: float, maximum: float) -> Any:
        return max(minimum, min(maximum, value))


class DefenseRoom:
    def __init__(self, room_id: str = "MAIN") -> None:
        self.room_id = room_id
        self.clients: dict[str, DefenseClient] = {}
        self.host_id = ""
        self.next_client_id = 1
        self.next_tower_id = 1
        self.next_enemy_id = 1
        self.next_shot_id = 1
        self.towers: dict[int, DefenseTower] = {}
        self.enemies: list[DefenseEnemy] = []
        self.shots: list[DefenseShot] = []
        self.effects: list[DefenseEffect] = []
        self.wave = 0
        self.phase = "build"
        self.map_id = DEFENSE_DEFAULT_MAP_ID
        self.map_name = str(DEFENSE_MAPS[DEFENSE_DEFAULT_MAP_ID]["name"])
        self.path_points = list(DEFENSE_MAPS[DEFENSE_DEFAULT_MAP_ID]["pathPoints"])
        self.path_cells = build_defense_path_cells(self.path_points)
        self.path_pixels = [defense_cell_center(x, y) for x, y in self.path_points]
        self.base_health_max = DEFENSE_BASE_HEALTH
        self.base_health = self.base_health_max
        self.start_resources = DEFENSE_START_RESOURCES
        self.max_wave = DEFENSE_MAX_WAVE
        self.spawn_remaining = 0
        self.spawn_total = 0
        self.spawn_timer = 0.0
        self.auto_start_at = 0.0
        self.last_ping: dict[str, Any] | None = None
        self.status = "타워를 배치하고 방장이 웨이브를 시작하세요."

    def apply_map(self, map_id: str) -> None:
        config = DEFENSE_MAPS.get(map_id, DEFENSE_MAPS[DEFENSE_DEFAULT_MAP_ID])
        self.map_id = map_id if map_id in DEFENSE_MAPS else DEFENSE_DEFAULT_MAP_ID
        self.map_name = str(config["name"])
        self.path_points = list(config["pathPoints"])
        self.path_cells = build_defense_path_cells(self.path_points)
        self.path_pixels = [defense_cell_center(x, y) for x, y in self.path_points]
        self.base_health_max = int(config.get("baseHealth", DEFENSE_BASE_HEALTH))
        self.base_health = self.base_health_max
        self.start_resources = int(config.get("startResources", DEFENSE_START_RESOURCES))

    def configure(self, client: DefenseClient, map_id: str) -> str:
        if client.id != self.host_id:
            return "방장만 맵을 변경할 수 있습니다."
        if self.wave > 0 or self.towers or self.phase != "build":
            return "맵은 1웨이브 시작 전, 타워를 배치하기 전에만 변경할 수 있습니다."
        if map_id not in DEFENSE_MAPS:
            return "알 수 없는 맵입니다."
        self.apply_map(map_id)
        for player in self.clients.values():
            player.resources = self.start_resources
            player.kills = 0
            player.score = 0
        self.status = f"{self.map_name} 맵이 선택되었습니다."
        self.add_effect(
            DEFENSE_WIDTH / 2,
            DEFENSE_HEIGHT / 2,
            "map",
            "#62e6ff",
            0.9,
            self.map_name,
        )
        return ""

    def create_client(self, writer: asyncio.StreamWriter) -> DefenseClient:
        client = DefenseClient(
            id=f"d{self.next_client_id}",
            writer=writer,
            room_id=self.room_id,
            color=COLORS[(self.next_client_id - 1) % len(COLORS)],
            resources=self.start_resources,
        )
        self.next_client_id += 1
        return client

    def add_client(self, client: DefenseClient) -> None:
        self.clients[client.id] = client
        self.ensure_host()

    def remove_client(self, client: DefenseClient) -> None:
        self.clients.pop(client.id, None)
        if client.id == self.host_id:
            self.host_id = ""
        self.ensure_host()

    def ensure_host(self) -> None:
        if self.host_id in self.clients:
            return
        oldest = sorted(self.clients.values(), key=lambda client: client.connected_at)
        self.host_id = oldest[0].id if oldest else ""

    def summary(self) -> dict[str, Any]:
        return {
            "gameCount": len(self.clients),
            "playerCount": len(self.clients),
            "spectatorCount": 0,
            "ready": bool(self.clients),
        }

    def start_wave(self, client: DefenseClient) -> str:
        if client.id != self.host_id:
            return "방장만 웨이브를 시작할 수 있습니다."
        return self.begin_wave()

    def begin_wave(self) -> str:
        if self.phase == "wave":
            return "이미 웨이브가 진행 중입니다."
        if self.phase in {"win", "defeat"}:
            return "게임이 끝났습니다. 새 방을 만들어 다시 시작하세요."
        if self.wave >= self.max_wave:
            return "모든 웨이브를 완료했습니다."
        self.wave += 1
        self.phase = "wave"
        self.auto_start_at = 0.0
        self.spawn_remaining = self.wave_spawn_count(self.wave)
        self.spawn_total = self.spawn_remaining
        self.spawn_timer = 0.0
        self.status = f"{self.wave} 웨이브 시작."
        start_x, start_y = self.path_pixels[0]
        self.add_effect(start_x, start_y, "wave", "#ffd166", 1.0, f"W{self.wave}")
        return ""

    def schedule_auto_start(self) -> None:
        if self.phase == "build" and 0 < self.wave < self.max_wave:
            self.auto_start_at = time.time() + DEFENSE_AUTO_START_SECONDS
        else:
            self.auto_start_at = 0.0

    def build_tower(
        self, client: DefenseClient, tower_type: str, cell_x: int, cell_y: int
    ) -> str:
        tower_config = DEFENSE_TOWERS.get(tower_type)
        if not tower_config:
            return "알 수 없는 타워입니다."
        if self.phase != "build":
            return "웨이브 사이 건설 시간에만 타워를 지을 수 있습니다."
        if not self.can_place(cell_x, cell_y):
            return "이 위치에는 타워를 지을 수 없습니다."
        cost = int(tower_config["cost"])
        if client.resources < cost:
            return "자원이 부족합니다."
        client.resources -= cost
        tower = DefenseTower(
            id=self.next_tower_id,
            owner_id=client.id,
            tower_type=tower_type,
            cell_x=cell_x,
            cell_y=cell_y,
        )
        self.towers[tower.id] = tower
        self.next_tower_id += 1
        tower_x, tower_y = defense_cell_center(cell_x, cell_y)
        self.add_effect(
            tower_x,
            tower_y,
            "build",
            str(tower_config["color"]),
            0.7,
            "BUILD",
        )
        self.status = f"{client.name}님이 {tower_config['name']} 타워를 배치했습니다."
        return ""

    def upgrade_tower(self, client: DefenseClient, tower_id: int) -> str:
        tower = self.towers.get(tower_id)
        if not tower:
            return "타워를 찾을 수 없습니다."
        if tower.owner_id != client.id:
            return "자신의 타워만 업그레이드할 수 있습니다."
        if self.phase != "build":
            return "웨이브 사이 건설 시간에만 업그레이드할 수 있습니다."
        if tower.level >= 3:
            return "이미 최대 단계입니다."
        cost = self.upgrade_cost(tower)
        if client.resources < cost:
            return "자원이 부족합니다."
        client.resources -= cost
        tower.level += 1
        tower_x, tower_y = defense_cell_center(tower.cell_x, tower.cell_y)
        self.add_effect(tower_x, tower_y, "upgrade", "#f8f871", 0.7, f"Lv{tower.level}")
        self.status = f"{client.name}님이 타워를 {tower.level}단계로 업그레이드했습니다."
        return ""

    def sell_tower(self, client: DefenseClient, tower_id: int) -> str:
        tower = self.towers.get(tower_id)
        if not tower:
            return "타워를 찾을 수 없습니다."
        if tower.owner_id != client.id:
            return "자신의 타워만 판매할 수 있습니다."
        if self.phase != "build":
            return "웨이브 사이 건설 시간에만 판매할 수 있습니다."
        refund = int(self.tower_total_cost(tower) * 0.6)
        client.resources += refund
        self.towers.pop(tower.id, None)
        tower_x, tower_y = defense_cell_center(tower.cell_x, tower.cell_y)
        self.add_effect(tower_x, tower_y, "sell", "#c8f7ff", 0.65, f"+{refund}")
        self.status = f"{client.name}님이 타워를 판매했습니다. +{refund}"
        return ""

    def use_skill(self, client: DefenseClient, skill_type: str) -> str:
        config = DEFENSE_SKILLS.get(skill_type)
        if not config:
            return "알 수 없는 전술 스킬입니다."
        if self.phase in {"win", "defeat"}:
            return "게임이 끝난 뒤에는 전술 스킬을 사용할 수 없습니다."
        now = time.time()
        remaining = float(client.skill_cooldowns.get(skill_type, 0.0)) - now
        if remaining > 0:
            return f"{config['name']} 재사용 대기 중입니다. {math.ceil(remaining)}초"
        cost = int(config["cost"])
        if client.resources < cost:
            return "자원이 부족합니다."
        if skill_type in {"airstrike", "freeze"} and not self.enemies:
            return "대상 적이 없습니다."
        if skill_type == "repair" and self.base_health >= self.base_health_max:
            return "기지가 이미 최대 체력입니다."

        client.resources -= cost
        client.skill_cooldowns[skill_type] = now + float(config["cooldown"])
        if skill_type == "airstrike":
            self.use_airstrike(client, config)
        elif skill_type == "freeze":
            self.use_freeze(client, config)
        elif skill_type == "repair":
            self.use_repair(client, config)
        return ""

    def front_enemy(self) -> DefenseEnemy | None:
        return max(
            self.enemies,
            key=lambda enemy: (enemy.segment, enemy.x + enemy.y),
            default=None,
        )

    def use_airstrike(self, client: DefenseClient, config: dict[str, Any]) -> None:
        target = self.front_enemy()
        if not target:
            return
        radius = float(config["radius"])
        damage = float(config["damage"])
        affected = [
            enemy
            for enemy in list(self.enemies)
            if math.hypot(enemy.x - target.x, enemy.y - target.y) <= radius
        ]
        self.add_effect(target.x, target.y, "airstrike", str(config["color"]), 1.05, "포격")
        for enemy in affected:
            if enemy in self.enemies:
                self.damage_enemy(enemy, damage, client.id)
        self.status = f"{client.name}님이 포격 지원을 호출했습니다."

    def use_freeze(self, client: DefenseClient, config: dict[str, Any]) -> None:
        target = self.front_enemy()
        if not target:
            return
        radius = float(config["radius"])
        duration = float(config["duration"])
        count = 0
        for enemy in self.enemies:
            if math.hypot(enemy.x - target.x, enemy.y - target.y) <= radius:
                enemy.slow_until = max(enemy.slow_until, duration)
                count += 1
        self.add_effect(target.x, target.y, "freeze", str(config["color"]), 1.05, "빙결")
        self.status = f"{client.name}님이 빙결장으로 적 {count}기를 묶었습니다."

    def use_repair(self, client: DefenseClient, config: dict[str, Any]) -> None:
        before = self.base_health
        self.base_health = min(self.base_health_max, self.base_health + int(config["heal"]))
        end_x, end_y = self.path_pixels[-1]
        self.add_effect(end_x, end_y, "repair", str(config["color"]), 1.05, f"+{self.base_health - before}")
        self.status = f"{client.name}님이 기지를 긴급 수리했습니다. +{self.base_health - before}"

    def can_place(self, cell_x: int, cell_y: int) -> bool:
        if cell_x < 0 or cell_x >= DEFENSE_COLUMNS or cell_y < 0 or cell_y >= DEFENSE_ROWS:
            return False
        if (cell_x, cell_y) in self.path_cells:
            return False
        return all(
            tower.cell_x != cell_x or tower.cell_y != cell_y
            for tower in self.towers.values()
        )

    def upgrade_cost(self, tower: DefenseTower) -> int:
        base = int(DEFENSE_TOWERS[tower.tower_type]["cost"])
        return int(base * (0.75 + tower.level * 0.5))

    def tower_total_cost(self, tower: DefenseTower) -> int:
        base = int(DEFENSE_TOWERS[tower.tower_type]["cost"])
        total = base
        for level in range(1, tower.level):
            total += int(base * (0.75 + level * 0.5))
        return total

    def update(self, dt: float) -> None:
        for shot in self.shots:
            shot.ttl -= dt
        self.shots = [shot for shot in self.shots if shot.ttl > 0]
        self.effects = [effect for effect in self.effects if self.tick_effect(effect, dt)]
        if (
            self.phase == "build"
            and self.auto_start_at
            and self.clients
            and time.time() >= self.auto_start_at
        ):
            self.begin_wave()
        if self.phase != "wave":
            return
        self.spawn_timer -= dt
        while self.spawn_remaining > 0 and self.spawn_timer <= 0:
            self.spawn_enemy()
            self.spawn_remaining -= 1
            self.spawn_timer += max(0.26, 0.74 - self.wave * 0.035)
        self.update_enemies(dt)
        self.update_towers(dt)
        if self.base_health <= 0:
            self.phase = "defeat"
            self.enemies.clear()
            self.status = "기지가 파괴되었습니다."
            return
        if self.spawn_remaining <= 0 and not self.enemies:
            if self.wave >= self.max_wave:
                self.phase = "win"
                self.status = "모든 웨이브를 막아냈습니다."
                self.auto_start_at = 0.0
            else:
                self.phase = "build"
                bonus = 35 + self.wave * 9
                for client in self.clients.values():
                    client.resources += bonus
                self.status = f"{self.wave} 웨이브 완료. 전원 +{bonus}"
                self.add_effect(
                    DEFENSE_WIDTH / 2,
                    DEFENSE_HEIGHT / 2,
                    "reward",
                    "#8be66f",
                    1.0,
                    f"+{bonus}",
                )
                self.schedule_auto_start()

    def tick_effect(self, effect: DefenseEffect, dt: float) -> bool:
        effect.ttl -= dt
        return effect.ttl > 0

    def add_effect(
        self,
        x: float,
        y: float,
        kind: str,
        color: str,
        ttl: float = 0.8,
        text: str = "",
    ) -> None:
        self.effects.append(
            DefenseEffect(x=x, y=y, kind=kind, color=color, ttl=ttl, text=text)
        )
        self.effects = self.effects[-64:]

    def wave_spawn_count(self, wave: int) -> int:
        player_bonus = max(0, len(self.clients) - 1) * 2
        boss_bonus = 1 if wave in DEFENSE_BOSS_WAVES else 0
        return 7 + wave * 3 + player_bonus + boss_bonus

    def wave_enemy_counts(self, wave: int) -> dict[str, int]:
        total = self.wave_spawn_count(wave)
        counts = {"normal": total}
        if wave >= 4:
            counts["runner"] = max(1, total // 5)
            counts["normal"] -= counts["runner"]
        if wave >= 6:
            counts["tank"] = max(1, total // 7)
            counts["normal"] -= counts["tank"]
        if wave >= 8:
            counts["shield"] = max(1, total // 8)
            counts["normal"] -= counts["shield"]
        if wave in DEFENSE_BOSS_WAVES:
            counts["boss"] = 1
            counts["normal"] -= 1
        counts["normal"] = max(0, counts["normal"])
        return {kind: count for kind, count in counts.items() if count > 0}

    def wave_preview(self) -> dict[str, Any]:
        next_wave = min(self.wave + 1, self.max_wave)
        counts = self.wave_enemy_counts(next_wave) if self.wave < self.max_wave else {}
        enemies = [
            {
                "type": kind,
                "name": DEFENSE_ENEMY_TYPES.get(kind, {}).get("name", kind),
                "count": count,
                "color": DEFENSE_ENEMY_TYPES.get(kind, {}).get("color", "#ff5f6d"),
            }
            for kind, count in counts.items()
        ]
        return {
            "wave": next_wave,
            "boss": next_wave in DEFENSE_BOSS_WAVES,
            "enemies": enemies,
        }

    def enemy_kind_for_spawn(self) -> str:
        if self.wave in DEFENSE_BOSS_WAVES and self.spawn_remaining == 1:
            return "boss"
        if self.wave >= 8 and self.next_enemy_id % 8 == 0:
            return "shield"
        if self.wave >= 6 and self.next_enemy_id % 7 == 0:
            return "tank"
        if self.wave >= 4 and self.next_enemy_id % 5 == 0:
            return "runner"
        return "normal"

    def spawn_enemy(self) -> None:
        x, y = self.path_pixels[0]
        enemy_type = self.enemy_kind_for_spawn()
        base = DEFENSE_ENEMY_TYPES["normal"]
        config = DEFENSE_ENEMY_TYPES.get(enemy_type, base)
        if enemy_type == "boss":
            health = float(config["health"]) + self.wave * float(config["healthGrowth"])
            speed = float(config["speed"])
            reward = int(config["reward"]) + self.wave * int(config["rewardGrowth"])
        else:
            health = float(base["health"]) + self.wave * float(base["healthGrowth"])
            speed = float(base["speed"]) + self.wave * float(base["speedGrowth"])
            reward = int(base["reward"]) + self.wave * int(base["rewardGrowth"])
            health *= float(config.get("healthScale", 1.0))
            speed *= float(config.get("speedScale", 1.0))
            reward += int(config.get("rewardBonus", 0))
        shield = health * float(config.get("shieldScale", 0.0))
        self.enemies.append(
            DefenseEnemy(
                id=self.next_enemy_id,
                x=x,
                y=y,
                segment=0,
                health=health,
                max_health=health,
                speed=speed,
                reward=reward,
                enemy_type=enemy_type,
                shield=shield,
                max_shield=shield,
                base_damage=int(config.get("damage", 1)),
            )
        )
        self.next_enemy_id += 1

    def update_enemies(self, dt: float) -> None:
        reached: list[DefenseEnemy] = []
        for enemy in list(self.enemies):
            enemy.slow_until = max(0.0, enemy.slow_until - dt)
            enemy.marked_until = max(0.0, enemy.marked_until - dt)
            if enemy.burn_until > 0:
                enemy.burn_until = max(0.0, enemy.burn_until - dt)
                self.damage_enemy(enemy, enemy.burn_dps * dt, enemy.burn_owner_id, show_hit=False)
                if enemy not in self.enemies:
                    continue
            if (
                enemy.enemy_type == "boss"
                and not enemy.enraged
                and enemy.health / max(1, enemy.max_health) <= 0.45
            ):
                enemy.enraged = True
                self.add_effect(enemy.x, enemy.y, "rage", "#ff5f6d", 1.0, "격노")
            speed = enemy.speed * (0.55 if enemy.slow_until > 0 else 1.0)
            if enemy.enraged:
                speed *= 1.22
            remaining = speed * dt
            while remaining > 0 and enemy.segment < len(self.path_pixels) - 1:
                target_x, target_y = self.path_pixels[enemy.segment + 1]
                distance = math.hypot(target_x - enemy.x, target_y - enemy.y)
                if distance <= 0.001:
                    enemy.segment += 1
                    continue
                if distance <= remaining:
                    enemy.x, enemy.y = target_x, target_y
                    enemy.segment += 1
                    remaining -= distance
                else:
                    enemy.x += (target_x - enemy.x) / distance * remaining
                    enemy.y += (target_y - enemy.y) / distance * remaining
                    remaining = 0
            if enemy.segment >= len(self.path_pixels) - 1:
                reached.append(enemy)
        for enemy in reached:
            if enemy in self.enemies:
                self.enemies.remove(enemy)
                damage = max(1, enemy.base_damage + (1 if enemy.enraged else 0))
                self.base_health = max(0, self.base_health - damage)
                self.add_effect(
                    enemy.x,
                    enemy.y,
                    "base_hit",
                    "#ff5f6d",
                    0.9,
                    f"-{damage}",
                )
        if reached:
            self.status = f"적 {len(reached)}기가 기지에 도달했습니다."

    def update_towers(self, dt: float) -> None:
        for tower in list(self.towers.values()):
            tower.cooldown_left = max(0.0, tower.cooldown_left - dt)
            if tower.cooldown_left > 0:
                continue
            target = self.find_target(tower)
            if not target:
                continue
            config = DEFENSE_TOWERS[tower.tower_type]
            if config.get("boost"):
                continue
            level_bonus = 1 + (tower.level - 1) * 0.45
            boost = self.tower_boost_multiplier(tower)
            damage = float(config["damage"]) * level_bonus * boost
            cooldown = (
                float(config["cooldown"])
                * max(0.74, 1 - (tower.level - 1) * 0.1)
                / boost
            )
            tower.cooldown_left = cooldown
            tower_x, tower_y = defense_cell_center(tower.cell_x, tower.cell_y)
            self.add_shot(tower_x, tower_y, target.x, target.y, str(config["color"]))
            if config.get("slow"):
                target.slow_until = max(target.slow_until, float(config["slow"]))
            if config.get("splash"):
                splash = float(config["splash"])
                for enemy in list(self.enemies):
                    if math.hypot(enemy.x - target.x, enemy.y - target.y) <= splash:
                        self.apply_defense_status(enemy, tower, config)
                        self.damage_enemy(enemy, damage, tower.owner_id)
            else:
                self.apply_defense_status(target, tower, config)
                self.damage_enemy(target, damage, tower.owner_id)

    def apply_defense_status(
        self, enemy: DefenseEnemy, tower: DefenseTower, config: dict[str, Any]
    ) -> None:
        if enemy not in self.enemies:
            return
        if config.get("burn"):
            enemy.burn_until = max(enemy.burn_until, float(config["burn"]))
            enemy.burn_dps = max(enemy.burn_dps, float(config.get("burnDps", 0)))
            enemy.burn_owner_id = tower.owner_id
        if config.get("mark"):
            enemy.marked_until = max(enemy.marked_until, float(config["mark"]))
            enemy.mark_bonus = max(enemy.mark_bonus, float(config.get("markBonus", 0)))

    def find_target(self, tower: DefenseTower) -> DefenseEnemy | None:
        tower_x, tower_y = defense_cell_center(tower.cell_x, tower.cell_y)
        config = DEFENSE_TOWERS[tower.tower_type]
        tower_range = float(config["range"]) + (tower.level - 1) * 14
        targets = [
            enemy
            for enemy in self.enemies
            if math.hypot(enemy.x - tower_x, enemy.y - tower_y) <= tower_range
        ]
        return max(targets, key=lambda enemy: enemy.segment, default=None)

    def tower_boost_multiplier(self, tower: DefenseTower) -> float:
        best = 1.0
        tower_x, tower_y = defense_cell_center(tower.cell_x, tower.cell_y)
        for booster in self.towers.values():
            if booster.id == tower.id:
                continue
            config = DEFENSE_TOWERS.get(booster.tower_type, {})
            if not config.get("boost"):
                continue
            booster_x, booster_y = defense_cell_center(booster.cell_x, booster.cell_y)
            booster_range = float(config["range"]) + (booster.level - 1) * 14
            if math.hypot(tower_x - booster_x, tower_y - booster_y) <= booster_range:
                best = max(best, 1 + (float(config["boost"]) - 1) * booster.level)
        return best

    def damage_enemy(
        self,
        enemy: DefenseEnemy,
        damage: float,
        owner_id: str,
        show_hit: bool = True,
    ) -> None:
        if enemy not in self.enemies:
            return
        if enemy.marked_until > 0:
            damage *= 1 + enemy.mark_bonus
        if enemy.shield > 0:
            absorbed = min(enemy.shield, damage)
            enemy.shield -= absorbed
            damage -= absorbed
            if damage <= 0:
                if show_hit:
                    self.add_effect(enemy.x, enemy.y, "shield", "#6fe8ff", 0.45, "SHIELD")
                return
        enemy.health -= damage
        if enemy.health > 0:
            if show_hit:
                self.add_effect(enemy.x, enemy.y, "hit", "#f8f871", 0.35, f"-{int(damage)}")
            return
        self.enemies.remove(enemy)
        self.add_effect(enemy.x, enemy.y, "kill", "#ffd166", 0.8, f"+{enemy.reward}")
        owner = self.clients.get(owner_id)
        if owner:
            owner.resources += enemy.reward
            owner.kills += 1
            owner.score += enemy.reward * 10

    def add_shot(
        self, x: float, y: float, target_x: float, target_y: float, color: str
    ) -> None:
        self.shots.append(
            DefenseShot(
                id=self.next_shot_id,
                x=x,
                y=y,
                target_x=target_x,
                target_y=target_y,
                color=color,
            )
        )
        self.next_shot_id += 1

    def state(self) -> dict[str, Any]:
        auto_start_seconds = 0
        if self.auto_start_at and self.phase == "build":
            auto_start_seconds = max(0, math.ceil(self.auto_start_at - time.time()))
        return {
            "type": "defense_state",
            "roomId": self.room_id,
            "width": DEFENSE_WIDTH,
            "height": DEFENSE_HEIGHT,
            "cell": DEFENSE_CELL,
            "columns": DEFENSE_COLUMNS,
            "rows": DEFENSE_ROWS,
            "phase": self.phase,
            "wave": self.wave,
            "maxWave": self.max_wave,
            "mapId": self.map_id,
            "mapName": self.map_name,
            "maps": DEFENSE_MAPS,
            "towerTypes": DEFENSE_TOWERS,
            "enemyTypes": DEFENSE_ENEMY_TYPES,
            "skillTypes": DEFENSE_SKILLS,
            "wavePreview": self.wave_preview(),
            "autoStartSeconds": auto_start_seconds,
            "baseHealth": self.base_health,
            "baseHealthMax": self.base_health_max,
            "status": self.status,
            "hostId": self.host_id,
            "pathPoints": [[x, y] for x, y in self.path_points],
            "pathCells": [[x, y] for x, y in sorted(self.path_cells)],
            "lastPing": self.last_ping,
            "players": [
                {
                    "id": client.id,
                    "name": client.name,
                    "color": client.color,
                    "resources": client.resources,
                    "kills": client.kills,
                    "score": client.score,
                    "skillCooldowns": {
                        key: max(0, round(until - time.time(), 1))
                        for key, until in client.skill_cooldowns.items()
                    },
                    "isHost": client.id == self.host_id,
                    "connectedAt": round(client.connected_at, 3),
                }
                for client in self.clients.values()
            ],
            "scores": [
                {
                    "id": client.id,
                    "name": client.name,
                    "kills": client.kills,
                    "score": client.score,
                }
                for client in sorted(self.clients.values(), key=lambda item: item.score, reverse=True)
            ],
            "towers": [
                {
                    "id": tower.id,
                    "ownerId": tower.owner_id,
                    "ownerName": self.clients[tower.owner_id].name
                    if tower.owner_id in self.clients
                    else "퇴장",
                    "type": tower.tower_type,
                    "cellX": tower.cell_x,
                    "cellY": tower.cell_y,
                    "level": tower.level,
                    "range": int(DEFENSE_TOWERS[tower.tower_type]["range"])
                    + (tower.level - 1) * 14,
                    "boost": round(self.tower_boost_multiplier(tower), 2),
                }
                for tower in self.towers.values()
            ],
            "enemies": [
                {
                    "id": enemy.id,
                    "x": round(enemy.x, 2),
                    "y": round(enemy.y, 2),
                    "health": round(enemy.health, 1),
                    "maxHealth": round(enemy.max_health, 1),
                    "slowed": enemy.slow_until > 0,
                    "burning": enemy.burn_until > 0,
                    "burn": round(enemy.burn_until, 1),
                    "marked": enemy.marked_until > 0,
                    "mark": round(enemy.marked_until, 1),
                    "enraged": enemy.enraged,
                    "type": enemy.enemy_type,
                    "segment": enemy.segment,
                    "shield": round(enemy.shield, 1),
                    "maxShield": round(enemy.max_shield, 1),
                }
                for enemy in self.enemies
            ],
            "shots": [
                {
                    "id": shot.id,
                    "x": round(shot.x, 2),
                    "y": round(shot.y, 2),
                    "targetX": round(shot.target_x, 2),
                    "targetY": round(shot.target_y, 2),
                    "color": shot.color,
                    "ttl": round(max(0, shot.ttl), 3),
                }
                for shot in self.shots
            ],
            "effects": [
                {
                    "x": round(effect.x, 2),
                    "y": round(effect.y, 2),
                    "kind": effect.kind,
                    "color": effect.color,
                    "ttl": round(max(0, effect.ttl), 3),
                    "text": effect.text,
                }
                for effect in self.effects
            ],
            "serverTime": round(time.time(), 3),
        }


class PartyRoom:
    def __init__(self, room_id: str, game_type: str = "kart") -> None:
        self.room_id = room_id
        self.game_type = game_type if game_type in PARTY_GAME_TYPES else "kart"
        self.config = PARTY_GAME_CONFIGS[self.game_type]
        self.clients: dict[str, PartyClient] = {}
        self.host_id = ""
        self.next_client_id = 1
        self.next_pickup_id = 1
        self.next_bomb_id = 1
        self.next_block_id = 1
        self.pickups: list[PartyPickup] = []
        self.bombs: list[PartyBomb] = []
        self.blocks: list[PartyBlock] = []
        self.effects: list[PartyEffect] = []
        self.started_at = time.time()
        self.ends_at = self.started_at + float(self.config["duration"])
        self.finished = False
        self.winner_id = ""
        self.winner_name = ""
        self.status = f"{self.config['name']} 방이 열렸습니다."
        self.seed_pickups()
        self.seed_blocks()

    def create_client(self, writer: asyncio.StreamWriter) -> PartyClient:
        client = PartyClient(
            id=f"g{self.next_client_id}",
            writer=writer,
            room_id=self.room_id,
            game_type=self.game_type,
            color=COLORS[(self.next_client_id - 1) % len(COLORS)],
        )
        self.next_client_id += 1
        self.place_client(client)
        return client

    def add_client(self, client: PartyClient) -> None:
        self.clients[client.id] = client
        self.ensure_host()
        self.status = f"{client.name}님이 참가했습니다."

    def remove_client(self, client: PartyClient) -> None:
        self.clients.pop(client.id, None)
        if client.id == self.host_id:
            self.host_id = ""
        self.ensure_host()

    def ensure_host(self) -> None:
        if self.host_id in self.clients:
            return
        oldest = sorted(self.clients.values(), key=lambda client: client.connected_at)
        self.host_id = oldest[0].id if oldest else ""

    def summary(self) -> dict[str, Any]:
        return {
            "gameCount": len(self.clients),
            "playerCount": len(self.clients),
            "spectatorCount": 0,
            "ready": bool(self.clients),
        }

    def restart(self, client: PartyClient) -> str:
        if client.id != self.host_id:
            return "방장만 라운드를 다시 시작할 수 있습니다."
        self.pickups.clear()
        self.bombs.clear()
        self.blocks.clear()
        self.effects.clear()
        self.started_at = time.time()
        self.ends_at = self.started_at + float(self.config["duration"])
        self.finished = False
        self.winner_id = ""
        self.winner_name = ""
        self.seed_pickups()
        self.seed_blocks()
        for player in self.clients.values():
            player.score = 0
            player.lap = 0
            player.checkpoint = 0
            player.trail.clear()
            player.alive = True
            player.vx = 0
            player.vy = 0
            player.cooldown_until = 0
            player.boosted_until = 0
            player.shield_until = 0
            player.drift_charge = 0
            player.drifting = False
            player.bomb_power = 0
            player.bomb_limit = 1
            player.coin_combo = 0
            player.coin_combo_until = 0
            player.magnet_until = 0
            player.frenzy_until = 0
            player.kart_pad_cooldowns.clear()
            player.action_latched = False
            self.place_client(player)
        self.status = "라운드를 다시 시작했습니다."
        return ""

    def place_client(self, client: PartyClient) -> None:
        index = max(0, self.next_client_id - 1)
        if self.game_type == "kart":
            client.x = 290 + (index % 4) * 46
            client.y = 795 + (index // 4) * 48
            client.angle = 0
        else:
            margin = 90
            for _ in range(80):
                client.x = random.uniform(margin, PARTY_WIDTH - margin)
                client.y = random.uniform(margin, PARTY_HEIGHT - margin)
                if not self.client_hits_block(client.x, client.y):
                    break
            client.angle = random.uniform(-math.pi, math.pi)
        client.vx = 0
        client.vy = 0
        client.alive = True
        client.respawn_at = 0
        client.shield_until = 0
        client.drift_charge = 0
        client.drifting = False
        client.coin_combo = 0
        client.coin_combo_until = 0
        client.magnet_until = 0
        client.frenzy_until = 0
        client.kart_pad_cooldowns.clear()
        client.action_latched = False
        client.trail = [(client.x, client.y)]

    def seed_pickups(self) -> None:
        target = {"kart": 9, "bomb": 12, "snake": 34, "coin": 30}[self.game_type]
        while len(self.pickups) < target:
            kind = "coin"
            value = 1
            if self.game_type == "kart":
                kind, value = self.random_kart_pickup()
            elif self.game_type == "snake":
                roll = random.random()
                if roll < 0.12:
                    kind = "boost"
                    value = 2
                elif roll < 0.22:
                    kind = "gem"
                    value = 3
                elif roll < 0.29:
                    kind = "shield"
                elif roll < 0.34:
                    kind = "feast"
                    value = 8
            elif self.game_type == "coin":
                kind, value = self.random_coin_pickup()
            elif self.game_type == "bomb":
                kind, value = self.random_bomb_pickup()
            self.pickups.append(
                PartyPickup(
                    id=self.next_pickup_id,
                    x=random.uniform(80, PARTY_WIDTH - 80),
                    y=random.uniform(80, PARTY_HEIGHT - 80),
                    kind=kind,
                    value=value,
                )
            )
            self.next_pickup_id += 1

    def random_kart_pickup(self) -> tuple[str, int]:
        roll = random.random()
        if roll < 0.18:
            return ("nitro", 1)
        if roll < 0.5:
            return ("boost", 1)
        return ("coin", 2 if random.random() < 0.25 else 1)

    def random_bomb_pickup(self) -> tuple[str, int]:
        roll = random.random()
        if roll < 0.18:
            return ("flame", 1)
        if roll < 0.34:
            return ("bombup", 1)
        if roll < 0.5:
            return ("speed", 1)
        return ("coin", 2 if random.random() < 0.35 else 1)

    def random_coin_pickup(self) -> tuple[str, int]:
        roll = random.random()
        if roll < 0.1:
            return ("shield", 1)
        if roll < 0.2:
            return ("magnet", 1)
        if roll < 0.28:
            return ("frenzy", 1)
        if roll < 0.44:
            return ("gem", 5)
        return ("coin", 3 if random.random() < 0.2 else 1)

    def seed_blocks(self) -> None:
        if self.game_type != "bomb" or self.blocks:
            return
        for x in range(320, PARTY_WIDTH - 260, 160):
            for y in range(280, PARTY_HEIGHT - 220, 160):
                if (x // 160 + y // 160) % 5 == 0:
                    continue
                if any(
                    party_distance(x, y, spawn_x, spawn_y) < 260
                    for spawn_x, spawn_y in (
                        (420, 420),
                        (PARTY_WIDTH - 420, 420),
                        (420, PARTY_HEIGHT - 420),
                        (PARTY_WIDTH - 420, PARTY_HEIGHT - 420),
                    )
                ):
                    continue
                self.blocks.append(PartyBlock(id=self.next_block_id, x=float(x), y=float(y)))
                self.next_block_id += 1

    def client_hits_block(self, x: float, y: float) -> bool:
        if self.game_type != "bomb":
            return False
        return any(
            abs(x - block.x) < block.size / 2 + PARTY_PLAYER_RADIUS
            and abs(y - block.y) < block.size / 2 + PARTY_PLAYER_RADIUS
            for block in self.blocks
        )

    def handle_message(self, client: PartyClient, raw: str) -> str:
        try:
            message = json.loads(raw)
        except json.JSONDecodeError:
            return ""
        kind = str(message.get("type") or "")
        if kind == "party_join":
            client.name = str(message.get("name") or "Player").strip()[:18] or "Player"
            return ""
        if kind == "party_input":
            client.input = {
                "up": bool(message.get("up")),
                "down": bool(message.get("down")),
                "left": bool(message.get("left")),
                "right": bool(message.get("right")),
                "action": bool(message.get("action")),
            }
            return ""
        if kind == "party_restart":
            return self.restart(client)
        return ""

    def update(self, dt: float, now: float) -> None:
        self.effects = [effect for effect in self.effects if self.tick_effect(effect, dt)]
        if self.finished:
            return
        if now >= self.ends_at:
            self.finish_round("시간 종료")
            return
        self.seed_pickups()
        if self.game_type == "kart":
            self.update_kart(dt, now)
        elif self.game_type == "bomb":
            self.update_walkers(dt, now)
            self.update_bombs(dt, now)
        elif self.game_type == "snake":
            self.update_snakes(dt, now)
        else:
            self.update_walkers(dt, now)
            self.update_coin_pickups(dt, now)
            self.update_coin_hazards(now)
        self.collect_pickups(now)

    def tick_effect(self, effect: PartyEffect, dt: float) -> bool:
        effect.ttl -= dt
        return effect.ttl > 0

    def add_effect(
        self,
        x: float,
        y: float,
        kind: str,
        color: str,
        ttl: float = 0.8,
        text: str = "",
    ) -> None:
        self.effects.append(PartyEffect(x=x, y=y, kind=kind, color=color, ttl=ttl, text=text))
        self.effects = self.effects[-48:]

    def kart_boost_pads(self) -> list[dict[str, float | str]]:
        checkpoints = self.config.get("track", [])
        pads: list[dict[str, float | str]] = []
        if self.game_type != "kart" or len(checkpoints) < 2:
            return pads
        for pad_number, index in enumerate(range(0, len(checkpoints), 2), start=1):
            start = checkpoints[index]
            end = checkpoints[(index + 1) % len(checkpoints)]
            start_x, start_y = float(start[0]), float(start[1])
            end_x, end_y = float(end[0]), float(end[1])
            pads.append(
                {
                    "id": f"pad{pad_number}",
                    "x": start_x * 0.48 + end_x * 0.52,
                    "y": start_y * 0.48 + end_y * 0.52,
                    "angle": math.atan2(end_y - start_y, end_x - start_x),
                }
            )
        return pads

    def apply_kart_boost_pad(self, client: PartyClient, now: float) -> None:
        for pad in self.kart_boost_pads():
            pad_id = str(pad["id"])
            if now < client.kart_pad_cooldowns.get(pad_id, 0):
                continue
            if party_distance(client.x, client.y, float(pad["x"]), float(pad["y"])) > 58:
                continue
            client.boosted_until = max(client.boosted_until, now + 1.15)
            client.kart_pad_cooldowns[pad_id] = now + 3.0
            client.score += 2
            self.add_effect(client.x, client.y, "pad", client.color, 0.65, "PAD")

    def update_kart(self, dt: float, now: float) -> None:
        checkpoints = self.config["track"]
        for client in self.clients.values():
            controls = client.input
            turn = float(controls.get("right", False)) - float(controls.get("left", False))
            if turn:
                client.angle += turn * 3.2 * dt
            throttle = float(controls.get("up", False)) - 0.5 * float(controls.get("down", False))
            boost = 1.45 if now < client.boosted_until else 1.0
            speed = math.hypot(client.vx, client.vy)
            action = bool(controls.get("action"))
            can_drift = action and abs(turn) > 0 and throttle > 0 and speed > 90 and now >= client.cooldown_until
            if can_drift:
                client.drifting = True
                client.drift_charge = min(1.65, client.drift_charge + dt * (0.75 + speed / 440))
                client.angle += turn * 0.85 * dt
            elif client.action_latched and not action:
                if client.drift_charge >= 0.42:
                    boost_duration = min(1.6, 0.45 + client.drift_charge * 0.78)
                    client.boosted_until = now + boost_duration
                    client.cooldown_until = now + 1.15
                    boost = 1.45
                    self.add_effect(client.x, client.y, "boost", client.color, 0.7, "MINI")
                client.drift_charge = 0
                client.drifting = False
            else:
                client.drifting = False
                if not action:
                    client.drift_charge = max(0, client.drift_charge - dt * 1.8)
            client.action_latched = action
            track_distance = party_distance_to_polyline(client.x, client.y, checkpoints)
            on_track = track_distance <= 62
            grip = (0.82 if on_track else 0.48) if client.drifting else (1.0 if on_track else 0.58)
            accel = 520 * throttle * boost * grip
            client.vx += math.cos(client.angle) * accel * dt
            client.vy += math.sin(client.angle) * accel * dt
            speed = math.hypot(client.vx, client.vy)
            drift_limit = 0.92 if client.drifting else 1.0
            max_speed = float(self.config["speed"]) * boost * drift_limit * (1.0 if on_track else 0.68)
            if speed > max_speed:
                client.vx = client.vx / speed * max_speed
                client.vy = client.vy / speed * max_speed
            drag = 0.988 if on_track else 0.965
            client.vx *= drag
            client.vy *= drag
            self.move_client(client, client.vx * dt, client.vy * dt)
            self.apply_kart_boost_pad(client, now)
            target = checkpoints[client.checkpoint % len(checkpoints)]
            if party_distance(client.x, client.y, float(target[0]), float(target[1])) < 72:
                client.checkpoint += 1
                client.score += 8
                self.add_effect(client.x, client.y, "checkpoint", client.color, 0.55, "CHECK")
                if client.checkpoint >= len(checkpoints):
                    client.checkpoint = 0
                    client.lap += 1
                    client.score += 100
                    self.add_effect(client.x, client.y, "lap", client.color, 0.9, f"{client.lap} LAP")
                    self.status = f"{client.name}님이 {client.lap}바퀴를 완료했습니다."
                    if client.lap >= int(self.config["laps"]):
                        self.finish_round(f"{client.name}님 완주")
                        return

    def update_walkers(self, dt: float, now: float) -> None:
        speed = float(self.config["speed"])
        for client in self.clients.values():
            if not self.ensure_alive(client, now):
                continue
            controls = client.input
            dx = float(controls.get("right", False)) - float(controls.get("left", False))
            dy = float(controls.get("down", False)) - float(controls.get("up", False))
            length = math.hypot(dx, dy)
            if length:
                dx /= length
                dy /= length
                client.angle = math.atan2(dy, dx)
            if (
                self.game_type == "coin"
                and controls.get("action")
                and length
                and now >= client.cooldown_until
            ):
                client.boosted_until = now + 0.32
                client.cooldown_until = now + 3.0
                self.add_effect(client.x, client.y, "dash", client.color, 0.45, "DASH")
            boost_factor = 1.0
            if self.game_type == "coin" and now < client.boosted_until:
                boost_factor = 2.15
            elif self.game_type == "bomb" and now < client.boosted_until:
                boost_factor = 1.28
            move_speed = speed * boost_factor
            self.move_client(client, dx * move_speed * dt, dy * move_speed * dt)
            if self.game_type == "bomb":
                self.maybe_drop_bomb(client, now)

    def update_snakes(self, dt: float, now: float) -> None:
        speed = float(self.config["speed"])
        for client in self.clients.values():
            if not self.ensure_alive(client, now):
                continue
            controls = client.input
            dx = float(controls.get("right", False)) - float(controls.get("left", False))
            dy = float(controls.get("down", False)) - float(controls.get("up", False))
            if dx or dy:
                next_angle = math.atan2(dy, dx)
                if math.cos(next_angle - client.angle) > -0.35:
                    client.angle = next_angle
            if controls.get("action") and now >= client.cooldown_until:
                client.boosted_until = now + 0.75
                client.cooldown_until = now + 3.2
                self.add_effect(client.x, client.y, "boost", client.color, 0.55, "SPRINT")
            move_speed = speed * (1.5 if now < client.boosted_until else 1.0)
            self.move_client(
                client,
                math.cos(client.angle) * move_speed * dt,
                math.sin(client.angle) * move_speed * dt,
                bounce=False,
            )
            if (
                client.x <= PARTY_PLAYER_RADIUS
                or client.x >= PARTY_WIDTH - PARTY_PLAYER_RADIUS
                or client.y <= PARTY_PLAYER_RADIUS
                or client.y >= PARTY_HEIGHT - PARTY_PLAYER_RADIUS
            ):
                if self.guard_snake(client, now, "벽"):
                    continue
                self.knock_out(client, now, "벽에 닿았습니다.")
                continue
            client.trail.append((client.x, client.y))
            limit = 22 + min(90, client.score * 2)
            client.trail = client.trail[-limit:]
            for other in self.clients.values():
                if not other.alive:
                    continue
                trail = other.trail[:-8] if other.id == client.id else other.trail
                if any(party_distance(client.x, client.y, x, y) < 13 for x, y in trail):
                    if self.guard_snake(client, now, "꼬리"):
                        break
                    self.knock_out(client, now, "꼬리에 부딪혔습니다.")
                    break

    def guard_snake(self, client: PartyClient, now: float, label: str) -> bool:
        if self.game_type != "snake" or now >= client.shield_until:
            return False
        client.shield_until = 0
        client.x = party_clamp(client.x, PARTY_PLAYER_RADIUS + 8, PARTY_WIDTH - PARTY_PLAYER_RADIUS - 8)
        client.y = party_clamp(client.y, PARTY_PLAYER_RADIUS + 8, PARTY_HEIGHT - PARTY_PLAYER_RADIUS - 8)
        client.angle = math.atan2(PARTY_HEIGHT / 2 - client.y, PARTY_WIDTH / 2 - client.x)
        client.trail = client.trail[-14:]
        self.add_effect(client.x, client.y, "shield", "#69dcff", 0.85, f"{label} 방어")
        return True

    def update_bombs(self, dt: float, now: float) -> None:
        alive: list[PartyBomb] = []
        for bomb in self.bombs:
            if bomb.blast_ttl > 0:
                bomb.blast_ttl -= dt
                if bomb.blast_ttl > 0:
                    alive.append(bomb)
                continue
            bomb.ttl -= dt
            if bomb.ttl > 0:
                alive.append(bomb)
                continue
            bomb.blast_ttl = 0.35
            alive.append(bomb)
            self.add_effect(bomb.x, bomb.y, "blast", "#ffba5a", 0.5, "BOOM")
            self.trigger_bomb_chain(bomb)
            self.destroy_bomb_blocks(bomb)
            owner = self.clients.get(bomb.owner_id)
            for client in self.clients.values():
                if not client.alive:
                    continue
                if party_in_bomb_blast(client.x, client.y, bomb.x, bomb.y, bomb.radius):
                    self.knock_out(client, now, "폭발에 맞았습니다.")
                    if owner and owner.id != client.id:
                        owner.score += 5
        self.bombs = alive

    def trigger_bomb_chain(self, bomb: PartyBomb) -> None:
        for other in self.bombs:
            if other.id == bomb.id or other.blast_ttl > 0 or other.ttl <= 0:
                continue
            if not party_in_bomb_blast(other.x, other.y, bomb.x, bomb.y, bomb.radius):
                continue
            other.ttl = 0
            self.add_effect(other.x, other.y, "chain", "#ff5f6d", 0.45, "CHAIN")

    def destroy_bomb_blocks(self, bomb: PartyBomb) -> None:
        remaining: list[PartyBlock] = []
        for block in self.blocks:
            if party_in_bomb_blast(block.x, block.y, bomb.x, bomb.y, bomb.radius):
                self.add_effect(block.x, block.y, "block", "#ffba5a", 0.65, "BREAK")
                if random.random() < 0.36:
                    kind, value = self.random_bomb_pickup()
                    self.pickups.append(
                        PartyPickup(
                            id=self.next_pickup_id,
                            x=block.x,
                            y=block.y,
                            kind=kind,
                            value=value,
                        )
                    )
                    self.next_pickup_id += 1
            else:
                remaining.append(block)
        self.blocks = remaining

    def update_coin_hazards(self, now: float) -> None:
        for hazard in self.hazards(now):
            for client in self.clients.values():
                if client.alive and party_distance(client.x, client.y, hazard["x"], hazard["y"]) < hazard["radius"] + 8:
                    if now < client.shield_until:
                        client.shield_until = 0
                        self.add_effect(client.x, client.y, "shield", "#69dcff", 0.75, "SAFE")
                        continue
                    self.knock_out(client, now, "위험 구역에 닿았습니다.")

    def update_coin_pickups(self, dt: float, now: float) -> None:
        if self.game_type != "coin":
            return
        magnet_players = [
            client
            for client in self.clients.values()
            if client.alive and now < client.magnet_until
        ]
        if not magnet_players:
            return
        for pickup in self.pickups:
            if pickup.kind not in {"coin", "gem"}:
                continue
            target = min(
                magnet_players,
                key=lambda client: party_distance(client.x, client.y, pickup.x, pickup.y),
            )
            gap = party_distance(target.x, target.y, pickup.x, pickup.y)
            if gap <= 1 or gap > 260:
                continue
            pull = min(gap, (310 + max(0, 260 - gap) * 2.4) * dt)
            pickup.x += (target.x - pickup.x) / gap * pull
            pickup.y += (target.y - pickup.y) / gap * pull

    def coin_pickup_score(self, collector: PartyClient, pickup: PartyPickup, now: float) -> int:
        if now <= collector.coin_combo_until:
            collector.coin_combo += 1
        else:
            collector.coin_combo = 1
        collector.coin_combo_until = now + 2.6
        combo_bonus = min(6, collector.coin_combo // 4)
        multiplier = 2 if now < collector.frenzy_until else 1
        return max(1, (pickup.value + combo_bonus) * multiplier)

    def collect_pickups(self, now: float) -> None:
        remaining: list[PartyPickup] = []
        for pickup in self.pickups:
            collector = next(
                (
                    client
                    for client in self.clients.values()
                    if client.alive and party_distance(client.x, client.y, pickup.x, pickup.y) < 28
                ),
                None,
            )
            if not collector:
                remaining.append(pickup)
                continue
            if pickup.kind == "boost":
                collector.boosted_until = max(collector.boosted_until, now + 1.6)
                collector.score += 3
                self.add_effect(pickup.x, pickup.y, "boost", collector.color, 0.65, "BOOST")
            elif pickup.kind == "nitro":
                collector.boosted_until = max(collector.boosted_until, now + 2.6)
                collector.score += 5
                self.add_effect(pickup.x, pickup.y, "nitro", collector.color, 0.8, "NITRO")
            elif pickup.kind == "shield":
                collector.shield_until = max(collector.shield_until, now + 5.0)
                collector.score += 1
                self.add_effect(pickup.x, pickup.y, "shield", "#69dcff", 0.75, "SHIELD")
            elif pickup.kind == "magnet":
                collector.magnet_until = max(collector.magnet_until, now + 6.0)
                collector.score += 2
                self.add_effect(pickup.x, pickup.y, "magnet", "#42d7ff", 0.75, "MAGNET")
            elif pickup.kind == "frenzy":
                collector.frenzy_until = max(collector.frenzy_until, now + 5.0)
                collector.coin_combo = max(collector.coin_combo, 3)
                collector.coin_combo_until = now + 2.6
                collector.score += 3
                self.add_effect(pickup.x, pickup.y, "frenzy", "#ffd166", 0.85, "FEVER")
            elif pickup.kind == "feast":
                collector.score += pickup.value
                collector.boosted_until = max(collector.boosted_until, now + 0.9)
                self.add_effect(pickup.x, pickup.y, "feast", "#ffd166", 0.9, f"+{pickup.value}")
            elif pickup.kind == "flame":
                collector.bomb_power = min(5, collector.bomb_power + 1)
                collector.score += 2
                self.add_effect(pickup.x, pickup.y, "flame", "#ff5f6d", 0.7, f"화력 {collector.bomb_power + 1}")
            elif pickup.kind == "bombup":
                collector.bomb_limit = min(4, collector.bomb_limit + 1)
                collector.score += 2
                self.add_effect(pickup.x, pickup.y, "bombup", "#f5fbff", 0.7, f"폭탄 {collector.bomb_limit}")
            elif pickup.kind == "speed":
                collector.boosted_until = max(collector.boosted_until, now + 3.2)
                collector.score += 2
                self.add_effect(pickup.x, pickup.y, "speed", "#42d7ff", 0.7, "SPEED")
            else:
                gained = (
                    self.coin_pickup_score(collector, pickup, now)
                    if self.game_type == "coin"
                    else pickup.value
                )
                collector.score += gained
                effect_text = f"+{gained}"
                if self.game_type == "coin" and collector.coin_combo >= 4:
                    effect_text = f"{effect_text} x{min(7, collector.coin_combo)}"
                self.add_effect(
                    pickup.x,
                    pickup.y,
                    "gem" if pickup.kind == "gem" else "pickup",
                    collector.color,
                    0.65,
                    effect_text,
                )
        self.pickups = remaining

    def maybe_drop_bomb(self, client: PartyClient, now: float) -> None:
        action = bool(client.input.get("action"))
        if not action:
            client.action_latched = False
            return
        if client.action_latched or now < client.cooldown_until:
            return
        active_bombs = sum(
            1
            for bomb in self.bombs
            if bomb.owner_id == client.id and bomb.ttl > 0 and bomb.blast_ttl <= 0
        )
        if active_bombs >= client.bomb_limit:
            client.action_latched = True
            return
        client.action_latched = True
        client.cooldown_until = now + 1.0
        bomb_x = round(client.x / 40) * 40
        bomb_y = round(client.y / 40) * 40
        radius = 96 + min(5, client.bomb_power) * 24
        self.bombs.append(
            PartyBomb(
                id=self.next_bomb_id,
                owner_id=client.id,
                x=bomb_x,
                y=bomb_y,
                radius=radius,
            )
        )
        self.add_effect(
            bomb_x,
            bomb_y,
            "bomb",
            client.color,
            0.5,
            "BOMB",
        )
        self.next_bomb_id += 1

    def move_client(self, client: PartyClient, dx: float, dy: float, bounce: bool = True) -> None:
        previous_x = client.x
        previous_y = client.y
        client.x += dx
        client.y += dy
        if bounce:
            if client.x < PARTY_PLAYER_RADIUS or client.x > PARTY_WIDTH - PARTY_PLAYER_RADIUS:
                client.vx *= -0.35
            if client.y < PARTY_PLAYER_RADIUS or client.y > PARTY_HEIGHT - PARTY_PLAYER_RADIUS:
                client.vy *= -0.35
        client.x = party_clamp(client.x, PARTY_PLAYER_RADIUS, PARTY_WIDTH - PARTY_PLAYER_RADIUS)
        client.y = party_clamp(client.y, PARTY_PLAYER_RADIUS, PARTY_HEIGHT - PARTY_PLAYER_RADIUS)
        if self.client_hits_block(client.x, client.y):
            client.x = previous_x
            client.y = previous_y
            client.vx *= -0.25
            client.vy *= -0.25

    def knock_out(self, client: PartyClient, now: float, reason: str) -> None:
        client.alive = False
        client.respawn_at = now + 1.7
        client.trail.clear()
        client.score = max(0, client.score - 2)
        self.add_effect(client.x, client.y, "down", client.color, 0.85, "-2")
        self.status = f"{client.name}님이 {reason}"

    def ensure_alive(self, client: PartyClient, now: float) -> bool:
        if client.alive:
            return True
        if now < client.respawn_at:
            return False
        self.place_client(client)
        self.add_effect(client.x, client.y, "respawn", client.color, 0.9, "READY")
        return True

    def finish_round(self, reason: str) -> None:
        leader = self.leader()
        self.finished = True
        self.winner_id = leader.id if leader else ""
        self.winner_name = leader.name if leader else ""
        if leader:
            self.status = f"{reason}. {leader.name}님 승리. 방장이 라운드를 다시 시작할 수 있습니다."
        else:
            self.status = f"{reason}. 라운드를 다시 시작하세요."

    def leader(self) -> PartyClient | None:
        if not self.clients:
            return None
        if self.game_type == "kart":
            return max(
                self.clients.values(),
                key=lambda client: (client.lap, client.checkpoint, client.score),
            )
        return max(self.clients.values(), key=lambda client: client.score)

    def hazards(self, now: float) -> list[dict[str, float]]:
        if self.game_type != "coin":
            return []
        phase = now - self.started_at
        return [
            {
                "x": PARTY_WIDTH * 0.28 + math.sin(phase * 0.72) * 320,
                "y": PARTY_HEIGHT * 0.28 + math.cos(phase * 0.5) * 210,
                "radius": 64,
            },
            {
                "x": PARTY_WIDTH * 0.72 + math.cos(phase * 0.55) * 360,
                "y": PARTY_HEIGHT * 0.68 + math.sin(phase * 0.68) * 260,
                "radius": 76,
            },
            {
                "x": PARTY_WIDTH * 0.5 + math.sin(phase * 0.42) * 430,
                "y": PARTY_HEIGHT * 0.52 + math.cos(phase * 0.61) * 300,
                "radius": 58,
            },
        ]

    def state(self) -> dict[str, Any]:
        now = time.time()
        return {
            "type": "party_state",
            "roomId": self.room_id,
            "game": self.game_type,
            "config": self.config,
            "width": PARTY_WIDTH,
            "height": PARTY_HEIGHT,
            "hostId": self.host_id,
            "status": self.status,
            "startedAt": round(self.started_at, 3),
            "finished": self.finished,
            "winnerId": self.winner_id,
            "winnerName": self.winner_name,
            "remaining": 0 if self.finished else max(0, math.ceil(self.ends_at - now)),
            "scores": [
                {
                    "id": client.id,
                    "name": client.name,
                    "score": client.score,
                    "lap": client.lap,
                    "checkpoint": client.checkpoint,
                }
                for client in sorted(
                    self.clients.values(),
                    key=lambda item: (item.lap, item.checkpoint, item.score)
                    if self.game_type == "kart"
                    else (item.score, 0, 0),
                    reverse=True,
                )
            ],
            "boostPads": self.kart_boost_pads() if self.game_type == "kart" else [],
            "players": [
                {
                    "id": client.id,
                    "name": client.name,
                    "color": client.color,
                    "x": round(client.x, 2),
                    "y": round(client.y, 2),
                    "vx": round(client.vx, 2),
                    "vy": round(client.vy, 2),
                    "angle": round(client.angle, 4),
                    "score": client.score,
                    "lap": client.lap,
                    "checkpoint": client.checkpoint,
                    "alive": client.alive,
                    "isHost": client.id == self.host_id,
                    "boosted": now < client.boosted_until,
                    "drifting": client.drifting,
                    "driftCharge": round(client.drift_charge, 2),
                    "shielded": now < client.shield_until,
                    "shield": max(0, round(client.shield_until - now, 1)),
                    "bombPower": client.bomb_power,
                    "bombLimit": client.bomb_limit,
                    "combo": client.coin_combo if now <= client.coin_combo_until else 0,
                    "comboTime": max(0, round(client.coin_combo_until - now, 1)),
                    "magnet": max(0, round(client.magnet_until - now, 1)),
                    "frenzy": max(0, round(client.frenzy_until - now, 1)),
                    "cooldown": max(0, round(client.cooldown_until - now, 1)),
                    "trail": [[round(x, 1), round(y, 1)] for x, y in client.trail[-120:]],
                }
                for client in self.clients.values()
            ],
            "pickups": [
                {
                    "id": pickup.id,
                    "x": round(pickup.x, 1),
                    "y": round(pickup.y, 1),
                    "kind": pickup.kind,
                    "value": pickup.value,
                }
                for pickup in self.pickups
            ],
            "bombs": [
                {
                    "id": bomb.id,
                    "ownerId": bomb.owner_id,
                    "x": round(bomb.x, 1),
                    "y": round(bomb.y, 1),
                    "ttl": round(max(0, bomb.ttl), 2),
                    "blastTtl": round(max(0, bomb.blast_ttl), 2),
                    "radius": bomb.radius,
                }
                for bomb in self.bombs
            ],
            "blocks": [
                {
                    "id": block.id,
                    "x": round(block.x, 1),
                    "y": round(block.y, 1),
                    "size": round(block.size, 1),
                }
                for block in self.blocks
            ],
            "hazards": self.hazards(now),
            "effects": [
                {
                    "x": round(effect.x, 1),
                    "y": round(effect.y, 1),
                    "kind": effect.kind,
                    "color": effect.color,
                    "ttl": round(max(0, effect.ttl), 3),
                    "text": effect.text,
                }
                for effect in self.effects
            ],
            "serverTime": round(now, 3),
        }


class ArenaServer:
    def __init__(
        self, game_root: Path | str = ROOT, home_path: Path | str | None = None
    ) -> None:
        self.game_root = Path(game_root).resolve()
        self.home_path = Path(home_path).resolve() if home_path else None
        self.arena_rooms: dict[str, ArenaRoom] = {}
        self.fortress_rooms: dict[str, FortressMatch] = {}
        self.defense_rooms: dict[str, DefenseRoom] = {}
        self.party_rooms: dict[str, PartyRoom] = {}
        self.hub_clients: dict[str, HubClient] = {}
        self.hub_rooms: dict[str, HubRoom] = {}
        self.next_hub_client_id = 1
        self.running = True

    def clean_room_id(self, value: Any, fallback: str = "MAIN") -> str:
        raw = str(value or "").strip().upper()
        clean = "".join(ch for ch in raw if ch.isalnum())
        return (clean or fallback)[:16]

    def ensure_arena_room(self, room_id: str) -> ArenaRoom:
        room_id = self.clean_room_id(room_id)
        if room_id not in self.arena_rooms:
            self.arena_rooms[room_id] = ArenaRoom(id=room_id)
        return self.arena_rooms[room_id]

    def ensure_fortress_match(self, room_id: str) -> FortressMatch:
        room_id = self.clean_room_id(room_id)
        if room_id not in self.fortress_rooms:
            self.fortress_rooms[room_id] = FortressMatch(room_id=room_id)
        return self.fortress_rooms[room_id]

    def ensure_defense_room(self, room_id: str) -> DefenseRoom:
        room_id = self.clean_room_id(room_id)
        if room_id not in self.defense_rooms:
            self.defense_rooms[room_id] = DefenseRoom(room_id=room_id)
        return self.defense_rooms[room_id]

    def ensure_party_room(self, room_id: str, game_type: str = "kart") -> PartyRoom:
        room_id = self.clean_room_id(room_id)
        game_type = game_type if game_type in PARTY_GAME_TYPES else "kart"
        if room_id not in self.party_rooms:
            self.party_rooms[room_id] = PartyRoom(room_id=room_id, game_type=game_type)
        return self.party_rooms[room_id]

    def room_has_activity(self, room_id: str) -> bool:
        arena_room = self.arena_rooms.get(room_id)
        fortress_room = self.fortress_rooms.get(room_id)
        defense_room = self.defense_rooms.get(room_id)
        party_room = self.party_rooms.get(room_id)
        return (
            any(client.room_id == room_id for client in self.hub_clients.values())
            or bool(arena_room and arena_room.clients)
            or bool(fortress_room and fortress_room.clients)
            or bool(defense_room and defense_room.clients)
            or bool(party_room and party_room.clients)
        )

    async def cleanup_hub_room_if_empty(self, room_id: str) -> None:
        room_id = self.clean_room_id(room_id)
        if room_id not in self.hub_rooms:
            return
        if self.room_has_activity(room_id):
            await self.broadcast_hub_room_list()
            return
        self.hub_rooms.pop(room_id, None)
        await self.broadcast_hub_room_list()

    async def handle_connection(
        self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter
    ) -> None:
        try:
            request = await reader.readuntil(b"\r\n\r\n")
        except asyncio.IncompleteReadError:
            writer.close()
            await writer.wait_closed()
            return

        request_line, headers = self.parse_headers(request)
        if not request_line:
            writer.close()
            await writer.wait_closed()
            return

        method, path, _ = request_line
        if headers.get("upgrade", "").lower() == "websocket":
            parsed = urlparse(path)
            if parsed.path == "/fortress":
                await self.handle_fortress_websocket(reader, writer, headers, parsed.query)
            elif parsed.path == "/defense":
                await self.handle_defense_websocket(reader, writer, headers, parsed.query)
            elif parsed.path == "/party":
                await self.handle_party_websocket(reader, writer, headers, parsed.query)
            elif parsed.path == "/hub":
                await self.handle_hub_websocket(reader, writer, headers)
            else:
                await self.handle_websocket(reader, writer, headers, parsed.query)
            return

        await self.serve_static(writer, method, path)

    def parse_headers(self, request: bytes) -> tuple[tuple[str, str, str] | None, dict[str, str]]:
        text = request.decode("iso-8859-1", "replace")
        lines = text.split("\r\n")
        parts = lines[0].split()
        if len(parts) != 3:
            return None, {}
        headers: dict[str, str] = {}
        for line in lines[1:]:
            if ":" in line:
                key, value = line.split(":", 1)
                headers[key.strip().lower()] = value.strip()
        return (parts[0], parts[1], parts[2]), headers

    async def serve_static(
        self, writer: asyncio.StreamWriter, method: str, request_path: str
    ) -> None:
        parsed = urlparse(request_path)
        path = unquote(parsed.path)
        file_path = self.resolve_static_path(path)
        if not file_path:
            await self.write_response(writer, 403, b"Forbidden", "text/plain")
            return
        if not file_path.is_file():
            await self.write_response(writer, 404, b"Not found", "text/plain")
            return

        body = b"" if method.upper() == "HEAD" else file_path.read_bytes()
        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        await self.write_response(writer, 200, body, content_type)

    def resolve_static_path(self, path: str) -> Path | None:
        if path == "/home.html":
            home_path = self.home_path or self.game_root.parent / "home.html"
            if home_path.is_file():
                return home_path.resolve()

        if path in ("", "/"):
            relative = "index.html"
        elif path in ("/game", "/game/"):
            relative = "index.html"
        elif path.startswith("/game/"):
            relative = path.removeprefix("/game/") or "index.html"
        else:
            relative = path.lstrip("/")

        file_path = (self.game_root / relative).resolve()
        blocked = {".py", ".pyc", ".pyo"}
        if (
            self.game_root not in file_path.parents
            and file_path != self.game_root
            or file_path.suffix.lower() in blocked
            or "__pycache__" in file_path.parts
        ):
            return None
        return file_path

    async def write_response(
        self,
        writer: asyncio.StreamWriter,
        status: int,
        body: bytes,
        content_type: str,
    ) -> None:
        reason = {200: "OK", 403: "Forbidden", 404: "Not Found"}.get(status, "OK")
        headers = [
            f"HTTP/1.1 {status} {reason}",
            f"Content-Type: {content_type}; charset=utf-8",
            f"Content-Length: {len(body)}",
            "Cache-Control: no-store",
            "Connection: close",
            "",
            "",
        ]
        writer.write("\r\n".join(headers).encode("utf-8") + body)
        await writer.drain()
        writer.close()
        await writer.wait_closed()

    async def handle_websocket(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
        headers: dict[str, str],
        query: str = "",
    ) -> None:
        key = headers.get("sec-websocket-key")
        if not key:
            writer.close()
            await writer.wait_closed()
            return

        accept = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        writer.write(
            (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
            ).encode("ascii")
        )
        await writer.drain()

        values = parse_qs(query)
        room_id = self.clean_room_id(values.get("room", ["MAIN"])[0])
        room = self.ensure_arena_room(room_id)
        client = self.create_client(room, writer)
        room.clients[client.id] = client
        await self.send_json(
            writer,
            {"type": "welcome", "id": client.id, "roomId": room_id},
            client.write_lock,
        )
        await self.broadcast_hub_room_list()

        try:
            while self.running:
                message = await self.read_ws_message(reader)
                if message is None:
                    break
                self.handle_client_message(client, message)
        except (asyncio.IncompleteReadError, ConnectionError, OSError, UnicodeDecodeError):
            pass
        finally:
            room.clients.pop(client.id, None)
            if not room.clients:
                self.arena_rooms.pop(room_id, None)
            await self.cleanup_hub_room_if_empty(room_id)
            writer.close()
            try:
                await writer.wait_closed()
            except OSError:
                pass

    async def handle_fortress_websocket(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
        headers: dict[str, str],
        query: str,
    ) -> None:
        key = headers.get("sec-websocket-key")
        if not key:
            writer.close()
            await writer.wait_closed()
            return

        accept = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        writer.write(
            (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
            ).encode("ascii")
        )
        await writer.drain()

        values = parse_qs(query)
        role = values.get("role", ["client"])[0]
        room_id = self.clean_room_id(values.get("room", ["MAIN"])[0])
        match = self.ensure_fortress_match(room_id)
        client = match.create_client(writer)
        match.add_client(client, role)
        await self.send_json(
            writer,
            {
                "type": "fortress_welcome",
                "id": client.id,
                "slot": client.slot,
                "roomId": room_id,
            },
            client.write_lock,
        )
        await self.broadcast_hub_room_list()

        try:
            while self.running:
                message = await self.read_ws_message(reader)
                if message is None:
                    break
                match.handle_message(client, message)
        except (asyncio.IncompleteReadError, ConnectionError, OSError, UnicodeDecodeError):
            pass
        finally:
            match.remove_client(client)
            if not match.clients:
                self.fortress_rooms.pop(room_id, None)
            await self.cleanup_hub_room_if_empty(room_id)
            writer.close()
            try:
                await writer.wait_closed()
            except OSError:
                pass

    async def handle_defense_websocket(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
        headers: dict[str, str],
        query: str,
    ) -> None:
        key = headers.get("sec-websocket-key")
        if not key:
            writer.close()
            await writer.wait_closed()
            return

        accept = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        writer.write(
            (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
            ).encode("ascii")
        )
        await writer.drain()

        values = parse_qs(query)
        room_id = self.clean_room_id(values.get("room", ["MAIN"])[0])
        room = self.ensure_defense_room(room_id)
        client = room.create_client(writer)
        room.add_client(client)
        await self.send_json(
            writer,
            {
                "type": "defense_welcome",
                "id": client.id,
                "roomId": room_id,
                "isHost": client.id == room.host_id,
            },
            client.write_lock,
        )
        await self.broadcast_hub_room_list()

        try:
            while self.running:
                message = await self.read_ws_message(reader)
                if message is None:
                    break
                await self.handle_defense_message(room, client, message)
        except (asyncio.IncompleteReadError, ConnectionError, OSError, UnicodeDecodeError):
            pass
        finally:
            room.remove_client(client)
            if not room.clients:
                self.defense_rooms.pop(room_id, None)
            await self.cleanup_hub_room_if_empty(room_id)
            writer.close()
            try:
                await writer.wait_closed()
            except OSError:
                pass

    async def handle_defense_message(
        self, room: DefenseRoom, client: DefenseClient, raw: str
    ) -> None:
        try:
            message = json.loads(raw)
        except json.JSONDecodeError:
            return

        kind = str(message.get("type") or "")
        error = ""
        if kind == "defense_join":
            client.name = str(message.get("name") or "Player").strip()[:18] or "Player"
            return
        if kind == "defense_configure":
            error = room.configure(client, str(message.get("mapId") or "classic"))
        elif kind == "defense_ping":
            if room.phase in {"win", "defeat"}:
                error = "게임이 끝난 뒤에는 핑을 표시할 수 없습니다."
            else:
                room.last_ping = {
                    "x": self.safe_int(message.get("cellX"), -1),
                    "y": self.safe_int(message.get("cellY"), -1),
                    "clientId": client.id,
                    "name": client.name,
                    "time": round(time.time(), 3),
                }
                room.status = f"{client.name}님이 전장에 핑을 표시했습니다."
        elif kind == "defense_start_wave":
            error = room.start_wave(client)
        elif kind == "defense_build":
            error = room.build_tower(
                client,
                str(message.get("towerType") or "basic"),
                self.safe_int(message.get("cellX"), -1),
                self.safe_int(message.get("cellY"), -1),
            )
        elif kind == "defense_upgrade":
            error = room.upgrade_tower(client, self.safe_int(message.get("towerId"), -1))
        elif kind == "defense_sell":
            error = room.sell_tower(client, self.safe_int(message.get("towerId"), -1))
        elif kind == "defense_skill":
            error = room.use_skill(client, str(message.get("skillType") or ""))
        if error:
            await self.send_json(
                client.writer,
                {"type": "defense_error", "message": error},
                client.write_lock,
            )

    async def handle_party_websocket(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
        headers: dict[str, str],
        query: str,
    ) -> None:
        key = headers.get("sec-websocket-key")
        if not key:
            writer.close()
            await writer.wait_closed()
            return

        accept = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        writer.write(
            (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
            ).encode("ascii")
        )
        await writer.drain()

        values = parse_qs(query)
        room_id = self.clean_room_id(values.get("room", ["MAIN"])[0])
        game_type = str(values.get("game", ["kart"])[0]).strip().lower()
        room = self.ensure_party_room(room_id, game_type)
        client = room.create_client(writer)
        room.add_client(client)
        await self.send_json(
            writer,
            {
                "type": "party_welcome",
                "id": client.id,
                "roomId": room_id,
                "game": room.game_type,
                "isHost": client.id == room.host_id,
            },
            client.write_lock,
        )
        await self.broadcast_hub_room_list()

        try:
            while self.running:
                message = await self.read_ws_message(reader)
                if message is None:
                    break
                error = room.handle_message(client, message)
                if error:
                    await self.send_json(
                        client.writer,
                        {"type": "party_error", "message": error},
                        client.write_lock,
                    )
        except (asyncio.IncompleteReadError, ConnectionError, OSError, UnicodeDecodeError):
            pass
        finally:
            room.remove_client(client)
            if not room.clients:
                self.party_rooms.pop(room_id, None)
            await self.cleanup_hub_room_if_empty(room_id)
            writer.close()
            try:
                await writer.wait_closed()
            except OSError:
                pass

    async def handle_hub_websocket(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
        headers: dict[str, str],
    ) -> None:
        key = headers.get("sec-websocket-key")
        if not key:
            writer.close()
            await writer.wait_closed()
            return

        accept = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        writer.write(
            (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
            ).encode("ascii")
        )
        await writer.drain()

        client = self.create_hub_client(writer)
        self.hub_clients[client.id] = client
        await self.send_json(
            writer,
            {
                "type": "hub_welcome",
                "id": client.id,
                "serverTime": round(time.time(), 3),
            },
            client.write_lock,
        )
        await self.send_hub_info(client)
        await self.send_hub_room_list(client)

        try:
            while self.running:
                message = await self.read_ws_message(reader)
                if message is None:
                    break
                await self.handle_hub_message(client, message)
        except (asyncio.IncompleteReadError, ConnectionError, OSError, UnicodeDecodeError):
            pass
        finally:
            await self.remove_hub_client(client)
            writer.close()
            try:
                await writer.wait_closed()
            except OSError:
                pass

    def create_hub_client(self, writer: asyncio.StreamWriter) -> HubClient:
        client_id = f"h{self.next_hub_client_id}"
        self.next_hub_client_id += 1
        peer_info = writer.get_extra_info("peername")
        peer = str(peer_info[0]) if peer_info else ""
        return HubClient(id=client_id, writer=writer, peer=peer)

    async def handle_hub_message(self, client: HubClient, raw: str) -> None:
        try:
            message = json.loads(raw)
        except json.JSONDecodeError:
            return

        kind = str(message.get("type") or "")
        if kind == "hello":
            client.name = self.clean_hub_name(message.get("name"))
            client.runtime = self.clean_hub_meta(message.get("runtime"), 24)
            client.page_host = self.clean_hub_meta(message.get("pageHost"), 80)
            client.page_port = self.clean_hub_meta(message.get("pagePort"), 12)
            client.game_host = self.clean_hub_meta(message.get("gameHost"), 80)
            client.game_port = self.clean_hub_meta(message.get("gamePort"), 12)
            await self.send_hub_info(client)
            if client.room_id:
                await self.broadcast_hub_presence(client.room_id)
            return

        if kind == "room_list":
            await self.send_hub_room_list(client)
            return

        if kind == "create_room":
            await self.create_hub_room(client, message)
            return

        if kind == "join_room":
            await self.join_hub_room(
                client,
                self.clean_room_id(message.get("roomId"), ""),
                str(message.get("pin") or "").strip()[:24],
            )
            return

        if kind == "leave_room":
            await self.leave_hub_room(client)
            return

        if kind == "ping":
            await self.send_json(
                client.writer,
                {
                    "type": "pong",
                    "sentAt": message.get("sentAt"),
                    "serverTime": round(time.time(), 3),
                },
                client.write_lock,
            )
            return

        if kind == "chat_message":
            await self.relay_hub_room_message(client, message)
            return

        if kind in {"file_offer", "file_chunk", "file_done", "file_cancel"}:
            await self.relay_hub_room_message(client, message, exclude=client.id)

    async def create_hub_room(
        self, client: HubClient, message: dict[str, Any]
    ) -> None:
        feature = str(message.get("feature") or "drop").strip().lower()[:24]
        if feature not in {"drop", "arena", "fortress", "defense", *PARTY_GAME_TYPES}:
            feature = "drop"
        pin = (
            ""
            if feature in {"arena", "fortress", "defense", *PARTY_GAME_TYPES}
            else str(message.get("pin") or "").strip()[:24]
        )
        room = HubRoom(
            id=self.make_hub_room_id(),
            name=str(message.get("name") or "LAN Room").strip()[:40] or "LAN Room",
            feature=feature,
            pin=pin,
            host_id=client.id,
        )
        self.hub_rooms[room.id] = room
        await self.join_hub_room(client, room.id, room.pin, is_new=True)
        await self.broadcast_hub_room_list()

    async def join_hub_room(
        self,
        client: HubClient,
        room_id: str,
        pin: str = "",
        is_new: bool = False,
    ) -> None:
        room = self.hub_rooms.get(room_id)
        if not room:
            await self.send_hub_error(client, "방을 찾을 수 없습니다.")
            return
        if room.pin and room.pin != pin:
            await self.send_hub_error(client, "PIN이 일치하지 않습니다.")
            return

        if client.room_id and client.room_id != room.id:
            await self.leave_hub_room(client, notify=False)
        client.room_id = room.id
        await self.send_json(
            client.writer,
            {
                "type": "room_joined",
                "room": self.hub_room_payload(room),
                "isNew": is_new,
                "participants": self.hub_participants(room.id),
            },
            client.write_lock,
        )
        await self.broadcast_hub_presence(room.id)

    async def leave_hub_room(
        self, client: HubClient, notify: bool = True
    ) -> None:
        room_id = client.room_id
        if not room_id:
            return
        client.room_id = ""
        if notify:
            await self.send_json(
                client.writer,
                {"type": "room_left", "roomId": room_id},
                client.write_lock,
            )
        await self.cleanup_hub_room_if_empty(room_id)
        if room_id not in self.hub_rooms:
            return
        await self.broadcast_hub_presence(room_id)

    async def remove_hub_client(self, client: HubClient) -> None:
        room_id = client.room_id
        self.hub_clients.pop(client.id, None)
        if room_id:
            await self.cleanup_hub_room_if_empty(room_id)
            if room_id in self.hub_rooms:
                await self.broadcast_hub_presence(room_id)

    async def relay_hub_room_message(
        self,
        client: HubClient,
        message: dict[str, Any],
        exclude: str | None = None,
    ) -> None:
        room_id = client.room_id
        if not room_id or room_id not in self.hub_rooms:
            await self.send_hub_error(client, "먼저 방에 참여하세요.")
            return
        allowed = {
            "type",
            "transferId",
            "fileName",
            "fileSize",
            "fileType",
            "chunkIndex",
            "totalChunks",
            "data",
            "size",
            "message",
            "chatId",
            "sentAt",
        }
        payload = {key: message.get(key) for key in allowed if key in message}
        payload.update(
            {
                "senderId": client.id,
                "senderName": client.name,
                "roomId": room_id,
                "serverTime": round(time.time(), 3),
            }
        )
        await self.broadcast_hub_room(room_id, payload, exclude=exclude)

    def clean_hub_name(self, value: Any) -> str:
        return str(value or "Guest").strip()[:24] or "Guest"

    def clean_hub_meta(self, value: Any, limit: int = 80) -> str:
        return str(value or "").replace("\r", "").replace("\n", "").strip()[:limit]

    def make_hub_room_id(self) -> str:
        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        while True:
            room_id = "".join(random.choice(alphabet) for _ in range(5))
            if room_id not in self.hub_rooms:
                return room_id

    def hub_room_payload(self, room: HubRoom) -> dict[str, Any]:
        hub_count = sum(
            1 for client in self.hub_clients.values() if client.room_id == room.id
        )
        arena_room = self.arena_rooms.get(room.id)
        arena_count = len(arena_room.clients) if arena_room else 0
        fortress_room = self.fortress_rooms.get(room.id)
        fortress_summary = (
            fortress_room.summary()
            if fortress_room
            else {"gameCount": 0, "playerCount": 0, "spectatorCount": 0, "ready": False}
        )
        defense_room = self.defense_rooms.get(room.id)
        defense_summary = (
            defense_room.summary()
            if defense_room
            else {"gameCount": 0, "playerCount": 0, "spectatorCount": 0, "ready": False}
        )
        party_room = self.party_rooms.get(room.id)
        party_summary = (
            party_room.summary()
            if party_room
            else {"gameCount": 0, "playerCount": 0, "spectatorCount": 0, "ready": False}
        )
        game_count = arena_count
        player_count = arena_count
        spectator_count = 0
        ready = bool(arena_count)
        if room.feature == "fortress":
            game_count = fortress_summary["gameCount"]
            player_count = fortress_summary["playerCount"]
            spectator_count = fortress_summary["spectatorCount"]
            ready = fortress_summary["ready"]
        elif room.feature == "defense":
            game_count = defense_summary["gameCount"]
            player_count = defense_summary["playerCount"]
            spectator_count = 0
            ready = defense_summary["ready"]
        elif room.feature in PARTY_GAME_TYPES:
            game_count = party_summary["gameCount"]
            player_count = party_summary["playerCount"]
            spectator_count = 0
            ready = party_summary["ready"]
        return {
            "id": room.id,
            "name": room.name,
            "feature": room.feature,
            "locked": bool(room.pin),
            "hostId": room.host_id,
            "count": hub_count,
            "hubCount": hub_count,
            "gameCount": game_count,
            "playerCount": player_count,
            "spectatorCount": spectator_count,
            "ready": ready,
            "createdAt": round(room.created_at, 3),
        }

    def hub_participants(self, room_id: str) -> list[dict[str, Any]]:
        room = self.hub_rooms.get(room_id)
        return [
            {
                "id": client.id,
                "name": client.name,
                "peer": client.peer,
                "runtime": client.runtime,
                "pageHost": client.page_host,
                "pagePort": client.page_port,
                "gameHost": client.game_host,
                "gamePort": client.game_port,
                "isHost": bool(room and client.id == room.host_id),
                "connectedAt": round(client.connected_at, 3),
            }
            for client in self.hub_clients.values()
            if client.room_id == room_id
        ]

    async def send_hub_info(self, client: HubClient) -> None:
        await self.send_json(
            client.writer,
            {
                "type": "hub_info",
                "id": client.id,
                "name": client.name,
                "peer": client.peer,
                "runtime": client.runtime,
                "pageHost": client.page_host,
                "pagePort": client.page_port,
                "gameHost": client.game_host,
                "gamePort": client.game_port,
                "serverTime": round(time.time(), 3),
            },
            client.write_lock,
        )

    async def send_hub_room_list(self, client: HubClient) -> None:
        await self.send_json(
            client.writer,
            {
                "type": "room_list",
                "rooms": [self.hub_room_payload(room) for room in self.hub_rooms.values()],
            },
            client.write_lock,
        )

    async def send_hub_error(self, client: HubClient, message: str) -> None:
        await self.send_json(
            client.writer,
            {"type": "hub_error", "message": message},
            client.write_lock,
        )

    async def broadcast_hub_room_list(self) -> None:
        payload = {
            "type": "room_list",
            "rooms": [self.hub_room_payload(room) for room in self.hub_rooms.values()],
        }
        for client in list(self.hub_clients.values()):
            try:
                await self.send_json(client.writer, payload, client.write_lock)
            except (ConnectionError, OSError):
                pass

    async def broadcast_hub_presence(self, room_id: str) -> None:
        await self.broadcast_hub_room(
            room_id,
            {
                "type": "presence",
                "roomId": room_id,
                "participants": self.hub_participants(room_id),
            },
        )

    async def broadcast_hub_room(
        self,
        room_id: str,
        payload: dict[str, Any],
        exclude: str | None = None,
    ) -> None:
        for peer in list(self.hub_clients.values()):
            if peer.room_id != room_id or peer.id == exclude:
                continue
            try:
                await self.send_json(peer.writer, payload, peer.write_lock)
            except (ConnectionError, OSError):
                pass

    def create_client(self, room: ArenaRoom, writer: asyncio.StreamWriter) -> Client:
        client_id = f"p{room.next_client_id}"
        room.next_client_id += 1
        x, y = self.random_spawn()
        return Client(
            id=client_id,
            writer=writer,
            room_id=room.id,
            color=COLORS[(room.next_client_id - 2) % len(COLORS)],
            x=x,
            y=y,
        )

    def random_spawn(self) -> tuple[float, float]:
        for _ in range(80):
            x = random.uniform(PLAYER_RADIUS + 80, ARENA_WIDTH - PLAYER_RADIUS - 80)
            y = random.uniform(PLAYER_RADIUS + 80, ARENA_HEIGHT - PLAYER_RADIUS - 80)
            if not self.arena_circle_hits_obstacle(x, y, PLAYER_RADIUS + 12):
                return (x, y)
        return (ARENA_WIDTH / 2, ARENA_HEIGHT / 2)

    def arena_circle_hits_obstacle(self, x: float, y: float, radius: float) -> bool:
        return any(self.circle_rect_intersects(x, y, radius, obstacle) for obstacle in ARENA_OBSTACLES)

    def circle_rect_intersects(self, x: float, y: float, radius: float, rect: dict[str, int]) -> bool:
        closest_x = max(float(rect["x"]), min(x, float(rect["x"] + rect["w"])))
        closest_y = max(float(rect["y"]), min(y, float(rect["y"] + rect["h"])))
        return math.hypot(x - closest_x, y - closest_y) <= radius

    def handle_client_message(self, client: Client, raw: str) -> None:
        try:
            message = json.loads(raw)
        except json.JSONDecodeError:
            return

        if message.get("type") == "join":
            name = str(message.get("name") or "Player").strip()[:18]
            client.name = name or "Player"
            return

        if message.get("type") == "input":
            client.input = {
                "up": bool(message.get("up")),
                "down": bool(message.get("down")),
                "left": bool(message.get("left")),
                "right": bool(message.get("right")),
                "fire": bool(message.get("fire")),
                "aimX": self.safe_float(message.get("aimX"), client.x),
                "aimY": self.safe_float(message.get("aimY"), client.y),
            }

    def safe_float(self, value: Any, fallback: float) -> float:
        try:
            result = float(value)
        except (TypeError, ValueError):
            return fallback
        if not math.isfinite(result):
            return fallback
        return result

    def safe_int(self, value: Any, fallback: int) -> int:
        try:
            result = int(value)
        except (TypeError, ValueError):
            return fallback
        return result

    async def read_ws_message(self, reader: asyncio.StreamReader) -> str | None:
        first = await reader.readexactly(2)
        opcode = first[0] & 0x0F
        masked = bool(first[1] & 0x80)
        length = first[1] & 0x7F
        if length == 126:
            length = int.from_bytes(await reader.readexactly(2), "big")
        elif length == 127:
            length = int.from_bytes(await reader.readexactly(8), "big")
        if length > 65536:
            raise ConnectionError("Frame too large")
        mask = await reader.readexactly(4) if masked else b""
        payload = await reader.readexactly(length)
        if masked:
            payload = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
        if opcode == 8:
            return None
        if opcode == 9:
            return ""
        if opcode != 1:
            return ""
        return payload.decode("utf-8")

    async def send_json(
        self,
        writer: asyncio.StreamWriter,
        data: dict[str, Any],
        lock: asyncio.Lock,
    ) -> None:
        payload = json.dumps(data, separators=(",", ":")).encode("utf-8")
        frame = self.build_ws_frame(payload)
        async with lock:
            writer.write(frame)
            await writer.drain()

    def build_ws_frame(self, payload: bytes) -> bytes:
        length = len(payload)
        if length < 126:
            header = bytes([0x81, length])
        elif length < 65536:
            header = bytes([0x81, 126]) + length.to_bytes(2, "big")
        else:
            header = bytes([0x81, 127]) + length.to_bytes(8, "big")
        return header + payload

    async def game_loop(self) -> None:
        last = time.monotonic()
        while self.running:
            now = time.monotonic()
            dt = min(0.05, now - last)
            last = now
            self.update_players(dt, now)
            for match in list(self.fortress_rooms.values()):
                match.update(dt, now)
            for room in list(self.defense_rooms.values()):
                room.update(dt)
            for room in list(self.party_rooms.values()):
                room.update(dt, now)
            await self.broadcast_state()
            await self.broadcast_fortress_state()
            await self.broadcast_defense_state()
            await self.broadcast_party_state()
            await asyncio.sleep(1 / TICK_RATE)

    def update_players(self, dt: float, now: float) -> None:
        for room in list(self.arena_rooms.values()):
            room.effects = [
                effect for effect in room.effects if self.tick_arena_effect(effect, dt)
            ]
            self.ensure_arena_pickups(room)
            for client in list(room.clients.values()):
                if not client.alive:
                    if now >= client.respawn_at:
                        client.x, client.y = self.random_spawn()
                        client.health = 100
                        client.alive = True
                        client.shield_until = 0
                        client.haste_until = 0
                        client.rapid_until = 0
                        client.weapon = "blaster"
                        client.weapon_until = 0
                        client.weapon_ammo = 0
                        self.add_arena_effect(
                            room,
                            client.x,
                            client.y,
                            "respawn",
                            client.color,
                            0.9,
                            "READY",
                        )
                    continue

                controls = client.input
                dx = float(controls.get("right", False)) - float(controls.get("left", False))
                dy = float(controls.get("down", False)) - float(controls.get("up", False))
                length = math.hypot(dx, dy)
                if length:
                    dx /= length
                    dy /= length
                speed = PLAYER_SPEED * (1.32 if now < client.haste_until else 1.0)
                self.move_arena_client(client, dx * speed * dt, dy * speed * dt)
                self.collect_arena_pickups(room, client, now)
                self.expire_arena_weapon(client, now)

                aim_x = float(controls.get("aimX", client.x + 1))
                aim_y = float(controls.get("aimY", client.y))
                client.angle = math.atan2(aim_y - client.y, aim_x - client.x)

                weapon_config = ARENA_WEAPONS.get(client.weapon, ARENA_WEAPONS["blaster"])
                cooldown = float(weapon_config["cooldown"]) * (0.55 if now < client.rapid_until else 1.0)
                if controls.get("fire") and now - client.last_fire >= cooldown:
                    self.spawn_bullet(room, client)
                    client.last_fire = now
            self.update_arena_control_points(room, dt, now)
            self.update_bullets(room, dt)

    def tick_arena_effect(self, effect: ArenaEffect, dt: float) -> bool:
        effect.ttl -= dt
        return effect.ttl > 0

    def add_arena_effect(
        self,
        room: ArenaRoom,
        x: float,
        y: float,
        kind: str,
        color: str,
        ttl: float = 0.7,
        text: str = "",
    ) -> None:
        room.effects.append(ArenaEffect(x=x, y=y, kind=kind, color=color, ttl=ttl, text=text))
        room.effects = room.effects[-36:]

    def expire_arena_weapon(self, client: Client, now: float) -> None:
        if client.weapon == "blaster":
            return
        if client.weapon_ammo > 0 and now < client.weapon_until:
            return
        client.weapon = "blaster"
        client.weapon_until = 0
        client.weapon_ammo = 0

    def update_arena_control_points(self, room: ArenaRoom, dt: float, now: float) -> None:
        for point in room.control_points:
            occupants = [
                client
                for client in room.clients.values()
                if client.alive
                and math.hypot(client.x - float(point["x"]), client.y - float(point["y"]))
                <= float(point["radius"])
            ]
            if len(occupants) != 1:
                if not point.get("ownerId"):
                    point["capture"] = max(0.0, float(point.get("capture", 0.0)) - dt * 0.32)
                continue

            client = occupants[0]
            if point.get("ownerId") == client.id:
                point["capture"] = 1.0
                if now >= float(point.get("nextScoreAt", 0.0)):
                    client.score += 1
                    client.health = min(100, client.health + 4)
                    point["nextScoreAt"] = now + 2.6
                    self.add_arena_effect(
                        room,
                        float(point["x"]),
                        float(point["y"]),
                        "control",
                        client.color,
                        0.55,
                        "+1",
                    )
                continue

            if point.get("ownerId") and float(point.get("capture", 0.0)) > 0:
                point["capture"] = max(0.0, float(point.get("capture", 0.0)) - dt * 0.78)
                if point["capture"] > 0:
                    continue
                point["ownerId"] = ""
                point["ownerName"] = ""
                point["ownerColor"] = ""

            point["capture"] = min(1.0, float(point.get("capture", 0.0)) + dt * 0.52)
            if point["capture"] >= 1.0:
                point["ownerId"] = client.id
                point["ownerName"] = client.name
                point["ownerColor"] = client.color
                point["nextScoreAt"] = now + 1.0
                client.score += 2
                self.add_arena_effect(
                    room,
                    float(point["x"]),
                    float(point["y"]),
                    "control",
                    client.color,
                    0.9,
                    f"{point['label']} 점령",
                )

    def move_arena_client(self, client: Client, dx: float, dy: float) -> None:
        next_x = max(PLAYER_RADIUS, min(ARENA_WIDTH - PLAYER_RADIUS, client.x + dx))
        if not self.arena_circle_hits_obstacle(next_x, client.y, PLAYER_RADIUS):
            client.x = next_x
        next_y = max(PLAYER_RADIUS, min(ARENA_HEIGHT - PLAYER_RADIUS, client.y + dy))
        if not self.arena_circle_hits_obstacle(client.x, next_y, PLAYER_RADIUS):
            client.y = next_y

    def ensure_arena_pickups(self, room: ArenaRoom) -> None:
        kinds = [
            "heal",
            "shield",
            "haste",
            "rapid",
            "spread",
            "rail",
            "rocket",
        ]
        while len(room.pickups) < ARENA_PICKUP_TARGET:
            x, y = self.random_spawn()
            room.pickups.append(
                ArenaPickup(
                    id=room.next_pickup_id,
                    x=x,
                    y=y,
                    kind=random.choice(kinds),
                )
            )
            room.next_pickup_id += 1

    def collect_arena_pickups(self, room: ArenaRoom, client: Client, now: float) -> None:
        remaining: list[ArenaPickup] = []
        for pickup in room.pickups:
            if math.hypot(client.x - pickup.x, client.y - pickup.y) > PLAYER_RADIUS + 16:
                remaining.append(pickup)
                continue
            if pickup.kind == "heal":
                client.health = min(100, client.health + 34)
            elif pickup.kind == "shield":
                client.shield_until = now + 5.0
            elif pickup.kind == "haste":
                client.haste_until = now + 5.0
            elif pickup.kind == "rapid":
                client.rapid_until = now + 5.0
            elif pickup.kind in ARENA_WEAPONS and pickup.kind != "blaster":
                weapon_config = ARENA_WEAPONS[pickup.kind]
                client.weapon = pickup.kind
                client.weapon_until = now + float(weapon_config.get("duration", 10.0))
                client.weapon_ammo = int(weapon_config.get("ammo", 6))
            self.add_arena_effect(
                room,
                pickup.x,
                pickup.y,
                "pickup",
                client.color,
                0.65,
                pickup.kind.upper(),
            )
        room.pickups = remaining

    def spawn_bullet(self, room: ArenaRoom, client: Client) -> None:
        weapon_key = client.weapon if client.weapon in ARENA_WEAPONS else "blaster"
        weapon = ARENA_WEAPONS[weapon_key]
        count = int(weapon.get("count", 1))
        spread = float(weapon.get("spread", 0.0))
        start = -spread / 2 if count > 1 else 0.0
        step = spread / max(1, count - 1)
        for index in range(count):
            angle = client.angle + start + step * index
            speed = float(weapon["speed"])
            vx = math.cos(angle) * speed
            vy = math.sin(angle) * speed
            room.bullets.append(
                Bullet(
                    id=room.next_bullet_id,
                    owner_id=client.id,
                    x=client.x + math.cos(angle) * (PLAYER_RADIUS + 10),
                    y=client.y + math.sin(angle) * (PLAYER_RADIUS + 10),
                    vx=vx,
                    vy=vy,
                    color=client.color,
                    ttl=float(weapon["ttl"]),
                    kind=weapon_key,
                    damage=int(weapon["damage"]),
                    radius=float(weapon["radius"]),
                    splash=float(weapon.get("splash", 0.0)),
                )
            )
            room.next_bullet_id += 1
        self.add_arena_effect(
            room,
            client.x + math.cos(client.angle) * (PLAYER_RADIUS + 18),
            client.y + math.sin(client.angle) * (PLAYER_RADIUS + 18),
            "muzzle",
            client.color,
            0.16,
        )
        if weapon_key != "blaster":
            client.weapon_ammo = max(0, client.weapon_ammo - 1)
            if client.weapon_ammo <= 0:
                client.weapon = "blaster"
                client.weapon_until = 0

    def update_bullets(self, room: ArenaRoom, dt: float) -> None:
        alive_bullets: list[Bullet] = []
        players = list(room.clients.values())
        for bullet in room.bullets:
            bullet.x += bullet.vx * dt
            bullet.y += bullet.vy * dt
            bullet.ttl -= dt
            if (
                bullet.ttl <= 0
                or bullet.x < 0
                or bullet.x > ARENA_WIDTH
                or bullet.y < 0
                or bullet.y > ARENA_HEIGHT
            ):
                self.resolve_arena_bullet_impact(room, bullet)
                continue
            if self.arena_circle_hits_obstacle(bullet.x, bullet.y, bullet.radius):
                self.resolve_arena_bullet_impact(room, bullet)
                continue
            hit = self.find_bullet_hit(bullet, players)
            if hit:
                if bullet.splash > 0:
                    self.resolve_arena_bullet_impact(room, bullet)
                else:
                    self.damage_player(room, hit, bullet.owner_id, bullet.color, bullet.damage)
                continue
            alive_bullets.append(bullet)
        room.bullets = alive_bullets

    def find_bullet_hit(self, bullet: Bullet, players: list[Client]) -> Client | None:
        for player in players:
            if not player.alive or player.id == bullet.owner_id:
                continue
            if math.hypot(player.x - bullet.x, player.y - bullet.y) <= PLAYER_RADIUS + bullet.radius:
                return player
        return None

    def resolve_arena_bullet_impact(self, room: ArenaRoom, bullet: Bullet) -> None:
        if bullet.splash <= 0:
            self.add_arena_effect(room, bullet.x, bullet.y, "impact", bullet.color, 0.45)
            return
        self.add_arena_effect(room, bullet.x, bullet.y, "rocket", bullet.color, 0.72, "BOOM")
        for player in list(room.clients.values()):
            if not player.alive or player.id == bullet.owner_id:
                continue
            gap = math.hypot(player.x - bullet.x, player.y - bullet.y)
            if gap > bullet.splash + PLAYER_RADIUS:
                continue
            ratio = max(0.25, 1.0 - gap / max(1.0, bullet.splash))
            damage = max(10, round(bullet.damage * ratio))
            self.damage_player(room, player, bullet.owner_id, bullet.color, damage)

    def damage_player(
        self, room: ArenaRoom, victim: Client, attacker_id: str, color: str, amount: int = 25
    ) -> None:
        now = time.monotonic()
        damage = max(6, round(amount * 0.4)) if now < victim.shield_until else amount
        victim.health = max(0, victim.health - damage)
        self.add_arena_effect(
            room,
            victim.x,
            victim.y,
            "hit" if victim.health > 0 else "down",
            color,
            0.75,
            f"-{damage}",
        )
        if victim.health > 0:
            return
        victim.alive = False
        victim.respawn_at = time.monotonic() + RESPAWN_DELAY
        attacker = room.clients.get(attacker_id)
        if attacker and attacker.id != victim.id:
            attacker.score += 1

    async def broadcast_state(self) -> None:
        for room_id, room in list(self.arena_rooms.items()):
            if not room.clients:
                continue
            now = time.monotonic()
            for client in room.clients.values():
                self.expire_arena_weapon(client, now)
            state = {
                "type": "state",
                "roomId": room_id,
                "arena": {
                    "width": ARENA_WIDTH,
                    "height": ARENA_HEIGHT,
                    "obstacles": ARENA_OBSTACLES,
                },
                "players": [
                    {
                        "id": client.id,
                        "name": client.name,
                        "x": round(client.x, 2),
                        "y": round(client.y, 2),
                        "angle": round(client.angle, 4),
                        "radius": PLAYER_RADIUS,
                        "health": client.health,
                        "score": client.score,
                        "color": client.color,
                        "alive": client.alive,
                        "respawnIn": max(0, round(client.respawn_at - now, 2)),
                        "shielded": now < client.shield_until,
                        "hasted": now < client.haste_until,
                        "rapid": now < client.rapid_until,
                        "weapon": client.weapon,
                        "weaponAmmo": client.weapon_ammo,
                        "weaponTtl": max(0, round(client.weapon_until - now, 2)),
                    }
                    for client in room.clients.values()
                ],
                "pickups": [
                    {
                        "id": pickup.id,
                        "x": round(pickup.x, 2),
                        "y": round(pickup.y, 2),
                        "kind": pickup.kind,
                    }
                    for pickup in room.pickups
                ],
                "controlPoints": [
                    {
                        "id": point["id"],
                        "label": point["label"],
                        "x": round(float(point["x"]), 2),
                        "y": round(float(point["y"]), 2),
                        "radius": round(float(point["radius"]), 2),
                        "ownerId": point.get("ownerId", ""),
                        "ownerName": point.get("ownerName", ""),
                        "ownerColor": point.get("ownerColor", ""),
                        "capture": round(float(point.get("capture", 0.0)), 3),
                    }
                    for point in room.control_points
                ],
                "bullets": [
                    {
                        "id": bullet.id,
                        "x": round(bullet.x, 2),
                        "y": round(bullet.y, 2),
                        "vx": round(bullet.vx, 2),
                        "vy": round(bullet.vy, 2),
                        "radius": round(bullet.radius, 2),
                        "color": bullet.color,
                        "kind": bullet.kind,
                    }
                    for bullet in room.bullets
                ],
                "effects": [
                    {
                        "x": round(effect.x, 2),
                        "y": round(effect.y, 2),
                        "kind": effect.kind,
                        "color": effect.color,
                        "ttl": round(max(0, effect.ttl), 3),
                        "text": effect.text,
                    }
                    for effect in room.effects
                ],
                "serverTime": round(time.time(), 3),
            }
            stale: list[str] = []
            for client in list(room.clients.values()):
                try:
                    await self.send_json(client.writer, state, client.write_lock)
                except (ConnectionError, OSError):
                    stale.append(client.id)
            for client_id in stale:
                room.clients.pop(client_id, None)
            if not room.clients:
                self.arena_rooms.pop(room_id, None)
                await self.cleanup_hub_room_if_empty(room_id)

    async def broadcast_fortress_state(self) -> None:
        for room_id, match in list(self.fortress_rooms.items()):
            if not match.clients:
                continue
            state = match.state()
            stale: list[str] = []
            for client in list(match.clients.values()):
                try:
                    await self.send_json(
                        client.writer,
                        {**state, "slot": client.slot, "roomId": room_id},
                        client.write_lock,
                    )
                except (ConnectionError, OSError):
                    stale.append(client.id)
            for client_id in stale:
                client = match.clients.get(client_id)
                if client:
                    match.remove_client(client)
            if not match.clients:
                self.fortress_rooms.pop(room_id, None)
                await self.cleanup_hub_room_if_empty(room_id)

    async def broadcast_defense_state(self) -> None:
        for room_id, room in list(self.defense_rooms.items()):
            if not room.clients:
                continue
            state = room.state()
            stale: list[str] = []
            for client in list(room.clients.values()):
                try:
                    await self.send_json(
                        client.writer,
                        {**state, "clientId": client.id, "isHost": client.id == room.host_id},
                        client.write_lock,
                    )
                except (ConnectionError, OSError):
                    stale.append(client.id)
            for client_id in stale:
                client = room.clients.get(client_id)
                if client:
                    room.remove_client(client)
            if not room.clients:
                self.defense_rooms.pop(room_id, None)
                await self.cleanup_hub_room_if_empty(room_id)

    async def broadcast_party_state(self) -> None:
        for room_id, room in list(self.party_rooms.items()):
            if not room.clients:
                continue
            state = room.state()
            stale: list[str] = []
            for client in list(room.clients.values()):
                try:
                    await self.send_json(
                        client.writer,
                        {**state, "clientId": client.id, "isHost": client.id == room.host_id},
                        client.write_lock,
                    )
                except (ConnectionError, OSError):
                    stale.append(client.id)
            for client_id in stale:
                client = room.clients.get(client_id)
                if client:
                    room.remove_client(client)
            if not room.clients:
                self.party_rooms.pop(room_id, None)
                await self.cleanup_hub_room_if_empty(room_id)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run the LAN Arena server.")
    parser.add_argument("--host", default=os.environ.get("LAN_ARENA_HOST", "0.0.0.0"))
    parser.add_argument(
        "--port", type=int, default=int(os.environ.get("LAN_ARENA_PORT", "7000"))
    )
    args = parser.parse_args()

    arena = ArenaServer()
    server = await asyncio.start_server(arena.handle_connection, args.host, args.port)
    sockets = ", ".join(str(sock.getsockname()) for sock in server.sockets or [])
    print(f"LAN Arena listening on {sockets}")
    print(f"Open http://localhost:{args.port}/ on the host PC.")
    print(f"LAN users can open http://HOST_IP:{args.port}/ after firewall access is allowed.")

    loop_task = asyncio.create_task(arena.game_loop())
    try:
        async with server:
            await server.serve_forever()
    except KeyboardInterrupt:
        arena.running = False
    finally:
        arena.running = False
        loop_task.cancel()
        try:
            await loop_task
        except asyncio.CancelledError:
            pass


if __name__ == "__main__":
    asyncio.run(main())
