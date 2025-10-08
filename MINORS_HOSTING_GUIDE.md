# 🎓 미성년자를 위한 Discord 봇 호스팅 가이드

미성년자(만 19세 미만)도 사용할 수 있는 호스팅 방법들을 소개합니다!

---

## ✅ 1순위 추천: Replit (완전 무료!)

### 장점
- ✅ **미성년자 사용 가능!** (이메일만 있으면 됨)
- ✅ **완전 무료** (유료 플랜도 있지만 불필요)
- ✅ 신용카드 불필요
- ✅ 웹 브라우저에서 바로 코딩 가능
- ✅ GitHub 연동 자동 배포
- ✅ 설치 과정 없음

### 단점
- ⚠️ 50분 동안 활동이 없으면 슬립 모드
- ⚠️ 무료 플랜은 리소스 제한 있음
- ⚠️ 속도가 조금 느림

### 배포 방법

#### 1단계: Replit 가입
```
1. https://replit.com 접속
2. "Sign up" 클릭
3. Google 계정 또는 이메일로 가입 (나이 제한 없음!)
```

#### 2단계: 프로젝트 가져오기
```
1. "Create Repl" 클릭
2. "Import from GitHub" 선택
3. GitHub URL 입력:
   https://github.com/skywalkers-lab/final-evolution
4. Language: Node.js 선택
5. "Import from GitHub" 클릭
```

#### 3단계: 환경변수 설정
```
1. 좌측 메뉴에서 "Secrets" (🔒 자물쇠 아이콘) 클릭
2. 다음 변수들 추가:

DISCORD_BOT_TOKEN=여기에_봇_토큰
DISCORD_APPLICATION_ID=여기에_앱_ID
DATABASE_URL=여기에_DB_URL (아래 참고)
SESSION_SECRET=아무_긴_문자열
NODE_ENV=production
```

#### 4단계: 데이터베이스 설정 (무료)
Replit은 PostgreSQL을 제공하지 않으므로 **Neon** 사용 (무료, 미성년자 가능):

```
1. https://neon.tech 접속
2. GitHub 계정으로 가입 (나이 제한 없음)
3. "Create a project" 클릭
4. Connection String 복사
5. Replit Secrets에 DATABASE_URL로 추가
```

#### 5단계: 실행
```
1. Replit 화면 상단의 "Run" 버튼 클릭
2. 봇이 자동으로 시작됨!
```

#### 6단계: 24/7 유지 (UptimeRobot 사용)
Replit은 50분 후 슬립되므로, 무료 핑 서비스 사용:

```
1. https://uptimerobot.com 가입 (무료, 미성년자 가능)
2. "Add New Monitor" 클릭
3. Monitor Type: HTTP(s)
4. URL: Replit에서 제공하는 URL 입력
5. Monitoring Interval: 5 minutes
6. "Create Monitor" 클릭
```

---

## ✅ 2순위: Render.com (무료 티어)

### 장점
- ✅ **미성년자 사용 가능!** (이메일만 있으면 됨)
- ✅ 무료 티어 제공
- ✅ GitHub 자동 배포
- ✅ PostgreSQL 무료 포함

### 단점
- ⚠️ 15분 동안 요청 없으면 슬립
- ⚠️ 무료 DB는 90일 후 삭제 (재생성 가능)
- ⚠️ 월 750시간 제한 (24/7은 약 730시간)

### 배포 방법

#### 1단계: Render 가입
```
https://render.com
→ "Get Started" 클릭
→ GitHub 계정으로 가입 (나이 제한 없음!)
```

#### 2단계: PostgreSQL 생성
```
1. Dashboard → "+ New" → "PostgreSQL"
2. Name: discord-bot-db
3. Plan: Free 선택
4. "Create Database" 클릭
5. Internal Database URL 복사
```

#### 3단계: 웹 서비스 생성
```
1. Dashboard → "+ New" → "Web Service"
2. "Connect repository" → GitHub 저장소 선택
3. 설정:
   Name: discord-economy-bot
   Environment: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Plan: Free
4. Environment Variables 추가:
   DATABASE_URL=<복사한_DB_URL>
   DISCORD_BOT_TOKEN=봇_토큰
   DISCORD_APPLICATION_ID=앱_ID
   NODE_ENV=production
   SESSION_SECRET=랜덤_문자열
5. "Create Web Service" 클릭
```

