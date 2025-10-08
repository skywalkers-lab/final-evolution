# 🚀 가비아 클라우드 완전 초보자 가이드

회원가입을 완료하셨다니 좋습니다! 이제 서버를 생성해보겠습니다.

---

## 📍 지금 보고 계신 화면에서 시작하기

### 1단계: 클라우드 서버 생성 시작 (현재 화면)

**지금 보고 계신 화면에서:**

1. 왼쪽 상단 메뉴에서 **"클라우드"** 탭이 선택되어 있는지 확인
2. 화면 중앙의 **"서비스 알아보기"** 버튼 클릭 (파란색 버튼)
   
   **또는**
   
3. 상단 메뉴에서 **"관리콘솔"** 버튼 클릭 (우측 상단)

---

## 🖥️ 2단계: 서버 생성 페이지로 이동

관리콘솔에 들어가면:

1. 좌측 메뉴에서 **"서버"** 또는 **"Compute"** 선택
2. **"서버 생성"** 또는 **"+ 생성하기"** 버튼 클릭

---

## ⚙️ 3단계: 서버 설정 (중요!)

### 서버 타입 선택
```
[추천] g1.c2m4 - 2코어, 4GB RAM
- Discord 봇 + 웹 대시보드 동시 운영 가능
- 월 19,800원

[저렴한 옵션] g1.c1m2 - 1코어, 2GB RAM
- 기본 운영 가능 (다소 느릴 수 있음)
- 월 9,900원
```

### 운영체제 선택
```
✅ Ubuntu 22.04 LTS (필수!)
```

### 스토리지
```
✅ 50GB SSD (기본값)
```

### 네트워크/보안 설정
**방화벽 규칙 추가** (매우 중요!):
```
포트 22   - SSH (서버 접속용)
포트 3000 - 웹 대시보드
포트 80   - HTTP
포트 443  - HTTPS (선택사항)
```

### SSH 키 설정
```
새로운 SSH 키 생성 또는
기존 키 사용
※ 생성된 키는 반드시 다운로드하여 보관!
```

---

## 💳 4단계: 결제 정보 입력

⚠️ **중요: 가비아는 카카오페이를 지원하지 않습니다!**

1. **결제 수단 선택** (다음 중 하나):
   - � 신용카드 (비자/마스터카드)
   - 🏦 실시간 계좌이체
   - 📱 휴대폰 결제 (일부 요금제)

2. **정기 결제 동의** 체크

3. **"서버 생성"** 버튼 클릭

💡 **카카오페이로 결제하고 싶다면?**
→ **네이버 클라우드 플랫폼**을 이용하세요! (NCLOUD_GUIDE.md 참고)

---

## ⏱️ 5단계: 서버 생성 대기 (약 5분)

- 서버가 생성되는 동안 잠시 기다립니다
- 생성 완료되면 서버 목록에 표시됩니다

---

## 🔌 6단계: 서버 접속 정보 확인

서버가 생성되면:

1. **서버 목록**에서 생성된 서버 클릭
2. **공인 IP 주소** 확인 및 복사
3. **SSH 접속 정보** 확인

### SSH 접속 방법

**Windows 사용자:**
```bash
# PowerShell 또는 명령 프롬프트에서
ssh -i "다운로드한키.pem" root@서버IP주소
```

**Mac/Linux 사용자:**
```bash
# 터미널에서
chmod 400 다운로드한키.pem
ssh -i "다운로드한키.pem" root@서버IP주소
```

**가비아 웹 콘솔 사용 (더 쉬움!):**
```
서버 목록 → 해당 서버 → "콘솔 접속" 버튼 클릭
→ 웹 브라우저에서 바로 접속 가능!
```

---

## 🗄️ 7단계: PostgreSQL 데이터베이스 추가

가비아 클라우드에서 데이터베이스 서비스를 제공하지 않으므로, 서버에 직접 설치합니다.

**자동 설치 스크립트가 PostgreSQL도 같이 설치해줍니다!**

---

## 🚀 8단계: Discord 봇 자동 설치

서버에 접속한 후 다음 명령어를 실행:

### 방법 1: 자동 설치 스크립트 (추천)

```bash
# 1. 설치 스크립트 다운로드
wget https://raw.githubusercontent.com/skywalkers-lab/final-evolution/main/install-gabia.sh

# 2. 실행 권한 부여
chmod +x install-gabia.sh

# 3. 스크립트 실행
./install-gabia.sh
```

