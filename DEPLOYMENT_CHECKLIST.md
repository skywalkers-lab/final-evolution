# 🚀 프로덕션 배포 체크리스트

배포 전에 다음 항목들을 확인하세요.

## ✅ Discord 설정

### Discord Developer Portal
- [ ] 애플리케이션 생성 완료
- [ ] Bot Token 발급 완료
- [ ] Client ID 확인
- [ ] Client Secret 발급 완료
- [ ] Bot Intents 활성화:
  - [ ] Presence Intent
  - [ ] Server Members Intent
  - [ ] Message Content Intent

### OAuth2 설정
- [ ] Redirect URIs 추가:
  - [ ] `https://your-app.railway.app/auth/discord/callback`
  - [ ] `http://localhost:3000/auth/discord/callback` (개발용)
- [ ] Scopes 확인: `bot`, `applications.commands`
- [ ] 봇 권한 확인: Send Messages, Embed Links, Attach Files, Use Slash Commands

### 봇 초대
- [ ] 봇 초대 URL 생성
- [ ] 테스트 서버에 봇 초대
- [ ] 봇이 온라인 상태인지 확인

---

## ✅ Railway 설정

### 프로젝트 생성
- [ ] Railway 계정 생성
- [ ] GitHub 연동
- [ ] 프로젝트 생성
- [ ] 저장소 연결

### PostgreSQL 데이터베이스
- [ ] PostgreSQL 플러그인 추가
- [ ] `DATABASE_URL` 자동 설정 확인
- [ ] 데이터베이스 연결 테스트

### 환경 변수 설정
- [ ] `DISCORD_BOT_TOKEN` 설정
- [ ] `DISCORD_CLIENT_ID` 설정
- [ ] `DISCORD_CLIENT_SECRET` 설정
- [ ] `SESSION_SECRET` 설정 (32+ 자리 랜덤 문자열)
- [ ] `NODE_ENV=production` 설정
- [ ] `DASHBOARD_URL` 설정 (Railway 도메인)

### 도메인 설정
- [ ] Railway 도메인 생성 (.up.railway.app)
- [ ] 커스텀 도메인 연결 (선택사항)
- [ ] SSL 인증서 확인

---

## ✅ 데이터베이스 설정

### 스키마 배포
- [ ] Railway 콘솔에서 `npm run db:push` 실행
- [ ] 테이블 생성 확인
- [ ] 인덱스 확인

### 데이터 마이그레이션 (선택사항)
- [ ] 기존 백업 파일 준비
- [ ] PostgreSQL 접속
- [ ] SQL 파일 실행
- [ ] 데이터 무결성 확인

---

## ✅ 보안 설정

### 환경 변수 보안
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] Git 히스토리에 민감한 정보가 없는지 확인
- [ ] Railway에서만 환경 변수 설정

### 세션 보안
- [ ] `SESSION_SECRET`이 강력한 랜덤 문자열인지 확인
- [ ] 프로덕션과 개발 환경의 시크릿이 다른지 확인

### Discord 토큰 보안
- [ ] Bot Token이 노출되지 않았는지 확인
- [ ] 의심스러운 경우 토큰 재발급

---

## ✅ 애플리케이션 설정

### 코드 확인
- [ ] `NODE_ENV=production` 체크 로직 확인
- [ ] HTTPS 리다이렉션 설정 확인
- [ ] 에러 핸들링 확인
- [ ] 로깅 설정 확인

### 빌드 테스트
- [ ] 로컬에서 프로덕션 빌드 테스트
  ```bash
  npm run build
  NODE_ENV=production npm start
  ```
- [ ] 빌드 에러 없음 확인
- [ ] 번들 크기 확인

---

## ✅ 배포 후 테스트

### Discord 봇
- [ ] 봇이 온라인 상태인지 확인
- [ ] 슬래시 명령어 등록 확인
- [ ] 테스트 명령어 실행:
  - [ ] `/은행 계좌개설`
  - [ ] `/주식 목록`
  - [ ] `/웹대시보드`
  - [ ] `/차트 [종목코드]`

### 웹 대시보드
- [ ] 메인 페이지 접속 확인
- [ ] Discord OAuth 로그인 테스트
- [ ] 로그인 후 대시보드 접근 확인
- [ ] 실시간 데이터 업데이트 확인 (WebSocket)

### API 엔드포인트
- [ ] `/api/me` - 인증 확인
- [ ] `/api/guilds` - 서버 목록
- [ ] `/api/stocks` - 주식 목록
- [ ] `/api/news` - 뉴스 목록

### 데이터베이스
- [ ] 계좌 생성 테스트
- [ ] 거래 내역 저장 확인
- [ ] 주식 거래 테스트
- [ ] 데이터 무결성 확인

---

## ✅ 모니터링 설정

### Railway 모니터링
- [ ] Railway 대시보드에서 로그 확인
- [ ] 메트릭 모니터링 (CPU, 메모리)
- [ ] 배포 히스토리 확인

### 에러 추적
- [ ] 에러 로그 확인 방법 숙지
- [ ] 중요 에러 알림 설정 (선택사항)

---

## ✅ 문서화

### 사용자 가이드
- [ ] README.md 업데이트
- [ ] 명령어 리스트 문서화
- [ ] FAQ 작성 (선택사항)

### 개발자 문서
- [ ] 환경 변수 문서화 (.env.example)
- [ ] API 문서화 (선택사항)
- [ ] 배포 가이드 업데이트

---

## ✅ 사용자 공지

### Discord 서버
- [ ] 공지 채널에 안내 메시지 작성
- [ ] 웹 대시보드 링크 공유
- [ ] 명령어 사용법 안내
- [ ] 문의 채널 안내

### 메시지 예시
```markdown
🎉 **한국은행 종합 서비스센터 오픈!**

📊 **웹 대시보드**: https://your-app.railway.app
🤖 **Discord 명령어**: `/은행`, `/주식`, `/차트`, `/웹대시보드`

**시작하기**:
1. `/은행 계좌개설 비밀번호:[비밀번호]` - 계좌 개설
2. `/주식 목록` - 상장 주식 확인
3. `/웹대시보드` - 대시보드 링크 받기

**문의**: #문의 채널에 남겨주세요!
```

---

## ✅ 백업 계획

### 정기 백업
- [ ] Railway 자동 백업 활성화
- [ ] 주간 수동 백업 일정 설정
- [ ] 백업 복원 테스트

### 재해 복구
- [ ] 백업 파일 안전한 곳에 보관
- [ ] 복구 절차 문서화
- [ ] 복구 테스트 수행

---

## 🎯 배포 완료!

모든 체크리스트 항목이 완료되면 배포 준비가 끝났습니다! 🚀

### 다음 단계
1. Git에 최종 커밋
2. Railway에 푸시 (자동 배포)
3. 배포 로그 모니터링
4. 사용자에게 공지
5. 피드백 수집

**Happy Trading! 📈💰**