---

## ✅ 3순위: Glitch (완전 무료)

### 장점
- ✅ **미성년자 사용 가능!**
- ✅ 완전 무료
- ✅ 신용카드 불필요
- ✅ 브라우저에서 바로 코딩

### 단점
- ⚠️ 5분마다 슬립 (핑 서비스 필요)
- ⚠️ 프로젝트 크기 제한
- ⚠️ 속도 느림

### 배포 방법
```
1. https://glitch.com 가입 (GitHub 계정)
2. "New Project" → "Import from GitHub"
3. 저장소 URL 입력
4. .env 파일에 환경변수 추가
5. 프로젝트 자동 시작
```

---

## ✅ 4순위: 부모님 동의 받아서 사용

만약 부모님이 동의해주신다면:

### 네이버 클라우드 플랫폼
```
- 부모님 명의로 가입
- 카카오페이 결제 가능
- 무료 크레딧 $100 (3개월)
- 가장 안정적
```

### 방법
```
1. 부모님께 상황 설명
2. 부모님 계정으로 가입
3. 부모님 동의 하에 서비스 이용
4. 월 ~30,000원 비용 발생
```

---

## ✅ 5순위: 집 컴퓨터 24/7 운영

### 장점
- ✅ 완전 무료
- ✅ 가입 불필요
- ✅ 완전한 제어

### 단점
- ⚠️ 전기세 발생
- ⚠️ 컴퓨터를 항상 켜둬야 함
- ⚠️ 공인 IP 필요 (또는 Ngrok 사용)

### 배포 방법

#### Windows
```powershell
# 1. Node.js 설치 (https://nodejs.org)
# 2. PostgreSQL 설치 (https://www.postgresql.org/download/)

# 3. 프로젝트 클론
git clone https://github.com/skywalkers-lab/final-evolution.git
cd final-evolution

# 4. .env 파일 생성
notepad .env
# (환경변수 입력)

# 5. 의존성 설치
npm install

# 6. 빌드
npm run build

# 7. 실행
npm start
```

#### Mac/Linux
```bash
# 위와 동일하지만 더 쉬움
npm install pm2 -g
pm2 start dist/index.js --name discord-bot
pm2 startup
pm2 save
```

---

## 📊 미성년자 가능 옵션 비교표

| 플랫폼 | 비용 | 미성년자 | 24/7 | 난이도 | 추천도 |
|--------|------|---------|------|--------|--------|
| **Replit** | 무료 | ✅ | ⚠️ 핑 필요 | ⭐ 쉬움 | 🥇 1위 |
| **Render** | 무료 | ✅ | ⚠️ 슬립 | ⭐⭐ 보통 | 🥈 2위 |
| **Glitch** | 무료 | ✅ | ⚠️ 핑 필요 | ⭐ 쉬움 | 🥉 3위 |
| **Neon DB** | 무료 | ✅ | ✅ | ⭐ 쉬움 | DB 전용 |
| **집 컴퓨터** | 무료 | ✅ | ✅ | ⭐⭐⭐ 어려움 | 4위 |

---

## 🎯 상황별 최적 추천

### "완전 무료로 시작하고 싶어요"
→ **Replit + Neon DB + UptimeRobot** (전부 무료!)

### "설치 과정이 복잡하면 싫어요"
→ **Replit** (브라우저에서 클릭 몇 번으로 끝)

### "안정적으로 24/7 운영하고 싶어요"
→ **Render.com** (무료지만 안정적)

### "집 컴퓨터가 항상 켜져 있어요"
→ **집 컴퓨터 운영** (전기세만 나감)

### "부모님이 월 3만원 정도는 괜찮다고 하세요"
→ **네이버 클라우드** (부모님 명의, 가장 좋음)

---

## 🚀 빠른 시작: Replit 5분 가이드

### 1분: 가입
```
https://replit.com
→ Google 계정으로 가입
```

### 2분: 프로젝트 가져오기
```
Create Repl → Import from GitHub
→ https://github.com/skywalkers-lab/final-evolution
```

### 1분: 데이터베이스 생성
```
https://neon.tech
→ GitHub 로그인
→ Create project
→ Connection string 복사
```

