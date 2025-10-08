# 🆓 무료 배포 옵션 가이드

Railway가 유료라서 부담되신다면, 무료 또는 저렴한 대안들을 소개합니다.

---

## 🌟 옵션 1: Render.com (무료 티어 있음)

### 장점
- ✅ 완전 무료 티어 제공
- ✅ PostgreSQL 무료 포함 (90일 후 삭제, 계속 무료로 재생성 가능)
- ✅ GitHub 자동 배포
- ✅ 설정 매우 쉬움

### 단점
- ⚠️ 15분 동안 요청이 없으면 슬립 모드 (첫 요청 시 느림)
- ⚠️ 무료 티어는 750시간/월 제한 (24/7은 불가능)
- ⚠️ 웹 서비스 1개만 무료

### 배포 방법

#### 1. Render 가입
1. https://render.com 접속
2. GitHub 계정으로 로그인

#### 2. PostgreSQL 생성
1. Dashboard → "+ New" → "PostgreSQL" 선택
2. Name: `discord-bot-db`
3. Plan: **Free** 선택
4. "Create Database" 클릭
5. Internal Database URL 복사

#### 3. 웹 서비스 생성
1. Dashboard → "+ New" → "Web Service" 선택
2. Connect GitHub repository
3. 다음 설정:
   ```yaml
   Name: discord-economy-bot
   Environment: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Plan: Free
   ```

#### 4. 환경 변수 설정
Environment 탭에서:
```bash
DATABASE_URL=<Render PostgreSQL URL>
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_APPLICATION_ID=your_app_id
NODE_ENV=production
```

#### 5. 슬립 모드 방지 (선택사항)
**UptimeRobot** (무료)로 5분마다 핑 보내기:
1. https://uptimerobot.com 가입
2. "+ Add New Monitor" 클릭
3. Monitor Type: HTTP(s)
4. URL: `https://your-app.onrender.com`
5. Monitoring Interval: 5 minutes

---

## 🚁 옵션 2: Fly.io (무료 티어)

### 장점
- ✅ 매우 관대한 무료 티어
- ✅ 항상 온라인 (슬립 없음)
- ✅ 3개 VM 무료 (2,340시간/월)
- ✅ 빠른 글로벌 배포

### 단점
- ⚠️ 신용카드 필수 (무료지만 등록 필요)
- ⚠️ 명령줄(CLI) 사용 필요
- ⚠️ 설정이 조금 복잡함

### 배포 방법

#### 1. Fly CLI 설치
```bash
# Linux/Mac
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

#### 2. Fly 로그인 및 앱 생성
```bash
# 로그인
fly auth login

# 앱 생성
fly launch --name discord-economy-bot --no-deploy

# PostgreSQL 생성 (무료)
fly postgres create --name discord-bot-db --initial-cluster-size 1
```

#### 3. Fly.toml 설정
프로젝트 루트에 `fly.toml` 파일이 자동 생성됩니다. 확인:
```toml
app = "discord-economy-bot"

[build]
  builder = "heroku/buildpacks:20"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

#### 4. 시크릿 설정
```bash
fly secrets set DISCORD_BOT_TOKEN=your_bot_token
fly secrets set DISCORD_APPLICATION_ID=your_app_id
fly secrets set DATABASE_URL=<Fly PostgreSQL URL>
```

#### 5. 배포
```bash
fly deploy
```

---

## 💻 옵션 3: Oracle Cloud (완전 무료 평생!)

### 장점
- ✅ **완전 무료 평생** (신용카드 필요하지만 청구 안 됨)
- ✅ 2 AMD VM (항상 무료)
- ✅ 200GB 스토리지
- ✅ 완전한 제어 (VPS처럼)

### 단점
- ⚠️ 설정 매우 복잡 (리눅스 서버 관리 필요)
- ⚠️ 수동 배포 및 관리
- ⚠️ 계정 승인에 시간 소요 가능

### 배포 방법 (간략)

#### 1. Oracle Cloud 가입
1. https://cloud.oracle.com 가입
2. Always Free 티어 선택
3. 신용카드 등록 (청구 안 됨)

#### 2. VM 인스턴스 생성
1. Compute → Instances → Create Instance
2. Image: Ubuntu 22.04
3. Shape: VM.Standard.E2.1.Micro (Always Free)
4. SSH 키 생성 및 다운로드

