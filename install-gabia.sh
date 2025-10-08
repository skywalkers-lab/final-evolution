#!/bin/bash
# 가비아 클라우드 전용 자동 설치 스크립트
# Ubuntu 22.04 기준 + PostgreSQL 포함

set -e  # 에러 발생시 중단

echo "🚀 가비아 클라우드 Discord 경제 봇 자동 설치"
echo "================================================"
echo ""

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 시스템 정보 확인
echo -e "${BLUE}📋 시스템 정보 확인 중...${NC}"
echo "OS: $(lsb_release -d | cut -f2)"
echo "메모리: $(free -h | awk '/^Mem:/ {print $2}')"
echo "디스크: $(df -h / | awk 'NR==2 {print $4}') 사용 가능"
echo ""

# 시스템 업데이트
echo -e "${BLUE}📦 시스템 업데이트 중... (시간이 좀 걸립니다)${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

# Node.js 18 설치
echo -e "${BLUE}📦 Node.js 18 설치 중...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js 이미 설치됨: $(node -v)"
fi

# PostgreSQL 15 설치
echo -e "${BLUE}🗄️  PostgreSQL 15 설치 중...${NC}"
if ! command -v psql &> /dev/null; then
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    echo -e "${GREEN}✅ PostgreSQL 설치 완료${NC}"
else
    echo "PostgreSQL 이미 설치됨: $(psql --version)"
fi

# 필수 패키지 설치
echo -e "${BLUE}📦 필수 패키지 설치 중...${NC}"
apt-get install -y git nginx curl wget ufw

# PM2 설치
echo -e "${BLUE}📦 PM2 설치 중...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo "PM2 이미 설치됨: $(pm2 -v)"
fi

# 방화벽 설정
echo -e "${BLUE}🔥 방화벽 설정 중...${NC}"
ufw --force enable
ufw allow 22/tcp comment 'SSH'
ufw allow 3000/tcp comment 'Discord Bot Web'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw status

# PostgreSQL 데이터베이스 및 사용자 생성
echo -e "${BLUE}🗄️  데이터베이스 설정 중...${NC}"
DB_NAME="discord_bot"
DB_USER="discord_bot_user"
DB_PASSWORD=$(openssl rand -base64 24)

sudo -u postgres psql <<EOF
-- 기존 데이터베이스/사용자 삭제 (있다면)
DROP DATABASE IF EXISTS $DB_NAME;
DROP USER IF EXISTS $DB_USER;

-- 새로 생성
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

echo -e "${GREEN}✅ 데이터베이스 생성 완료${NC}"
echo -e "${YELLOW}📝 DB 정보:${NC}"
echo "  데이터베이스: $DB_NAME"
echo "  사용자: $DB_USER"
echo "  비밀번호: $DB_PASSWORD"
echo ""

# DATABASE_URL 생성
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# 프로젝트 디렉토리로 이동
cd /opt

# 기존 프로젝트가 있다면 백업
if [ -d "final-evolution" ]; then
    echo -e "${YELLOW}⚠️  기존 프로젝트 발견, 백업 중...${NC}"
    mv final-evolution final-evolution.backup.$(date +%Y%m%d_%H%M%S)
fi

# 프로젝트 클론
echo -e "${BLUE}📥 프로젝트 다운로드 중...${NC}"
git clone https://github.com/skywalkers-lab/final-evolution.git
cd final-evolution

