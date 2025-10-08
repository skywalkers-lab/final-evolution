# 🏦 한국은행 종합 서비스센터 (Bank of Korea Service Center)

Discord 기반 가상 경제 시뮬레이션 플랫폼 - 주식 거래, 은행, 경매 시스템

[![Discord](https://img.shields.io/badge/Discord-Bot-5865F2?style=flat&logo=discord&logoColor=white)](https://discord.com/developers/applications)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Railway](https://img.shields.io/badge/Railway-Deployed-0B0D0E?style=flat&logo=railway&logoColor=white)](https://railway.app)

---

## 📋 목차

- [✨ 주요 기능](#-주요-기능)
- [🎮 Discord 명령어](#-discord-명령어)
- [🎮 Roblox 연동](#-roblox-연동)
- [🚀 빠른 시작](#-빠른-시작)
- [🛠️ 기술 스택](#️-기술-스택)
- [📦 설치 및 실행](#-설치-및-실행)
- [🌐 프로덕션 배포](#-프로덕션-배포)
- [📸 스크린샷](#-스크린샷)
- [🤝 기여하기](#-기여하기)
- [📄 라이센스](#-라이센스)

---

## ✨ 주요 기능

### 🏦 은행 시스템
- 💰 계좌 개설 및 관리
- 💸 사용자 간 송금
- 📊 거래 내역 추적
- 🔒 계좌 동결/해제 (관리자)

### 📈 주식 거래
- 📊 실시간 주가 시뮬레이션 (5초마다 업데이트)
- 💹 시장가 매수/매도
- 📝 지정가 주문
- 📉 캔들스틱 차트 (이미지)
- 🎯 포트폴리오 관리

### 🎪 경매 시스템
- 🔨 실시간 경매 입찰
- 🏆 자동 낙찰 처리
- 💎 특별 아이템 거래

### 📰 뉴스 시스템
- 📱 AI 뉴스 분석 (주가 영향)
- 🎭 4가지 카테고리 (정치/사회/경제/연예)
- 📊 자동 주가 반영

### 🌐 웹 대시보드
- 📊 실시간 시장 현황
- 💼 포트폴리오 분석
- 📈 인터랙티브 차트
- 🔔 실시간 알림 (WebSocket)

### 🎮 Roblox 연동
- 🔗 Discord-Roblox 계정 연동
- 💰 게임 내 잔액 조회
- 💸 자동 입출금 시스템
- 📊 포트폴리오 동기화
- ⚡ 실시간 업데이트

---

## 🎮 Discord 명령어

### 은행 (`/은행`)
```
/은행 계좌개설 비밀번호:[비밀번호]  - 새 계좌 개설
/은행 잔액 [사용자]                  - 잔액 조회
/은행 이체 계좌번호:[계좌] 금액:[금액] - 송금
/은행 비밀번호수정                    - 비밀번호 변경
```

### 주식 (`/주식`)
```
/주식 목록                           - 상장 주식 목록
/주식 가격 종목코드:[코드]           - 주가 조회
/주식 매수 종목코드:[코드] 수량:[수량] - 시장가 매수
/주식 매도 종목코드:[코드] 수량:[수량] - 시장가 매도
/주식 지정가매수                      - 지정가 매수 주문
/주식 지정가매도                      - 지정가 매도 주문
/주식 주문목록                        - 내 주문 확인
/주식 주문취소 주문id:[ID]           - 주문 취소
```

### 차트 (`/차트`)
```
/차트 종목코드:[코드]                - 캔들스틱 차트 (PNG 이미지)
```

### 경매 (`/경매`)
```
/경매 목록                           - 진행중인 경매
/경매 입찰 경매id:[ID] 금액:[금액]   - 입찰하기
```

### 기타
```
/대시보드                            - 웹 대시보드 링크
/뉴스분석                            - 뉴스 생성 (관리자)
/관리자설정                          - 관리자 기능
/주식관리                            - 주식 관리 (관리자)
```

---

## 🎮 Roblox 연동

Discord 계정을 Roblox 계정과 연동하여 게임 내에서 경제 시스템을 사용할 수 있습니다.

### 연동 방법

1. **Discord에서 인증 코드 요청**
   ```
   POST /api/roblox/link/request
   ```

2. **Roblox 게임에서 코드 입력**
   - 게임 내 GUI에서 8자리 코드 입력
   - 10분 이내에 인증 완료

3. **자동 연동 완료**
   - Discord 계정의 잔액과 포트폴리오가 게임에 표시됨

### Roblox API 엔드포인트

```lua
-- 게임 서버에서 사용 (X-Game-Key 필요)
GET  /api/roblox/economy/balance/:robloxUserId
POST /api/roblox/economy/adjust
GET  /api/roblox/economy/portfolio/:robloxUserId

-- 웹에서 사용 (인증 불필요)
POST /api/roblox/link/request
GET  /api/roblox/link/status/:discordUserId
DELETE /api/roblox/link/:discordUserId
```

자세한 내용은 [ROBLOX_INTEGRATION.md](./ROBLOX_INTEGRATION.md)를 참조하세요.

---

## 🚀 빠른 시작

### 전제 조건
- Node.js 18+ 
- PostgreSQL 데이터베이스
- Discord Bot Token

### 1. 저장소 클론
```bash
git clone https://github.com/yourusername/final-evolution.git
cd final-evolution
```

### 2. 환경 변수 설정
`server/.env` 파일 생성:
```env
# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Server
NODE_ENV=development
PORT=3000
SESSION_SECRET=your_random_secret_key
```

### 3. 의존성 설치 및 실행
```bash
# 패키지 설치
npm install

# 데이터베이스 스키마 생성
npm run db:push

# 개발 서버 실행
npm run dev
```

### 4. 웹 대시보드 접속
브라우저에서 `http://localhost:3000` 접속

---

## 🛠️ 기술 스택

### Frontend
- ⚛️ **React 18** - UI 프레임워크
- 🎨 **TailwindCSS** - 스타일링
- 📊 **Recharts** - 차트 라이브러리
- 🔌 **WebSocket** - 실시간 통신
- 🎯 **Wouter** - 경량 라우팅

### Backend
- 🟢 **Node.js** + **Express** - 서버
- 📘 **TypeScript** - 타입 안정성
- 🤖 **Discord.js v14** - Discord 봇
- 🗄️ **PostgreSQL** - 데이터베이스
- 📊 **Drizzle ORM** - 데이터베이스 ORM
- 🎨 **ChartJS-Node-Canvas** - 서버 사이드 차트

### DevOps
- 🚂 **Railway** - 호스팅
- 🐙 **GitHub** - 버전 관리
- 🔧 **Vite** - 빌드 도구

---

## 📦 설치 및 실행

### 개발 모드
```bash
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
npm start
```

### 데이터베이스 마이그레이션
```bash
npm run db:push
```

---

## 🌐 프로덕션 배포

### Railway 배포 (권장)

자세한 배포 가이드는 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 참조

#### 빠른 배포
1. Railway 계정 생성: https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. 저장소 선택
4. PostgreSQL 플러그인 추가
5. 환경 변수 설정
6. 배포 완료! 🎉

#### 필수 환경 변수
```env
DISCORD_BOT_TOKEN=xxx
DISCORD_CLIENT_ID=xxx
DISCORD_CLIENT_SECRET=xxx
DATABASE_URL=postgresql://...
SESSION_SECRET=xxx
NODE_ENV=production
DASHBOARD_URL=https://your-app.railway.app
```

### Discord OAuth 설정
Discord Developer Portal에서 Redirect URI 추가:
```
https://your-app.railway.app/auth/discord/callback
```

---

## 📸 스크린샷

### 웹 대시보드
![Dashboard](./docs/images/dashboard.png)

### Discord 명령어
![Commands](./docs/images/commands.png)

### 차트
![Chart](./docs/images/chart.png)

---

## 🤝 기여하기

기여를 환영합니다! 다음 단계를 따라주세요:

1. 저장소 Fork
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

---

## 📄 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

---

## 👥 제작자

- **개발자**: [@skywalkers-lab](https://github.com/skywalkers-lab)
- **프로젝트**: [final-evolution](https://github.com/skywalkers-lab/final-evolution)

---

## 🙏 감사의 말

- Discord.js 커뮤니티
- React 커뮤니티
- 모든 기여자분들

---

## 📞 지원 및 문의

- 🐛 **버그 리포트**: [GitHub Issues](https://github.com/yourusername/final-evolution/issues)
- 💬 **Discord 서버**: [참여하기](#)
- 📧 **이메일**: your-email@example.com

---

**Happy Trading! 🚀📈**