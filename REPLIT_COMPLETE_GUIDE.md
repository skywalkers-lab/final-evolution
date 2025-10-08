# 🚀 Replit 완벽 가이드 - 프로젝트 업로드 방법

Discord 경제 봇을 Replit에 올리는 3가지 방법을 소개합니다!

---

## ⭐ 방법 1: GitHub에서 직접 가져오기 (제일 쉬움!)

**다운로드 필요 없음!** 클릭 몇 번으로 끝!

### 단계:

1. **Replit 접속**
   ```
   https://replit.com
   → 로그인 (Google 계정 추천)
   ```

2. **새 Repl 생성**
   ```
   왼쪽 메뉴 "Create" 또는 "+ Create Repl" 클릭
   ```

3. **GitHub에서 가져오기**
   ```
   상단 탭에서 "Import from GitHub" 선택
   
   GitHub URL 입력:
   https://github.com/skywalkers-lab/final-evolution
   
   "Import from GitHub" 버튼 클릭
   ```

4. **자동 완료!**
   ```
   모든 파일이 자동으로 Replit에 복사됨
   약 1-2분 소요
   ```

---

## 📦 방법 2: ZIP 파일 업로드

프로젝트를 다운로드해서 올리는 방법입니다.

### A. 프로젝트 다운로드

#### 옵션 1: GitHub에서 다운로드
```
1. https://github.com/skywalkers-lab/final-evolution 접속
2. 초록색 "Code" 버튼 클릭
3. "Download ZIP" 클릭
4. final-evolution-main.zip 다운로드됨
```

#### 옵션 2: 현재 환경에서 다운로드 (이미 완료!)
```
파일 위치: /workspaces/final-evolution-replit.zip
크기: 약 50MB (불필요한 파일 제외됨)
```

### B. Replit에 업로드

1. **Replit에서 빈 Repl 생성**
   ```
   Create → Node.js 선택
   이름: discord-economy-bot
   ```

2. **ZIP 파일 업로드**
   ```
   방법 1: 드래그 앤 드롭
   - ZIP 파일을 Replit 파일 탐색기로 드래그
   
   방법 2: 업로드 버튼
   - 파일 탐색기 우클릭
   - "Upload file" 클릭
   - ZIP 파일 선택
   ```

3. **압축 해제**
   ```
   Replit Shell에서:
   unzip final-evolution-main.zip
   
   또는
   
   unzip final-evolution-replit.zip
   ```

---

## 🖱️ 방법 3: 파일 직접 복사 (비추천)

파일이 많아서 시간이 오래 걸립니다. 방법 1이나 2를 추천합니다!

---

## ⚙️ Replit 설정 (중요!)

프로젝트를 가져온 후 반드시 설정해야 합니다!

### 1. 환경변수 설정 (Secrets)

좌측 메뉴에서 🔒 **Secrets** (자물쇠 아이콘) 클릭:

```bash
# Discord 봇 설정 (필수!)
DISCORD_BOT_TOKEN=여기에_봇_토큰_입력
DISCORD_APPLICATION_ID=여기에_앱_ID_입력

# 데이터베이스 (Neon 사용)
DATABASE_URL=여기에_Neon_DB_URL_입력

# 세션 시크릿
SESSION_SECRET=아무_긴_랜덤_문자열

# 프로덕션 설정
NODE_ENV=production
PORT=3000
```

### 2. .replit 파일 생성/수정

프로젝트 루트에 `.replit` 파일이 있는지 확인:

```toml
run = "npm start"
entrypoint = "server/index.ts"

[nix]
channel = "stable-22_11"

[deployment]
run = ["sh", "-c", "npm start"]

[env]
NODE_ENV = "production"
PORT = "3000"

[[ports]]
localPort = 3000
externalPort = 80

[languages.typescript]
pattern = "**/*.ts"
syntax = "typescript"

[languages.typescript.languageServer]
start = ["typescript-language-server", "--stdio"]
```

### 3. 데이터베이스 설정 (Neon)

