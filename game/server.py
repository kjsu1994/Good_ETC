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
ARENA_WIDTH = 1600
ARENA_HEIGHT = 1000
PLAYER_RADIUS = 18
PLAYER_SPEED = 260
BULLET_RADIUS = 5
BULLET_SPEED = 650
BULLET_TTL = 1.6
FIRE_COOLDOWN = 0.22
RESPAWN_DELAY = 1.8
TICK_RATE = 30
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

FORTRESS_WIDTH = 1400
FORTRESS_HEIGHT = 760
FORTRESS_GRAVITY = 300
FORTRESS_TICK_RATE = 30
FORTRESS_MOVE_BUDGET_MAX = 100
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

DEFENSE_WIDTH = 960
DEFENSE_HEIGHT = 640
DEFENSE_CELL = 40
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
        "pathPoints": [(0, 7), (5, 7), (5, 3), (12, 3), (12, 11), (20, 11), (20, 6), (23, 6)],
    },
    "harbor": {
        "name": "항구 지그재그",
        "baseHealth": 22,
        "startResources": 170,
        "pathPoints": [(0, 4), (4, 4), (4, 12), (9, 12), (9, 5), (15, 5), (15, 10), (23, 10)],
    },
    "lava": {
        "name": "용암 협곡",
        "baseHealth": 18,
        "startResources": 200,
        "pathPoints": [(0, 10), (3, 10), (3, 2), (8, 2), (8, 13), (14, 13), (14, 6), (19, 6), (19, 9), (23, 9)],
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
        "color": "#ffba5a",
        "desc": "범위 피해",
    },
    "sniper": {
        "name": "저격",
        "cost": 135,
        "range": 230,
        "damage": 55,
        "cooldown": 1.7,
        "color": "#c8f7ff",
        "desc": "긴 사거리 고화력",
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


@dataclass
class ArenaRoom:
    id: str
    clients: dict[str, Client] = field(default_factory=dict)
    bullets: list[Bullet] = field(default_factory=list)
    next_client_id: int = 1
    next_bullet_id: int = 1
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
            self.create_player("P1", "#53e2a8", 170, 45, 8, 82),
            self.create_player("P2", "#ffbc54", 1230, 135, 98, 172),
        ]
        self.build_terrain()
        self.place_players()
        self.turn = 0
        self.wind = self.random_wind()
        self.set_projectiles([])
        self.explosion = None
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
            "activeItem": "",
            "items": {"repair": 1, "shield": 1, "power": 1},
        }

    def random_wind(self) -> int:
        return round((random.random() * 2 - 1) * 70)

    def build_terrain(self) -> None:
        self.terrain = []
        for x in range(FORTRESS_WIDTH + 1):
            y = (
                535
                + math.sin(x / 105) * 48
                + math.sin(x / 47) * 21
                + math.sin(x / 230) * 34
            )
            self.terrain.append(self.clamp(round(y), 390, 660))
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
        }

    def finish_turn_soon(self) -> None:
        self.turn_delay_at = time.monotonic() + 0.65

    def next_turn(self) -> None:
        self.current_player()["activeItem"] = ""
        self.turn = 1 - self.turn
        self.current_player()["moveLeft"] = FORTRESS_MOVE_BUDGET_MAX
        self.wind = self.random_wind()
        self.turn_delay_at = 0.0
        self.status = f"{self.current_player()['name']} 턴. 이동, 포각, 파워를 조절하세요."

    def update(self, dt: float, now: float) -> None:
        if self.turn_delay_at and now >= self.turn_delay_at and not self.projectile:
            self.next_turn()
        if self.ready():
            self.update_projectiles(dt)
        if self.explosion:
            self.explosion["age"] += dt
            if self.explosion["age"] > 0.55:
                self.explosion = None

    def update_projectiles(self, dt: float) -> None:
        active: list[dict[str, Any]] = []
        exploded = False
        for shot in list(self.projectiles):
            shot["age"] += dt
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
        self.explosion = {"x": x, "y": y, "radius": shot["radius"], "age": 0.0}
        self.carve_terrain(x, y, shot["radius"], shot.get("carve", 1.0))
        self.apply_explosion_damage(x, y, shot["radius"], shot["damage"])
        self.place_players()

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
        self.status = f"{client.name}님이 타워를 판매했습니다. +{refund}"
        return ""

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
                self.schedule_auto_start()

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
            speed = enemy.speed * (0.55 if enemy.slow_until > 0 else 1.0)
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
                self.base_health = max(0, self.base_health - max(1, enemy.base_damage))
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
                        self.damage_enemy(enemy, damage, tower.owner_id)
            else:
                self.damage_enemy(target, damage, tower.owner_id)

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

    def damage_enemy(self, enemy: DefenseEnemy, damage: float, owner_id: str) -> None:
        if enemy not in self.enemies:
            return
        if enemy.shield > 0:
            absorbed = min(enemy.shield, damage)
            enemy.shield -= absorbed
            damage -= absorbed
            if damage <= 0:
                return
        enemy.health -= damage
        if enemy.health > 0:
            return
        self.enemies.remove(enemy)
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
                    "type": enemy.enemy_type,
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
            "serverTime": round(time.time(), 3),
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

    def room_has_activity(self, room_id: str) -> bool:
        arena_room = self.arena_rooms.get(room_id)
        fortress_room = self.fortress_rooms.get(room_id)
        defense_room = self.defense_rooms.get(room_id)
        return (
            any(client.room_id == room_id for client in self.hub_clients.values())
            or bool(arena_room and arena_room.clients)
            or bool(fortress_room and fortress_room.clients)
            or bool(defense_room and defense_room.clients)
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
        if error:
            await self.send_json(
                client.writer,
                {"type": "defense_error", "message": error},
                client.write_lock,
            )

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
        if feature not in {"drop", "arena", "fortress", "defense"}:
            feature = "drop"
        pin = (
            ""
            if feature in {"arena", "fortress", "defense"}
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
        return (
            random.uniform(PLAYER_RADIUS + 60, ARENA_WIDTH - PLAYER_RADIUS - 60),
            random.uniform(PLAYER_RADIUS + 60, ARENA_HEIGHT - PLAYER_RADIUS - 60),
        )

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
            await self.broadcast_state()
            await self.broadcast_fortress_state()
            await self.broadcast_defense_state()
            await asyncio.sleep(1 / TICK_RATE)

    def update_players(self, dt: float, now: float) -> None:
        for room in list(self.arena_rooms.values()):
            for client in list(room.clients.values()):
                if not client.alive:
                    if now >= client.respawn_at:
                        client.x, client.y = self.random_spawn()
                        client.health = 100
                        client.alive = True
                    continue

                controls = client.input
                dx = float(controls.get("right", False)) - float(controls.get("left", False))
                dy = float(controls.get("down", False)) - float(controls.get("up", False))
                length = math.hypot(dx, dy)
                if length:
                    dx /= length
                    dy /= length
                client.x = max(
                    PLAYER_RADIUS,
                    min(ARENA_WIDTH - PLAYER_RADIUS, client.x + dx * PLAYER_SPEED * dt),
                )
                client.y = max(
                    PLAYER_RADIUS,
                    min(ARENA_HEIGHT - PLAYER_RADIUS, client.y + dy * PLAYER_SPEED * dt),
                )

                aim_x = float(controls.get("aimX", client.x + 1))
                aim_y = float(controls.get("aimY", client.y))
                client.angle = math.atan2(aim_y - client.y, aim_x - client.x)

                if controls.get("fire") and now - client.last_fire >= FIRE_COOLDOWN:
                    self.spawn_bullet(room, client)
                    client.last_fire = now
            self.update_bullets(room, dt)

    def spawn_bullet(self, room: ArenaRoom, client: Client) -> None:
        vx = math.cos(client.angle) * BULLET_SPEED
        vy = math.sin(client.angle) * BULLET_SPEED
        room.bullets.append(
            Bullet(
                id=room.next_bullet_id,
                owner_id=client.id,
                x=client.x + math.cos(client.angle) * (PLAYER_RADIUS + 10),
                y=client.y + math.sin(client.angle) * (PLAYER_RADIUS + 10),
                vx=vx,
                vy=vy,
                color=client.color,
            )
        )
        room.next_bullet_id += 1

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
                continue
            hit = self.find_bullet_hit(bullet, players)
            if hit:
                self.damage_player(room, hit, bullet.owner_id)
                continue
            alive_bullets.append(bullet)
        room.bullets = alive_bullets

    def find_bullet_hit(self, bullet: Bullet, players: list[Client]) -> Client | None:
        for player in players:
            if not player.alive or player.id == bullet.owner_id:
                continue
            if math.hypot(player.x - bullet.x, player.y - bullet.y) <= PLAYER_RADIUS + BULLET_RADIUS:
                return player
        return None

    def damage_player(self, room: ArenaRoom, victim: Client, attacker_id: str) -> None:
        victim.health = max(0, victim.health - 25)
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
            state = {
                "type": "state",
                "roomId": room_id,
                "arena": {"width": ARENA_WIDTH, "height": ARENA_HEIGHT},
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
                    }
                    for client in room.clients.values()
                ],
                "bullets": [
                    {
                        "id": bullet.id,
                        "x": round(bullet.x, 2),
                        "y": round(bullet.y, 2),
                        "radius": BULLET_RADIUS,
                        "color": bullet.color,
                    }
                    for bullet in room.bullets
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
