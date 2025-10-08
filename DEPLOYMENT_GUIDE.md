# 🚀 한국은행 종합 서비스센터 - 프로덕션 배포 가이드

## 📋 목차
1. [사전 준비](#사전-준비)
2. [Railway 배포](#railway-배포)
3. [Discord 봇 설정](#discord-봇-설정)
4. [환경 변수 설정](#환경-변수-설정)
5. [데이터베이스 설정](#데이터베이스-설정)
6. [배포 후 확인](#배포-후-확인)

---

## 🎯 사전 준비

### 1. Discord 개발자 포털 설정

#### Discord 애플리케이션 생성
1. https://discord.com/developers/applications 접속
2. "New Application" 클릭
3. 애플리케이션 이름 입력 (예: 한국은행 종합 서비스)

#### 봇 생성 및 토큰 획득
1. 좌측 메뉴에서 "Bot" 선택
2. "Add Bot" 클릭
3. **Bot Token** 복사 (나중에 사용)
4. 다음 권한 활성화:
   - ✅ Presence Intent
   - ✅ Server Members Intent
   - ✅ Message Content Intent

#### OAuth2 설정
1. 좌측 메뉴에서 "OAuth2" → "General" 선택
2. **Client ID** 복사
3. **Client Secret** 생성 후 복사
4. "Redirects" 섹션에 다음 추가:
   ```
   https://your-app-name.up.railway.app/auth/discord/callback
   http://localhost:3000/auth/discord/callback  (개발용)
   ```

#### 봇 권한 설정
1. "OAuth2" → "URL Generator" 선택
2. **Scopes** 선택:
   - ✅ bot
   - ✅ applications.commands
3. **Bot Permissions** 선택:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ Use Slash Commands
4. 생성된 URL로 봇을 서버에 초대

---

## 🚂 Railway 배포

### 1. Railway 프로젝트 생성

1. https://railway.app 접속 및 로그인
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. 저장소 연결 및 선택

### 2. PostgreSQL 데이터베이스 추가

1. 프로젝트 대시보드에서 "New" → "Database" → "Add PostgreSQL" 클릭
2. 자동으로 `DATABASE_URL` 환경 변수가 설정됨

### 3. 커스텀 도메인 설정 (선택사항)

1. Settings → Networking → Generate Domain
2. 생성된 도메인 복사 (예: `your-app.up.railway.app`)
3. 또는 커스텀 도메인 연결 가능

---

## 🤖 Discord 봇 설정

### Redirect URI 업데이트
Discord 개발자 포털에서 OAuth2 Redirects에 프로덕션 URL 추가:
```
https://your-app.up.railway.app/auth/discord/callback
```

### 봇 인증 URL
사용자들이 웹 대시보드에 로그인할 때 사용할 URL:
```
https://your-app.up.railway.app/login
```

---

## ⚙️ 환경 변수 설정

Railway 대시보드의 **Variables** 탭에서 다음 환경 변수들을 설정하세요:

### 필수 환경 변수

```bash
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here

# Database (Railway에서 자동 설정됨)
DATABASE_URL=postgresql://...

# Session Security
SESSION_SECRET=generate_a_long_random_string_here

# Server Configuration
NODE_ENV=production
PORT=5000

# Application URL (Railway 도메인)
DASHBOARD_URL=https://your-app.up.railway.app
REPLIT_DOMAINS=your-app.up.railway.app
```

### SESSION_SECRET 생성 방법
```bash
# Node.js로 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 또는 OpenSSL로 생성
openssl rand -hex 32
```

---

## 🗄️ 데이터베이스 설정

### 1. 스키마 배포

Railway 콘솔에서 실행:
```bash
npm run db:push
```

### 2. 초기 데이터 설정 (선택사항)

기존 백업이 있다면 Railway PostgreSQL에 복원:
```bash
# Railway CLI 설치
npm install -g @railway/cli

# 프로젝트 연결
railway link

# PostgreSQL 접속
railway connect

# SQL 파일 실행
\i /path/to/backup.sql
```

---

## ✅ 배포 후 확인

### 1. 헬스체크
```bash
curl https://your-app.up.railway.app/
```
응답: `{"message":"Server is running"}`

### 2. 봇 상태 확인
Discord 서버에서 봇이 온라인 상태인지 확인:
- 상태 메시지: "🏦 한국은행 종합서비스센터 | 24/7 운영"

### 3. 명령어 테스트
Discord에서 테스트:
```
/은행 계좌개설
/주식 목록
/웹대시보드
/차트 [종목코드]
```

### 4. 웹 대시보드 접속
브라우저에서 접속:
```
https://your-app.up.railway.app/login
```

---

## 🔧 문제 해결

### 봇이 오프라인 상태
1. Railway 로그 확인: Settings → Logs
2. `DISCORD_BOT_TOKEN` 환경 변수 확인
3. Discord Bot 페이지에서 Intent 권한 확인

### 웹 로그인 실패
1. Discord OAuth Redirect URI 확인
2. `DISCORD_CLIENT_ID` 및 `DISCORD_CLIENT_SECRET` 확인
3. Railway 도메인과 환경 변수의 URL 일치 확인

### 데이터베이스 연결 오류
1. `DATABASE_URL` 환경 변수 확인
2. Railway PostgreSQL 플러그인 상태 확인
3. 방화벽 규칙 확인

### 명령어가 작동하지 않음
1. Railway 로그에서 "Slash commands registered" 메시지 확인
2. Discord에서 봇을 서버에서 제거 후 재초대
3. 봇 권한 확인 (applications.commands)

---

## 📊 모니터링

### Railway 대시보드
- **Metrics**: CPU, 메모리, 네트워크 사용량
- **Logs**: 실시간 로그 스트림
- **Deployments**: 배포 히스토리

### Discord 봇 활동
- 서버 수: 봇이 참여한 서버 개수
- 명령어 사용량: 로그에서 추적
- 오류율: 에러 로그 모니터링

---

## 🔐 보안 권장사항

1. **환경 변수 보호**
   - `.env` 파일을 절대 Git에 커밋하지 마세요
   - Railway에서만 환경 변수 설정

2. **세션 시크릿**
   - 강력한 랜덤 문자열 사용
   - 정기적으로 갱신

3. **데이터베이스 백업**
   - Railway의 자동 백업 활성화
   - 주기적으로 수동 백업 다운로드

4. **봇 토큰 보호**
   - 토큰이 노출되면 즉시 재발급
   - Discord 개발자 포털에서 "Regenerate" 클릭

---

## 🎉 완료!

이제 봇이 프로덕션 환경에서 실행됩니다!

### 사용자 안내
사용자들에게 다음 정보를 공유하세요:
- **웹 대시보드**: https://your-app.up.railway.app
- **Discord 명령어**: `/은행`, `/주식`, `/차트`, `/웹대시보드` 등
- **초기 계좌 개설**: `/은행 계좌개설 비밀번호:[4자리이상]`

### 지원 및 업데이트
- 버그 리포트: GitHub Issues
- 기능 요청: Discord 서버
- 업데이트: Git push 시 자동 배포

---

## 📞 지원

문제가 발생하면:
1. Railway 로그 확인
2. Discord 개발자 포털 설정 재확인
3. GitHub Issues에 문의

**Happy Trading! 🚀📈**