### 1분: 환경변수 설정
```
Replit Secrets:
- DISCORD_BOT_TOKEN
- DISCORD_APPLICATION_ID  
- DATABASE_URL
- SESSION_SECRET
- NODE_ENV=production
```

### 30초: 실행
```
Run 버튼 클릭 → 완료!
```

---

## 🔧 Replit 전용 설정 파일

프로젝트 루트에 `.replit` 파일 생성:

```toml
run = "npm start"
entrypoint = "server/index.ts"

[nix]
channel = "stable-22_11"

[deployment]
run = ["sh", "-c", "npm start"]
deploymentTarget = "cloudrun"

[env]
NODE_ENV = "production"

[[ports]]
localPort = 3000
externalPort = 80
```

---

## 💡 중요 팁

### Discord 봇 토큰 받는 법
```
1. https://discord.com/developers/applications
2. 애플리케이션 생성 (나이 제한 없음)
3. Bot → Add Bot
4. Token 복사
5. Bot Permissions 설정
6. OAuth2 → URL Generator로 봇 초대
```

### 슬립 모드 방지
```
UptimeRobot (무료):
- 5분마다 자동 핑
- 봇이 항상 온라인 유지
- 미성년자 가입 가능
```

### 데이터 백업
```
Replit은 언제든지 삭제될 수 있으므로:
- GitHub에 정기적으로 commit/push
- Neon DB 백업 설정
- 중요 데이터는 로컬에도 저장
```

---

## 🆘 자주 묻는 질문

### Q: 정말 미성년자도 사용 가능한가요?
A: 네! Replit, Render, Glitch 모두 이메일만 있으면 가입 가능합니다. 신용카드나 나이 인증이 필요 없습니다.

### Q: 무료로 계속 쓸 수 있나요?
A: 네! Replit, Render 무료 티어는 영구 무료입니다. 단, 슬립 모드가 있습니다.

### Q: 슬립 모드가 뭔가요?
A: 일정 시간 동안 활동이 없으면 서버가 잠들어서 봇이 오프라인됩니다. UptimeRobot으로 5분마다 깨울 수 있습니다.

### Q: 부모님 동의 없이 가능한가요?
A: 무료 서비스(Replit, Render)는 가능하지만, 유료 서비스는 부모님 동의가 필요합니다.

### Q: 학교에서도 관리할 수 있나요?
A: 네! Replit은 웹 브라우저에서 모든 작업이 가능해서 학교 컴퓨터에서도 가능합니다.

---

## 🎓 학생 혜택

### GitHub Student Developer Pack
만 13세 이상 학생이라면:

```
https://education.github.com/pack

제공 혜택:
- DigitalOcean $200 크레딧
- Azure $100 크레딧  
- Heroku 무료 Hobby 플랜
- Namecheap 무료 도메인
등 100개 이상의 서비스 무료!

필요 서류:
- 학생증 또는 재학증명서
- 학교 이메일 (.ac.kr)
```

### 가입 방법
```
1. GitHub 가입
2. Settings → Developer settings
3. Student Developer Pack 신청
4. 학생 인증 (학생증 사진 업로드)
5. 승인 (보통 1-2일)
```

---

## 🎉 추천 조합 (완전 무료!)

```
✅ 호스팅: Replit (무료)
✅ 데이터베이스: Neon (무료)
✅ 슬립 방지: UptimeRobot (무료)
✅ 도메인: Freenom (무료) 또는 학생팩
✅ 코드 관리: GitHub (무료)

총 비용: 0원!
```

---

## 📞 도움이 필요하면

### Discord 커뮤니티
```
- Replit Discord
- Render Community
- 개발자 커뮤니티 (디스코드)
```

### YouTube 튜토리얼
```
"Replit Discord Bot 호스팅"
"무료 Discord 봇 24/7"
검색하면 많은 한국어 가이드가 있습니다!
```

---

## 🏁 결론

**미성년자 최고 추천:**
1. **Replit** (가장 쉽고 빠름)
2. **Render** (더 안정적)
3. **집 컴퓨터** (완전 무료)

모두 신용카드나 나이 인증 없이 사용 가능합니다!

화이팅하세요! 🎉
