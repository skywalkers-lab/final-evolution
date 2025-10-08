#!/bin/bash
# 네이버 클라우드 / 가비아 / 카페24 자동 설치 스크립트
# Ubuntu 22.04 기준

set -e  # 에러 발생시 중단

echo "🚀 Discord 경제 봇 자동 설치 시작..."
echo ""

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 시스템 업데이트
echo -e "${BLUE}📦 시스템 업데이트 중...${NC}"
apt update && apt upgrade -y

# Node.js 18 설치
echo -e "${BLUE}📦 Node.js 18 설치 중...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs git nginx

# PM2 설치
echo -e "${BLUE}📦 PM2 설치 중...${NC}"
npm install -g pm2

# 프로젝트 디렉토리로 이동
cd /opt

# 기존 프로젝트가 있다면 백업
if [ -d "final-evolution" ]; then
    echo -e "${RED}⚠️  기존 프로젝트 발견, 백업 중...${NC}"
    mv final-evolution final-evolution.backup.$(date +%Y%m%d_%H%M%S)
fi

# 프로젝트 클론
echo -e "${BLUE}📥 프로젝트 다운로드 중...${NC}"
git clone https://github.com/skywalkers-lab/final-evolution.git
cd final-evolution

# 의존성 설치
echo -e "${BLUE}📦 의존성 설치 중... (시간이 좀 걸립니다)${NC}"
npm install

# 환경변수 입력 받기
echo ""
echo -e "${GREEN}📝 환경변수를 입력해주세요:${NC}"
echo ""
read -p "Discord Bot Token: " BOT_TOKEN
read -p "Discord Application ID: " APP_ID
read -p "Database URL (예: postgresql://user:pass@host:5432/dbname): " DB_URL
read -p "Session Secret (아무 긴 문자열): " SESSION_SECRET

# .env 파일 생성
echo -e "${BLUE}📝 환경변수 파일 생성 중...${NC}"
cat > .env << EOF
# Discord 봇 설정
DISCORD_BOT_TOKEN=$BOT_TOKEN
DISCORD_APPLICATION_ID=$APP_ID

# 데이터베이스
DATABASE_URL=$DB_URL

# 세션 시크릿
SESSION_SECRET=$SESSION_SECRET

# 프로덕션 설정
NODE_ENV=production
PORT=3000
EOF

# 빌드
echo -e "${BLUE}🔨 프로젝트 빌드 중...${NC}"
npm run build

# 데이터베이스 초기화
echo -e "${BLUE}🗄️  데이터베이스 스키마 배포 중...${NC}"
npm run db:push

# PM2로 시작
echo -e "${BLUE}▶️  앱 시작 중...${NC}"
pm2 delete discord-bot 2>/dev/null || true  # 기존 프로세스 제거
pm2 start dist/index.js --name discord-bot

# 부팅시 자동 시작 설정
pm2 startup | tail -n 1 | bash
pm2 save

# 방화벽 설정
echo -e "${BLUE}🔥 방화벽 설정 중...${NC}"
ufw allow 22/tcp comment 'SSH'
ufw allow 3000/tcp comment 'Discord Bot Web'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# 서버 IP 가져오기
SERVER_IP=$(curl -s ifconfig.me)

# 완료 메시지
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                            ║${NC}"
echo -e "${GREEN}║        ✅ 설치 완료!                        ║${NC}"
echo -e "${GREEN}║                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 유용한 명령어:${NC}"
echo ""
echo "  상태 확인:     pm2 status"
echo "  로그 보기:     pm2 logs discord-bot"
echo "  재시작:        pm2 restart discord-bot"
echo "  중지:          pm2 stop discord-bot"
echo "  모니터링:      pm2 monit"
echo ""
echo -e "${BLUE}🌐 웹 대시보드:${NC}"
echo "  http://$SERVER_IP:3000"
echo ""
echo -e "${BLUE}📱 Discord 봇:${NC}"
echo "  Discord 서버에서 봇이 온라인 상태인지 확인하세요!"
echo ""
echo -e "${GREEN}🎉 Discord 경제 봇이 24/7 실행 중입니다!${NC}"
echo ""

# PM2 상태 보여주기
pm2 status
