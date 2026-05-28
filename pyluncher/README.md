# Good ETC Python Launcher

`home.html`과 `game/`을 단일 Windows EXE로 묶기 위한 런처입니다.

EXE 실행 시 대시보드는 런처가 만든 로컬 HTTP 주소
`http://127.0.0.1:<port>/home.html`에서 열립니다. `방 입장`과 `파일
클라이언트 입장`은 모두 EXE에 포함된 `game/` 파일을 사용하므로 사용자가
HTML/JS/CSS 파일을 따로 복사할 필요가 없습니다. EXE에서는 두 버튼 모두 외부
브라우저를 열지 않고 앱 창 안의 내장 게임 화면으로 실행됩니다.

일반 브라우저에서 `home.html`을 여는 경우에는 `방 입장`과 `파일 클라이언트 입장`
모두 현재 대시보드와 같은 서버의 `game/index.html` 클라이언트를 열고 입력한
호스트/포트를 WebSocket 접속 주소로 전달합니다. `방 입장`은 자동 접속까지
시도하므로 Docker Compose의 `game-server` 또는 별도 Python 게임 서버가 실행 중이어야
합니다. EXE에서는 계속 런처의 HTTP 게임 클라이언트로 연결됩니다.

## 개발 실행

```powershell
py -3 .\pyluncher\launcher.py
```

기본값은 `0.0.0.0:7000`입니다. EXE를 실행하면 게임 서버가 자동으로 만들어지고
pywebview 창에서 런처의 로컬 HTTP 대시보드를 엽니다. 게임 패널의 `방 입장`
버튼은 같은 서버의 게임 클라이언트 주소로 연결됩니다.

```powershell
py -3 .\pyluncher\launcher.py --port 7010
```

## EXE 빌드

```powershell
powershell -ExecutionPolicy Bypass -File .\pyluncher\build.ps1
```

빌드 결과:

```text
pyluncher/dist/GoodETC_Launcher.exe
```

EXE는 실행 시 내부 파일을 임시 폴더에 풀고, 대시보드와 게임을 같은 로컬
HTTP/WebSocket 서버에서 제공합니다. 빌드는 `--windowed`
모드라 콘솔창 없이 앱 창 하나만 표시됩니다. LAN 접속을 받으려면 Windows
방화벽에서 TCP `7000` 포트를 허용해야 합니다.

사용자 배포 시에는 아래 파일 하나만 전달하면 됩니다.

```text
pyluncher/dist/GoodETC_Launcher.exe
```