Replit은 PostgreSQL을 제공하지 않으므로 **Neon** 사용 (무료):

```
1. https://neon.tech 접속
2. GitHub 계정으로 로그인
3. "Create a project" 클릭
4. Project name: discord-bot
5. Region: US East (Ohio) 선택
6. "Create project" 클릭
7. Connection string 복사
8. Replit Secrets에 DATABASE_URL로 추가
```

**Connection string 형식:**
```
postgresql://user:password@host.neon.tech/database?sslmode=require
```

---

## 🚀 실행하기

### 1. 의존성 설치

Replit Shell에서:
```bash
npm install
```

### 2. 빌드

```bash
npm run build
```

### 3. 데이터베이스 스키마 배포

```bash
npm run db:push
```

### 4. 실행!

Replit 상단의 **"Run"** 버튼 클릭 또는:
```bash
npm start
```

---

## 🔄 24/7 운영 (슬립 방지)

Replit 무료 플랜은 50분 동안 활동이 없으면 슬립 모드로 들어갑니다.

### UptimeRobot 설정 (무료, 5분 소요)

1. **UptimeRobot 가입**
   ```
   https://uptimerobot.com
   → 이메일로 가입 (무료)
   ```

2. **Replit URL 확인**
   ```
   Replit 실행 후 상단에 표시되는 URL 복사
   예: https://discord-economy-bot.username.repl.co
   ```

3. **모니터 추가**
   ```
   Dashboard → "+ Add New Monitor" 클릭
   
   Monitor Type: HTTP(s)
   Friendly Name: Discord Bot
   URL: <Replit URL 입력>
   Monitoring Interval: 5 minutes
   
   "Create Monitor" 클릭
   ```

4. **완료!**
   ```
   이제 5분마다 UptimeRobot이 서버를 깨워서
   24/7 운영이 가능합니다!
   ```

---

## 📝 주요 파일 구조

Replit에서 확인해야 할 중요한 파일들:

```
final-evolution/
├── .replit                # Replit 설정 파일
├── package.json           # 의존성 관리
├── server/
│   ├── index.ts          # 메인 서버 파일
│   ├── services/
│   │   ├── discord-bot.ts    # Discord 봇
│   │   └── trading-engine.ts # 거래 엔진
│   └── storage.ts        # 데이터베이스
├── client/               # 웹 대시보드
└── shared/
    └── schema.ts         # DB 스키마
```

---

## 🐛 문제 해결

### 봇이 시작되지 않음
```bash
# Shell에서 로그 확인
npm start

# 환경변수 확인
echo $DISCORD_BOT_TOKEN
```

**해결책:**
- Secrets에 모든 환경변수가 있는지 확인
- Discord 봇 토큰이 정확한지 확인
- Discord 개발자 포털에서 봇 Intents 활성화 확인

### 데이터베이스 연결 실패
```
Error: getaddrinfo ENOTFOUND
```

**해결책:**
- Neon에서 DATABASE_URL을 정확히 복사했는지 확인
- URL 끝에 `?sslmode=require` 추가
- Replit Secrets에서 DATABASE_URL 다시 확인

### 빌드 에러
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 슬립 모드 문제
- UptimeRobot 설정 확인
- Monitoring Interval이 5분인지 확인
- Replit URL이 정확한지 확인

### 메모리 부족
```
JavaScript heap out of memory
```

**해결책:**
```bash
# package.json의 start 스크립트 수정
"start": "node --max-old-space-size=512 dist/index.js"
```

---

## 🎨 웹 대시보드 접속

봇이 실행되면:

```
Replit URL (자동 생성):
https://discord-economy-bot.username.repl.co

포트를 추가하면:
https://discord-economy-bot.username.repl.co:3000
```

Replit은 자동으로 포트를 프록시해주므로 `:3000` 없이도 접속 가능!

---

## 🔐 Discord 봇 토큰 받는 법

아직 토큰이 없다면:

1. **Discord 개발자 포털**
   ```
   https://discord.com/developers/applications
   ```

