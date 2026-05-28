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


@dataclass
class Client:
    id: str
    writer: asyncio.StreamWriter
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
class FortressClient:
    id: str
    writer: asyncio.StreamWriter
    slot: int = -1
    write_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class FortressMatch:
    def __init__(self) -> None:
        self.clients: dict[str, FortressClient] = {}
        self.slots: list[str | None] = [None, None]
        self.next_client_id = 1
        self.terrain: list[int] = []
        self.players: list[dict[str, Any]] = []
        self.turn = 0
        self.wind = 0
        self.projectile: dict[str, Any] | None = None
        self.explosion: dict[str, Any] | None = None
        self.game_over = False
        self.status = ""
        self.turn_delay_at = 0.0
        self.reset()

    def create_client(self, writer: asyncio.StreamWriter) -> FortressClient:
        client = FortressClient(id=f"f{self.next_client_id}", writer=writer)
        self.next_client_id += 1
        return client

    def add_client(self, client: FortressClient, role: str) -> None:
        self.clients[client.id] = client
        if role == "host":
            self.reset()
            self.assign_slot(client, 0)
            return
        if self.slots[1] is None:
            self.assign_slot(client, 1)

    def assign_slot(self, client: FortressClient, slot: int) -> None:
        previous = self.slots[slot]
        if previous and previous in self.clients:
            self.clients[previous].slot = -1
        self.slots[slot] = client.id
        client.slot = slot

    def remove_client(self, client: FortressClient) -> None:
        for index, client_id in enumerate(self.slots):
            if client_id == client.id:
                self.slots[index] = None
        self.clients.pop(client.id, None)
        if not self.ready():
            self.projectile = None
            self.turn_delay_at = 0.0

    def ready(self) -> bool:
        return all(self.slots)

    def reset(self) -> None:
        self.players = [
            self.create_player("P1", "#53e2a8", 170, 45, 8, 82),
            self.create_player("P2", "#ffbc54", 1230, 135, 98, 172),
        ]
        self.build_terrain()
        self.place_players()
        self.turn = 0
        self.wind = self.random_wind()
        self.projectile = None
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
            or self.projectile
            or self.turn_delay_at
        ):
            return
        if action == "move":
            self.move_player(self.safe_float(message.get("delta"), 0))
        elif action == "angle":
            self.adjust_angle(self.safe_float(message.get("delta"), 0))
        elif action == "power":
            self.adjust_power(self.safe_float(message.get("delta"), 0))
        elif action == "fire":
            self.fire()
        elif action == "item":
            self.use_item(str(message.get("item") or ""))

    def move_player(self, delta: float) -> None:
        player = self.current_player()
        other = self.players[1 - self.turn]
        delta = self.clamp(delta, -20, 20)
        next_x = self.clamp(player["x"] + delta, 50, FORTRESS_WIDTH - 50)
        if abs(next_x - other["x"]) < 72:
            return
        player["x"] = next_x
        player["y"] = self.terrain_at(player["x"]) - 18

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
        radians = (player["angle"] * math.pi) / 180
        speed = 145 + player["power"] * 5.1
        power_shot = player["activeItem"] == "power" and player["items"]["power"] > 0
        if power_shot:
            player["items"]["power"] -= 1
        player["activeItem"] = ""
        self.projectile = {
            "owner": self.turn,
            "x": player["x"] + math.cos(radians) * 31,
            "y": player["y"] - 21 - math.sin(radians) * 31,
            "vx": math.cos(radians) * speed,
            "vy": -math.sin(radians) * speed,
            "radius": 72 if power_shot else 52,
            "damage": 48 if power_shot else 34,
            "age": 0.0,
        }
        self.status = f"{player['name']} 발사."

    def finish_turn_soon(self) -> None:
        self.turn_delay_at = time.monotonic() + 0.65

    def next_turn(self) -> None:
        self.current_player()["activeItem"] = ""
        self.turn = 1 - self.turn
        self.wind = self.random_wind()
        self.turn_delay_at = 0.0
        self.status = f"{self.current_player()['name']} 턴. 이동, 포각, 파워를 조절하세요."

    def update(self, dt: float, now: float) -> None:
        if self.turn_delay_at and now >= self.turn_delay_at and not self.projectile:
            self.next_turn()
        if self.ready():
            self.update_projectile(dt)
        if self.explosion:
            self.explosion["age"] += dt
            if self.explosion["age"] > 0.55:
                self.explosion = None

    def update_projectile(self, dt: float) -> None:
        shot = self.projectile
        if not shot:
            return
        shot["age"] += dt
        shot["vx"] += self.wind * 0.22 * dt
        shot["vy"] += FORTRESS_GRAVITY * dt
        shot["x"] += shot["vx"] * dt
        shot["y"] += shot["vy"] * dt

        for index, player in enumerate(self.players):
            if index == shot["owner"] and shot["age"] < 0.18:
                continue
            if math.hypot(shot["x"] - player["x"], shot["y"] - player["y"]) <= 24:
                self.explode(shot["x"], shot["y"])
                return

        if shot["x"] < 0 or shot["x"] > FORTRESS_WIDTH or shot["y"] > FORTRESS_HEIGHT:
            self.explode(
                self.clamp(shot["x"], 0, FORTRESS_WIDTH),
                self.clamp(shot["y"], 0, FORTRESS_HEIGHT),
            )
            return

        if shot["y"] >= self.terrain_at(shot["x"]):
            self.explode(shot["x"], shot["y"])

    def explode(self, x: float, y: float) -> None:
        shot = self.projectile
        if not shot:
            return
        self.projectile = None
        self.explosion = {"x": x, "y": y, "radius": shot["radius"], "age": 0.0}
        self.carve_terrain(x, y, shot["radius"])
        self.apply_explosion_damage(x, y, shot["radius"], shot["damage"])
        self.place_players()
        if not self.game_over:
            self.finish_turn_soon()

    def carve_terrain(self, cx: float, cy: float, radius: float) -> None:
        start = self.clamp(math.floor(cx - radius), 0, FORTRESS_WIDTH)
        end = self.clamp(math.ceil(cx + radius), 0, FORTRESS_WIDTH)
        for x in range(start, end + 1):
            dx = x - cx
            depth = math.sqrt(max(0, radius * radius - dx * dx)) * 0.72
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
                    "items": dict(player["items"]),
                }
                for index, player in enumerate(self.players)
            ],
            "turn": self.turn,
            "wind": self.wind,
            "projectile": self.visible_projectile(),
            "explosion": self.visible_explosion(),
            "gameOver": self.game_over,
            "ready": self.ready(),
            "status": self.status_text(),
        }

    def visible_projectile(self) -> dict[str, Any] | None:
        if not self.projectile:
            return None
        return {
            "x": round(self.projectile["x"], 2),
            "y": round(self.projectile["y"], 2),
            "radius": self.projectile["radius"],
        }

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
        self.clients: dict[str, Client] = {}
        self.bullets: list[Bullet] = []
        self.next_client_id = 1
        self.next_bullet_id = 1
        self.fortress = FortressMatch()
        self.running = True

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
            else:
                await self.handle_websocket(reader, writer, headers)
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

        client = self.create_client(writer)
        self.clients[client.id] = client
        await self.send_json(writer, {"type": "welcome", "id": client.id}, client.write_lock)

        try:
            while self.running:
                message = await self.read_ws_message(reader)
                if message is None:
                    break
                self.handle_client_message(client, message)
        except (asyncio.IncompleteReadError, ConnectionError, OSError, UnicodeDecodeError):
            pass
        finally:
            self.clients.pop(client.id, None)
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
        client = self.fortress.create_client(writer)
        self.fortress.add_client(client, role)
        await self.send_json(
            writer,
            {"type": "fortress_welcome", "id": client.id, "slot": client.slot},
            client.write_lock,
        )

        try:
            while self.running:
                message = await self.read_ws_message(reader)
                if message is None:
                    break
                self.fortress.handle_message(client, message)
        except (asyncio.IncompleteReadError, ConnectionError, OSError, UnicodeDecodeError):
            pass
        finally:
            self.fortress.remove_client(client)
            writer.close()
            try:
                await writer.wait_closed()
            except OSError:
                pass

    def create_client(self, writer: asyncio.StreamWriter) -> Client:
        client_id = f"p{self.next_client_id}"
        self.next_client_id += 1
        x, y = self.random_spawn()
        return Client(
            id=client_id,
            writer=writer,
            color=COLORS[(self.next_client_id - 2) % len(COLORS)],
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
            self.update_bullets(dt)
            self.fortress.update(dt, now)
            await self.broadcast_state()
            await self.broadcast_fortress_state()
            await asyncio.sleep(1 / TICK_RATE)

    def update_players(self, dt: float, now: float) -> None:
        for client in list(self.clients.values()):
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
                self.spawn_bullet(client)
                client.last_fire = now

    def spawn_bullet(self, client: Client) -> None:
        vx = math.cos(client.angle) * BULLET_SPEED
        vy = math.sin(client.angle) * BULLET_SPEED
        self.bullets.append(
            Bullet(
                id=self.next_bullet_id,
                owner_id=client.id,
                x=client.x + math.cos(client.angle) * (PLAYER_RADIUS + 10),
                y=client.y + math.sin(client.angle) * (PLAYER_RADIUS + 10),
                vx=vx,
                vy=vy,
                color=client.color,
            )
        )
        self.next_bullet_id += 1

    def update_bullets(self, dt: float) -> None:
        alive_bullets: list[Bullet] = []
        players = list(self.clients.values())
        for bullet in self.bullets:
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
                self.damage_player(hit, bullet.owner_id)
                continue
            alive_bullets.append(bullet)
        self.bullets = alive_bullets

    def find_bullet_hit(self, bullet: Bullet, players: list[Client]) -> Client | None:
        for player in players:
            if not player.alive or player.id == bullet.owner_id:
                continue
            if math.hypot(player.x - bullet.x, player.y - bullet.y) <= PLAYER_RADIUS + BULLET_RADIUS:
                return player
        return None

    def damage_player(self, victim: Client, attacker_id: str) -> None:
        victim.health = max(0, victim.health - 25)
        if victim.health > 0:
            return
        victim.alive = False
        victim.respawn_at = time.monotonic() + RESPAWN_DELAY
        attacker = self.clients.get(attacker_id)
        if attacker and attacker.id != victim.id:
            attacker.score += 1

    async def broadcast_state(self) -> None:
        if not self.clients:
            return
        state = {
            "type": "state",
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
                for client in self.clients.values()
            ],
            "bullets": [
                {
                    "id": bullet.id,
                    "x": round(bullet.x, 2),
                    "y": round(bullet.y, 2),
                    "radius": BULLET_RADIUS,
                    "color": bullet.color,
                }
                for bullet in self.bullets
            ],
            "serverTime": round(time.time(), 3),
        }
        stale: list[str] = []
        for client in list(self.clients.values()):
            try:
                await self.send_json(client.writer, state, client.write_lock)
            except (ConnectionError, OSError):
                stale.append(client.id)
        for client_id in stale:
            self.clients.pop(client_id, None)

    async def broadcast_fortress_state(self) -> None:
        if not self.fortress.clients:
            return
        state = self.fortress.state()
        stale: list[str] = []
        for client in list(self.fortress.clients.values()):
            try:
                await self.send_json(client.writer, {**state, "slot": client.slot}, client.write_lock)
            except (ConnectionError, OSError):
                stale.append(client.id)
        for client_id in stale:
            client = self.fortress.clients.get(client_id)
            if client:
                self.fortress.remove_client(client)


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
