# Good ETC Python Launcher

`home.html`과 `game/`을 단일 Windows EXE로 묶기 위한 런처입니다.

## 개발 실행

```powershell
py -3 .\pyluncher\launcher.py
```

기본값은 `0.0.0.0:7000`입니다. EXE를 실행하면 게임 서버가 자동으로 만들어지고
pywebview 창에서 번들된 `home.html` 파일을 직접 엽니다. 게임 패널의 `방 입장`
버튼은 EXE가 만든 서버 주소로 연결됩니다.

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

EXE는 실행 시 내부 파일을 임시 폴더에 풀고, 대시보드는 파일 경로로 직접 열며,
게임용 HTTP/WebSocket 서버만 백그라운드에서 시작합니다. 빌드는 `--windowed`
모드라 콘솔창 없이 앱 창 하나만 표시됩니다. LAN 접속을 받으려면 Windows
방화벽에서 TCP `7000` 포트를 허용해야 합니다.

사용자 배포 시에는 아래 파일 하나만 전달하면 됩니다.

```text
pyluncher/dist/GoodETC_Launcher.exe
```
