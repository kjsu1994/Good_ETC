# 게임 서버

`home.html`에서 실행하는 LAN 아레나와 포트리스 멀티 모드의 정적 파일 및 WebSocket 서버입니다.

## 실행

호스트 PC에서 서버를 실행합니다.

```bash
python game/server.py --host 0.0.0.0 --port 7000
```

호스트는 브라우저에서 아래 주소를 엽니다.

```text
http://localhost:7000/
```

같은 LAN의 다른 사용자는 호스트 PC의 IP로 접속합니다.

```text
http://HOST_IP:7000/
```

LAN 아레나는 `/ws`, 포트리스 멀티 모드는 `/fortress` WebSocket을 사용합니다. 통합 입장 센터에서 만든 게임 방은 `room` query로 분리되며, 예를 들어 `/ws?room=ABCDE`와 `/fortress?role=client&room=ABCDE`처럼 접속합니다. 방화벽에서 TCP `7000` 포트가 허용되어야 다른 PC가 접속할 수 있습니다.

포트리스 멀티는 방마다 P1/P2 두 명이 플레이하고, 3번째 이후 접속자는 관전자로 들어갑니다. 관전자는 화면에 관전 상태가 표시되고 조작할 수 없으며, 플레이어가 나가면 오래된 관전자부터 자동으로 빈 슬롯에 참여합니다.

`포트리스 혼자하기`는 WebSocket 서버 없이 브라우저 안에서 로컬로 실행됩니다. 각 턴에는 이동 게이지가 100 지급되고, `Z/X/C/V/B`로 표준탄, 강타탄, 광역탄, 분열탄, 굴착탄을 선택합니다. 포트리스 화면은 독자 레트로 차량, 지형, HUD, 폭발 효과를 Canvas/CSS로 그리며 원작 게임 자산을 사용하지 않습니다.

## LAN connection note

- `127.0.0.1`, `127.x.x.x`, and `localhost` always mean the current PC only.
- If the host PC is `192.168.1.154` and the active game port is `7000`, other PCs should open `http://192.168.1.154:7000/game/index.html`.
- Arena can also use `http://192.168.1.154:7000/game/index.html?host=192.168.1.154&port=7000&room=ABCDE&auto=1`.
- Fortress multiplayer join uses `http://192.168.1.154:7000/game/index.html?game=fortress&mode=multi&role=client&host=192.168.1.154&port=7000&room=ABCDE`.
- The game screen has a collapsible connection info panel that shows the current page URL, WebSocket target, active port, and a LAN share URL for another PC.
- The Windows launcher may use `7001`, `7002`, and so on if `7000` is busy. Use the port shown in the dashboard or in the in-game connection panel.

## Hub socket

The server also exposes `/hub` for the unified entry center and Share&Drop. It reuses the same HTTP/WebSocket port as the games, so no extra socket port is required. The unified entry center uses `/hub` to list and create game rooms, while Share&Drop uses `/hub` rooms for chat and file transfer. Share&Drop relays file chunks between browsers in the same room and currently limits each file to 100MB.
