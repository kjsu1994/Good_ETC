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

LAN 아레나는 `/ws`, 포트리스 멀티 모드는 `/fortress` WebSocket을 사용합니다. 방화벽에서 TCP `7000` 포트가 허용되어야 다른 PC가 접속할 수 있습니다.

`포트리스 혼자하기`는 WebSocket 서버 없이 브라우저 안에서 로컬로 실행됩니다. 포트리스 화면은 독자 레트로 차량, 지형, HUD, 폭발 효과를 Canvas/CSS로 그리며 원작 게임 자산을 사용하지 않습니다.
