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
class HubClient:
    id: str
    writer: asyncio.StreamWriter
    name: str = "Guest"
    room_id: str = ""
    peer: str = ""
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


class ArenaServer:
    def __init__(
        self, game_root: Path | str = ROOT, home_path: Path | str | None = None
    ) -> None:
        self.game_root = Path(game_root).resolve()
        self.home_path = Path(home_path).resolve() if home_path else None
        self.arena_rooms: dict[str, ArenaRoom] = {}
        self.fortress_rooms: dict[str, FortressMatch] = {}
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

    def room_has_activity(self, room_id: str) -> bool:
        arena_room = self.arena_rooms.get(room_id)
        fortress_room = self.fortress_rooms.get(room_id)
        return (
            any(client.room_id == room_id for client in self.hub_clients.values())
            or bool(arena_room and arena_room.clients)
            or bool(fortress_room and fortress_room.clients)
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
        if feature not in {"drop", "arena", "fortress"}:
            feature = "drop"
        pin = "" if feature in {"arena", "fortress"} else str(message.get("pin") or "").strip()[:24]
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
        game_count = (
            arena_count if room.feature == "arena" else fortress_summary["gameCount"]
        )
        return {
            "id": room.id,
            "name": room.name,
            "feature": room.feature,
            "locked": bool(room.pin),
            "hostId": room.host_id,
            "count": hub_count,
            "hubCount": hub_count,
            "gameCount": game_count,
            "playerCount": fortress_summary["playerCount"] if room.feature == "fortress" else game_count,
            "spectatorCount": fortress_summary["spectatorCount"] if room.feature == "fortress" else 0,
            "ready": fortress_summary["ready"] if room.feature == "fortress" else bool(game_count),
            "createdAt": round(room.created_at, 3),
        }

    def hub_participants(self, room_id: str) -> list[dict[str, Any]]:
        return [
            {
                "id": client.id,
                "name": client.name,
                "peer": client.peer,
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
            await self.broadcast_state()
            await self.broadcast_fortress_state()
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
