# 게임 서버

`home.html`에서 실행하는 LAN 아레나, 포트리스, 웨이브 디펜스, 파티 게임의 정적 파일 및 WebSocket 서버입니다.

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

LAN 아레나는 `/ws`, 포트리스 멀티 모드는 `/fortress`, 웨이브 디펜스 멀티 모드는 `/defense`, 파티 게임은 `/party` WebSocket을 사용합니다. 통합 입장 센터에서 만든 게임 방은 `room` query로 분리되며, 예를 들어 `/ws?room=ABCDE`, `/fortress?role=client&room=ABCDE`, `/fortress?role=spectator&room=ABCDE`, `/defense?room=ABCDE`, `/party?game=kart&room=ABCDE`처럼 접속합니다. 방화벽에서 TCP `7000` 포트가 허용되어야 다른 PC가 접속할 수 있습니다.

포트리스 멀티는 방마다 P1/P2 두 명이 플레이하고, 3번째 이후 접속자는 관전자로 들어갑니다. 관전자는 화면에 관전 상태가 표시되고 조작할 수 없으며, 플레이어가 나가면 오래된 관전자부터 자동으로 빈 슬롯에 참여합니다.

`포트리스 혼자하기`는 WebSocket 서버 없이 브라우저 안에서 로컬로 실행됩니다. 각 턴에는 이동 게이지가 100 지급되고, `Z/X/C/V/B`로 표준탄, 강타탄, 광역탄, 분열탄, 굴착탄을 선택합니다. 포트리스 화면은 독자 레트로 차량, 지형, HUD, 폭발 효과를 Canvas/CSS로 그리며 원작 게임 자산을 사용하지 않습니다.

## LAN connection note

- `127.0.0.1`, `127.x.x.x`, and `localhost` always mean the current PC only.
- If the host PC is `192.168.1.154` and the active game port is `7000`, other PCs should open `http://192.168.1.154:7000/game/index.html`.
- Arena can also use `http://192.168.1.154:7000/game/index.html?host=192.168.1.154&port=7000&room=ABCDE&auto=1`.
- Fortress multiplayer join uses `http://192.168.1.154:7000/game/index.html?game=fortress&mode=multi&role=client&host=192.168.1.154&port=7000&room=ABCDE`.
- Party games use `http://192.168.1.154:7000/game/index.html?game=kart&mode=multi&host=192.168.1.154&port=7000&room=ABCDE&auto=1`. Replace `kart` with `bomb`, `snake`, or `coin`.
- The game screen has a collapsible connection info panel. `현재 화면` is the local page currently open, `서버 연결` is the WebSocket target used by the game, and `초대 링크` is the address to send to another participant.
- The Windows launcher may use `7001`, `7002`, and so on if `7000` is busy. Use the port shown in the dashboard or in the in-game connection panel.

## Hub socket

The server also exposes `/hub` for the unified entry center and Share&Drop. It reuses the same HTTP/WebSocket port as the games, so no extra socket port is required. The unified entry center uses `/hub` to list and create game rooms, while Share&Drop uses `/hub` rooms for chat and file transfer. Share&Drop relays file chunks between browsers in the same room and currently limits each file to 100MB.

## 웨이브 디펜스

웨이브 디펜스 멀티는 `/defense?room=ABCDE` WebSocket을 사용합니다. 통합 입장 센터의 `defense` 방에서 바로 입장할 수 있고, 첫 접속자가 방장이 되어 첫 웨이브를 시작합니다. 참가자는 각자 개인 자원으로 기본탄, 감속, 폭발, 저격, 증폭기 타워를 배치하며, 기본 우회로/항구 지그재그/용암 협곡 맵에서 15웨이브 동안 기지를 지키면 승리합니다. 5/10/15웨이브에는 보스가 등장하고, 첫 웨이브 이후에는 준비 시간이 끝나면 다음 웨이브가 자동으로 시작됩니다.

혼자하기는 `game/index.html?game=defense&mode=solo`로 실행되며 WebSocket 서버 없이 브라우저 또는 EXE 안에서 동작합니다.

## 카트 랠리와 파티 게임

카트 랠리와 파티 게임 3종은 공통 `/party?game=TYPE&room=ABCDE` WebSocket을 사용합니다. 지원 타입은 `kart`, `bomb`, `snake`, `coin`입니다.

- `kart`: 체크포인트 3바퀴 완주 레이싱입니다. Space로 부스터를 사용합니다.
- `bomb`: 폭탄을 설치하고 폭발 범위를 피해 점수를 얻습니다.
- `snake`: 먹이를 모아 길어지고 벽과 꼬리 충돌을 피합니다.
- `coin`: 움직이는 위험 구역을 피해 코인을 모으는 시간제 점수 경쟁입니다.

각 게임은 `game/index.html?game=TYPE&mode=solo` 혼자하기 폴백을 제공하고, 멀티 화면에는 `?` 도움말과 `i` 접속 정보 패널이 있습니다. 라운드는 제한 시간 또는 완주 조건으로 종료되고 승자를 표시하며, 작은 화면에서는 터치 방향 패드와 액션 버튼으로 조작할 수 있습니다.
