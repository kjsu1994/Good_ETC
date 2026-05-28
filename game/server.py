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
from urllib.parse import unquote, urlparse


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
            await self.broadcast_state()
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
