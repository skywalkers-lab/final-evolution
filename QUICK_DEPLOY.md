# ⚡ 5분 빠른 배포 가이드 (Railway)

## 🎯 준비물 체크리스트
- [ ] GitHub 계정
- [ ] Discord 봇 토큰 (있음)
- [ ] Discord Application ID (있음)
- [ ] 신용카드 (Railway 유료 플랜 - $5/월)

---

## 🚀 1단계: Railway 프로젝트 생성 (2분)

### 1-1. Railway 가입
1. https://railway.app 접속
2. GitHub 계정으로 로그인
3. "Start a New Project" 클릭

### 1-2. GitHub 저장소 연결
1. "Deploy from GitHub repo" 선택
2. 이 저장소(`final-evolution`) 선택
3. "Deploy Now" 클릭

### 1-3. PostgreSQL 추가
1. 프로젝트 대시보드에서 "+ New" 클릭
2. "Database" → "Add PostgreSQL" 선택
3. 자동으로 `DATABASE_URL` 환경변수가 설정됨

---

## ⚙️ 2단계: 환경변수 설정 (2분)

Railway 대시보드에서 **Variables** 탭 클릭 후 다음 변수들 추가:

### 필수 환경변수
```bash
# Discord 봇 설정
DISCORD_BOT_TOKEN=여기에_봇_토큰_입력
DISCORD_APPLICATION_ID=여기에_애플리케이션_ID_입력

# 프로덕션 모드
NODE_ENV=production

# 포트 (Railway 자동 설정이지만 명시)
PORT=3000

# 세션 시크릿 (아무 랜덤 문자열)
SESSION_SECRET=여기에_랜덤한_긴_문자열_입력

# DATABASE_URL은 PostgreSQL 추가시 자동 설정됨
```

### 환경변수 입력 예시
```bash
DISCORD_BOT_TOKEN=MTI4NDA1MzI0OTA1NzYyMDAxOA.GxXxXx.xxxxxxxxxxxxxxxxxxxxxx
DISCORD_APPLICATION_ID=1284053249057620018
SESSION_SECRET=my-super-secret-random-string-2024-very-long
NODE_ENV=production
PORT=3000
```

---

## 🗄️ 3단계: 데이터베이스 초기화 (1분)

### 3-1. Railway 콘솔 접속
1. PostgreSQL 서비스 클릭
2. "Connect" 탭에서 연결 정보 확인

### 3-2. 스키마 배포
Railway 대시보드에서 메인 서비스 선택 후:
1. "Settings" → "Deploy Trigger" 활성화
2. 또는 로컬에서 실행:
```bash
# DATABASE_URL 환경변수 설정 후
npm run db:push
```

### 3-3. 기존 데이터 복원 (선택사항)
백업 파일이 있다면:
```bash
# Railway PostgreSQL에 연결
psql $DATABASE_URL < JONGRO_서버_데이터_백업_2025-08-28.sql
```

---

## ✅ 4단계: 배포 확인 및 테스트

### 4-1. 웹 대시보드 확인
1. Railway에서 생성된 URL 클릭 (예: `your-app.up.railway.app`)
2. 웹 대시보드가 로드되는지 확인
3. 로그인 테스트

### 4-2. Discord 봇 확인
1. Discord 서버에서 봇이 온라인인지 확인
2. 명령어 테스트:
   ```
   /은행 잔액조회
   /주식 시세
   /엑셀내보내기
   ```

### 4-3. 실시간 기능 확인
- 웹 대시보드에서 주가가 실시간으로 업데이트되는지 확인
- 주식 거래 기능 테스트
- WebSocket 연결 상태 확인

---

## 🔧 추가 설정 (선택사항)

### Discord OAuth 설정 (웹 로그인용)
1. Discord 개발자 포털 접속: https://discord.com/developers/applications
2. 애플리케이션 선택 → OAuth2 → Redirects
3. 다음 URL 추가:
   ```
   https://your-app.up.railway.app/auth/discord/callback
   ```
4. Client ID와 Client Secret 복사
5. Railway 환경변수에 추가:
   ```bash
   DISCORD_CLIENT_ID=여기에_입력
   DISCORD_CLIENT_SECRET=여기에_입력
   ```

### 커스텀 도메인 연결 (선택사항)
1. Railway Settings → Networking
2. "Custom Domain" 클릭
3. 도메인 입력 (예: `bank.yourdomain.com`)
4. DNS 레코드 설정 (Railway가 자동 안내)

---

## 🚨 문제 해결

### 봇이 오프라인인 경우
1. Railway 로그 확인: "View Logs" 클릭
2. `DISCORD_BOT_TOKEN` 환경변수 확인
3. Discord 개발자 포털에서 봇 권한 확인:
   - Presence Intent ✅
   - Server Members Intent ✅
   - Message Content Intent ✅

### 데이터베이스 연결 오류
1. PostgreSQL 서비스가 실행 중인지 확인
2. `DATABASE_URL` 환경변수 확인
3. Railway 로그에서 연결 오류 메시지 확인

### 웹 대시보드 접속 안 됨
1. Railway에서 서비스가 "Active" 상태인지 확인
2. 포트가 올바른지 확인 (`PORT=3000`)
3. 빌드 로그에서 에러 확인

### 주가 업데이트 안 됨
1. 로그에서 "Trading engine started" 메시지 확인
2. 데이터베이스에 주식 데이터가 있는지 확인:
   ```sql
   SELECT * FROM stocks WHERE guild_id = 'your_guild_id';
   ```

---

## 💰 예상 비용

### Railway 요금제
- **Hobby Plan**: $5/월
  - 500시간 실행 시간
  - 8GB 메모리
  - 100GB 대역폭
  - **24/7 운영 가능** (약 730시간 필요)

- **Pro Plan**: $20/월 (추천)
  - 무제한 실행 시간 ✅
  - 32GB 메모리
  - 100GB 대역폭
  - 우선 지원

### PostgreSQL 비용
- Railway PostgreSQL: 플랜에 포함됨
- 약 1GB 저장공간 사용 예상

### 총 예상 비용
- **월 $20** (Pro 플랜 권장)
- 또는 **월 $5** (Hobby 플랜, 24/7 운영 시 추가 요금 발생 가능)

---

## 🎉 완료!

이제 Discord 봇과 웹 대시보드가 24/7 운영됩니다!

### 유지보수 팁
- 📊 Railway 대시보드에서 리소스 사용량 모니터링
- 🔄 GitHub에 코드 push하면 자동 재배포
- 📧 Railway 알림 설정으로 에러 알림 받기
- 💾 정기적으로 데이터베이스 백업

### 자동 배포 흐름
```
GitHub Push → Railway 자동 감지 → 빌드 → 배포 → 재시작
```

### 모니터링
- Railway 대시보드: 실시간 로그, CPU/메모리 사용량
- Discord 봇 상태: 온라인/오프라인
- 웹 대시보드: 헬스체크 엔드포인트
