# 🇰🇷 한국 호스팅 서비스 가이드 (카카오페이 결제 가능)

해외 신용카드 없이 카카오페이, 토스, 계좌이체로 결제 가능한 한국 서비스들입니다.

---

## 🏆 1순위 추천: 네이버 클라우드 플랫폼 (NCP)

### 장점
- ✅ **카카오페이 결제 가능** ✅
- ✅ 토스, 계좌이체, 신용카드 모두 가능
- ✅ 한국어 지원 + 한국 고객센터
- ✅ 서버 위치 한국 (빠른 속도)
- ✅ 무료 크레딧 $100 (3개월)
- ✅ 안정적인 인프라 (네이버 운영)

### 가격
- **Micro 서버**: 월 7,000원~
  - CPU 1코어, RAM 1GB
  - Discord 봇 + 웹 대시보드 충분
- **Compact 서버**: 월 14,000원~
  - CPU 2코어, RAM 4GB
  - 여유있는 운영 (추천)

### 배포 방법

#### 1단계: 네이버 클라우드 가입 (5분)
1. https://www.ncloud.com 접속
2. 네이버 계정으로 가입
3. 신용카드 또는 **카카오페이** 등록
4. 무료 크레딧 $100 신청 (3개월간 무료!)

#### 2단계: 서버 생성
1. Console → Compute → Server 메뉴
2. "서버 생성" 클릭
3. 다음 옵션 선택:
   ```
   서버 타입: Micro (또는 Compact)
   OS: Ubuntu Server 22.04
   스토리지: 50GB (기본)
   ```
4. ACG(방화벽) 설정:
   - 포트 22 (SSH) 허용
   - 포트 3000 (웹) 허용
   - 포트 443 (HTTPS) 허용
5. "서버 생성" 완료

#### 3단계: Cloud DB for PostgreSQL 생성
1. Console → Database → Cloud DB for PostgreSQL
2. "DB 서버 생성" 클릭
3. 설정:
   ```
   DB 타입: PostgreSQL 15
   요금제: Economy (월 14,000원~)
   DB 이름: discord_bot
   사용자명: postgres
   비밀번호: 설정
   ```

#### 4단계: 서버 접속 및 설정
```bash
# SSH 접속 (네이버 클라우드 콘솔에서 IP 확인)
ssh root@your-server-ip

# 시스템 업데이트
apt update && apt upgrade -y

# Node.js 18 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Git 설치
apt-get install -y git

# PM2 설치 (프로세스 관리자)
npm install -g pm2

# 프로젝트 클론
cd /opt
git clone https://github.com/skywalkers-lab/final-evolution.git
cd final-evolution

# 의존성 설치
npm install

# 빌드
npm run build
```

#### 5단계: 환경변수 설정
```bash
# .env 파일 생성
nano /opt/final-evolution/.env
```

다음 내용 입력:
```bash
# Discord 봇 설정
DISCORD_BOT_TOKEN=여기에_봇_토큰
DISCORD_APPLICATION_ID=여기에_앱_ID

# 데이터베이스 (네이버 Cloud DB 정보)
DATABASE_URL=postgresql://postgres:비밀번호@DB서버IP:5432/discord_bot

# 세션 시크릿
SESSION_SECRET=랜덤한_긴_문자열

# 프로덕션 모드
NODE_ENV=production
PORT=3000
```

Ctrl+O (저장), Ctrl+X (종료)

#### 6단계: 데이터베이스 초기화
```bash
cd /opt/final-evolution
npm run db:push
```

#### 7단계: PM2로 실행
```bash
# 앱 시작
pm2 start dist/index.js --name discord-bot

# 부팅 시 자동 시작 설정
pm2 startup
pm2 save

# 상태 확인
pm2 status
pm2 logs discord-bot
```

#### 8단계: Nginx 설정 (HTTPS용, 선택사항)
```bash
# Nginx 설치
apt-get install -y nginx certbot python3-certbot-nginx

# Nginx 설정
nano /etc/nginx/sites-available/discord-bot
```

