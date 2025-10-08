# 🔐 Replit 환경 변수 설정 가이드

## 필수 환경 변수 (Secrets에 추가하세요)

Replit에서 **Tools** → **Secrets** 메뉴에 다음 변수들을 하나씩 추가:

### Discord 봇 설정
```
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
```

**실제 값은 Discord Developer Portal에서 가져오세요:**
- Bot Token: https://discord.com/developers/applications → 당신의 앱 → Bot → Token
- Client ID: OAuth2 → CLIENT ID
- Client Secret: OAuth2 → CLIENT SECRET

### Discord OAuth 콜백
```
DISCORD_CALLBACK_URL=/auth/discord/callback
```

### 데이터베이스 (Neon PostgreSQL)
```
DATABASE_URL=postgresql://neondb_owner:npg_Cb1BRYQalr9W@ep-cool-star-adxzan1y-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 세션 보안키
```
SESSION_SECRET=super_secret_session_key_for_discord_bot_economy_simulator_2024_very_long_string
```

### 서버 설정
```
PORT=3000
NODE_ENV=production
```

### Roblox 통합 (선택사항)
```
ROBLOX_GAME_API_KEY=your_secure_game_api_key_here_change_in_production
WEB_CLIENT_API_KEY=your_secure_web_client_key_here_change_in_production
```

---

## 🚀 실행 방법

### 1. Replit에서 자동 실행
- Replit이 자동으로 `package.json`의 스크립트를 감지합니다
- **Run** 버튼만 누르면 자동으로 `npm run dev` 실행

### 2. Shell에서 수동 실행 (선택사항)
```bash
npm install
npm run db:push
npm run dev
```

---

## 🔄 24/7 실행 유지 (UptimeRobot 설정)

Replit은 무료 플랜에서 접속이 없으면 자동으로 잠들기 때문에, 외부 핑 서비스가 필요합니다.

### UptimeRobot 설정하기

1. **https://uptimerobot.com** 가입 (무료)
2. **Add New Monitor** 클릭
3. 설정값:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Final Evolution Bot
   - **URL**: `https://your-repl-name.replit.app` (Repl 실행 후 표시되는 URL)
   - **Monitoring Interval**: 5 minutes
4. **Create Monitor** 클릭

이제 5분마다 자동으로 서버를 깨워서 24/7 실행됩니다!

---

## ⚠️ 중요한 주의사항

### Discord OAuth 리디렉션 URL 업데이트

1. **Discord Developer Portal** 접속: https://discord.com/developers/applications
2. 당신의 애플리케이션 선택 (1408844722801213510)
3. **OAuth2** → **Redirects** 섹션
4. 새 리디렉션 URL 추가:
   ```
   https://your-repl-name.replit.app/auth/discord/callback
   ```
5. **Save Changes**

### Replit URL 확인하기
- Repl이 실행되면 우측 상단에 URL이 표시됩니다
- 형식: `https://final-evolution-username.replit.app`

---

## 🧪 테스트

1. Repl이 실행되면 브라우저에서 URL 열기
2. Discord 봇이 온라인 상태인지 확인
3. 대시보드 접속: `https://your-repl-url/`
4. Discord에서 `/잔고` 명령어 테스트

---

## 📊 데이터베이스 마이그레이션

처음 실행 시 자동으로 테이블이 생성됩니다. 만약 수동으로 하고 싶다면:

```bash
npm run db:push
```

---

## 🐛 문제 해결

### "Module not found" 에러
```bash
npm install
```

### "Database connection failed"
- Secrets에서 `DATABASE_URL`이 정확한지 확인
- Neon 데이터베이스가 활성화되어 있는지 확인

### "Discord bot offline"
- Secrets에서 `DISCORD_BOT_TOKEN`이 정확한지 확인
- Discord Developer Portal에서 봇이 활성화되어 있는지 확인

### 포트 에러
- Replit은 자동으로 포트를 감지합니다
- `PORT` 환경 변수를 3000으로 설정하세요

---

## 💰 비용

- **Replit 무료 플랜**: 무제한 (UptimeRobot으로 항상 실행)
- **Neon DB 무료 플랜**: 500MB 저장공간 (수천 명의 사용자 지원 가능)
- **UptimeRobot 무료 플랜**: 50개 모니터까지

**총 비용: $0/월** 🎉

---

## 📱 Discord 봇 명령어

배포 후 사용 가능한 명령어:
- `/잔고` - 계좌 잔고 확인
- `/송금` - 다른 사용자에게 송금
- `/주식목록` - 거래 가능한 주식 목록
- `/주식구매` - 주식 매수
- `/주식판매` - 주식 매도
- `/포트폴리오` - 내 주식 현황
- `/랭킹` - 부자 순위
- `/엑셀내보내기` - 모든 거래 내역 다운로드 (관리자 전용)
- `/서킷브레이커해제` - 서킷브레이커 수동 해제 (관리자 전용)

---

## 🎯 다음 단계

1. ✅ Replit에서 GitHub 불러오기
2. ✅ Secrets 환경 변수 설정
3. ✅ Run 버튼 클릭
4. ✅ Discord OAuth URL 업데이트
5. ✅ UptimeRobot 설정
6. ✅ 테스트!

완료! 🚀
