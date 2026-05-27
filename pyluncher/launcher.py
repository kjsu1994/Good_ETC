#!/usr/bin/env python3
"""Good ETC single-executable launcher."""

from __future__ import annotations

import argparse
import asyncio
import os
import socket
import sys
import threading
import time
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


APP_TITLE = "IMT Dashboard v5.0"
APP_WIDTH = 1280
APP_HEIGHT = 900


def local_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


class LauncherServer:
    def __init__(self, host: str, port: int) -> None:
        self.host = host
        self.preferred_port = port
        self.port = port
        self.ready = threading.Event()
        self.error: BaseException | None = None
        self.loop: asyncio.AbstractEventLoop | None = None
        self.stop_event: asyncio.Event | None = None
        self.thread = threading.Thread(target=self._thread_main, daemon=True)

    @property
    def local_url(self) -> str:
        return f"http://localhost:{self.port}/home.html"

    @property
    def lan_url(self) -> str:
        return f"http://{local_ip()}:{self.port}/home.html"

    def start(self) -> None:
        self.thread.start()
        if not self.ready.wait(15):
            raise TimeoutError("Launcher server did not start in time.")
        if self.error:
            raise self.error

    def stop(self) -> None:
        if self.loop and self.stop_event:
            self.loop.call_soon_threadsafe(self.stop_event.set)
        self.thread.join(timeout=5)

    def _thread_main(self) -> None:
        try:
            asyncio.run(self._run())
        except BaseException as exc:
            self.error = exc
            self.ready.set()

    async def _run(self) -> None:
        root = APP_ROOT
        home_path = root / "home.html"
        game_root = root / "game"

        if not home_path.is_file():
            raise FileNotFoundError(f"home.html not found: {home_path}")
        if not (game_root / "index.html").is_file():
            raise FileNotFoundError(f"game/index.html not found: {game_root}")

        self.loop = asyncio.get_running_loop()
        self.stop_event = asyncio.Event()
        arena = ArenaServer(game_root=game_root, home_path=home_path)
        server = await self._start_http_server(arena)
        loop_task = asyncio.create_task(arena.game_loop())

        self.ready.set()
        try:
            await self.stop_event.wait()
        finally:
            server.close()
            await server.wait_closed()
            arena.running = False
            loop_task.cancel()
            try:
                await loop_task
            except asyncio.CancelledError:
                pass

    async def _start_http_server(self, arena: ArenaServer) -> asyncio.Server:
        last_error: OSError | None = None
        for port in range(self.preferred_port, self.preferred_port + 20):
            try:
                server = await asyncio.start_server(
                    arena.handle_connection,
                    self.host,
                    port,
                )
                self.port = port
                return server
            except OSError as exc:
                last_error = exc
                if getattr(exc, "errno", None) not in {48, 98, 10048}:
                    raise
        raise OSError(
            f"No available port from {self.preferred_port} to {self.preferred_port + 19}."
        ) from last_error


def run_pywebview(server: LauncherServer) -> None:
    import webview

    webview.create_window(
        APP_TITLE,
        server.local_url,
        width=APP_WIDTH,
        height=APP_HEIGHT,
        resizable=True,
        confirm_close=True,
    )
    webview.start()


def run_until_stopped() -> None:
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
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
        "--browser",
        action="store_true",
        help="Open in the default browser instead of pywebview.",
    )
    parser.add_argument(
        "--no-window",
        "--no-browser",
        dest="no_window",
        action="store_true",
        help="Start only the background server.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    server = LauncherServer(args.host, args.port)
    try:
        server.start()
        print("Good ETC launcher is running.")
        print(f"Local: {server.local_url}")
        print(f"LAN:   {server.lan_url}")

        if args.no_window:
            run_until_stopped()
        elif args.browser:
            webbrowser.open(server.local_url)
            run_until_stopped()
        else:
            run_pywebview(server)
    except OSError as exc:
        print(f"Failed to start launcher: {exc}", file=sys.stderr)
        raise SystemExit(1)
    finally:
        server.stop()


if __name__ == "__main__":
    main()
