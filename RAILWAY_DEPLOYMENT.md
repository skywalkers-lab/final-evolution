# Railway.com 배포 가이드

이 가이드는 Discord 경제 봇 웹 대시보드를 Railway.com에서 호스팅하는 방법을 설명합니다.

## 🚀 배포 단계

### 1단계: Railway 프로젝트 생성
1. https://railway.com/new 접속
2. "Deploy from GitHub repo" 선택
3. 이 저장소를 선택하여 연결

### 2단계: 필수 환경변수 설정

Railway 대시보드의 Variables 탭에서 다음 환경변수들을 설정해야 합니다:

#### 🗄️ 데이터베이스 연결
```
DATABASE_URL=postgresql://username:password@hostname:port/database_name
```
- PostgreSQL 데이터베이스 연결 문자열
- Railway PostgreSQL 플러그인을 사용하면 자동으로 설정됩니다

#### 🤖 Discord 봇 설정
```
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_APPLICATION_ID=your_application_id
```

#### 🏦 기본 서버 설정
```
NODE_ENV=production
PORT=5000
```

### 3단계: Railway PostgreSQL 데이터베이스 연결 (권장)
1. Railway 대시보드에서 "Add Plugin" 클릭
2. "PostgreSQL" 선택
3. 자동으로 DATABASE_URL이 설정됩니다

### 4단계: 데이터베이스 스키마 배포
배포 후 처음 한 번만 실행:
```bash
npm run db:push --force
```

### 5단계: 기존 데이터 복원 (선택사항)
기존 백업이 있다면:
1. Railway 콘솔에 접속
2. PostgreSQL 데이터베이스에 연결
3. 백업 SQL 파일 실행

## 🔧 설정 파일 설명

### `railway.toml`
Railway 플랫폼 전용 설정 파일:
- 빌드 설정
- 헬스체크 경로
- 환경변수 기본값
- 재시작 정책

### `nixpacks.toml`
Railway가 사용하는 Nixpacks 빌더 설정:
- Node.js 18 버전 지정
- 빌드 및 시작 명령어

## 📝 배포 후 확인사항

### 1. 웹 대시보드 접속
- `https://your-railway-domain.railway.app` 접속
- 메인 대시보드가 정상적으로 로드되는지 확인

### 2. Discord 봇 상태 확인
- Discord 서버에서 봇이 온라인 상태인지 확인
- `/은행 잔액조회` 같은 기본 명령어 테스트

### 3. 실시간 기능 테스트
- WebSocket 연결 (실시간 주가 업데이트)
- 주식 거래 시스템
- 뉴스 분석 기능

## ⚠️ 주의사항

### 포트 설정
- Railway는 자동으로 PORT 환경변수를 제공
- 앱이 `0.0.0.0:5000`에서 바인딩되도록 설정됨

### 메모리 및 CPU 사용량
- Discord 봇 + 웹서버가 동시에 실행됨
- 실시간 주가 시뮬레이션이 백그라운드에서 작동

### 데이터베이스 연결
- 연결 풀 설정으로 다수의 동시 연결 처리
- Neon Serverless PostgreSQL과 호환

## 🔄 업데이트 배포
코드 변경 후:
1. GitHub에 push
2. Railway가 자동으로 재배포
3. 데이터베이스 스키마 변경시: `npm run db:push --force`

## 🆘 문제 해결

### 봇이 오프라인 상태일 때
1. DISCORD_BOT_TOKEN 환경변수 확인
2. Railway 로그에서 Discord 연결 오류 확인

### 데이터베이스 연결 오류
1. DATABASE_URL 형식 확인
2. PostgreSQL 플러그인 상태 확인
3. 네트워크 연결 상태 점검

### 빌드 실패
1. Node.js 버전 호환성 (18+ 필요)
2. 의존성 설치 오류 로그 확인
3. TypeScript 컴파일 오류 해결