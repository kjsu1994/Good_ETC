#!/usr/bin/env python3
"""Good ETC single-executable launcher."""

from __future__ import annotations

import argparse
import asyncio
import os
import socket
import sys
import webbrowser
from pathlib import Path


def resource_root() -> Path:
    bundled = getattr(sys, "_MEIPASS", None)
    if bundled:
        return Path(bundled).resolve()
    return Path(__file__).resolve().parents[1]


APP_ROOT = resource_root()
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from game.server import ArenaServer


def local_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


async def run_launcher(host: str, port: int, open_browser: bool) -> None:
    root = APP_ROOT
    home_path = root / "home.html"
    game_root = root / "game"

    if not home_path.is_file():
        raise FileNotFoundError(f"home.html not found: {home_path}")
    if not (game_root / "index.html").is_file():
        raise FileNotFoundError(f"game/index.html not found: {game_root}")

    arena = ArenaServer(game_root=game_root, home_path=home_path)
    server = await asyncio.start_server(arena.handle_connection, host, port)
    loop_task = asyncio.create_task(arena.game_loop())

    local_url = f"http://localhost:{port}/home.html"
    lan_url = f"http://{local_ip()}:{port}/home.html"
    print("Good ETC launcher is running.")
    print(f"Local: {local_url}")
    print(f"LAN:   {lan_url}")
    print("Press Ctrl+C to stop.")

    if open_browser:
        webbrowser.open(local_url)

    try:
        async with server:
            await server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        arena.running = False
        loop_task.cancel()
        try:
            await loop_task
        except asyncio.CancelledError:
            pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Good ETC as a local app server.")
    parser.add_argument(
        "--host",
        default=os.environ.get("GOOD_ETC_HOST", "0.0.0.0"),
        help="Bind address. Use 0.0.0.0 for LAN access.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("GOOD_ETC_PORT", "7000")),
        help="HTTP/WebSocket port.",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Start the server without opening the browser.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        asyncio.run(run_launcher(args.host, args.port, not args.no_browser))
    except OSError as exc:
        print(f"Failed to start launcher: {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