#### 3. 서버 설정
```bash
# SSH 접속
ssh -i ~/.ssh/oracle_key ubuntu@<서버_IP>

# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 설치 (프로세스 관리자)
sudo npm install -g pm2

# PostgreSQL 설치
sudo apt-get install postgresql postgresql-contrib

# 프로젝트 클론
git clone https://github.com/your-repo/final-evolution.git
cd final-evolution
npm install
npm run build

# .env 파일 생성
nano .env
# (환경변수 입력)

# PM2로 실행
pm2 start dist/index.js --name discord-bot
pm2 startup  # 부팅 시 자동 시작
pm2 save
```

---

## 🐳 옵션 4: 자체 서버 + Docker

### VPS 추천 (저렴한 순)

#### Contabo ($4.99/월)
- 4GB RAM, 200GB SSD
- 무제한 트래픽
- 독일/미국 서버

#### Hetzner ($4.15/월)
- 4GB RAM, 40GB SSD
- 20TB 트래픽
- 유럽 서버

#### DigitalOcean ($6/월)
- 1GB RAM, 25GB SSD
- 1TB 트래픽
- 글로벌 서버

### Docker 배포 방법

#### 1. VPS 구매 및 접속
```bash
ssh root@your-server-ip
```

#### 2. Docker 설치
```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose 설치
sudo apt-get install docker-compose
```

#### 3. 프로젝트 클론 및 설정
```bash
git clone https://github.com/your-repo/final-evolution.git
cd final-evolution

# .env 파일 생성
nano .env
```

#### 4. docker-compose.yml 생성
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/discord_bot
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN}
      - DISCORD_APPLICATION_ID=${DISCORD_APPLICATION_ID}
      - NODE_ENV=production
    depends_on:
      - db
    restart: always

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=discord_bot
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

volumes:
  postgres_data:
```

#### 5. 배포
```bash
docker-compose up -d
```

#### 6. 로그 확인
```bash
docker-compose logs -f app
```

---

## 📊 무료 옵션 비교표

| 플랫폼 | 비용 | 24/7 운영 | 슬립모드 | PostgreSQL | 난이도 |
|--------|------|-----------|----------|------------|--------|
| **Render** | 무료 | ❌ (750h/월) | ⚠️ 있음 | ✅ 무료 | ⭐ 쉬움 |
| **Fly.io** | 무료 | ✅ | ❌ 없음 | ✅ 무료 | ⭐⭐ 보통 |
| **Oracle Cloud** | 무료 평생 | ✅ | ❌ 없음 | 직접 설치 | ⭐⭐⭐ 어려움 |
| **Railway** | $5~20/월 | ✅ | ❌ 없음 | ✅ 포함 | ⭐ 쉬움 |

---

## 🎯 상황별 추천

### "완전 무료로 시작하고 싶어요"
→ **Render.com** (슬립 모드 있지만 UptimeRobot으로 해결 가능)

### "항상 온라인이어야 하고 무료였으면 좋겠어요"
→ **Fly.io** (신용카드만 등록하면 완전 무료)

### "장기적으로 무료로 운영하고 싶어요"
→ **Oracle Cloud** (설정 복잡하지만 평생 무료)

### "돈 조금 내고 편하게 쓰고 싶어요"
→ **Railway Pro** ($20/월, 가장 쉽고 안정적)

### "가성비 좋은 VPS로 완전히 제어하고 싶어요"
→ **Contabo + Docker** ($5/월, 고급 사용자용)

---

## 🚨 중요 팁

### 무료 티어 주의사항
1. **백업 필수**: 무료 DB는 언제든지 삭제될 수 있음
2. **모니터링**: 슬립 모드 방지를 위한 핑 서비스 사용
3. **제한 확인**: 트래픽 및 실행 시간 제한 체크

### 배포 전 체크리스트
- [ ] .env 파일의 모든 변수 설정 완료
- [ ] Discord 봇 권한 (Intents) 활성화
- [ ] PostgreSQL 연결 테스트
- [ ] 로컬에서 `npm run build` 성공 확인
- [ ] 포트 설정 확인 (환경변수 PORT 사용)

### 문제 해결
대부분의 무료 플랫폼은:
- 로그를 제공하니 에러 확인 가능
- 커뮤니티 포럼이 활발함
- Discord/GitHub 이슈로 도움 요청 가능
