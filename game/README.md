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

파티 게임 월드는 2200x1400 좌표계로 확장되며, 클라이언트는 전체 맵을 한 화면에 축소하지 않고 플레이어 중심 카메라를 사용합니다. LAN 아레나도 2200x1400 전장과 강화된 배경 오브젝트를 사용합니다.

포트리스 전장은 2200x920 좌표계로 확장되고 현재 턴, 포탄, 폭발 위치를 따라가는 카메라를 사용합니다. 웨이브 디펜스는 1280x832 월드, 32px 셀, 40x26 셀 맵을 사용해 기존보다 더 촘촘하고 넓은 배치 공간을 제공합니다.

파티 게임 4종은 3차 고도화에서 게임별 규칙과 화면 밀도를 더 분리했습니다. 카트 랠리는 트랙 밖 감속/저접지 판정을 추가했고, 폭탄 그리드는 십자형 폭발 판정을 사용합니다. 스네이크 배틀은 꼬리 라인과 헤드 표현을 강화했고, 코인 러시는 액션 버튼으로 짧은 대시를 사용해 위험 구역을 빠져나갈 수 있습니다.

LAN 아레나는 4차 고도화에서 서버 판정 기반 엄폐 구조물과 회복/보호막/가속/연사 파워업을 사용합니다. 포트리스 카메라는 조작 패널이 열린 넓은 화면에서도 현재 탱크를 더 잘 보이게 보정하며, 웨이브 디펜스는 경로 방향 표시와 적/타워/사격 이펙트를 강화했습니다.

LAN 아레나 훈련장은 `game/index.html?mode=solo`로 실행합니다. WebSocket 서버 없이 로컬 봇 3명과 플레이하며, 멀티와 같은 2200x1400 전장, 엄폐물, 회복/보호막/가속/연사 파워업, 탄환 충돌과 리스폰 흐름을 사용합니다.

LAN 아레나는 로컬/멀티 공통 전투 이펙트를 사용합니다. 총구 섬광, 탄착 충격파, 피격 데미지 숫자, 처치 상태, 리스폰 링, 파워업 획득 표시가 `effects` 상태로 전달되며, 서버 상태에는 `respawnIn`이 포함되어 부활 대기 시간을 화면에서 확인할 수 있습니다.

LAN 아레나와 파티 게임 4종은 대형 맵 미니맵을 표시합니다. 미니맵에는 현재 카메라 시야, 플레이어, 파워업, 폭탄/위험 구역, 카트 트랙이 요약되어 넓어진 맵에서 위치를 놓치지 않도록 돕습니다.

솔로 파티 모드는 로컬 AI 3명을 자동 배치합니다. 카트 랠리 AI는 체크포인트를 따라 주행하고 부스터를 사용하며, 폭탄 그리드 AI는 상대와 폭탄 폭발 범위를 기준으로 추적/회피하고, 스네이크 배틀 AI는 먹이와 꼬리 충돌 위험을 함께 계산합니다. 코인 러시 AI는 움직이는 위험 구역을 피해 코인을 모으므로 서버 없이도 4인 경쟁 흐름을 확인할 수 있습니다.

웨이브 디펜스 전투 화면은 타워가 현재 공격할 수 있는 목표를 향해 포신을 돌리고, 적은 경로 진행 방향과 보호막 링을 표시합니다. 멀티 서버 상태에도 적의 진행 구간이 포함되어 브라우저/EXE 양쪽에서 같은 전황 표현을 사용할 수 있습니다.

포트리스 전술 미니맵은 우하단에 표시되며 지형 실루엣, P1/P2 위치, 현재 턴, 포탄, 폭발 반경, 현재 카메라 시야를 요약합니다.

포트리스 포탄은 비행 중 실제 이동 지점을 궤적 기록으로 남겨 잔상과 연기처럼 표시합니다. 폭발 지점은 서버/로컬 상태의 `impactMarks`에 보관되어 지형 위 크레이터와 전술 미니맵 흔적으로 남으며, 탄종 색이 궤적과 충돌 흔적에 반영됩니다.

파티 게임 4종은 로컬 솔로와 `/party` 멀티 모두 `effects` 상태를 사용합니다. 카트 랠리는 체크포인트, 랩, 부스터를 표시하고, 폭탄 그리드는 폭탄 설치와 폭발, 피격을 표시합니다. 코인 러시는 코인 획득과 대시, 스네이크 배틀은 충돌과 리스폰을 링 이펙트와 짧은 텍스트로 보여줍니다.