다음 내용 입력:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 도메인이 있다면

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# 설정 활성화
ln -s /etc/nginx/sites-available/discord-bot /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# HTTPS 인증서 (도메인 있을 때)
certbot --nginx -d your-domain.com
```

#### 9단계: 완료!
- 웹 대시보드: `http://서버IP:3000` (또는 도메인)
- Discord 봇: 자동으로 온라인 상태

---

## 🥈 2순위: 가비아 클라우드

### 장점
- ✅ **카카오페이 결제 가능** ✅
- ✅ 한국 1위 호스팅 업체
- ✅ 24시간 한국어 고객지원
- ✅ 간편한 관리 패널

### 가격
- **g1.c1m1 (기본)**: 월 9,900원
  - CPU 1코어, RAM 1GB
- **g1.c2m2 (권장)**: 월 19,800원
  - CPU 2코어, RAM 2GB

### 배포 방법
1. https://www.gabia.com/service/gcloud 접속
2. "클라우드 서버" 신청
3. Ubuntu 22.04 선택
4. 위의 네이버 클라우드와 동일한 방법으로 설정

---

## 🥉 3순위: 카페24 클라우드

### 장점
- ✅ **카카오페이 결제 가능** ✅
- ✅ 저렴한 가격
- ✅ 국내 데이터센터

### 가격
- **Basic**: 월 6,600원
  - CPU 1코어, RAM 1GB
- **Standard**: 월 13,200원
  - CPU 2코어, RAM 2GB

### 배포 방법
1. https://www.cafe24.com 접속
2. "클라우드 서버" 메뉴
3. 위의 방법과 동일하게 설정

---

## 💡 4순위: Vultr 서울 리전 (해외지만 편함)

### 장점
- ✅ 서울 데이터센터 (빠른 속도)
- ⚠️ 해외 결제 필요 (비자/마스터카드)
- ✅ 매우 저렴 ($3.50~)
- ✅ 간단한 설정

### 가격
- **$6/월**: CPU 1코어, RAM 1GB, 25GB SSD
- **$12/월**: CPU 1코어, RAM 2GB, 55GB SSD

### 배포 방법
1. https://www.vultr.com 가입
2. Region: Seoul 선택
3. 위의 방법과 동일

---

## 📊 한국 호스팅 비교표

| 서비스 | 최저가격 | 카카오페이 | 무료체험 | 한국어지원 | 난이도 |
|--------|----------|-----------|---------|-----------|--------|
| **네이버 클라우드** | 7,000원/월 | ✅ | $100 크레딧 | ✅ | ⭐⭐ |
| **가비아** | 9,900원/월 | ✅ | 7일 | ✅ | ⭐⭐ |
| **카페24** | 6,600원/월 | ✅ | 없음 | ✅ | ⭐⭐ |
| **Vultr 서울** | $6/월 | ❌ | $100 크레딧 | ❌ | ⭐ |

---

## 🎯 최종 추천: 네이버 클라우드 플랫폼

### 이유
1. **무료 크레딧 $100** - 3개월 무료 테스트
2. **카카오페이 결제** - 간편 결제
3. **안정적** - 네이버가 직접 운영
4. **빠름** - 한국 서버
5. **DB 포함** - PostgreSQL 따로 관리

### 예상 총 비용
```
서버 (Compact): 14,000원/월
DB (Economy): 14,000원/월
트래픽: 포함
-----------------------------
총합: 28,000원/월 (약 $20)

※ 처음 3개월은 무료 크레딧으로 무료!
```

---

## 🚀 빠른 시작 스크립트

네이버 클라우드 서버 접속 후 이 스크립트 하나로 끝!