# 환경변수 입력 받기
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📝 Discord 봇 설정 정보를 입력해주세요${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 Discord 개발자 포털에서 확인 가능:${NC}"
echo "   https://discord.com/developers/applications"
echo ""

read -p "Discord Bot Token: " BOT_TOKEN
read -p "Discord Application ID: " APP_ID
read -p "Session Secret (아무 긴 문자열): " SESSION_SECRET

# .env 파일 생성
echo -e "${BLUE}📝 환경변수 파일 생성 중...${NC}"
cat > .env << EOF
# Discord 봇 설정
DISCORD_BOT_TOKEN=$BOT_TOKEN
DISCORD_APPLICATION_ID=$APP_ID

# 데이터베이스 (자동 생성됨)
DATABASE_URL=$DATABASE_URL

# 세션 시크릿
SESSION_SECRET=$SESSION_SECRET

# 프로덕션 설정
NODE_ENV=production
PORT=3000
EOF

echo -e "${GREEN}✅ 환경변수 파일 생성 완료${NC}"

# 의존성 설치
echo -e "${BLUE}📦 의존성 설치 중... (시간이 좀 걸립니다)${NC}"
npm install

# 빌드
echo -e "${BLUE}🔨 프로젝트 빌드 중...${NC}"
npm run build

# 데이터베이스 스키마 배포
echo -e "${BLUE}🗄️  데이터베이스 스키마 배포 중...${NC}"
npm run db:push

# PM2로 시작
echo -e "${BLUE}▶️  앱 시작 중...${NC}"
pm2 delete discord-bot 2>/dev/null || true  # 기존 프로세스 제거
pm2 start dist/index.js --name discord-bot --max-memory-restart 500M

# 부팅시 자동 시작 설정
pm2 startup systemd -u root --hp /root | tail -n 1 | bash
pm2 save

# Nginx 설정
echo -e "${BLUE}🌐 Nginx 웹 서버 설정 중...${NC}"
cat > /etc/nginx/sites-available/discord-bot << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

# Nginx 활성화
ln -sf /etc/nginx/sites-available/discord-bot /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

# 서버 IP 가져오기
SERVER_IP=$(curl -s ifconfig.me)

# 데이터베이스 정보 저장
cat > /root/db_info.txt << EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗄️  PostgreSQL 데이터베이스 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

데이터베이스: $DB_NAME
사용자: $DB_USER
비밀번호: $DB_PASSWORD
연결 URL: $DATABASE_URL

이 정보는 /root/db_info.txt 파일에 저장되어 있습니다.

백업 명령어:
pg_dump -U $DB_USER $DB_NAME > backup_\$(date +%Y%m%d).sql

복원 명령어:
psql -U $DB_USER $DB_NAME < backup_YYYYMMDD.sql
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

# 완료 메시지
clear
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}║              ✅ 설치 완료!                              ║${NC}"
echo -e "${GREEN}║                                                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 유용한 명령어${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  📈 상태 확인:     pm2 status"
echo "  📝 로그 보기:     pm2 logs discord-bot"
echo "  🔄 재시작:        pm2 restart discord-bot"
echo "  🛑 중지:          pm2 stop discord-bot"
echo "  📊 모니터링:      pm2 monit"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🌐 접속 정보${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}웹 대시보드:${NC}"
echo "    http://$SERVER_IP"
echo "    http://$SERVER_IP:3000"
echo ""
echo -e "  ${GREEN}Discord 봇:${NC}"
echo "    Discord 서버에서 봇 온라인 확인"
echo "    명령어 테스트: /은행 잔액조회"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🗄️  데이터베이스 정보${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  자세한 정보: cat /root/db_info.txt"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}💾 백업 명령어${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  데이터베이스 백업:"
echo "    pg_dump -U $DB_USER $DB_NAME > backup_\$(date +%Y%m%d).sql"
echo ""
echo "  데이터베이스 복원:"
echo "    psql -U $DB_USER $DB_NAME < backup_YYYYMMDD.sql"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Discord 경제 봇이 24/7 실행 중입니다!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# PM2 상태 보여주기
pm2 status

# 데이터베이스 정보 출력
echo ""
echo -e "${YELLOW}📌 중요: 데이터베이스 정보가 /root/db_info.txt 파일에 저장되었습니다.${NC}"
echo -e "${YELLOW}   나중에 확인이 필요하면: cat /root/db_info.txt${NC}"
echo ""
