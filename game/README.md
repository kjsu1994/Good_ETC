# LAN Arena

`home.html`에서 실행하는 같은 LAN용 탑다운 아레나 게임입니다.

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

방화벽에서 TCP `7000` 포트가 허용되어야 합니다. `home.html`의 게임
패널에서 접속을 허용할 IP와 포트를 입력하면 Windows `netsh` 명령 또는
`.bat` 내용을 생성할 수 있습니다.