2. **애플리케이션 생성**
   ```
   "New Application" 클릭
   이름 입력: 한국은행 Discord Bot
   ```

3. **봇 생성**
   ```
   좌측 "Bot" 메뉴
   → "Add Bot" 클릭
   → "Reset Token" 클릭
   → 토큰 복사 (한 번만 표시됨!)
   ```

4. **권한 설정**
   ```
   Bot → Privileged Gateway Intents:
   ✅ Presence Intent
   ✅ Server Members Intent
   ✅ Message Content Intent
   ```

5. **봇 초대**
   ```
   OAuth2 → URL Generator
   Scopes: ✅ bot, ✅ applications.commands
   Bot Permissions: Administrator (개발용)
   
   생성된 URL로 서버에 초대
   ```

---

## 📊 Replit vs 다른 호스팅

| 특징 | Replit | Render | 가비아 |
|-----|--------|---------|--------|
| 비용 | 무료 | 무료 | 19,800원/월 |
| 설정 | 매우 쉬움 | 쉬움 | 어려움 |
| 24/7 | 핑 필요 | 슬립 있음 | 항상 |
| 속도 | 보통 | 보통 | 빠름 |
| 미성년자 | ✅ | ✅ | ❌ |

---

## 💡 Replit 꿀팁

### 1. 자동 저장
Replit은 모든 변경사항을 자동으로 저장합니다!

### 2. GitHub 연동
```
좌측 메뉴 "Version Control"
→ GitHub 연동
→ 자동으로 commit/push 가능
```

### 3. 팀 작업
```
우측 상단 "Invite" 클릭
→ 친구 초대
→ 실시간 협업 가능
```

### 4. 터미널 여러 개
```
Shell 탭 옆 "+" 버튼
→ 새 터미널 열기
→ 동시에 여러 명령 실행
```

### 5. 비밀 정보 보호
**절대 .env 파일을 사용하지 마세요!**
항상 Secrets를 사용하세요.

---

## 🎓 학습 자료

### Replit 공식 문서
- https://docs.replit.com

### Discord 봇 개발
- https://discord.js.org
- https://discord.com/developers/docs

### PostgreSQL (Neon)
- https://neon.tech/docs

---

## 🆘 도움이 필요하면

### Replit 커뮤니티
- Discord: https://discord.gg/replit
- Forum: https://ask.replit.com

### 프로젝트 이슈
- GitHub Issues: https://github.com/skywalkers-lab/final-evolution/issues

---

## ✅ 최종 체크리스트

배포 전 확인사항:

- [ ] Replit 계정 생성 완료
- [ ] 프로젝트 가져오기 완료 (GitHub 또는 ZIP)
- [ ] Discord 봇 토큰 발급 완료
- [ ] Neon 데이터베이스 생성 완료
- [ ] Replit Secrets 설정 완료:
  - [ ] DISCORD_BOT_TOKEN
  - [ ] DISCORD_APPLICATION_ID
  - [ ] DATABASE_URL
  - [ ] SESSION_SECRET
  - [ ] NODE_ENV=production
- [ ] .replit 파일 확인
- [ ] npm install 실행
- [ ] npm run build 실행
- [ ] npm run db:push 실행
- [ ] 봇 실행 확인 (Run 버튼)
- [ ] Discord에서 봇 온라인 확인
- [ ] 웹 대시보드 접속 확인
- [ ] UptimeRobot 설정 완료 (24/7용)

---

## 🎉 완료!

이제 Discord 경제 봇이 Replit에서 실행됩니다!

### 다음 단계:
1. Discord 서버에서 `/은행 잔액조회` 테스트
2. 웹 대시보드 접속해서 UI 확인
3. UptimeRobot으로 24/7 운영 시작

### 유지보수:
- Replit에서 코드 수정 → 자동 재시작
- GitHub 연동으로 버전 관리
- Neon 대시보드에서 DB 모니터링

**즐거운 코딩 되세요! 🚀**
