# Good ETC Python Launcher

`home.html`과 `game/`을 단일 Windows EXE로 묶기 위한 런처입니다.

## 개발 실행

```powershell
py -3 .\pyluncher\launcher.py
```

기본값은 `0.0.0.0:7000`입니다. 실행되면 브라우저에서
`http://localhost:7000/home.html`이 열립니다.

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

EXE는 실행 시 내부 파일을 임시 폴더에 풀고 로컬 HTTP/WebSocket 서버를 시작합니다.
LAN 접속을 받으려면 Windows 방화벽에서 TCP `7000` 포트를 허용해야 합니다.