```bash
#!/bin/bash
# 네이버 클라우드 자동 설치 스크립트

echo "🚀 Discord 봇 자동 설치 시작..."

# 시스템 업데이트
apt update && apt upgrade -y

# Node.js 18 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs git nginx

# PM2 설치
npm install -g pm2

# 프로젝트 클론
cd /opt
git clone https://github.com/skywalkers-lab/final-evolution.git
cd final-evolution

# 의존성 설치
npm install

# 환경변수 입력 받기
echo ""
echo "📝 환경변수를 입력해주세요:"
read -p "Discord Bot Token: " BOT_TOKEN
read -p "Discord Application ID: " APP_ID
read -p "Database URL: " DB_URL
read -p "Session Secret (아무 문자열): " SESSION_SECRET

# .env 파일 생성
cat > .env << EOF
DISCORD_BOT_TOKEN=$BOT_TOKEN
DISCORD_APPLICATION_ID=$APP_ID
DATABASE_URL=$DB_URL
SESSION_SECRET=$SESSION_SECRET
NODE_ENV=production
PORT=3000
EOF

# 빌드
echo "🔨 빌드 중..."
npm run build

# DB 초기화
echo "🗄️ 데이터베이스 초기화..."
npm run db:push

# PM2로 시작
echo "▶️ 앱 시작..."
pm2 start dist/index.js --name discord-bot
pm2 startup
pm2 save

# 방화벽 설정
ufw allow 22
ufw allow 3000
ufw allow 80
ufw allow 443
ufw --force enable

echo ""
echo "✅ 설치 완료!"
echo "📊 상태 확인: pm2 status"
echo "📝 로그 확인: pm2 logs discord-bot"
echo "🌐 웹 접속: http://$(curl -s ifconfig.me):3000"
echo ""
echo "🎉 Discord 봇이 실행 중입니다!"
```

### 사용 방법
```bash
# 서버 접속 후
wget https://raw.githubusercontent.com/skywalkers-lab/final-evolution/main/install.sh
chmod +x install.sh
./install.sh
```

---

## 🔧 유지보수 명령어

### PM2 관리
```bash
# 상태 확인
pm2 status

# 로그 보기
pm2 logs discord-bot

# 재시작
pm2 restart discord-bot

# 중지
pm2 stop discord-bot

# 메모리 사용량
pm2 monit
```

### 업데이트 방법
```bash
cd /opt/final-evolution
git pull
npm install
npm run build
pm2 restart discord-bot
```

### 백업
```bash
# 데이터베이스 백업
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 백업 다운로드
scp root@서버IP:/opt/final-evolution/backup_*.sql ./
```

---

## 📞 고객지원

### 네이버 클라우드
- 전화: 1588-3820
- 이메일: ncloud@navercorp.com
- 채팅: 콘솔 우측 하단

### 가비아
- 전화: 1544-4755
- 카카오톡 상담: @가비아

### 카페24
- 전화: 1544-4755
- 이메일: hosting@cafe24.com

---

## ❓ FAQ

### Q: 카카오페이로 매달 자동결제 되나요?
A: 네, 정기결제로 등록하면 자동으로 매달 결제됩니다.

### Q: 무료 크레딧 다 쓰면 어떻게 되나요?
A: 자동으로 유료 전환되니 미리 결제수단 등록하세요.

### Q: 서버 용량 부족하면?
A: 네이버 클라우드 콘솔에서 클릭 몇 번으로 업그레이드 가능합니다.

### Q: 도메인은 어디서 사나요?
A: 가비아, 후이즈 등에서 구매 (.com 약 15,000원/년)

### Q: HTTPS 설정은 어떻게?
A: Let's Encrypt 무료 인증서 사용 (위 가이드 참고)

---

## 🎉 완료!

이제 한국 호스팅으로 Discord 봇을 24/7 운영할 수 있습니다!

### 다음 단계
1. 네이버 클라우드 가입 (무료 크레딧 신청)
2. 서버 + DB 생성
3. 위 스크립트로 자동 설치
4. Discord에서 봇 테스트

### 궁금한 점이 있다면
- 네이버 클라우드 문서: https://guide.ncloud-docs.com
- 가비아 도움말: https://customer.gabia.com