스크립트가 다음을 자동으로 설치합니다:
- ✅ Node.js 18
- ✅ PostgreSQL 15
- ✅ PM2 (프로세스 관리자)
- ✅ Nginx (웹 서버)
- ✅ Discord 봇 프로젝트

### 설치 중 입력할 정보 준비:

```
Discord Bot Token: (Discord 개발자 포털에서 확인)
Discord Application ID: (Discord 개발자 포털에서 확인)
Session Secret: (아무 긴 문자열, 예: my-secret-2024-gabia)
```

---

## 🎉 9단계: 설치 완료 및 확인

설치가 완료되면:

### 웹 대시보드 접속
```
http://서버IP주소:3000
```

### Discord 봇 상태 확인
1. Discord 서버에서 봇이 온라인인지 확인
2. 명령어 테스트:
   ```
   /은행 잔액조회
   /주식 시세
   /엑셀내보내기
   ```

### 서버 상태 확인 명령어
```bash
# 봇 상태 확인
pm2 status

# 로그 보기
pm2 logs discord-bot

# 재시작
pm2 restart discord-bot
```

---

## 🔧 추가 설정 (선택사항)

### 도메인 연결하기

도메인이 있다면:

1. 가비아에서 도메인 구매 (약 15,000원/년)
2. DNS 설정:
   ```
   A 레코드: @ → 서버 IP
   A 레코드: www → 서버 IP
   ```
3. 서버에서 Nginx 설정:
   ```bash
   nano /etc/nginx/sites-available/discord-bot
   ```
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   ```bash
   ln -s /etc/nginx/sites-available/discord-bot /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

### HTTPS 인증서 설치 (무료)
```bash
apt-get install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 💰 예상 비용

### 가비아 클라우드 요금
```
서버 (g1.c2m4): 19,800원/월
트래픽: 포함
백업: 무료 (수동)
------------------------------
총합: 19,800원/월 (약 $15)
```

### 결제 일정
- 매월 자동 결제 (카카오페이)
- 사용한 만큼만 과금 (시간 단위)
- 언제든지 해지 가능

---

## 🆘 문제 해결

### 봇이 오프라인인 경우
```bash
# 로그 확인
pm2 logs discord-bot

# 재시작
pm2 restart discord-bot

# 환경변수 확인
cat /opt/final-evolution/.env
```

### 웹 대시보드 접속 안 됨
```bash
# 방화벽 확인
ufw status

# 포트 열기
ufw allow 3000/tcp
```

### 메모리 부족
```bash
# 메모리 사용량 확인
free -h

# 스왑 메모리 추가
dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 📞 가비아 고객지원

### 연락처
- ☎️ 전화: **1544-4755**
- 💬 카카오톡: **@가비아** 친구 추가
- 📧 이메일: hosting@gabia.com
- ⏰ 운영 시간: 평일 09:00-18:00

### 자주 묻는 질문
- Q: 서버 사양 변경 가능한가요?
  - A: 네, 관리콘솔에서 언제든지 업그레이드/다운그레이드 가능합니다.

- Q: 백업은 어떻게 하나요?
  - A: 관리콘솔 → 서버 → 스냅샷 생성

- Q: 데이터베이스 별도 서비스가 있나요?
  - A: 가비아는 DB 서비스가 없어서 서버에 직접 설치합니다.

---

## 🎯 다음 단계 체크리스트

- [ ] 가비아 클라우드 관리콘솔 접속
- [ ] 서버 생성 (Ubuntu 22.04, g1.c2m4)
- [ ] 방화벽 규칙 설정 (22, 3000, 80, 443)
- [ ] SSH로 서버 접속
- [ ] 자동 설치 스크립트 실행
- [ ] Discord 봇 토큰 입력
- [ ] 웹 대시보드 접속 확인 (http://서버IP:3000)
- [ ] Discord에서 봇 온라인 확인
- [ ] 명령어 테스트 (/은행 잔액조회)
- [ ] PM2로 자동 재시작 설정 완료

---

## 🎉 완료!

이제 Discord 경제 봇이 가비아 클라우드에서 24/7 운영됩니다!

### 유지보수
- 📊 PM2 대시보드로 모니터링
- 🔄 GitHub push하면 수동으로 업데이트 필요
- 💾 정기적으로 데이터베이스 백업
- 📈 가비아 콘솔에서 리소스 사용량 확인

### 업데이트 방법
```bash
cd /opt/final-evolution
git pull
npm install
npm run build
pm2 restart discord-bot
```

문제가 생기면 언제든지 물어보세요! 😊
